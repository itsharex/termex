import { ref } from "vue";
import { getAllTerminals } from "@/utils/terminalRegistry";
import { useSessionStore } from "@/stores/sessionStore";
import type { SearchOptions, CrossTabMatch, CrossTabResult } from "@/types/search";
import { DEFAULT_SEARCH_OPTIONS } from "@/types/search";

/** Maximum matches per tab to avoid excessive results. */
const MAX_PER_TAB = 100;

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Composable for searching across all open terminal tabs.
 */
export function useCrossTabSearch() {
  const searchTerm = ref("");
  const searchOptions = ref<SearchOptions>({ ...DEFAULT_SEARCH_OPTIONS });
  const results = ref<CrossTabResult[]>([]);
  const searching = ref(false);
  const totalMatchCount = ref(0);
  const matchedTabCount = ref(0);

  /** Builds a RegExp from the search term and options. */
  function buildRegex(): RegExp | null {
    if (!searchTerm.value) return null;
    try {
      const flags = searchOptions.value.caseSensitive ? "g" : "gi";
      let pattern: string;
      if (searchOptions.value.regex) {
        pattern = searchTerm.value;
      } else {
        pattern = escapeRegex(searchTerm.value);
      }
      if (searchOptions.value.wholeWord) {
        pattern = `\\b${pattern}\\b`;
      }
      return new RegExp(pattern, flags);
    } catch {
      return null;
    }
  }

  /** Scans a single terminal buffer synchronously (batch-friendly). */
  function scanTerminal(
    sessionId: string,
    tabTitle: string,
    terminal: import("@xterm/xterm").Terminal,
    regex: RegExp,
  ): CrossTabResult {
    const matches: CrossTabMatch[] = [];
    let totalMatches = 0;
    const bufferLength = terminal.buffer.active.length;

    for (let y = 0; y < bufferLength; y++) {
      const line = terminal.buffer.active.getLine(y);
      if (!line) continue;

      const text = line.translateToString(true);
      if (!text.trim()) continue;

      regex.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(text)) !== null) {
        totalMatches++;
        if (matches.length < MAX_PER_TAB) {
          matches.push({
            sessionId,
            tabTitle,
            lineNumber: y,
            lineContent: text,
            matchStart: match.index,
            matchLength: match[0].length,
          });
        }
        if (match[0].length === 0) regex.lastIndex++;
      }
    }

    return {
      sessionId,
      tabTitle,
      matches,
      totalMatches,
      truncated: totalMatches > MAX_PER_TAB,
    };
  }

  /** Executes the cross-tab search. */
  async function search() {
    const regex = buildRegex();
    if (!regex) {
      results.value = [];
      totalMatchCount.value = 0;
      matchedTabCount.value = 0;
      return;
    }

    searching.value = true;
    results.value = [];
    totalMatchCount.value = 0;
    matchedTabCount.value = 0;

    const sessionStore = useSessionStore();
    const terminals = getAllTerminals();
    const allResults: CrossTabResult[] = [];

    // Process each terminal, yielding between tabs for UI responsiveness
    for (const [sessionId, entry] of terminals) {
      const tab = sessionStore.tabs.find((t) => t.sessionId === sessionId);
      const tabTitle = tab?.title ?? sessionId;

      // Clone regex to reset lastIndex per terminal
      const clonedRegex = new RegExp(regex.source, regex.flags);
      const result = scanTerminal(sessionId, tabTitle, entry.terminal, clonedRegex);
      allResults.push(result);

      // Yield to event loop between tabs
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    // Sort: tabs with matches first, then by match count descending
    allResults.sort((a, b) => b.totalMatches - a.totalMatches);

    results.value = allResults;
    totalMatchCount.value = allResults.reduce((sum, r) => sum + r.totalMatches, 0);
    matchedTabCount.value = allResults.filter((r) => r.totalMatches > 0).length;
    searching.value = false;
  }

  /** Clears the search results. */
  function clear() {
    searchTerm.value = "";
    results.value = [];
    totalMatchCount.value = 0;
    matchedTabCount.value = 0;
    searching.value = false;
  }

  return {
    searchTerm,
    searchOptions,
    results,
    searching,
    totalMatchCount,
    matchedTabCount,
    search,
    clear,
  };
}
