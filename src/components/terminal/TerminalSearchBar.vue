<script setup lang="ts">
import { ref, nextTick, watch } from "vue";
import { useI18n } from "vue-i18n";
import { Close, ArrowUp, ArrowDown } from "@element-plus/icons-vue";
import type { SearchOptions } from "@/types/search";

const { t } = useI18n();

const props = defineProps<{
  visible: boolean;
  searchTerm: string;
  searchOptions: SearchOptions;
  matchIndex: number;
  matchCount: number;
}>();

const emit = defineEmits<{
  (e: "update:searchTerm", val: string): void;
  (e: "update:searchOptions", val: SearchOptions): void;
  (e: "find-next"): void;
  (e: "find-previous"): void;
  (e: "close"): void;
}>();

const inputRef = ref<HTMLInputElement>();

// Focus input when search bar becomes visible
watch(
  () => props.visible,
  async (visible) => {
    if (visible) {
      await nextTick();
      inputRef.value?.focus();
      inputRef.value?.select();
    }
  },
);

function onInput(e: Event) {
  emit("update:searchTerm", (e.target as HTMLInputElement).value);
}

function toggleOption(key: keyof SearchOptions) {
  emit("update:searchOptions", {
    ...props.searchOptions,
    [key]: !props.searchOptions[key],
  });
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") {
    e.preventDefault();
    emit("close");
    return;
  }
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    emit("find-next");
    return;
  }
  if (e.key === "Enter" && e.shiftKey) {
    e.preventDefault();
    emit("find-previous");
    return;
  }
}

/** Match count display text. */
function matchText(): string {
  if (!props.searchTerm) return "";
  if (props.matchCount === 0) return t("search.noResults");
  if (props.matchIndex < 0) return `${props.matchCount}+`;
  return t("search.matchCount", {
    current: props.matchIndex + 1,
    total: props.matchCount,
  });
}

defineExpose({ focus: () => { inputRef.value?.focus(); inputRef.value?.select(); } });
</script>

<template>
  <div
    v-show="visible"
    class="search-bar"
    @mousedown.stop
  >
    <!-- Row 1: search input full width -->
    <input
      ref="inputRef"
      :value="searchTerm"
      :placeholder="t('search.placeholder')"
      class="search-input w-full"
      spellcheck="false"
      @input="onInput"
      @keydown="onKeydown"
    />

    <!-- Row 2: match count (left) | toggles + nav (right) -->
    <div class="flex items-center justify-between mt-1">
      <span class="match-count">{{ matchText() }}</span>

      <div class="flex items-center">
        <div class="flex items-center gap-0.5">
          <button
            class="search-btn"
            :class="{ active: searchOptions.caseSensitive }"
            :title="t('search.caseSensitive')"
            @click="toggleOption('caseSensitive')"
          >Aa</button>
          <button
            class="search-btn"
            :class="{ active: searchOptions.regex }"
            :title="t('search.regex')"
            @click="toggleOption('regex')"
          >.*</button>
          <button
            class="search-btn"
            :class="{ active: searchOptions.wholeWord }"
            :title="t('search.wholeWord')"
            @click="toggleOption('wholeWord')"
          >W</button>
        </div>

        <div class="w-px h-3.5 mx-1.5" style="background: var(--tm-border)" />

        <div class="flex items-center gap-0.5">
          <button class="search-btn" :title="t('search.previousMatch')" @click="$emit('find-previous')">
            <el-icon :size="12"><ArrowUp /></el-icon>
          </button>
          <button class="search-btn" :title="t('search.nextMatch')" @click="$emit('find-next')">
            <el-icon :size="12"><ArrowDown /></el-icon>
          </button>
          <button class="search-btn" :title="t('search.close')" @click="$emit('close')">
            <el-icon :size="12"><Close /></el-icon>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-bar {
  position: absolute;
  top: 8px;
  right: 16px;
  z-index: 10;
  padding: 6px 8px;
  border-radius: 6px;
  background: var(--tm-bg-elevated);
  border: 1px solid var(--tm-border);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(8px);
  min-width: 260px;
}

.search-input {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  padding: 3px 6px;
  border-radius: 4px;
  border: 1px solid var(--tm-input-border);
  background: var(--tm-input-bg);
  color: var(--tm-text-primary);
  outline: none;
}

.search-input:focus {
  border-color: #6366f1;
}

.search-input::placeholder {
  color: var(--tm-text-muted);
}

.search-btn {
  font-size: 11px;
  font-family: monospace;
  width: 24px;
  height: 22px;
  border-radius: 3px;
  border: 1px solid transparent;
  color: var(--tm-text-muted);
  background: transparent;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-btn:hover {
  color: var(--tm-text-secondary);
  background: var(--tm-bg-hover);
}

.search-btn.active {
  color: #6366f1;
  border-color: #6366f1;
  background: rgba(99, 102, 241, 0.1);
}

.match-count {
  font-size: 11px;
  color: var(--tm-text-muted);
  min-width: 60px;
}
</style>
