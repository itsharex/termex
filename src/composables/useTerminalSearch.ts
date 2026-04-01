import { ref, watch } from "vue";
import type { SearchAddon, ISearchOptions } from "@xterm/addon-search";
import type { SearchOptions } from "@/types/search";
import { DEFAULT_SEARCH_OPTIONS } from "@/types/search";

/** Search decoration colors. */
const DECORATIONS = {
  matchBackground: "#FFD70040",
  matchBorder: "#FFD70060",
  matchOverviewRuler: "#FFD700",
  activeMatchBackground: "#FF8C00A0",
  activeMatchBorder: "#FF8C00",
  activeMatchColorOverviewRuler: "#FF8C00",
};

/**
 * Composable that manages terminal search state and bridges to SearchAddon.
 */
export function useTerminalSearch(
  getSearchAddon: () => SearchAddon | null,
) {
  const searchVisible = ref(false);
  const searchTerm = ref("");
  const searchOptions = ref<SearchOptions>({ ...DEFAULT_SEARCH_OPTIONS });
  const matchIndex = ref(-1);
  const matchCount = ref(0);

  let resultListener: { dispose(): void } | null = null;

  /** Builds ISearchOptions for the addon from our state. */
  function buildAddonOptions(): ISearchOptions {
    return {
      regex: searchOptions.value.regex,
      caseSensitive: searchOptions.value.caseSensitive,
      wholeWord: searchOptions.value.wholeWord,
      incremental: true,
      decorations: DECORATIONS,
    };
  }

  /** Binds the onDidChangeResults listener. */
  function bindResultListener() {
    disposeResultListener();
    const addon = getSearchAddon();
    if (!addon) return;
    resultListener = addon.onDidChangeResults((e) => {
      matchIndex.value = e.resultIndex;
      matchCount.value = e.resultCount;
    });
  }

  function disposeResultListener() {
    resultListener?.dispose();
    resultListener = null;
  }

  /** Opens the search bar. */
  function open() {
    if (searchVisible.value) return;
    searchVisible.value = true;
    bindResultListener();
  }

  /** Closes the search bar and clears decorations. */
  function close() {
    searchVisible.value = false;
    searchTerm.value = "";
    matchIndex.value = -1;
    matchCount.value = 0;
    const addon = getSearchAddon();
    addon?.clearDecorations();
    disposeResultListener();
  }

  /** Searches forward for the next match. */
  function findNext() {
    const addon = getSearchAddon();
    if (!addon || !searchTerm.value) return;
    addon.findNext(searchTerm.value, buildAddonOptions());
  }

  /** Searches backward for the previous match. */
  function findPrevious() {
    const addon = getSearchAddon();
    if (!addon || !searchTerm.value) return;
    addon.findPrevious(searchTerm.value, buildAddonOptions());
  }

  /** Triggers a new search (called on term or option change). */
  function updateSearch() {
    const addon = getSearchAddon();
    if (!addon) return;
    if (!searchTerm.value) {
      addon.clearDecorations();
      matchIndex.value = -1;
      matchCount.value = 0;
      return;
    }
    // Re-bind listener in case addon was recreated
    bindResultListener();
    addon.findNext(searchTerm.value, buildAddonOptions());
  }

  // Auto-search when term changes
  watch(searchTerm, () => {
    if (searchVisible.value) updateSearch();
  });

  // Re-search when options toggle
  watch(
    searchOptions,
    () => {
      if (searchVisible.value && searchTerm.value) updateSearch();
    },
    { deep: true },
  );

  /** Fills the search term from outside (e.g., cross-tab search). */
  function setSearchTerm(term: string) {
    searchTerm.value = term;
    if (!searchVisible.value) {
      open();
    }
  }

  return {
    searchVisible,
    searchTerm,
    searchOptions,
    matchIndex,
    matchCount,
    open,
    close,
    findNext,
    findPrevious,
    updateSearch,
    setSearchTerm,
  };
}

export type TerminalSearchAPI = ReturnType<typeof useTerminalSearch>;
