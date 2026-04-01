import { describe, it, expect } from "vitest";
import {
  DEFAULT_SEARCH_OPTIONS,
  PRESET_KEYWORD_RULES,
} from "@/types/search";
import type { SearchOptions, KeywordRule, CrossTabMatch, CrossTabResult } from "@/types/search";

describe("Search Types", () => {
  describe("DEFAULT_SEARCH_OPTIONS", () => {
    it("has all search options disabled by default", () => {
      expect(DEFAULT_SEARCH_OPTIONS).toEqual({
        caseSensitive: false,
        regex: false,
        wholeWord: false,
      });
    });

    it("is a valid SearchOptions object", () => {
      const opts: SearchOptions = DEFAULT_SEARCH_OPTIONS;
      expect(typeof opts.caseSensitive).toBe("boolean");
      expect(typeof opts.regex).toBe("boolean");
      expect(typeof opts.wholeWord).toBe("boolean");
    });
  });

  describe("PRESET_KEYWORD_RULES", () => {
    it("contains 4 preset rules", () => {
      expect(PRESET_KEYWORD_RULES).toHaveLength(4);
    });

    it("each preset has required fields (except id)", () => {
      for (const preset of PRESET_KEYWORD_RULES) {
        expect(typeof preset.pattern).toBe("string");
        expect(preset.pattern.length).toBeGreaterThan(0);
        expect(typeof preset.isRegex).toBe("boolean");
        expect(typeof preset.caseSensitive).toBe("boolean");
        expect(typeof preset.foregroundColor).toBe("string");
        expect(typeof preset.backgroundColor).toBe("string");
        expect(preset.backgroundColor.length).toBeGreaterThan(0);
        expect(typeof preset.enabled).toBe("boolean");
        expect(preset.enabled).toBe(true);
      }
    });

    it("does not have 'id' field in presets (omitted)", () => {
      for (const preset of PRESET_KEYWORD_RULES) {
        expect((preset as unknown as KeywordRule).id).toBeUndefined();
      }
    });

    it("preset patterns cover ERROR, WARNING, SUCCESS, FAIL", () => {
      const patterns = PRESET_KEYWORD_RULES.map((r) => r.pattern);
      expect(patterns).toContain("ERROR");
      expect(patterns.some((p) => p.includes("WARN"))).toBe(true);
      expect(patterns.some((p) => p.includes("SUCCESS"))).toBe(true);
      expect(patterns.some((p) => p.includes("FAIL"))).toBe(true);
    });

    it("regex presets produce valid RegExp objects", () => {
      for (const preset of PRESET_KEYWORD_RULES) {
        if (preset.isRegex) {
          expect(() => new RegExp(preset.pattern)).not.toThrow();
        }
      }
    });
  });

  describe("Type shapes", () => {
    it("KeywordRule has all required fields", () => {
      const rule: KeywordRule = {
        id: "test-id",
        pattern: "ERROR",
        isRegex: false,
        caseSensitive: true,
        foregroundColor: "#fff",
        backgroundColor: "#f00",
        enabled: true,
      };
      expect(rule.id).toBe("test-id");
      expect(rule.pattern).toBe("ERROR");
    });

    it("CrossTabMatch has all required fields", () => {
      const match: CrossTabMatch = {
        sessionId: "session-1",
        tabTitle: "server-01",
        lineNumber: 42,
        lineContent: "2024-03-31 ERROR: connection timeout",
        matchStart: 11,
        matchLength: 5,
      };
      expect(match.lineNumber).toBe(42);
      expect(match.matchStart).toBe(11);
    });

    it("CrossTabResult has all required fields", () => {
      const result: CrossTabResult = {
        sessionId: "session-1",
        tabTitle: "server-01",
        matches: [],
        totalMatches: 0,
        truncated: false,
      };
      expect(result.truncated).toBe(false);
      expect(result.matches).toEqual([]);
    });
  });
});
