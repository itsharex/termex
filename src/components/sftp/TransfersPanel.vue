<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useSftpStore } from "@/stores/sftpStore";
import { Upload, Download, Close } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";

const { t } = useI18n();
const sftpStore = useSftpStore();

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function getStatusText(item: any): string {
  if (item.done) return t("sftp.completed");
  if (item.total === 0) return t("sftp.preparing");
  return `${Math.round((item.transferred / item.total) * 100)}%`;
}

function handleClear() {
  // Remove all completed transfers
  sftpStore.transfers = sftpStore.transfers.filter((t) => !t.done);
  ElMessage.success(t("sftp.cleared"));
}

function handleRemoveTransfer(id: string) {
  const idx = sftpStore.transfers.findIndex((t) => t.id === id);
  if (idx !== -1) {
    sftpStore.transfers.splice(idx, 1);
  }
}
</script>

<template>
  <div class="flex flex-col h-full min-w-0 overflow-auto">
    <!-- Header -->
    <div v-if="sftpStore.transfers.length > 0" class="flex items-center justify-between px-3 py-2 shrink-0 border-b" style="border-color: var(--tm-border)">
      <span class="text-xs font-medium" style="color: var(--tm-text-secondary)">
        {{ sftpStore.transfers.length }} {{ t("sftp.transfers") }}
      </span>
      <button
        class="text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors"
        style="color: var(--tm-text-secondary)"
        @click="handleClear"
      >
        {{ t("sftp.clearCompleted") }}
      </button>
    </div>

    <!-- Transfers list -->
    <div v-if="sftpStore.transfers.length > 0" class="flex-1 overflow-auto">
      <div
        v-for="item in sftpStore.transfers"
        :key="item.id"
        :class="[
          'px-3 py-3 border-b transition-opacity',
          item.done ? 'opacity-60' : '',
        ]"
        style="border-color: var(--tm-border)"
      >
        <!-- File info -->
        <div class="flex items-center gap-2 mb-2">
          <el-icon :size="14">
            <Upload v-if="item.direction === 'upload'" />
            <Download v-else />
          </el-icon>
          <div class="flex-1 min-w-0">
            <div class="text-xs font-medium truncate" style="color: var(--tm-text-primary)">
              {{ item.remotePath.split("/").pop() }}
            </div>
            <div class="text-[10px] truncate mt-0.5" style="color: var(--tm-text-muted)">
              {{ item.direction === "upload" ? item.localPath : item.localPath }}
            </div>
          </div>
          <div class="text-right flex items-center gap-2">
            <div>
              <div class="text-xs font-medium" :style="{ color: item.done ? '#10b981' : 'var(--tm-text-secondary)' }">
                {{ getStatusText(item) }}
              </div>
              <div class="text-[10px]" style="color: var(--tm-text-muted)">
                {{ formatBytes(item.transferred) }}
                <span v-if="item.total > 0"> / {{ formatBytes(item.total) }}</span>
              </div>
            </div>
            <!-- Delete button -->
            <button
              class="text-xs p-1 rounded hover:bg-white/10 transition-colors flex-shrink-0"
              :title="t('sftp.remove')"
              @click="handleRemoveTransfer(item.id)"
            >
              <el-icon :size="12" style="color: var(--tm-text-muted)">
                <Close />
              </el-icon>
            </button>
          </div>
        </div>

        <!-- Progress bar -->
        <el-progress
          :percentage="item.total > 0 ? Math.round((item.transferred / item.total) * 100) : 0"
          :status="item.done ? 'success' : undefined"
          :stroke-width="3"
          :show-text="false"
        />
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="flex-1 flex items-center justify-center" style="color: var(--tm-text-muted)">
      <span class="text-sm">{{ t("sftp.noTransfers") }}</span>
    </div>
  </div>
</template>
