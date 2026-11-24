import { describe, expect, it } from "vitest";
import { clockAlert, formatClock, getRemainingMs, isFinalTick, startTimer, stopTimer, type MatchTimer } from "./clock";

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

describe("startTimer and stopTimer", () => {
  it("keeps the elapsed time across a pause", () => {
    const running = startTimer(tenMinutes, 1_000);
    const paused = stopTimer(running, 31_000);
    expect(paused).toMatchObject({ running: false, elapsedMs: 30_000 });
    expect(getRemainingMs(startTimer(paused, 50_000), 60_000)).toBe(600_000 - 40_000);
  });

  it("ignores a repeated tap from a second phone", () => {
    const running = startTimer(tenMinutes, 1_000);
    expect(startTimer(running, 9_000).startedAt).toBe(1_000);
    expect(stopTimer(tenMinutes, 9_000)).toBe(tenMinutes);
  });
});

describe("clockAlert", () => {
  it("stays calm before the last minute", () => {
    expect(clockAlert(60_001, true)).toBe("");
  });

  it("warns in the last minute and shouts in the last 10 seconds", () => {
    expect(clockAlert(60_000, true)).toBe(" is-warning");
    expect(clockAlert(10_000, true)).toBe(" is-final");
    expect(clockAlert(0, true)).toBe(" is-final");
  });

  it("stays calm while paused, but overtime is always red", () => {
    expect(clockAlert(5_000, false)).toBe("");
    expect(clockAlert(-1, false)).toBe(" is-over");
  });
});

describe("isFinalTick", () => {
  it("ticks when a new second of the last 10 starts", () => {
    expect(isFinalTick(10_100, 9_900)).toBe(true);
    expect(isFinalTick(9_900, 9_650)).toBe(false);
  });

  it("stays quiet before the last 10 seconds and at the end, where the whistle takes over", () => {
    expect(isFinalTick(11_100, 10_900)).toBe(false);
    expect(isFinalTick(200, -50)).toBe(false);
  });
});
