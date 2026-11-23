import { describe, expect, it } from "vitest";
import { runningMatch, type Match, type Session } from "./session";

function match(id: string, status: Match["status"]): Match {
  return { id, number: 1, stage: "group", homeId: "t1", awayId: "t2", status, events: [] };
}

const session: Session = {
  id: "s1",
  date: "2026-11-24",
  createdAt: 0,
  status: "live",
  teams: [],
  keeperIds: [],
  matches: [match("m1", "finished"), match("m2", "live"), match("m3", "pending")],
};

describe("runningMatch", () => {
  it("returns the match the pointer names while it runs", () => {
    expect(runningMatch(session, "m2")?.id).toBe("m2");
  });

  it("ignores a pointer left on a finished or pending match", () => {
    expect(runningMatch(session, "m1")).toBeUndefined();
    expect(runningMatch(session, "m3")).toBeUndefined();
  });

  it("ignores a pointer to a match that doesn't exist, or no pointer", () => {
    expect(runningMatch(session, "gone")).toBeUndefined();
    expect(runningMatch(session, null)).toBeUndefined();
    expect(runningMatch(undefined, "m2")).toBeUndefined();
  });
});
