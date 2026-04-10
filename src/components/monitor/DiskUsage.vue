<script setup lang="ts">
import type { DiskMetrics } from "@/types/monitor";
import { formatBytes } from "@/utils/format";

defineProps<{
  disks: DiskMetrics[];
}>();

function diskColor(percent: number): string {
  if (percent < 80) return "var(--el-color-success)";
  if (percent < 95) return "var(--el-color-warning)";
  return "var(--el-color-danger)";
}
</script>

<template>
  <div class="gauge-card">
    <div class="gauge-header">
      <span class="gauge-label">Disk</span>
    </div>
    <div class="disk-list">
      <div v-for="disk in disks" :key="disk.mountPoint" class="disk-item">
        <div class="disk-mount">
          <span class="disk-path">{{ disk.mountPoint }}</span>
          <span
            class="disk-size"
            :style="{ color: diskColor(disk.usagePercent) }"
          >
            {{ disk.usagePercent.toFixed(0) }}%
          </span>
        </div>
        <el-progress
          :percentage="disk.usagePercent"
          :stroke-width="6"
          :show-text="false"
          :color="diskColor(disk.usagePercent)"
        />
        <div class="disk-detail">
          {{ formatBytes(disk.usedBytes) }} / {{ formatBytes(disk.totalBytes) }}
          &middot; {{ formatBytes(disk.availableBytes) }} free
        </div>
      </div>
      <div v-if="disks.length === 0" class="gauge-na">N/A</div>
    </div>
  </div>
</template>
