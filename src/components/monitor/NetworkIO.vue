<script setup lang="ts">
import { computed } from "vue";
import type { NetworkMetrics, SystemMetrics } from "@/types/monitor";
import { formatBytesPerSec, formatBytes } from "@/utils/format";
import MetricChart from "./MetricChart.vue";

const props = defineProps<{
  network: NetworkMetrics;
  history: SystemMetrics[];
}>();

/** Aggregate rx rate history normalized to 0-100 for sparkline. */
const rxHistory = computed(() => {
  const maxRate = getMaxRate();
  return props.history.map((m) => {
    const totalRx = m.network.interfaces.reduce(
      (sum, i) => sum + i.rxBytesPerSec,
      0,
    );
    return maxRate > 0 ? Math.min((totalRx / maxRate) * 100, 100) : 0;
  });
});

const txHistory = computed(() => {
  const maxRate = getMaxRate();
  return props.history.map((m) => {
    const totalTx = m.network.interfaces.reduce(
      (sum, i) => sum + i.txBytesPerSec,
      0,
    );
    return maxRate > 0 ? Math.min((totalTx / maxRate) * 100, 100) : 0;
  });
});

function getMaxRate(): number {
  return Math.max(
    ...props.history.flatMap((m) =>
      m.network.interfaces.map((i) =>
        Math.max(i.rxBytesPerSec, i.txBytesPerSec),
      ),
    ),
    1,
  );
}
</script>

<template>
  <div class="gauge-card">
    <div class="gauge-header">
      <span class="gauge-label">Network</span>
    </div>
    <div class="net-list">
      <div
        v-for="iface in network.interfaces"
        :key="iface.name"
        class="net-item"
      >
        <div class="net-name">{{ iface.name }}</div>
        <div class="net-rates">
          <span class="net-rx">
            &darr; {{ formatBytesPerSec(iface.rxBytesPerSec) }}
          </span>
          <span class="net-tx">
            &uarr; {{ formatBytesPerSec(iface.txBytesPerSec) }}
          </span>
        </div>
        <div class="net-totals">
          Total: &darr; {{ formatBytes(iface.rxTotal) }} &middot; &uarr;
          {{ formatBytes(iface.txTotal) }}
        </div>
      </div>
      <div v-if="network.interfaces.length === 0" class="gauge-na">N/A</div>
    </div>
    <div v-if="history.length > 1" class="net-charts">
      <MetricChart :data="rxHistory" :height="20" color="#67c23a" fill />
      <MetricChart :data="txHistory" :height="20" color="#409eff" fill />
    </div>
  </div>
</template>
