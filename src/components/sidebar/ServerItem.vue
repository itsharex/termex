<script setup lang="ts">
import { Monitor } from "@element-plus/icons-vue";
import type { Server } from "@/types/server";

const props = defineProps<{
  server: Server;
}>();

const emit = defineEmits<{
  (e: "connect", server: Server): void;
}>();

function handleDblClick() {
  emit("connect", props.server);
}
</script>

<template>
  <el-tooltip
    :content="`${server.host}:${server.port}`"
    placement="right"
    :show-after="500"
    :hide-after="0"
    effect="dark"
  >
    <button
      class="w-full flex items-center gap-1.5 px-2 py-1.5 hover:bg-white/5
             text-gray-300 hover:text-gray-100 transition-colors rounded-sm"
      @dblclick="handleDblClick"
    >
      <el-icon :size="12" class="text-gray-500 shrink-0"><Monitor /></el-icon>
      <span class="truncate">{{ server.name }}</span>
    </button>
  </el-tooltip>
</template>
