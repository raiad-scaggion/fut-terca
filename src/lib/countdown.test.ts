import { describe, expect, it } from "vitest";
import { countdownStage, kickoffMs, splitRemaining } from "./countdown";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

describe("kickoffMs", () => {
  it("is 20:15 in Brasília, 23:15 UTC", () => {
    expect(new Date(kickoffMs("2026-11-10")).toISOString()).toBe("2026-11-10T23:15:00.000Z");
  });
});

describe("splitRemaining", () => {
  it("splits days, hours, minutes and seconds", () => {
    expect(splitRemaining(2 * 24 * HOUR + 3 * HOUR + 4 * MINUTE + 5000)).toEqual({ days: 2, hours: 3, minutes: 4, seconds: 5 });
  });

  it("rounds a partial second up, so the last second shows 1 and not 0", () => {
    expect(splitRemaining(400)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 1 });
  });

  it("never goes negative", () => {
    expect(splitRemaining(-5000)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  });
});

describe("countdownStage", () => {
  it("gets louder as kickoff nears", () => {
    expect(countdownStage(5 * 24 * HOUR)).toBe("calm");
    expect(countdownStage(2 * 24 * HOUR)).toBe("warm");
    expect(countdownStage(20 * HOUR)).toBe("hot");
    expect(countdownStage(3 * HOUR)).toBe("hotter");
    expect(countdownStage(30 * MINUTE)).toBe("crazy");
    expect(countdownStage(5 * MINUTE)).toBe("insane");
    expect(countdownStage(30_000)).toBe("final");
    expect(countdownStage(0)).toBe("kickoff");
    expect(countdownStage(-HOUR)).toBe("kickoff");
  });

  it("changes stage exactly at each boundary", () => {
    expect(countdownStage(HOUR)).toBe("crazy");
    expect(countdownStage(HOUR + 1)).toBe("hotter");
    expect(countdownStage(MINUTE)).toBe("final");
    expect(countdownStage(MINUTE + 1)).toBe("insane");
  });
});
