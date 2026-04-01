import type { Terminal } from "@xterm/xterm";
import type { SearchAddon } from "@xterm/addon-search";

interface TerminalEntry {
  terminal: Terminal;
  searchAddon: SearchAddon;
}

/** Global registry of active terminal instances, keyed by session ID. */
const registry = new Map<string, TerminalEntry>();

/** Registers a terminal instance for the given session. */
export function registerTerminal(
  sessionId: string,
  terminal: Terminal,
  searchAddon: SearchAddon,
): void {
  registry.set(sessionId, { terminal, searchAddon });
}

/** Unregisters the terminal for the given session. */
export function unregisterTerminal(sessionId: string): void {
  registry.delete(sessionId);
}

/** Gets a terminal entry by session ID. */
export function getTerminalEntry(
  sessionId: string,
): TerminalEntry | undefined {
  return registry.get(sessionId);
}

/** Returns all registered terminal entries. */
export function getAllTerminals(): Map<string, TerminalEntry> {
  return registry;
}
