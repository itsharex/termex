import { describe, it, expect } from "vitest";

/**
 * MetricChart.vue uses Canvas 2D for rendering.
 * Since @vue/test-utils is not available in this project,
 * we test the color selection logic extracted from the component.
 */

/** Replicates the auto-color selection logic from MetricChart.vue */
function getAutoColor(value: number): string {
  if (value < 60) return "#67c23a"; // green
  if (value < 85) return "#e6a23c"; // yellow
  return "#f56c6c"; // red
}

/** Replicates the step calculation logic */
function computeStep(width: number, dataLength: number): number {
  return width / Math.max(dataLength - 1, 1);
}

/** Replicates the Y coordinate calculation (0-100% mapped to canvas height) */
function computeY(value: number, height: number): number {
  return height - (value / 100) * height;
}

describe("MetricChart color logic", () => {
  it("returns green for values below 60", () => {
    expect(getAutoColor(0)).toBe("#67c23a");
    expect(getAutoColor(30)).toBe("#67c23a");
    expect(getAutoColor(59.9)).toBe("#67c23a");
  });

  it("returns yellow for values between 60 and 85", () => {
    expect(getAutoColor(60)).toBe("#e6a23c");
    expect(getAutoColor(75)).toBe("#e6a23c");
    expect(getAutoColor(84.9)).toBe("#e6a23c");
  });

  it("returns red for values 85 and above", () => {
    expect(getAutoColor(85)).toBe("#f56c6c");
    expect(getAutoColor(95)).toBe("#f56c6c");
    expect(getAutoColor(100)).toBe("#f56c6c");
  });
});

describe("MetricChart step calculation", () => {
  it("distributes points evenly across width", () => {
    expect(computeStep(200, 5)).toBe(50);
    expect(computeStep(200, 2)).toBe(200);
    expect(computeStep(200, 100)).toBeCloseTo(2.0202, 3);
  });

  it("handles single data point", () => {
    expect(computeStep(200, 1)).toBe(200);
  });

  it("handles zero data points gracefully", () => {
    // max(0 - 1, 1) = 1
    expect(computeStep(200, 0)).toBe(200);
  });
});

describe("MetricChart Y coordinate mapping", () => {
  it("maps 0% to bottom of canvas", () => {
    expect(computeY(0, 40)).toBe(40);
  });

  it("maps 100% to top of canvas", () => {
    expect(computeY(100, 40)).toBe(0);
  });

  it("maps 50% to middle", () => {
    expect(computeY(50, 40)).toBe(20);
  });

  it("handles various heights", () => {
    expect(computeY(25, 100)).toBe(75);
    expect(computeY(75, 200)).toBe(50);
  });
});
