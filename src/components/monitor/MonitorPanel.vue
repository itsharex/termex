<script setup lang="ts">
import { ref, computed } from "vue";
import { useMonitor } from "@/composables/useMonitor";
import { useSettingsStore } from "@/stores/settingsStore";
import { formatUptime } from "@/utils/format";
import CpuGauge from "./CpuGauge.vue";
import MemoryGauge from "./MemoryGauge.vue";
import DiskUsage from "./DiskUsage.vue";
import NetworkIO from "./NetworkIO.vue";
import ProcessList from "./ProcessList.vue";

const props = defineProps<{
  sessionId: string;
}>();

const sessionIdRef = computed(() => props.sessionId);
const settings = useSettingsStore();
const { isCollecting, latest, history, osInfo, start, stop } =
  useMonitor(sessionIdRef);

const processSort = ref<"cpu" | "mem">("cpu");

const uptimeText = computed(() => {
  if (!latest.value) return "";
  return formatUptime(latest.value.uptimeSeconds);
});

async function handleToggle() {
  if (isCollecting.value) {
    await stop();
  } else {
    await start();
  }
}
</script>

<template>
  <div class="monitor-panel">
    <template v-if="latest">
      <!-- Info bar: OS info + uptime + toggle button -->
      <div class="monitor-info-bar">
        <span v-if="osInfo" class="os-info">
          {{ osInfo.kernel }}
          <template v-if="osInfo.distro"> &middot; {{ osInfo.distro }}</template>
        </span>
        <div class="monitor-info-right">
          <span class="os-info">Up: {{ uptimeText }}</span>
          <span v-if="!isCollecting" class="monitor-paused-badge">PAUSED</span>
          <button
            class="monitor-toggle-btn"
            :class="isCollecting ? 'monitor-toggle-stop' : 'monitor-toggle-start'"
            :title="isCollecting ? 'Stop Monitor' : 'Resume Monitor'"
            @click="handleToggle"
          >
            <!-- Stop icon -->
            <svg v-if="isCollecting" width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <rect x="1" y="1" width="8" height="8" rx="1" />
            </svg>
            <!-- Play icon -->
            <svg v-else width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <polygon points="2,1 9,5 2,9" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Metric cards grid -->
      <div class="monitor-body" :class="{ 'is-paused': !isCollecting }">
        <div class="monitor-grid">
          <CpuGauge
            v-if="settings.monitorShowCpu"
            :metrics="latest.cpu"
            :load="latest.load"
            :history="history"
          />
          <MemoryGauge
            v-if="settings.monitorShowMemory"
            :metrics="latest.memory"
            :history="history"
          />
          <DiskUsage
            v-if="settings.monitorShowDisk"
            :disks="latest.disk"
          />
          <NetworkIO
            v-if="settings.monitorShowNetwork"
            :network="latest.network"
            :history="history"
          />
        </div>

        <!-- Process list -->
        <ProcessList
          v-if="settings.monitorShowProcesses"
          :processes="
            processSort === 'cpu'
              ? latest.topCpuProcesses
              : latest.topMemProcesses
          "
          :sort="processSort"
          @update:sort="processSort = $event"
        />
      </div>
    </template>

    <div v-else class="monitor-loading">
      <div class="monitor-loading-inner">
        <div class="monitor-spinner" />
        <span>Collecting metrics...</span>
      </div>
    </div>
  </div>
</template>
