import { describe, it, expect } from "vitest";
import {
  formatBytes,
  formatFileSize,
  formatBytesPerSec,
  formatUptime,
} from "@/utils/format";

describe("formatBytes / formatFileSize", () => {
  it("returns '0 B' for zero", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  it("formats bytes below 1 KB", () => {
    expect(formatBytes(512)).toBe("512 B");
  });

  it("formats kilobytes", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
  });

  it("formats megabytes", () => {
    expect(formatBytes(1048576)).toBe("1.0 MB");
    expect(formatBytes(5.5 * 1024 * 1024)).toBe("5.5 MB");
  });

  it("formats gigabytes", () => {
    expect(formatBytes(1073741824)).toBe("1.0 GB");
    expect(formatBytes(8 * 1024 * 1024 * 1024)).toBe("8.0 GB");
  });

  it("formats terabytes", () => {
    expect(formatBytes(1099511627776)).toBe("1.0 TB");
  });

  it("is the same reference as formatFileSize", () => {
    expect(formatBytes).toBe(formatFileSize);
  });
});

describe("formatBytesPerSec", () => {
  it("returns '0 B/s' for zero", () => {
    expect(formatBytesPerSec(0)).toBe("0 B/s");
  });

  it("formats small rates", () => {
    expect(formatBytesPerSec(512)).toBe("512 B/s");
  });

  it("formats KB/s rates", () => {
    expect(formatBytesPerSec(102400)).toBe("100.0 KB/s");
  });

  it("formats MB/s rates", () => {
    expect(formatBytesPerSec(1048576)).toBe("1.0 MB/s");
  });

  it("formats large rates", () => {
    expect(formatBytesPerSec(1073741824)).toBe("1.0 GB/s");
  });
});

describe("formatUptime", () => {
  it("formats minutes only", () => {
    expect(formatUptime(0)).toBe("0m");
    expect(formatUptime(59)).toBe("0m");
    expect(formatUptime(60)).toBe("1m");
    expect(formatUptime(300)).toBe("5m");
    expect(formatUptime(3599)).toBe("59m");
  });

  it("formats hours and minutes", () => {
    expect(formatUptime(3600)).toBe("1h 0m");
    expect(formatUptime(3660)).toBe("1h 1m");
    expect(formatUptime(7200)).toBe("2h 0m");
    expect(formatUptime(86399)).toBe("23h 59m");
  });

  it("formats days and hours", () => {
    expect(formatUptime(86400)).toBe("1d 0h");
    expect(formatUptime(90000)).toBe("1d 1h");
    expect(formatUptime(86400 * 45 + 3600 * 12)).toBe("45d 12h");
  });

  it("handles large values", () => {
    expect(formatUptime(86400 * 365)).toBe("365d 0h");
  });
});
