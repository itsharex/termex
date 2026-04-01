<script setup lang="ts">
import { ref, watch, nextTick, computed } from "vue";
import { useI18n } from "vue-i18n";
import { ArrowRight } from "@element-plus/icons-vue";
import { useCrossTabSearch } from "@/composables/useCrossTabSearch";
import { useSessionStore } from "@/stores/sessionStore";
import type { CrossTabMatch, SearchOptions } from "@/types/search";

const { t } = useI18n();

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: "update:visible", val: boolean): void;
  (e: "jump-to-match", match: CrossTabMatch): void;
}>();

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit("update:visible", val),
});

const sessionStore = useSessionStore();
const crossSearch = useCrossTabSearch();
const inputRef = ref<HTMLInputElement>();

// Collapsed state for tabs with no matches
const collapsedTabs = ref<Set<string>>(new Set());

// Focus input when dialog opens
watch(
  () => props.visible,
  async (visible) => {
    if (visible) {
      await nextTick();
      inputRef.value?.focus();
    } else {
      crossSearch.clear();
      collapsedTabs.value.clear();
    }
  },
);

function toggleOption(key: keyof SearchOptions) {
  crossSearch.searchOptions.value = {
    ...crossSearch.searchOptions.value,
    [key]: !crossSearch.searchOptions.value[key],
  };
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Enter") {
    e.preventDefault();
    crossSearch.search();
  }
}

function toggleCollapse(sessionId: string) {
  const set = new Set(collapsedTabs.value);
  if (set.has(sessionId)) {
    set.delete(sessionId);
  } else {
    set.add(sessionId);
  }
  collapsedTabs.value = set;
}

function jumpTo(match: CrossTabMatch) {
  // Switch to the tab
  sessionStore.setActive(match.sessionId);
  // Emit event for App.vue to open search in that pane
  emit("jump-to-match", match);
  dialogVisible.value = false;
}

