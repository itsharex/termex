import { computed, type Ref } from "vue";
import { useMonitorStore } from "@/stores/monitorStore";
import { useSettingsStore } from "@/stores/settingsStore";
import type { SystemMetrics, OsInfo } from "@/types/monitor";
import { formatUptime } from "@/utils/format";

/**
 * Component-level monitor composable.
 *
 * Provides reactive metrics data and lifecycle management.
 * Unmounting the component does NOT stop collection (collection is independent of UI).
 */
export function useMonitor(sessionId: Ref<string | null>) {
  const monitorStore = useMonitorStore();
  const settingsStore = useSettingsStore();

  const isCollecting = computed(() =>
    monitorStore.isCollecting(sessionId.value ?? ""),
  );

  const latest = computed<SystemMetrics | undefined>(() =>
    monitorStore.getLatest(sessionId.value ?? ""),
  );

  const history = computed<SystemMetrics[]>(() =>
    monitorStore.getHistory(sessionId.value ?? ""),
  );

  const osInfo = computed<OsInfo | undefined>(() =>
    monitorStore.getOsInfo(sessionId.value ?? ""),
  );

  /** Health status based on CPU and disk thresholds. */
  const healthStatus = computed<
    "healthy" | "warning" | "critical" | "offline"
  >(() => {
    const metrics = latest.value;
    if (!metrics) return "offline";

    const cpuPct = metrics.cpu.usagePercent;
    const maxDiskPct = Math.max(
      ...metrics.disk.map((d) => d.usagePercent),
      0,
    );

    if (cpuPct >= 95 || maxDiskPct >= 95) return "critical";
    if (cpuPct >= 80 || maxDiskPct >= 90) return "warning";
    return "healthy";
  });

  /** Health status color. */
  const healthColor = computed(() => {
    switch (healthStatus.value) {
      case "healthy":
        return "#67c23a";
      case "warning":
        return "#e6a23c";
      case "critical":
        return "#f56c6c";
      default:
        return "#909399";
    }
  });

  /** Tooltip text for the health indicator. */
  const healthTooltip = computed(() => {
    const m = latest.value;
    if (!m) return "";
    const uptime = formatUptime(m.uptimeSeconds);
    return `CPU: ${m.cpu.usagePercent.toFixed(1)}% | MEM: ${m.memory.usagePercent.toFixed(1)}% | Up: ${uptime}`;
  });

  /** Start collection. */
  async function start() {
    const sid = sessionId.value;
    if (!sid) return;
    await monitorStore.start(sid, settingsStore.monitorInterval);
  }

  /** Stop collection. */
  async function stop() {
    const sid = sessionId.value;
    if (!sid) return;
    await monitorStore.stop(sid);
  }

  /** Toggle collection on/off. */
  async function toggle() {
    if (isCollecting.value) {
      await stop();
    } else {
      await start();
    }
  }

  return {
    isCollecting,
    latest,
    history,
    osInfo,
    healthStatus,
    healthColor,
    healthTooltip,
    start,
    stop,
    toggle,
  };
}
