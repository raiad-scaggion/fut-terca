import { describe, expect, it } from "vitest";
import { formatClock, getRemainingMs, type MatchTimer } from "./clock";

const tenMinutes: MatchTimer = { durationSec: 600, running: false, startedAt: 0, elapsedMs: 0 };

describe("getRemainingMs", () => {
  it("returns the full duration before the start", () => {
    expect(getRemainingMs(tenMinutes, 5_000)).toBe(600_000);
  });

  it("counts time since the start while running", () => {
    const timer = { ...tenMinutes, running: true, startedAt: 1_000, elapsedMs: 30_000 };
    expect(getRemainingMs(timer, 61_000)).toBe(600_000 - 90_000);
  });

  it("ignores a start time in the future caused by clock skew", () => {
    const timer = { ...tenMinutes, running: true, startedAt: 10_000 };
    expect(getRemainingMs(timer, 9_000)).toBe(600_000);
  });
});

describe("formatClock", () => {
  it("pads minutes and seconds", () => {
    expect(formatClock(65_000)).toBe("01:05");
  });

  it("marks overtime with a plus sign", () => {
    expect(formatClock(-12_500)).toBe("+00:12");
  });
});
