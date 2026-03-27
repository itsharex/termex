<script setup lang="ts">
import { ref } from "vue";
import { Search, Close } from "@element-plus/icons-vue";
import { useServerStore } from "@/stores/serverStore";
import SidebarMenu from "./SidebarMenu.vue";
import ServerTree from "./ServerTree.vue";

const emit = defineEmits<{
  (e: "new-host"): void;
}>();

const serverStore = useServerStore();
const searchActive = ref(false);

function toggleSearch() {
  searchActive.value = !searchActive.value;
  if (!searchActive.value) {
    serverStore.searchQuery = "";
  }
}

function onSearchBlur() {
  if (!serverStore.searchQuery) {
    searchActive.value = false;
  }
}
</script>

<template>
  <aside class="w-60 bg-gray-950 border-r border-white/5 flex flex-col shrink-0">
    <!-- Header -->
    <div class="h-9 flex items-center px-2 gap-1 border-b border-white/5 shrink-0">
      <template v-if="!searchActive">
        <SidebarMenu @new-host="emit('new-host')" />
        <div class="flex-1" />
        <button
          class="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors"
          @click="toggleSearch"
        >
          <el-icon :size="14"><Search /></el-icon>
        </button>
      </template>

      <template v-else>
        <input
          v-model="serverStore.searchQuery"
          class="flex-1 bg-gray-800 text-gray-200 text-xs rounded px-2 py-1 outline-none
                 border border-gray-700 focus:border-primary-500 placeholder-gray-500"
          :placeholder="$t('sidebar.search')"
          autofocus
          @blur="onSearchBlur"
          @keydown.escape="toggleSearch"
        />
        <button
          class="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors"
          @click="toggleSearch"
        >
          <el-icon :size="14"><Close /></el-icon>
        </button>
      </template>
    </div>

    <!-- Server tree -->
    <div class="flex-1 overflow-y-auto overflow-x-hidden py-1">
      <ServerTree />
    </div>
  </aside>
</template>
