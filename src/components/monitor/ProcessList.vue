<script setup lang="ts">
import type { ProcessInfo } from "@/types/monitor";

defineProps<{
  processes: ProcessInfo[];
  sort: "cpu" | "mem";
}>();

const emit = defineEmits<{
  (e: "update:sort", value: "cpu" | "mem"): void;
}>();
</script>

<template>
  <div class="process-list">
    <div class="process-header">
      <span class="process-title">Top Processes</span>
      <div class="process-tabs">
        <el-button
          :type="sort === 'cpu' ? 'primary' : 'default'"
          size="small"
          text
          @click="emit('update:sort', 'cpu')"
        >
          CPU
        </el-button>
        <el-button
          :type="sort === 'mem' ? 'primary' : 'default'"
          size="small"
          text
          @click="emit('update:sort', 'mem')"
        >
          MEM
        </el-button>
      </div>
    </div>
    <el-table :data="processes" size="small" stripe>
      <el-table-column prop="pid" label="PID" width="75" />
      <el-table-column prop="user" label="USER" width="80" />
      <el-table-column prop="cpuPercent" label="CPU%" width="65">
        <template #default="{ row }">
          <span :class="{ 'text-red-500': row.cpuPercent > 50 }">
            {{ row.cpuPercent.toFixed(1) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="memPercent" label="MEM%" width="65">
        <template #default="{ row }">
          {{ row.memPercent.toFixed(1) }}
        </template>
      </el-table-column>
      <el-table-column
        prop="command"
        label="COMMAND"
        min-width="150"
        show-overflow-tooltip
      />
    </el-table>
  </div>
</template>
