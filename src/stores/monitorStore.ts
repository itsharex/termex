import { defineStore } from "pinia";
import { ref, reactive } from "vue";
import type { SystemMetrics, OsInfo } from "@/types/monitor";
import { tauriInvoke, tauriListen } from "@/utils/tauri";
import type { UnlistenFn } from "@tauri-apps/api/event";

export const useMonitorStore = defineStore("monitor", () => {
  /** Latest metrics per session. */
  const latestMetrics = reactive<Record<string, SystemMetrics>>({});

  /** Metrics history per session (for charts). */
  const metricsHistory = reactive<Record<string, SystemMetrics[]>>({});

  /** OS info per session. */
  const osInfoMap = reactive<Record<string, OsInfo>>({});

  /** Sessions currently being collected. */
  const collectingSessions = ref<Set<string>>(new Set());

  /** Event listener cleanup functions. */
  const unlistenMap = new Map<string, UnlistenFn[]>();

  /** Max history points kept on frontend side. */
  const MAX_HISTORY = 100;

  /** Start monitoring a session. */
  async function start(sessionId: string, intervalMs?: number) {
    await tauriInvoke("monitor_start", {
      sessionId,
      intervalMs: intervalMs ?? 3000,
    });

    collectingSessions.value.add(sessionId);

    const unlistenMetrics = await tauriListen<SystemMetrics>(
      `monitor://metrics/${sessionId}`,
      (metrics) => {
        latestMetrics[sessionId] = metrics;

        if (!metricsHistory[sessionId]) {
          metricsHistory[sessionId] = [];
        }
        metricsHistory[sessionId].push(metrics);
        if (metricsHistory[sessionId].length > MAX_HISTORY) {
          metricsHistory[sessionId].shift();
        }
      },
    );

    const unlistenOs = await tauriListen<OsInfo>(
      `monitor://os-info/${sessionId}`,
      (info) => {
        osInfoMap[sessionId] = info;
      },
    );

    const unlistenError = await tauriListen<string>(
      `monitor://error/${sessionId}`,
      (err) => {
        console.warn(`[monitor] collection error for ${sessionId}:`, err);
      },
    );

    unlistenMap.set(sessionId, [unlistenMetrics, unlistenOs, unlistenError]);
  }

  /** Stop monitoring a session. */
  async function stop(sessionId: string) {
    await tauriInvoke("monitor_stop", { sessionId });
    collectingSessions.value.delete(sessionId);

    const unlisteners = unlistenMap.get(sessionId);
    if (unlisteners) {
      unlisteners.forEach((fn) => fn());
      unlistenMap.delete(sessionId);
    }
  }

  /** Cleanup all state for a session (called on disconnect). */
  function cleanup(sessionId: string) {
    collectingSessions.value.delete(sessionId);
    delete latestMetrics[sessionId];
    delete metricsHistory[sessionId];
    delete osInfoMap[sessionId];
    const unlisteners = unlistenMap.get(sessionId);
    if (unlisteners) {
      unlisteners.forEach((fn) => fn());
      unlistenMap.delete(sessionId);
    }
  }

  /** Get the latest metrics snapshot. */
  function getLatest(sessionId: string): SystemMetrics | undefined {
    return latestMetrics[sessionId];
  }

  /** Get metrics history. */
  function getHistory(sessionId: string): SystemMetrics[] {
    return metricsHistory[sessionId] ?? [];
  }

  /** Get OS info. */
  function getOsInfo(sessionId: string): OsInfo | undefined {
    return osInfoMap[sessionId];
  }

  /** Check if a session is being monitored. */
  function isCollecting(sessionId: string): boolean {
    return collectingSessions.value.has(sessionId);
  }

  return {
    latestMetrics,
    metricsHistory,
    osInfoMap,
    collectingSessions,
    start,
    stop,
    cleanup,
    getLatest,
    getHistory,
    getOsInfo,
    isCollecting,
  };
});
