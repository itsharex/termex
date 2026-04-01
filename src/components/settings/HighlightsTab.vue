<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { ElMessage, ElMessageBox } from "element-plus";
import { Delete } from "@element-plus/icons-vue";
import { useSettingsStore } from "@/stores/settingsStore";
import type { KeywordRule } from "@/types/search";

const { t } = useI18n();
const settingsStore = useSettingsStore();

const rules = computed(() => settingsStore.keywordRules);

function addRule() {
  const rule: KeywordRule = {
    id: crypto.randomUUID(),
    pattern: "",
    isRegex: false,
    caseSensitive: false,
    foregroundColor: "",
    backgroundColor: "#6366F140",
    enabled: true,
  };
  settingsStore.addKeywordRule(rule);
}

function loadPresets() {
  const added = settingsStore.loadPresetKeywordRules();
  if (added.length > 0) {
    ElMessage.success(t("highlights.presetsLoaded"));
  }
}

function updateField(id: string, field: keyof KeywordRule, value: unknown) {
  // Validate regex if needed
  if (field === "pattern" || field === "isRegex") {
    const rule = rules.value.find((r) => r.id === id);
    if (rule) {
      const pattern = field === "pattern" ? (value as string) : rule.pattern;
      const isRegex = field === "isRegex" ? (value as boolean) : rule.isRegex;
      if (isRegex && pattern) {
        try {
          new RegExp(pattern);
        } catch {
          // Allow saving but show warning
          ElMessage.warning(t("highlights.invalidRegex"));
        }
      }
    }
  }
  settingsStore.updateKeywordRule(id, { [field]: value });
}

async function deleteRule(id: string) {
  try {
    await ElMessageBox.confirm(t("highlights.deleteConfirm"), {
      confirmButtonText: "OK",
      cancelButtonText: "Cancel",
      type: "warning",
    });
    settingsStore.removeKeywordRule(id);
  } catch {
    // cancelled
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-medium" style="color: var(--tm-text-primary)">
        {{ t("highlights.title") }}
      </h3>
      <div class="flex gap-2">
        <button
          class="text-xs px-2 py-1 rounded transition-colors hover:bg-white/10"
          style="color: var(--tm-text-secondary); border: 1px solid var(--tm-border)"
          @click="loadPresets"
        >
          {{ t("highlights.loadPresets") }}
        </button>
        <button
          class="text-xs px-2 py-1 rounded bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 transition-colors"
          @click="addRule"
        >
          + {{ t("highlights.addRule") }}
        </button>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-if="rules.length === 0"
      class="text-xs py-8 text-center"
      style="color: var(--tm-text-muted)"
    >
      {{ t("highlights.noRules") }}
    </div>

    <!-- Rules list -->
    <div v-else class="space-y-1.5">
      <!-- Header -->
      <div class="grid grid-cols-[1fr_48px_48px_64px_64px_36px_28px] gap-1 px-1 text-[10px]"
           style="color: var(--tm-text-muted)">
        <span>{{ t("highlights.pattern") }}</span>
        <span class="text-center">{{ t("highlights.regex") }}</span>
        <span class="text-center">{{ t("highlights.caseSensitive") }}</span>
        <span class="text-center">{{ t("highlights.bgColor") }}</span>
        <span class="text-center">{{ t("highlights.fgColor") }}</span>
        <span class="text-center">{{ t("highlights.enabled") }}</span>
        <span />
      </div>

      <!-- Rule rows -->
      <div
        v-for="rule in rules"
        :key="rule.id"
        class="grid grid-cols-[1fr_48px_48px_64px_64px_36px_28px] gap-1 items-center px-1 py-1 rounded hover:bg-white/5"
      >
        <!-- Pattern -->
        <input
          :value="rule.pattern"
          :placeholder="t('highlights.patternRequired')"
          class="text-xs px-1.5 py-1 rounded outline-none w-full"
          style="background: var(--tm-input-bg); color: var(--tm-text-primary); border: 1px solid var(--tm-input-border)"
          @input="updateField(rule.id, 'pattern', ($event.target as HTMLInputElement).value)"
        />

        <!-- Regex toggle -->
        <div class="flex justify-center">
          <el-switch
            :model-value="rule.isRegex"
            size="small"
            @update:model-value="updateField(rule.id, 'isRegex', $event)"
          />
        </div>

        <!-- Case sensitive toggle -->
        <div class="flex justify-center">
          <el-switch
            :model-value="rule.caseSensitive"
            size="small"
            @update:model-value="updateField(rule.id, 'caseSensitive', $event)"
          />
        </div>

        <!-- BG Color -->
        <div class="flex justify-center">
          <el-color-picker
            :model-value="rule.backgroundColor"
            size="small"
            show-alpha
            @update:model-value="updateField(rule.id, 'backgroundColor', $event ?? '')"
          />
        </div>

        <!-- FG Color -->
        <div class="flex justify-center">
          <el-color-picker
            :model-value="rule.foregroundColor || undefined"
            size="small"
            show-alpha
            @update:model-value="updateField(rule.id, 'foregroundColor', $event ?? '')"
          />
        </div>

        <!-- Enabled toggle -->
        <div class="flex justify-center">
          <el-switch
            :model-value="rule.enabled"
            size="small"
            @update:model-value="updateField(rule.id, 'enabled', $event)"
          />
        </div>

        <!-- Delete -->
        <button
          class="flex justify-center items-center text-gray-500 hover:text-red-400 transition-colors"
          @click="deleteRule(rule.id)"
        >
          <el-icon :size="14"><Delete /></el-icon>
        </button>
      </div>
    </div>
  </div>
</template>
