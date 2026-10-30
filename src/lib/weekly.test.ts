import { describe, expect, it } from "vitest";
import { normalizePlayer, type Player } from "./players";
import {
  addToTeam,
  buildRoundRobin,
  buildSession,
  clearWeekly,
  drawTeams,
  fillWithMonthly,
  isReadyToConfirm,
  nextOpenTeam,
  normalizeWeekly,
  removeFromTeams,
  setTeamColor,
  togglePlayer,
  unassignedPlayerIds,
  type Weekly,
} from "./weekly";

function line(id: string, extra = {}): Player {
  return normalizePlayer(id, { name: id, role: "line", ...extra });
}

function keeper(id: string, extra = {}): Player {
  return normalizePlayer(id, { name: id, role: "keeper", ...extra });
}

const LINE = Array.from({ length: 18 }, (_, index) => line(`p${index}`));
const empty = normalizeWeekly(null);

function selected(count: number): Weekly {
  return { ...empty, selectedIds: LINE.slice(0, count).map((player) => player.id) };
}

describe("normalizeWeekly", () => {
  it("starts with 4 empty teams in different colors", () => {
    expect(empty.teams).toHaveLength(4);
    expect(new Set(empty.teams.map((team) => team.color)).size).toBe(4);
  });

  it("reads back what Firebase leaves out", () => {
    const weekly = normalizeWeekly({ mode: "manual", teams: [{ color: "#000" }], selectedIds: { 1: "a" } });
    expect(weekly.mode).toBe("manual");
    expect(weekly.teams[0]).toEqual({ color: "#000", playerIds: [] });
    expect(weekly.teams).toHaveLength(4);
    expect(weekly.selectedIds).toEqual(["a"]);
    expect(weekly.keeperIds).toEqual([]);
  });
});

describe("togglePlayer", () => {
  it("adds and removes a player", () => {
    const added = togglePlayer(empty, LINE[0]);
    expect(added.selectedIds).toEqual(["p0"]);
    expect(togglePlayer(added, LINE[0]).selectedIds).toEqual([]);
  });

  it("stops at 16 outfield players and 2 keepers", () => {
    expect(togglePlayer(selected(16), LINE[16]).selectedIds).toHaveLength(16);
    const twoKeepers = togglePlayer(togglePlayer(empty, keeper("k1")), keeper("k2"));
    expect(togglePlayer(twoKeepers, keeper("k3")).keeperIds).toEqual(["k1", "k2"]);
  });

  it("takes a removed player off their team", () => {
    const weekly = addToTeam(selected(4), 0, "p0");
    expect(togglePlayer(weekly, LINE[0]).teams[0].playerIds).toEqual([]);
  });
});

describe("fillWithMonthly", () => {
  it("keeps who's picked, fills the rest with active mensalistas and respects the limits", () => {
    const players = [
      line("guest"),
      ...LINE.map((player) => ({ ...player, isMonthly: true })),
      line("left", { isMonthly: true, active: false }),
      keeper("k1", { isMonthly: true }),
      keeper("k2", { isMonthly: true }),
      keeper("k3", { isMonthly: true }),
    ];
    const weekly = fillWithMonthly({ ...empty, selectedIds: ["guest"] }, players);
    expect(weekly.selectedIds).toHaveLength(16);
    expect(weekly.selectedIds[0]).toBe("guest");
    expect(weekly.selectedIds).not.toContain("left");
    expect(weekly.keeperIds).toEqual(["k1", "k2"]);
  });
});

describe("drawTeams", () => {
  it("fills every team and keeps their colors", () => {
    const weekly = drawTeams(selected(16), LINE, new Map());
    expect(weekly.teams.map((team) => team.playerIds.length)).toEqual([4, 4, 4, 4]);
    expect(weekly.teams[0].color).toBe(empty.teams[0].color);
    expect(unassignedPlayerIds(weekly)).toEqual([]);
  });

  it("does nothing without 16 players", () => {
    expect(drawTeams(selected(15), LINE, new Map()).teams[0].playerIds).toEqual([]);
  });
});

describe("manual teams", () => {
  it("adds up to 4 players and moves a player between teams", () => {
    let weekly = selected(5);
    for (const id of ["p0", "p1", "p2", "p3", "p4"]) {
      weekly = addToTeam(weekly, 0, id);
    }
    expect(weekly.teams[0].playerIds).toEqual(["p0", "p1", "p2", "p3"]);

    weekly = addToTeam(weekly, 1, "p0");
    expect(weekly.teams[0].playerIds).not.toContain("p0");
    expect(weekly.teams[1].playerIds).toEqual(["p0"]);
    expect(unassignedPlayerIds(removeFromTeams(weekly, "p0"))).toEqual(["p0", "p4"]);
  });

  it("finds the next team with room", () => {
    let weekly = selected(4);
    for (const id of ["p0", "p1", "p2", "p3"]) {
      weekly = addToTeam(weekly, 0, id);
    }
    expect(nextOpenTeam(weekly, 0)).toBe(1);
    expect(nextOpenTeam(weekly, 2)).toBe(2);
  });
});

describe("setTeamColor", () => {
  it("swaps colors when the new one is taken", () => {
    const [first, second] = empty.teams.map((team) => team.color);
    const weekly = setTeamColor(empty, 0, second);
    expect(weekly.teams[0].color).toBe(second);
    expect(weekly.teams[1].color).toBe(first);
  });
});

describe("isReadyToConfirm", () => {
  it("needs full teams and 2 keepers", () => {
    const drawn = drawTeams(selected(16), LINE, new Map());
    expect(isReadyToConfirm(drawn)).toBe(false);
    expect(isReadyToConfirm({ ...drawn, keeperIds: ["k1", "k2"] })).toBe(true);
  });
});

describe("clearWeekly", () => {
  it("empties everything but keeps the mode", () => {
    const weekly = clearWeekly({ ...selected(4), mode: "manual", keeperIds: ["k1"] });
    expect(weekly.selectedIds).toEqual([]);
    expect(weekly.keeperIds).toEqual([]);
    expect(weekly.mode).toBe("manual");
  });
});

describe("buildRoundRobin", () => {
  it("plays every pair once in 6 matches, with both games of a round using all 4 teams", () => {
    const pairs = buildRoundRobin(["t1", "t2", "t3", "t4"]);
    expect(pairs).toHaveLength(6);
    expect(new Set(pairs.map((pair) => [...pair].sort().join())).size).toBe(6);
    expect(pairs.slice(0, 2).flat().sort()).toEqual(["t1", "t2", "t3", "t4"]);
  });
});

describe("buildSession", () => {
  it("creates the teams and 6 pending group matches", () => {
    const weekly = { ...drawTeams(selected(16), LINE, new Map()), keeperIds: ["k1", "k2"] };
    const session = buildSession(weekly, "2026-11-03", 123);

    expect(session.status).toBe("live");
    expect(session.date).toBe("2026-11-03");
    expect(Object.keys(session.teams)).toEqual(["t1", "t2", "t3", "t4"]);
    expect(session.teams.t1.playerIds).toEqual(weekly.teams[0].playerIds);
    expect(session.teams.t2.color).toBe(weekly.teams[1].color);
    expect(session.keeperIds).toEqual(["k1", "k2"]);
    expect(Object.values(session.matches).map((match) => match.status)).toEqual(Array(6).fill("pending"));
    expect(session.matches.m1).toMatchObject({ number: 1, stage: "group" });
  });
});
