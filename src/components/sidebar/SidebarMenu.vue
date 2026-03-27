<script setup lang="ts">
import { useI18n } from "vue-i18n";
import {
  Plus,
  Connection,
  Download,
  Upload,
  ArrowDown,
} from "@element-plus/icons-vue";

const { t } = useI18n();

const emit = defineEmits<{
  (e: "new-host"): void;
  (e: "quick-connect"): void;
  (e: "import"): void;
  (e: "export"): void;
}>();

function handleCommand(cmd: string) {
  switch (cmd) {
    case "new":
      emit("new-host");
      break;
    case "quick":
      emit("quick-connect");
      break;
    case "import":
      emit("import");
      break;
    case "export":
      emit("export");
      break;
  }
}
</script>

<template>
  <el-dropdown trigger="click" @command="handleCommand">
    <button
      class="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/10
             text-gray-300 hover:text-gray-100 text-xs font-medium transition-colors"
    >
      <span>Termex</span>
      <el-icon :size="10"><ArrowDown /></el-icon>
    </button>

    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item :icon="Plus" command="new">
          {{ t("sidebar.newConnection") }}
        </el-dropdown-item>
        <el-dropdown-item :icon="Connection" command="quick">
          {{ t("sidebar.quickConnect") }}
        </el-dropdown-item>
        <el-dropdown-item divided :icon="Download" command="import">
          {{ t("sidebar.importConfig") }}
        </el-dropdown-item>
        <el-dropdown-item :icon="Upload" command="export">
          {{ t("sidebar.exportConfig") }}
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>
