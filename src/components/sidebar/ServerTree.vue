<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useServerStore } from "@/stores/serverStore";
import { useSessionStore } from "@/stores/sessionStore";
import type { Server } from "@/types/server";
import ServerGroup from "./ServerGroup.vue";
import ServerItem from "./ServerItem.vue";

const { t } = useI18n();
const serverStore = useServerStore();
const sessionStore = useSessionStore();

function handleConnect(server: Server) {
  sessionStore.connect(server.id, server.name, 80, 24);
}
</script>

<template>
  <div class="text-xs">
    <!-- Empty state -->
    <div
      v-if="serverStore.groups.length === 0 && serverStore.servers.length === 0"
      class="px-4 py-8 text-center text-gray-500"
    >
      <p class="mb-1">{{ t("sidebar.servers") }}</p>
      <p class="text-[10px] text-gray-600">
        {{ t("sidebar.newConnection") }}
      </p>
    </div>

    <template v-else>
      <!-- Groups with their servers -->
      <ServerGroup
        v-for="group in serverStore.groupTree"
        :key="group.id"
        :group="group"
        :servers="group.servers"
        @connect="handleConnect"
      />

      <!-- Ungrouped servers -->
      <ServerItem
        v-for="server in serverStore.filteredServers.filter(s => !s.groupId)"
        :key="server.id"
        :server="server"
        @connect="handleConnect"
      />
    </template>
  </div>
</template>
