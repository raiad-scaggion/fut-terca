import { describe, expect, it } from "vitest";
import { normalizePlayer, type Player } from "./players";
import { normalizeSession, type Match, type MatchEvent, type Session } from "./session";
import { buildRanking, computeStats } from "./stats";

const ratings = { speed: 5, finishing: 5, defense: 5, passing: 5 };

function player(id: string, baseline = {}, extra = {}): Player {
  return normalizePlayer(id, { name: id, ratings, baseline, ...extra });
}

function event(type: MatchEvent["type"], playerId: string): MatchEvent {
  return { id: `${type}-${playerId}`, type, playerId, teamId: "t1", at: 1 };
}

function match(status: Match["status"], events: MatchEvent[]): Match {
  return { id: "m1", number: 1, stage: "group", homeId: "t1", awayId: "t2", status, events };
}

function session(matches: Match[], extra: Partial<Session> = {}): Session {
  return {
    id: "s1",
    date: "2026-11-03",
    createdAt: 1,
    status: "live",
    teams: [{ id: "t1", name: "Time 1", color: "#fff", playerIds: ["ana", "bia"] }],
    keeperIds: ["gui"],
    matches,
    ...extra,
  };
}

describe("computeStats", () => {
  it("returns the baseline when there are no sessions", () => {
    const stats = computeStats([player("ana", { goals: 3, assists: 2, titles: 1 })], []);
    expect(stats.get("ana")).toEqual({ goals: 3, assists: 2, saves: 0, titles: 1 });
  });

  it("adds goals, assists and saves from finished matches to the baseline", () => {
    const players = [player("ana", { goals: 3 }), player("gui", { saves: 1 })];
    const finished = match("finished", [event("goal", "ana"), event("assist", "ana"), event("save", "gui")]);

    const stats = computeStats(players, [session([finished])]);
    expect(stats.get("ana")).toEqual({ goals: 4, assists: 1, saves: 0, titles: 0 });
    expect(stats.get("gui")?.saves).toBe(2);
  });

  it("ignores matches that haven't finished", () => {
    const players = [player("ana")];
    const stats = computeStats(players, [session([match("live", [event("goal", "ana")])])]);
    expect(stats.get("ana")?.goals).toBe(0);
  });

  it("follows an edit to a finished match", () => {
    const players = [player("ana")];
    const before = computeStats(players, [session([match("finished", [event("goal", "ana"), event("assist", "ana")])])]);
    const after = computeStats(players, [session([match("finished", [event("assist", "ana")])])]);
    expect(before.get("ana")?.goals).toBe(1);
    expect(after.get("ana")?.goals).toBe(0);
  });

  it("gives a title to the champion team's players but not to the keepers", () => {
    const players = [player("ana", { titles: 2 }), player("bia"), player("gui", {}, { role: "keeper" })];
    const stats = computeStats(players, [session([], { championId: "t1" })]);
    expect(stats.get("ana")?.titles).toBe(3);
    expect(stats.get("bia")?.titles).toBe(1);
    expect(stats.get("gui")?.titles).toBe(0);
  });

  it("skips events from players who no longer exist", () => {
    const stats = computeStats([player("ana")], [session([match("finished", [event("goal", "ghost")])])]);
    expect(stats.has("ghost")).toBe(false);
  });

  it("doesn't change the players' baseline", () => {
    const players = [player("ana", { goals: 1 })];
    computeStats(players, [session([match("finished", [event("goal", "ana")])])]);
    expect(players[0].baseline.goals).toBe(1);
  });
});

describe("buildRanking", () => {
  const players = [
    player("Bia", { goals: 5, assists: 1 }),
    player("Ana", { goals: 5, assists: 1 }),
    player("Caio", { goals: 5, assists: 9 }),
    player("Duda", { goals: 1, titles: 7 }),
  ];
  const names = (rows: { player: Player }[]) => rows.map((row) => row.player.name);

  it("sorts by the chosen column and breaks ties by goals, assists and name", () => {
    const stats = computeStats(players, []);
    expect(names(buildRanking(players, stats, "goals"))).toEqual(["Caio", "Ana", "Bia", "Duda"]);
    expect(names(buildRanking(players, stats, "titles"))[0]).toBe("Duda");
  });

  it("keeps inactive players only while they have numbers", () => {
    const list = [player("Ana", { goals: 2 }, { active: false }), player("Teste", {}, { active: false }), player("Bia")];
    expect(names(buildRanking(list, computeStats(list, []), "goals"))).toEqual(["Ana", "Bia"]);
  });
});

describe("normalizeSession", () => {
  it("reads the maps Firebase returns and fills what it left out", () => {
    const session = normalizeSession("s1", {
      date: "2026-11-03",
      teams: { t1: { name: "Time 1", color: "#fff", playerIds: ["ana"] }, t2: { name: "Time 2", color: "#000" } },
      keeperIds: { 0: "gui", 2: "leo" },
      matches: {
        m2: { number: 2, status: "pending", homeId: "t1", awayId: "t2" },
        m1: { number: 1, status: "finished", homeId: "t1", awayId: "t2", events: { e1: { type: "goal", playerId: "ana" } } },
      },
    });

    expect(session.teams.map((team) => team.id)).toEqual(["t1", "t2"]);
    expect(session.teams[1].playerIds).toEqual([]);
    expect(session.keeperIds).toEqual(["gui", "leo"]);
    expect(session.matches.map((match) => match.id)).toEqual(["m1", "m2"]);
    expect(session.matches[0].events[0]).toMatchObject({ id: "e1", playerId: "ana" });
    expect(session.matches[1].events).toEqual([]);
  });
});
