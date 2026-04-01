import { watch, onUnmounted, type Ref } from "vue";
import type { Terminal, IDecoration, IDisposable } from "@xterm/xterm";
import type { KeywordRule } from "@/types/search";

/** Maximum decorations per rule to avoid performance issues. */
const MAX_DECORATIONS_PER_RULE = 2000;

interface RuleDecorations {
  ruleId: string;
  decorations: IDecoration[];
}

/**
 * Composable that manages persistent keyword highlighting in a terminal.
 * Scans the terminal buffer for keyword rules and applies colored decorations.
 */
export function useKeywordHighlight(
  getTerminal: () => Terminal | null,
  keywordRules: Ref<KeywordRule[]>,
) {
  let ruleDecorations: RuleDecorations[] = [];
  let lastScannedLine = 0;
  let onWriteParsedDisposable: IDisposable | null = null;
  let mounted = false;

  /** Builds a RegExp from a keyword rule. Returns null if invalid. */
  function buildRegex(rule: KeywordRule): RegExp | null {
    try {
      const flags = rule.caseSensitive ? "g" : "gi";
      if (rule.isRegex) {
        return new RegExp(rule.pattern, flags);
      }
      return new RegExp(escapeRegex(rule.pattern), flags);
    } catch {
      return null;
    }
  }

  function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /** Registers a decoration for a matched text at a specific buffer position. */
  function addDecoration(
    terminal: Terminal,
    row: number,
    col: number,
    length: number,
    rule: KeywordRule,
  ): IDecoration | null {
    // row is absolute buffer line, marker offset is relative to cursor
    const cursorAbsoluteY = terminal.buffer.active.baseY + terminal.buffer.active.cursorY;
    const offset = row - cursorAbsoluteY;

    const marker = terminal.registerMarker(offset);
    if (!marker) return null;

    const decoration = terminal.registerDecoration({
      marker,
      x: col,
      width: length,
      backgroundColor: rule.backgroundColor || undefined,
      foregroundColor: rule.foregroundColor || undefined,
    });

    if (decoration) {
      decoration.onRender((el) => {
        if (rule.backgroundColor) {
          el.style.backgroundColor = rule.backgroundColor;
        }
        if (rule.foregroundColor) {
          el.style.color = rule.foregroundColor;
        }
        el.style.opacity = "1";
      });
    }

    return decoration ?? null;
  }

  /** Scans a range of lines for a single rule and returns decorations. */
  function scanLinesForRule(
    terminal: Terminal,
    rule: KeywordRule,
    startLine: number,
    endLine: number,
    existingCount: number,
  ): IDecoration[] {
    const regex = buildRegex(rule);
    if (!regex) return [];

    const decorations: IDecoration[] = [];
    let count = existingCount;

    for (let y = startLine; y < endLine; y++) {
      if (count >= MAX_DECORATIONS_PER_RULE) break;

      const line = terminal.buffer.active.getLine(y);
      if (!line) continue;

      const text = line.translateToString(true);
      if (!text.trim()) continue;

      regex.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(text)) !== null) {
        if (count >= MAX_DECORATIONS_PER_RULE) break;
        const decoration = addDecoration(terminal, y, match.index, match[0].length, rule);
        if (decoration) {
          decorations.push(decoration);
          count++;
        }
        // Prevent infinite loops on zero-length matches
        if (match[0].length === 0) regex.lastIndex++;
      }
    }

    return decorations;
  }

  /** Full scan of the entire buffer for all rules. */
  function fullScan() {
    const terminal = getTerminal();
    if (!terminal) return;

    clearAll();
    const bufferLength = terminal.buffer.active.length;

    for (const rule of keywordRules.value) {
      if (!rule.enabled || !rule.pattern) continue;
      const decorations = scanLinesForRule(terminal, rule, 0, bufferLength, 0);
      ruleDecorations.push({ ruleId: rule.id, decorations });
    }

    lastScannedLine = bufferLength;
  }

  /** Incremental scan: only scan new lines since last scan. */
  function scanNewLines() {
    const terminal = getTerminal();
    if (!terminal) return;

    const bufferLength = terminal.buffer.active.length;
    if (bufferLength <= lastScannedLine) return;

    for (const rule of keywordRules.value) {
      if (!rule.enabled || !rule.pattern) continue;

      let entry = ruleDecorations.find((rd) => rd.ruleId === rule.id);
      if (!entry) {
        entry = { ruleId: rule.id, decorations: [] };
        ruleDecorations.push(entry);
      }

      const newDecorations = scanLinesForRule(
        terminal,
        rule,
        lastScannedLine,
        bufferLength,
        entry.decorations.length,
      );
      entry.decorations.push(...newDecorations);
    }

    lastScannedLine = bufferLength;
  }

  /** Clears all decorations for all rules. */
  function clearAll() {
    for (const entry of ruleDecorations) {
      for (const d of entry.decorations) {
        d.dispose();
      }
    }
    ruleDecorations = [];
    lastScannedLine = 0;
  }

  /** Starts listening for new terminal output to scan incrementally. */
  function startListening() {
    const terminal = getTerminal();
    if (!terminal || onWriteParsedDisposable) return;
    onWriteParsedDisposable = terminal.onWriteParsed(() => {
      scanNewLines();
    });
  }

  /** Stops listening for terminal output. */
  function stopListening() {
    onWriteParsedDisposable?.dispose();
    onWriteParsedDisposable = null;
  }

  /** Initializes highlighting: full scan + start listening. */
  function init() {
    if (mounted) return;
    mounted = true;
    fullScan();
    startListening();
  }

  /** Cleans up all resources. */
  function dispose() {
    mounted = false;
    stopListening();
    clearAll();
  }

  // Watch for rule changes and rebuild
  watch(
    keywordRules,
    () => {
      if (!mounted) return;
      clearAll();
      fullScan();
    },
    { deep: true },
  );

  onUnmounted(dispose);

  return { init, dispose, fullScan, clearAll };
}
