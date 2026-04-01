/** Search options shared by per-tab and cross-tab search. */
export interface SearchOptions {
  caseSensitive: boolean;
  regex: boolean;
  wholeWord: boolean;
}

/** Default search options. */
export const DEFAULT_SEARCH_OPTIONS: SearchOptions = {
  caseSensitive: false,
  regex: false,
  wholeWord: false,
};

/** Keyword highlight rule for persistent terminal highlighting. */
export interface KeywordRule {
  id: string;
  pattern: string;
  isRegex: boolean;
  caseSensitive: boolean;
  foregroundColor: string;
  backgroundColor: string;
  enabled: boolean;
}

/** Preset keyword rules for common patterns. */
export const PRESET_KEYWORD_RULES: Omit<KeywordRule, "id">[] = [
  {
    pattern: "ERROR",
    isRegex: false,
    caseSensitive: false,
    foregroundColor: "",
    backgroundColor: "#EF444440",
    enabled: true,
  },
  {
    pattern: "WARNING|WARN",
    isRegex: true,
    caseSensitive: false,
    foregroundColor: "",
    backgroundColor: "#EAB30840",
    enabled: true,
  },
  {
    pattern: "SUCCESS|PASSED",
    isRegex: true,
    caseSensitive: false,
    foregroundColor: "",
    backgroundColor: "#22C55E40",
    enabled: true,
  },
  {
    pattern: "FAIL|FATAL|CRITICAL",
    isRegex: true,
    caseSensitive: false,
    foregroundColor: "#FFFFFF",
    backgroundColor: "#EF444460",
    enabled: true,
  },
];

/** Cross-tab search result item. */
export interface CrossTabMatch {
  sessionId: string;
  tabTitle: string;
  lineNumber: number;
  lineContent: string;
  matchStart: number;
  matchLength: number;
}

/** Cross-tab search result grouped by tab. */
export interface CrossTabResult {
  sessionId: string;
  tabTitle: string;
  matches: CrossTabMatch[];
  totalMatches: number;
  truncated: boolean;
}
