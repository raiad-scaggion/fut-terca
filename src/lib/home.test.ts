import { describe, expect, it } from "vitest";
import { getHomeState, getLastChampion, listAwardWinners, nextTuesday } from "./home";
import type { Match, Session } from "./session";

function match(id: string, stage: Match["stage"], status: Match["status"], events: Match["events"] = []): Match {
  return { id, number: 1, stage, homeId: "t1", awayId: "t2", status, events };
}

function session(id: string, date: string, matches: Match[], createdAt = 1): Session {
  return {
    id,
    date,
    createdAt,
    status: "live",
    teams: [
      { id: "t1", name: "Time 1", color: "#000", playerIds: [] },
      { id: "t2", name: "Time 2", color: "#fff", playerIds: [] },
    ],
    keeperIds: [],
    matches,
  };
}

const goal = { id: "e1", type: "goal" as const, playerId: "a", teamId: "t1", at: 1 };
const finishedCup = (id: string, date: string, createdAt = 1) =>
  session(id, date, [match("final", "final", "finished", [goal])], createdAt);

const noLive = { sessionId: null, matchId: null };

describe("nextTuesday", () => {
  it("finds the coming Tuesday", () => {
    expect(nextTuesday("2026-10-30")).toBe("2026-11-03");
  });

  it("keeps today when today is Tuesday", () => {
    expect(nextTuesday("2026-11-03")).toBe("2026-11-03");
  });

  it("crosses the end of a year", () => {
    expect(nextTuesday("2026-12-30")).toBe("2027-01-05");
  });
});

describe("getHomeState", () => {
  it("counts the days when nothing is happening", () => {
    expect(getHomeState([], noLive, "2026-10-30")).toEqual({ kind: "next", date: "2026-11-03", days: 4 });
  });

  it("says zero days on a Tuesday before the cup", () => {
    expect(getHomeState([], noLive, "2026-11-03")).toMatchObject({ days: 0 });
  });

  it("shows the live match first", () => {
    const current = session("s1", "2026-11-03", [match("m1", "group", "live")]);
    const state = getHomeState([current], { sessionId: "s1", matchId: "m1" }, "2026-11-03");
    expect(state).toMatchObject({ kind: "live", match: { id: "m1" } });
  });

  it("shows the next match between games", () => {
    const current = session("s1", "2026-11-03", [match("m1", "group", "finished"), match("m2", "group", "pending")]);
    const state = getHomeState([current], { sessionId: "s1", matchId: null }, "2026-11-03");
    expect(state).toMatchObject({ kind: "cup", next: { id: "m2" } });
  });

  it("moves on a week once the night has a champion", () => {
    const state = getHomeState([finishedCup("s1", "2026-11-03")], { sessionId: "s1", matchId: null }, "2026-11-03");
    expect(state).toEqual({ kind: "next", date: "2026-11-10", days: 7 });
  });
});

describe("getLastChampion", () => {
  it("picks the newest cup that has a champion", () => {
    const sessions = [
      finishedCup("old", "2026-11-03", 1),
      finishedCup("new", "2026-11-10", 2),
      session("open", "2026-11-17", [match("m1", "group", "pending")], 3),
    ];
    expect(getLastChampion(sessions)?.session.id).toBe("new");
    expect(getLastChampion(sessions)?.team.id).toBe("t1");
  });

  it("is empty before the first champion", () => {
    expect(getLastChampion([])).toBeNull();
  });
});

describe("listAwardWinners", () => {
  it("joins the awards of one player and keeps tied winners", () => {
    const winners = listAwardWinners({
      month: "2026-11",
      craque: ["a"],
      artilheiro: ["a", "b"],
      garcom: ["c"],
      paredao: [],
    });
    expect(winners).toEqual([
      { playerId: "a", awards: ["craque", "artilheiro"] },
      { playerId: "b", awards: ["artilheiro"] },
      { playerId: "c", awards: ["garcom"] },
    ]);
  });
});
