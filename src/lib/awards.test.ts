import { describe, expect, it } from "vitest";
import {
  AWARD_LABELS,
  AWARD_ORDER,
  getCurrentAwards,
  getMonthlyAwards,
  getPlayerAward,
} from "./awards";
import { normalizePlayer, type Player } from "./players";
import type { Match, MatchEvent, Session } from "./session";

function player(id: string, baseline = {}): Player {
  return normalizePlayer(id, { name: id, baseline });
}

function event(type: MatchEvent["type"], playerId: string): MatchEvent {
  return { id: `${type}-${playerId}-${Math.random()}`, type, playerId, teamId: "t1", at: 1 };
}

function match(status: Match["status"], events: MatchEvent[]): Match {
  return { id: "m1", number: 1, stage: "group", homeId: "t1", awayId: "t2", status, events };
}

function session(date: string, matches: Match[]): Session {
  return {
    id: `s-${date}`,
    date,
    createdAt: 1,
    status: "finished",
    teams: [{ id: "t1", name: "Time 1", color: "#fff", playerIds: [] }],
    keeperIds: [],
    matches,
  };
}

describe("getMonthlyAwards", () => {
  it("picks a clear winner of each award", () => {
    const players = [player("ana"), player("bia"), player("caio"), player("gui")];
    const m = match("finished", [
      event("goal", "ana"),
      event("goal", "ana"),
      event("assist", "ana"),
      event("assist", "ana"),
      event("goal", "bia"),
      event("goal", "bia"),
      event("goal", "bia"),
      event("assist", "caio"),
      event("assist", "caio"),
      event("assist", "caio"),
      event("save", "gui"),
      event("save", "gui"),
    ]);

    const awards = getMonthlyAwards(players, [session("2026-10-15", [m])], "2026-10");
    expect(awards).toEqual({
      month: "2026-10",
      craque: ["ana"],
      artilheiro: ["bia"],
      garcom: ["caio"],
      paredao: ["gui"],
    });
    expect(AWARD_LABELS.craque).toBe("Craque do Mês");
  });

  it("gives two winners on a tie", () => {
    const players = [player("ana"), player("bia")];
    const m = match("finished", [event("goal", "ana"), event("goal", "bia")]);

    const awards = getMonthlyAwards(players, [session("2026-10-15", [m])], "2026-10");
    expect(awards.artilheiro).toEqual(["ana", "bia"]);
    expect(awards.craque).toEqual(["ana", "bia"]);
  });

  it("gives nobody when the highest value is zero", () => {
    const players = [player("ana"), player("bia")];
    const awards = getMonthlyAwards(players, [session("2026-10-15", [match("finished", [])])], "2026-10");
    expect(awards).toEqual({
      month: "2026-10",
      craque: [],
      artilheiro: [],
      garcom: [],
      paredao: [],
    });
  });

  it("ignores matches of another month", () => {
    const players = [player("ana")];
    const s = session("2026-09-20", [match("finished", [event("goal", "ana")])]);
    const awards = getMonthlyAwards(players, [s], "2026-10");
    expect(awards.artilheiro).toEqual([]);
  });

  it("ignores matches that aren't finished", () => {
    const players = [player("ana")];
    const s = session("2026-10-20", [match("live", [event("goal", "ana")])]);
    const awards = getMonthlyAwards(players, [s], "2026-10");
    expect(awards.artilheiro).toEqual([]);
  });

  it("ignores the baseline", () => {
    const players = [player("ana", { goals: 50, assists: 50, saves: 50, titles: 10 })];
    const awards = getMonthlyAwards(players, [], "2026-10");
    expect(awards.craque).toEqual([]);
    expect(awards.artilheiro).toEqual([]);
    expect(awards.garcom).toEqual([]);
    expect(awards.paredao).toEqual([]);
  });

  it("gives a double winner the first award in AWARD_ORDER", () => {
    const players = [player("ana"), player("bia")];
    const m = match("finished", [event("goal", "ana"), event("goal", "ana"), event("assist", "bia")]);
    const awards = getMonthlyAwards(players, [session("2026-10-15", [m])], "2026-10");

    expect(AWARD_ORDER).toEqual(["craque", "artilheiro", "garcom", "paredao"]);
    expect(awards.craque).toEqual(["ana"]);
    expect(awards.artilheiro).toEqual(["ana"]);
    expect(getPlayerAward(awards, "ana")).toBe("craque");
    expect(getPlayerAward(awards, "bia")).toBe("garcom");
    expect(getPlayerAward(awards, "outro")).toBeNull();
  });

  it("getCurrentAwards in January reads December of the year before", () => {
    const players = [player("ana")];
    const dec = session("2026-12-15", [match("finished", [event("goal", "ana")])]);
    const jan = session("2027-01-05", [match("finished", [event("assist", "ana")])]);

    const awards = getCurrentAwards(players, [dec, jan], "2027-01-10");
    expect(awards.month).toBe("2026-12");
    expect(awards.artilheiro).toEqual(["ana"]);
    expect(awards.garcom).toEqual([]);
  });
});
