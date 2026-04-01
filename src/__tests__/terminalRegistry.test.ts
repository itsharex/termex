import { describe, it, expect, beforeEach } from "vitest";
import {
  registerTerminal,
  unregisterTerminal,
  getTerminalEntry,
  getAllTerminals,
} from "@/utils/terminalRegistry";

// Minimal mocks for Terminal and SearchAddon
function mockTerminal() {
  return { cols: 80, rows: 24 } as any;
}
function mockSearchAddon() {
  return { findNext: () => false } as any;
}

describe("terminalRegistry", () => {
  beforeEach(() => {
    // Clean up all registered terminals
    for (const [id] of getAllTerminals()) {
      unregisterTerminal(id);
    }
  });

  it("registers and retrieves a terminal entry", () => {
    const terminal = mockTerminal();
    const searchAddon = mockSearchAddon();
    registerTerminal("session-1", terminal, searchAddon);

    const entry = getTerminalEntry("session-1");
    expect(entry).toBeDefined();
    expect(entry!.terminal).toBe(terminal);
    expect(entry!.searchAddon).toBe(searchAddon);
  });

  it("returns undefined for unregistered session", () => {
    expect(getTerminalEntry("nonexistent")).toBeUndefined();
  });

  it("unregisters a terminal entry", () => {
    registerTerminal("session-1", mockTerminal(), mockSearchAddon());
    expect(getTerminalEntry("session-1")).toBeDefined();

    unregisterTerminal("session-1");
    expect(getTerminalEntry("session-1")).toBeUndefined();
  });

  it("getAllTerminals returns all registered entries", () => {
    registerTerminal("s1", mockTerminal(), mockSearchAddon());
    registerTerminal("s2", mockTerminal(), mockSearchAddon());
    registerTerminal("s3", mockTerminal(), mockSearchAddon());

    const all = getAllTerminals();
    expect(all.size).toBe(3);
    expect(all.has("s1")).toBe(true);
    expect(all.has("s2")).toBe(true);
    expect(all.has("s3")).toBe(true);
  });

  it("overwrites on re-registration with same ID", () => {
    const t1 = mockTerminal();
    const t2 = mockTerminal();
    registerTerminal("session-1", t1, mockSearchAddon());
    registerTerminal("session-1", t2, mockSearchAddon());

    const entry = getTerminalEntry("session-1");
    expect(entry!.terminal).toBe(t2);
    expect(getAllTerminals().size).toBe(1);
  });

  it("unregistering non-existent ID does not throw", () => {
    expect(() => unregisterTerminal("nonexistent")).not.toThrow();
  });
});
