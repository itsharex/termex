import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useMonitorStore } from "@/stores/monitorStore";
import type { SystemMetrics, OsInfo } from "@/types/monitor";

// Mock tauriInvoke and tauriListen
const mockInvoke = vi.fn();
const mockListen = vi.fn();
vi.mock("@/utils/tauri", () => ({
  tauriInvoke: (...args: unknown[]) => mockInvoke(...args),
  tauriListen: (...args: unknown[]) => mockListen(...args),
}));

function makeMetrics(timestamp: number): SystemMetrics {
  return {
    timestamp,
    cpu: {
      usagePercent: 50,
      userPercent: 30,
      systemPercent: 15,
      iowaitPercent: 5,
      coreCount: 4,
    },
    memory: {
      totalBytes: 8_000_000_000,
      usedBytes: 4_000_000_000,
      availableBytes: 4_000_000_000,
      usagePercent: 50,
      swapTotal: 0,
      swapUsed: 0,
    },
    disk: [
      {
        mountPoint: "/",
        totalBytes: 100_000_000_000,
        usedBytes: 60_000_000_000,
        availableBytes: 40_000_000_000,
        usagePercent: 60,
      },
    ],
    network: { interfaces: [] },
    load: { one: 1.0, five: 0.5, fifteen: 0.3 },
    uptimeSeconds: 86400,
    topCpuProcesses: [],
    topMemProcesses: [],
  };
}

const MOCK_OS_INFO: OsInfo = {
  osType: "Linux",
  kernel: "Linux 5.15.0",
  distro: "Ubuntu 22.04",
  coreCount: 4,
};