/** Highlights the matched portion of a line. */
function highlightLine(line: string, start: number, length: number): string {
  const before = escapeHtml(line.substring(0, start));
  const matched = escapeHtml(line.substring(start, start + length));
  const after = escapeHtml(line.substring(start + length));
  return `${before}<mark class="match-highlight">${matched}</mark>${after}`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Truncates a line for display, keeping the match visible. */
function truncateLine(line: string, start: number, _length: number): { text: string; start: number } {
  const maxLen = 120;
  if (line.length <= maxLen) return { text: line, start };

  // Center the match in the visible window
  const windowStart = Math.max(0, start - 30);
  const windowEnd = Math.min(line.length, windowStart + maxLen);
  const text = (windowStart > 0 ? "..." : "") +
    line.substring(windowStart, windowEnd) +
    (windowEnd < line.length ? "..." : "");
  const newStart = start - windowStart + (windowStart > 0 ? 3 : 0);
  return { text, start: newStart };
}
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    :title="t('search.searchAllTabs')"
    width="640px"
    destroy-on-close
    class="cross-tab-search-dialog"
  >
    <!-- Search input row -->
    <div class="flex items-center gap-1.5 mb-4">
      <input
        ref="inputRef"
        v-model="crossSearch.searchTerm.value"
        :placeholder="t('search.placeholder')"
        class="flex-1 text-xs px-2 py-1.5 rounded outline-none"
        style="background: var(--tm-input-bg); color: var(--tm-text-primary); border: 1px solid var(--tm-input-border)"
        spellcheck="false"
        @keydown="onKeydown"
      />

      <!-- Option toggles -->
      <button
        class="toggle-btn"
        :class="{ active: crossSearch.searchOptions.value.caseSensitive }"
        :title="t('search.caseSensitive')"
        @click="toggleOption('caseSensitive')"
      >Aa</button>
      <button
        class="toggle-btn"
        :class="{ active: crossSearch.searchOptions.value.regex }"
        :title="t('search.regex')"
        @click="toggleOption('regex')"
      >.*</button>
      <button
        class="toggle-btn"
        :class="{ active: crossSearch.searchOptions.value.wholeWord }"
        :title="t('search.wholeWord')"
        @click="toggleOption('wholeWord')"
      >W</button>

      <el-button size="small" type="primary" @click="crossSearch.search()">
        {{ t("search.searchBtn") }}
      </el-button>
    </div>

    <!-- Searching indicator -->
    <div v-if="crossSearch.searching.value" class="text-center py-6">
      <span class="text-xs animate-pulse" style="color: var(--tm-text-muted)">
        {{ t("search.searching") }}
      </span>
    </div>

    <!-- Results -->
    <div
      v-else-if="crossSearch.results.value.length > 0"
      class="results-container"
    >
      <div
        v-for="result in crossSearch.results.value"
        :key="result.sessionId"
        class="mb-3"
      >
        <!-- Tab header -->
        <button
          class="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-white/5 transition-colors"
          @click="toggleCollapse(result.sessionId)"
        >
          <span
            class="transform transition-transform text-[10px]"
            :class="collapsedTabs.has(result.sessionId) ? '' : 'rotate-90'"
            style="color: var(--tm-text-muted)"
          >&#9654;</span>
          <span class="font-medium" style="color: var(--tm-text-primary)">
            {{ result.tabTitle }}
          </span>
          <span
            class="ml-auto text-[10px] px-1.5 py-0.5 rounded"
            :style="{
              color: result.totalMatches > 0 ? '#22c55e' : 'var(--tm-text-muted)',
              background: result.totalMatches > 0 ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
            }"
          >
            {{ result.totalMatches }} match{{ result.totalMatches !== 1 ? "es" : "" }}
          </span>
        </button>

        <!-- Match lines -->
        <div v-if="!collapsedTabs.has(result.sessionId) && result.matches.length > 0">
          <button
            v-for="(match, idx) in result.matches"
            :key="idx"
            class="w-full flex items-center gap-2 px-3 py-1 text-xs hover:bg-white/5 transition-colors cursor-pointer group"
            @click="jumpTo(match)"
          >
            <span class="shrink-0 w-10 text-right font-mono text-[10px]" style="color: var(--tm-text-muted)">
              {{ t("search.line") }} {{ match.lineNumber + 1 }}
            </span>
            <span
              class="flex-1 min-w-0 truncate font-mono text-[11px]"
              style="color: var(--tm-text-secondary)"
              v-html="highlightLine(
                truncateLine(match.lineContent, match.matchStart, match.matchLength).text,
                truncateLine(match.lineContent, match.matchStart, match.matchLength).start,
                match.matchLength,
              )"
            />
            <el-icon
              :size="12"
              class="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style="color: var(--tm-text-muted)"
            >
              <ArrowRight />
            </el-icon>
          </button>

          <!-- Truncation notice -->
          <div
            v-if="result.truncated"
            class="px-3 py-1 text-[10px]"
            style="color: var(--tm-text-muted)"
          >
            {{ t("search.moreMatches", { count: result.totalMatches - result.matches.length }) }}
          </div>
        </div>

        <!-- No matches -->
        <div
          v-if="!collapsedTabs.has(result.sessionId) && result.matches.length === 0"
          class="px-3 py-1 text-[10px] italic"
          style="color: var(--tm-text-muted)"
        >
          {{ t("search.noMatches") }}
        </div>
      </div>

      <!-- Total summary -->
      <div class="mt-3 pt-2 text-xs text-center" style="color: var(--tm-text-muted); border-top: 1px solid var(--tm-border)">
        {{ t("search.totalMatches", { count: crossSearch.totalMatchCount.value, tabs: crossSearch.matchedTabCount.value }) }}
      </div>
    </div>

    <!-- No results yet -->
    <div
      v-else-if="crossSearch.searchTerm.value && !crossSearch.searching.value"
      class="text-center py-6 text-xs"
      style="color: var(--tm-text-muted)"
    >
      {{ t("search.noMatches") }}
    </div>
  </el-dialog>
</template>

<style scoped>
.toggle-btn {
  font-size: 11px;
  font-family: monospace;
  padding: 2px 5px;
  border-radius: 3px;
  border: 1px solid transparent;
  color: var(--tm-text-muted);
  background: transparent;
  cursor: pointer;
  transition: all 0.15s;
}

.toggle-btn:hover {
  color: var(--tm-text-secondary);
  background: var(--tm-bg-hover);
}

.toggle-btn.active {
  color: #6366f1;
  border-color: #6366f1;
  background: rgba(99, 102, 241, 0.1);
}

.results-container {
  max-height: 400px;
  overflow-y: auto;
}

:deep(.match-highlight) {
  background: #FFD70060;
  color: inherit;
  border-radius: 2px;
  padding: 0 1px;
}

:deep(.cross-tab-search-dialog .el-dialog) {
  --el-dialog-bg-color: var(--tm-bg-elevated);
  --el-dialog-border-radius: 8px;
  --el-dialog-padding-primary: 16px;
  --el-text-color-primary: var(--tm-text-primary);
  --el-text-color-regular: var(--tm-text-primary);
  --el-bg-color: var(--tm-bg-elevated);
  --el-fill-color-blank: var(--tm-input-bg);
  --el-border-color: var(--tm-input-border);
  color: var(--tm-text-primary);
}
</style>
