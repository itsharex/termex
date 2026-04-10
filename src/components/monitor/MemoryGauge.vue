<script setup lang="ts">
import { computed } from "vue";
import type { MemoryMetrics, SystemMetrics } from "@/types/monitor";
import { formatBytes } from "@/utils/format";
import MetricChart from "./MetricChart.vue";

const props = defineProps<{
  metrics: MemoryMetrics;
  history: SystemMetrics[];
}>();

const memHistory = computed(() =>
  props.history.map((m) => m.memory.usagePercent),
);

const statusColor = computed(() => {
  const v = props.metrics.usagePercent;
  if (v < 70) return "var(--el-color-success)";
  if (v < 90) return "var(--el-color-warning)";
  return "var(--el-color-danger)";
});

const swapUsagePercent = computed(() => {
  if (props.metrics.swapTotal === 0) return 0;
  return (props.metrics.swapUsed / props.metrics.swapTotal) * 100;
});
</script>

<template>
  <div class="gauge-card">
    <div class="gauge-header">
      <span class="gauge-label">Memory</span>
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
      <span>
        {{ formatBytes(metrics.usedBytes) }} /
        {{ formatBytes(metrics.totalBytes) }}
      </span>
    </div>
    <MetricChart :data="memHistory" :height="24" fill />
    <div v-if="metrics.swapTotal > 0" class="gauge-footer">
      Swap: {{ formatBytes(metrics.swapUsed) }} /
      {{ formatBytes(metrics.swapTotal) }}
      ({{ swapUsagePercent.toFixed(0) }}%)
    </div>
  </div>
</template>
