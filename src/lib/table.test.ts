import { describe, expect, it } from "vitest";
import { normalizePlayer, type Player } from "./players";
import type { Match, MatchEvent, Session } from "./session";
import { buildKeeperTable, buildLineTable, sortTable } from "./table";

const ratings = { speed: 5, finishing: 5, defense: 5, passing: 5 };

function player(id: string, baseline = {}, role: Player["role"] = "line"): Player {
  return normalizePlayer(id, { name: id, ratings, baseline, role });
}

function event(type: MatchEvent["type"], playerId: string, teamId: string): MatchEvent {
  return { id: `${type}-${playerId}-${teamId}-${Math.random()}`, type, playerId, teamId, at: 1 };
}

function match(id: string, events: MatchEvent[], extra: Partial<Match> = {}): Match {
  return {
    id,
    number: 1,
    stage: "group",
    homeId: "t1",
    awayId: "t2",
    status: "finished",
    keepers: { home: "gui", away: "med" },
    events,
    ...extra,
  };
}

function session(id: string, matches: Match[], extra: Partial<Session> = {}): Session {
  return {
    id,
    date: "2026-11-03",
    createdAt: 1,
    status: "finished",
    teams: [
      { id: "t1", name: "Time 1", color: "#fff", playerIds: ["ana"] },
      { id: "t2", name: "Time 2", color: "#000", playerIds: ["bia"] },
    ],
    keeperIds: ["gui", "med"],
    matches,
    ...extra,
  };
}

// Medina usually plays outfield and kept goal for Time 2 on both nights.
const players = [player("ana", { goals: 10, titles: 2 }), player("bia"), player("gui", { titles: 3 }, "keeper"), player("med", { goals: 4 })];

const night1 = session(
  "s1",
  [
    match("m1", [event("goal", "ana", "t1"), event("goal", "ana", "t1"), event("save", "med", "t2"), event("howler", "med", "t2")]),
    match("m2", [event("assist", "bia", "t2"), event("goal", "bia", "t2"), event("ownGoal", "gui", "t1")], {
      stage: "final",
    }),
  ],
  { championId: "t2" },
);
const night2 = session("s2", [match("m3", [event("goal", "ana", "t1"), event("goal", "med", "t2")])]);

describe("buildLineTable", () => {
  const rows = buildLineTable(players, [night1, night2]);
  const row = (id: string) => rows.find((item) => item.player.id === id);

  it("lists outfield players and anyone who played outfield, with season totals", () => {
    expect(rows.map((item) => item.player.id).sort()).toEqual(["ana", "bia", "med"]);
    expect(row("ana")).toMatchObject({ titles: 2, goals: 13, assists: 0, contributions: 13, games: 3, nights: 2 });
  });

  it("averages app goals, assists and titles per night", () => {
    expect(row("ana")?.goalsPerNight).toBe(1.5);
    expect(row("bia")).toMatchObject({ titles: 1, goals: 1, assists: 1, titlesPerNight: 0.5, assistsPerNight: 0.5 });
  });

  it("counts only outfield games for a player who also kept goal", () => {
    expect(row("med")).toMatchObject({ games: 0, goals: 5, nights: 2 });
  });
});

describe("buildKeeperTable", () => {
  const rows = buildKeeperTable(players, [night1, night2]);
  const row = (id: string) => rows.find((item) => item.player.id === id);

  it("lists keepers and anyone who kept goal", () => {
    expect(rows.map((item) => item.player.id).sort()).toEqual(["gui", "med"]);
  });

  it("counts games, saves, goals conceded, clean sheets, howlers and own goals in goal", () => {
    // m1: Time 1 won 2x0. m2: Time 2 won 2x0 (a goal plus Gui's own goal). m3: 1x1.
    expect(row("med")).toMatchObject({ games: 3, saves: 1, conceded: 3, cleanSheets: 1, howlers: 1, ownGoals: 0 });
    expect(row("gui")).toMatchObject({ games: 3, conceded: 3, cleanSheets: 1, ownGoals: 1 });
  });

  it("gives titles won in goal, plus the Sheet's titles for a usual keeper", () => {
    expect(row("med")).toMatchObject({ titles: 1, titlesPerNight: 0.5 });
    expect(row("gui")).toMatchObject({ titles: 3, titlesPerNight: 0 });
  });

  it("averages per game in goal", () => {
    expect(row("med")?.concededPerGame).toBe(1);
    expect(row("med")?.savesPerGame).toBeCloseTo(1 / 3);
  });
});

describe("sortTable", () => {
  it("sorts by a column, highest first, and puts missing averages last", () => {
    const rows = [
      { player: player("a"), value: null },
      { player: player("b"), value: 1 },
      { player: player("c"), value: 3 },
    ];
    expect(sortTable(rows, (row) => row.value).map((row) => row.player.id)).toEqual(["c", "b", "a"]);
  });
});