describe("monitorStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockInvoke.mockReset();
    mockListen.mockReset();
    // Default: listen returns a noop unlisten function
    mockListen.mockResolvedValue(vi.fn());
  });

  describe("initial state", () => {
    it("has empty state", () => {
      const store = useMonitorStore();
      expect(store.isCollecting("sid-1")).toBe(false);
      expect(store.getLatest("sid-1")).toBeUndefined();
      expect(store.getHistory("sid-1")).toEqual([]);
      expect(store.getOsInfo("sid-1")).toBeUndefined();
    });
  });

  describe("start", () => {
    it("calls monitor_start and registers listeners", async () => {
      const store = useMonitorStore();
      await store.start("sid-1", 5000);

      expect(mockInvoke).toHaveBeenCalledWith("monitor_start", {
        sessionId: "sid-1",
        intervalMs: 5000,
      });
      expect(mockListen).toHaveBeenCalledTimes(3);
      expect(mockListen).toHaveBeenCalledWith(
        "monitor://metrics/sid-1",
        expect.any(Function),
      );
      expect(mockListen).toHaveBeenCalledWith(
        "monitor://os-info/sid-1",
        expect.any(Function),
      );
      expect(mockListen).toHaveBeenCalledWith(
        "monitor://error/sid-1",
        expect.any(Function),
      );
      expect(store.isCollecting("sid-1")).toBe(true);
    });

    it("uses default interval when not specified", async () => {
      const store = useMonitorStore();
      await store.start("sid-1");

      expect(mockInvoke).toHaveBeenCalledWith("monitor_start", {
        sessionId: "sid-1",
        intervalMs: 3000,
      });
    });

    it("stores metrics when listener fires", async () => {
      let metricsHandler: ((m: SystemMetrics) => void) | null = null;
      mockListen.mockImplementation(
        async (event: string, handler: (m: unknown) => void) => {
          if (event.includes("metrics")) {
            metricsHandler = handler as (m: SystemMetrics) => void;
          }
          return vi.fn();
        },
      );

      const store = useMonitorStore();
      await store.start("sid-1");

      const m = makeMetrics(1000);
      metricsHandler!(m);

      expect(store.getLatest("sid-1")).toEqual(m);
      expect(store.getHistory("sid-1")).toHaveLength(1);
    });

    it("stores OS info when listener fires", async () => {
      let osHandler: ((info: OsInfo) => void) | null = null;
      mockListen.mockImplementation(
        async (event: string, handler: (m: unknown) => void) => {
          if (event.includes("os-info")) {
            osHandler = handler as (info: OsInfo) => void;
          }
          return vi.fn();
        },
      );

      const store = useMonitorStore();
      await store.start("sid-1");
      osHandler!(MOCK_OS_INFO);

      expect(store.getOsInfo("sid-1")).toEqual(MOCK_OS_INFO);
    });

    it("caps history at MAX_HISTORY (100)", async () => {
      let metricsHandler: ((m: SystemMetrics) => void) | null = null;
      mockListen.mockImplementation(
        async (event: string, handler: (m: unknown) => void) => {
          if (event.includes("metrics")) {
            metricsHandler = handler as (m: SystemMetrics) => void;
          }
          return vi.fn();
        },
      );

      const store = useMonitorStore();
      await store.start("sid-1");

      for (let i = 0; i < 120; i++) {
        metricsHandler!(makeMetrics(i));
      }

      expect(store.getHistory("sid-1")).toHaveLength(100);
      // Oldest entries should have been shifted out
      expect(store.getHistory("sid-1")[0].timestamp).toBe(20);
      expect(store.getHistory("sid-1")[99].timestamp).toBe(119);
    });
  });

  describe("stop", () => {
    it("calls monitor_stop and cleans up listeners", async () => {
      const unlistenFn = vi.fn();
      mockListen.mockResolvedValue(unlistenFn);

      const store = useMonitorStore();
      await store.start("sid-1");
      expect(store.isCollecting("sid-1")).toBe(true);

      await store.stop("sid-1");
      expect(mockInvoke).toHaveBeenCalledWith("monitor_stop", {
        sessionId: "sid-1",
      });
      expect(store.isCollecting("sid-1")).toBe(false);
      // 3 listeners should have been unsubscribed
      expect(unlistenFn).toHaveBeenCalledTimes(3);
    });
  });

  describe("cleanup", () => {
    it("removes all state for a session", async () => {
      let metricsHandler: ((m: SystemMetrics) => void) | null = null;
      let osHandler: ((info: OsInfo) => void) | null = null;
      const unlistenFn = vi.fn();

      mockListen.mockImplementation(
        async (event: string, handler: (m: unknown) => void) => {
          if (event.includes("metrics")) {
            metricsHandler = handler as (m: SystemMetrics) => void;
          } else if (event.includes("os-info")) {
            osHandler = handler as (info: OsInfo) => void;
          }
          return unlistenFn;
        },
      );

      const store = useMonitorStore();
      await store.start("sid-1");

      metricsHandler!(makeMetrics(1000));
      osHandler!(MOCK_OS_INFO);

      expect(store.getLatest("sid-1")).toBeDefined();
      expect(store.getOsInfo("sid-1")).toBeDefined();
      expect(store.isCollecting("sid-1")).toBe(true);

      store.cleanup("sid-1");

      expect(store.getLatest("sid-1")).toBeUndefined();
      expect(store.getHistory("sid-1")).toEqual([]);
      expect(store.getOsInfo("sid-1")).toBeUndefined();
      expect(store.isCollecting("sid-1")).toBe(false);
      expect(unlistenFn).toHaveBeenCalledTimes(3);
    });

    it("is safe to call on non-existent session", () => {
      const store = useMonitorStore();
      expect(() => store.cleanup("nonexistent")).not.toThrow();
    });
  });

  describe("multi-session isolation", () => {
    it("maintains independent state per session", async () => {
      let handlers: Record<string, (m: SystemMetrics) => void> = {};
      mockListen.mockImplementation(
        async (event: string, handler: (m: unknown) => void) => {
          if (event.includes("metrics")) {
            const sid = event.split("/").pop()!;
            handlers[sid] = handler as (m: SystemMetrics) => void;
          }
          return vi.fn();
        },
      );

      const store = useMonitorStore();
      await store.start("sid-1");
      await store.start("sid-2");

      handlers["sid-1"](makeMetrics(100));
      handlers["sid-2"](makeMetrics(200));

      expect(store.getLatest("sid-1")!.timestamp).toBe(100);
      expect(store.getLatest("sid-2")!.timestamp).toBe(200);
      expect(store.getHistory("sid-1")).toHaveLength(1);
      expect(store.getHistory("sid-2")).toHaveLength(1);

      store.cleanup("sid-1");
      expect(store.getLatest("sid-1")).toBeUndefined();
      expect(store.getLatest("sid-2")!.timestamp).toBe(200);
    });
  });
});
