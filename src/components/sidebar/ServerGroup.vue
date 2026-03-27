<script setup lang="ts">
import { ref } from "vue";
import { ArrowRight } from "@element-plus/icons-vue";
import type { Server, ServerGroup } from "@/types/server";
import ServerItem from "./ServerItem.vue";

defineProps<{
  group: ServerGroup;
  servers: Server[];
}>();

const emit = defineEmits<{
  (e: "connect", server: Server): void;
}>();

const expanded = ref(true);

function toggle() {
  expanded.value = !expanded.value;
}
</script>

<template>
  <div>
    <!-- Group header -->
    <button
      class="w-full flex items-center gap-1.5 px-2 py-1.5 hover:bg-white/5
             text-gray-400 hover:text-gray-200 transition-colors"
      @click="toggle"
    >
      <el-icon
        :size="10"
        class="transition-transform duration-200"
        :class="{ 'rotate-90': expanded }"
      >
        <ArrowRight />
      </el-icon>
      <span
        class="w-2 h-2 rounded-full shrink-0"
        :style="{ backgroundColor: group.color }"
      />
      <span class="truncate font-medium">{{ group.name }}</span>
      <span class="ml-auto text-gray-600 text-[10px]">{{ servers.length }}</span>
    </button>

    <!-- Servers in group -->
    <div v-show="expanded" class="pl-3">
      <ServerItem
        v-for="server in servers"
        :key="server.id"
        :server="server"
        @connect="emit('connect', $event)"
      />
    </div>
  </div>
</template>
