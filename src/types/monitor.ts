/** Server OS type. */
export type ServerOS = "Linux" | "MacOS" | "FreeBSD" | "Unknown";

/** Complete system metrics snapshot. */
export interface SystemMetrics {
  timestamp: number;
  cpu: CpuMetrics;
  memory: MemoryMetrics;
  disk: DiskMetrics[];
  network: NetworkMetrics;
  load: LoadAverage;
  uptimeSeconds: number;
  topCpuProcesses: ProcessInfo[];
  topMemProcesses: ProcessInfo[];
}

/** CPU metrics. */
export interface CpuMetrics {
  usagePercent: number;
  userPercent: number;
  systemPercent: number;
  iowaitPercent: number;
  coreCount: number;
}

/** Memory metrics. */
export interface MemoryMetrics {
  totalBytes: number;
  usedBytes: number;
  availableBytes: number;
  usagePercent: number;
  swapTotal: number;
  swapUsed: number;
}

/** Disk metrics for a single mount point. */
export interface DiskMetrics {
  mountPoint: string;
  totalBytes: number;
  usedBytes: number;
  availableBytes: number;
  usagePercent: number;
}

/** Network metrics. */
export interface NetworkMetrics {
  interfaces: NetworkInterface[];
}

/** Single network interface traffic data. */
export interface NetworkInterface {
  name: string;
  rxBytesPerSec: number;
  txBytesPerSec: number;
  rxTotal: number;
  txTotal: number;
}

/** System load averages. */
export interface LoadAverage {
  one: number;
  five: number;
  fifteen: number;
}

/** Process information. */
export interface ProcessInfo {
  pid: number;
  user: string;
  cpuPercent: number;
  memPercent: number;
  command: string;
}

/** OS basic information. */
export interface OsInfo {
  osType: ServerOS;
  kernel: string;
  distro: string;
  coreCount: number;
}
