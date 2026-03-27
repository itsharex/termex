<script setup lang="ts">
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import AppearanceTab from "./AppearanceTab.vue";
import TerminalTab from "./TerminalTab.vue";

const { t } = useI18n();

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: "update:visible", val: boolean): void;
}>();

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit("update:visible", val),
});

const activeTab = ref("appearance");

const tabs = computed(() => [
  { name: "appearance", label: t("settings.appearance") },
  { name: "terminal", label: t("settings.terminal") },
  { name: "keybindings", label: t("settings.keybindings") },
  { name: "security", label: t("settings.security") },
  { name: "ai", label: t("settings.aiConfig") },
  { name: "backup", label: t("settings.backup") },
  { name: "about", label: t("settings.about") },
]);
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    :title="t('settings.title')"
    width="680px"
    :close-on-click-modal="false"
    destroy-on-close
    class="settings-dialog"
  >
    <div class="flex gap-4 min-h-[400px]">
      <!-- Tabs navigation -->
      <nav class="w-40 shrink-0 space-y-0.5">
        <button
          v-for="tab in tabs"
          :key="tab.name"
          class="w-full text-left text-sm px-3 py-2 rounded transition-colors"
          :class="activeTab === tab.name
            ? 'bg-primary-500/15 text-primary-400'
            : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'"
          @click="activeTab = tab.name"
        >
          {{ tab.label }}
        </button>
      </nav>

      <!-- Tab content -->
      <div class="flex-1 min-w-0">
        <AppearanceTab v-if="activeTab === 'appearance'" />
        <TerminalTab v-else-if="activeTab === 'terminal'" />
        <div v-else class="text-gray-500 text-sm py-4">
          {{ tabs.find(t => t.name === activeTab)?.label }} — Coming soon
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<style scoped>
:deep(.settings-dialog .el-dialog) {
  --el-dialog-bg-color: #1a1a2e;
  --el-dialog-border-radius: 8px;
}
</style>
