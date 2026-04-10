<script setup lang="ts">
import { computed } from "vue";
import type { CpuMetrics, LoadAverage, SystemMetrics } from "@/types/monitor";
import MetricChart from "./MetricChart.vue";

const props = defineProps<{
  metrics: CpuMetrics;
  load: LoadAverage;
  history: SystemMetrics[];
}>();

const cpuHistory = computed(() =>
  props.history.map((m) => m.cpu.usagePercent),
);

const statusColor = computed(() => {
  const v = props.metrics.usagePercent;
  if (v < 60) return "var(--el-color-success)";
  if (v < 85) return "var(--el-color-warning)";
  return "var(--el-color-danger)";
});
</script>

<template>
  <div class="gauge-card">
    <div class="gauge-header">
      <span class="gauge-label">CPU</span>
      <span class="gauge-value" :style="{ color: statusColor }">
        {{ metrics.usagePercent.toFixed(1) }}%
      </span>
    </div>
    <el-progress
      :percentage="metrics.usagePercent"
      :stroke-width="6"
      :show-text="false"
      :color="statusColor"
    />
    <div class="gauge-details">
      <span>user: {{ metrics.userPercent.toFixed(1) }}%</span>
      <span>sys: {{ metrics.systemPercent.toFixed(1) }}%</span>
      <span v-if="metrics.iowaitPercent > 0">
        iowait: {{ metrics.iowaitPercent.toFixed(1) }}%
      </span>
    </div>
    <MetricChart :data="cpuHistory" :height="24" fill />
    <div class="gauge-footer">
      Load: {{ load.one.toFixed(2) }} / {{ load.five.toFixed(2) }} /
      {{ load.fifteen.toFixed(2) }}
    </div>
  </div>
</template>
