<script setup lang="ts">
import { useSettingsStore } from "@/stores/settingsStore";

const settings = useSettingsStore();

const intervalOptions = [
  { label: "1s", value: 1000 },
  { label: "3s", value: 3000 },
  { label: "5s", value: 5000 },
  { label: "10s", value: 10000 },
];
</script>

<template>
  <div class="space-y-6">
    <h3
      class="text-base font-semibold"
      style="color: var(--tm-text-primary)"
    >
      Server Monitor
    </h3>

    <!-- Collection interval -->
    <div class="space-y-2">
      <label class="text-xs" style="color: var(--tm-text-secondary)">
        Collection Interval
      </label>
      <el-radio-group v-model="settings.monitorInterval" size="small">
        <el-radio-button
          v-for="opt in intervalOptions"
          :key="opt.value"
          :value="opt.value"
        >
          {{ opt.label }}
        </el-radio-button>
      </el-radio-group>
    </div>

    <!-- Auto-start -->
    <div class="flex items-center justify-between">
      <label class="text-xs" style="color: var(--tm-text-secondary)">
        Auto-start monitoring on connect
      </label>
      <el-switch v-model="settings.monitorAutoStart" />
    </div>

    <!-- Visible panels -->
    <div class="space-y-2">
      <label class="text-xs" style="color: var(--tm-text-secondary)">
        Visible Panels
      </label>
      <div class="flex flex-wrap gap-4">
        <el-checkbox v-model="settings.monitorShowCpu">CPU</el-checkbox>
        <el-checkbox v-model="settings.monitorShowMemory">Memory</el-checkbox>
        <el-checkbox v-model="settings.monitorShowDisk">Disk</el-checkbox>
        <el-checkbox v-model="settings.monitorShowNetwork">
          Network
        </el-checkbox>
        <el-checkbox v-model="settings.monitorShowProcesses">
          Processes
        </el-checkbox>
      </div>
    </div>
  </div>
</template>
