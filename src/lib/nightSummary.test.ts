import { describe, expect, it } from "vitest";
import { buildNightSummary, dayLabel, sessionDate } from "./nightSummary";
import type { Player } from "./players";
import type { Match, MatchEvent, Session } from "./session";

const names = ["Ana", "Beto", "Caio", "Dudu", "Edu", "Fabi", "Gui", "Hugo"];
const byId = new Map(names.map((name, index) => [`p${index}`, { id: `p${index}`, name } as Player]));

function event(type: MatchEvent["type"], playerId: string, teamId: string): MatchEvent {
  return { id: `${type}-${playerId}-${Math.random()}`, type, playerId, teamId, at: 1 };
}

function match(id: string, stage: Match["stage"], homeId: string, awayId: string, events: MatchEvent[], status: Match["status"] = "finished"): Match {
  return { id, number: 1, stage, homeId, awayId, status, events, keepers: { home: "p6", away: "p7" } };
}

function session(matches: Match[], championId?: string): Session {
  return {
    id: "s1",
    date: "2026-10-27",
    createdAt: 1,
    status: "finished",
    teams: [
      { id: "t1", name: "Time 1", color: "#f5c842", playerIds: ["p0", "p1"] },
      { id: "t2", name: "Time 2", color: "#4f9dff", playerIds: ["p2", "p3"] },
    ],
    keeperIds: ["p6", "p7"],
    matches,
    championId,
  };
}

describe("buildNightSummary", () => {
  it("waits for the champion", () => {
    expect(buildNightSummary(session([match("m1", "group", "t1", "t2", [])]), byId)).toBeNull();
  });

  it("names the champion's players and the keeper of the final", () => {
    const final = match("m1", "final", "t2", "t1", [event("goal", "p2", "t2")]);
    const { champion } = buildNightSummary(session([final], "t2"), byId)!;

    expect(champion).toEqual({ name: "Time 2", color: "#4f9dff", players: ["Caio", "Dudu"], keeper: "Gui" });
  });

  it("marks the winner and flags a knockout match decided by the table", () => {
    const group = match("m1", "group", "t1", "t2", [event("goal", "p0", "t1")]);
    const semi = match("m2", "semi", "t2", "t1", []);
    const final = match("m3", "final", "t1", "t2", [event("goal", "p0", "t1")]);
    const { results } = buildNightSummary(session([group, semi, final], "t1"), byId)!;

    expect(results[0]).toMatchObject({ decidedByTable: false, home: { goals: 1, winner: true }, away: { goals: 0, winner: false } });
    expect(results[1]).toMatchObject({ decidedByTable: true, home: { winner: false }, away: { winner: true } });
  });

  it("leaves a tied group match without a winner", () => {
    const group = match("m1", "group", "t1", "t2", []);
    const final = match("m2", "final", "t1", "t2", [event("goal", "p0", "t1")]);
    const { results } = buildNightSummary(session([group, final], "t1"), byId)!;

    expect(results[0]).toMatchObject({ decidedByTable: false, home: { winner: false }, away: { winner: false } });
  });

  it("lists every player of the night, best numbers first, with only finished matches", () => {
    const played = match("m1", "final", "t1", "t2", [
      event("goal", "p1", "t1"),
      event("assist", "p0", "t1"),
      event("save", "p7", "t2"),
      event("save", "p7", "t2"),
    ]);
    const live = match("m2", "third", "t1", "t2", [event("goal", "p2", "t2")], "live");
    const { players } = buildNightSummary(session([played, live], "t1"), byId)!;

    expect(players.map((player) => player.name)).toEqual(["Beto", "Ana", "Hugo", "Caio", "Dudu", "Gui"]);
    expect(players[2]).toMatchObject({ goals: 0, assists: 0, saves: 2 });
  });
});

describe("dates", () => {
  it("keeps the session's own day", () => {
    expect(dayLabel(sessionDate("2026-10-27"))).toBe("27 de outubro");
  });
});
