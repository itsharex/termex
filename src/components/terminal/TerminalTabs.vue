<script setup lang="ts">
import { Close } from "@element-plus/icons-vue";
import { useSessionStore } from "@/stores/sessionStore";

const sessionStore = useSessionStore();

function onTabClick(sessionId: string) {
  sessionStore.setActive(sessionId);
}

function onTabClose(e: MouseEvent, sessionId: string) {
  e.stopPropagation();
  sessionStore.disconnect(sessionId);
}
</script>

<template>
  <div class="h-9 bg-gray-950 border-b border-white/5 flex items-center shrink-0 overflow-x-auto">
    <!-- Tabs -->
    <button
      v-for="tab in sessionStore.tabs"
      :key="tab.id"
      class="group flex items-center gap-1.5 px-3 h-full text-xs border-r border-white/5
             transition-colors shrink-0 max-w-[180px]"
      :class="tab.active
        ? 'bg-gray-900 text-gray-200 border-b-2 border-b-primary-500'
        : 'bg-gray-950 text-gray-500 hover:text-gray-300 hover:bg-gray-900/50'"
      @click="onTabClick(tab.sessionId)"
    >
      <!-- Status dot -->
      <span
        class="w-1.5 h-1.5 rounded-full shrink-0"
        :class="{
          'bg-green-500': sessionStore.sessions.get(tab.sessionId)?.status === 'connected',
          'bg-yellow-500 animate-pulse': sessionStore.sessions.get(tab.sessionId)?.status === 'connecting',
          'bg-gray-500': sessionStore.sessions.get(tab.sessionId)?.status === 'disconnected',
          'bg-red-500': sessionStore.sessions.get(tab.sessionId)?.status === 'error',
        }"
      />

      <span class="truncate">{{ tab.title }}</span>

      <!-- Close button -->
      <el-icon
        :size="12"
        class="shrink-0 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity"
        @click.stop="onTabClose($event, tab.sessionId)"
      >
        <Close />
      </el-icon>
    </button>

    <!-- Empty fill -->
    <div class="flex-1" />
  </div>
</template>
