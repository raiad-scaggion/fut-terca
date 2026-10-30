import { describe, expect, it } from "vitest";
import { balanceTeams, buildPairHistory, teamTotal } from "./draw";
import { normalizePlayer, type LinePosition, type Player } from "./players";
import type { Session } from "./session";

// Mulberry32, so every draw in these tests is repeatable.
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function line(id: string, level: number, linePosition: LinePosition): Player {
  return normalizePlayer(id, {
    name: id,
    role: "line",
    linePosition,
    ratings: { speed: level, finishing: level, defense: level, passing: level },
  });
}

const POSITIONS: LinePosition[] = ["defesa", "meio", "meio", "ataque"];
const LEVELS = [9, 9, 9, 9, 8, 8, 7, 7, 6, 6, 5, 5, 4, 4, 3, 3];
const PLAYERS = LEVELS.map((level, index) => line(`p${index}`, level, POSITIONS[index % 4]));

function spread(teams: Player[][]): number {
  const totals = teams.map(teamTotal);
  return Math.max(...totals) - Math.min(...totals);
}

function session(id: string, date: string, playerIds: string[]): Session {
  return {
    id,
    date,
    createdAt: 1,
    status: "finished",
    teams: [{ id: "t1", name: "Time 1", color: "#fff", playerIds }],
    keeperIds: [],
    matches: [],
  };
}

describe("balanceTeams", () => {
  it("makes 4 teams of 4 using each player once", () => {
    const teams = balanceTeams(PLAYERS, new Map(), seeded(1));
    expect(teams.map((team) => team.length)).toEqual([4, 4, 4, 4]);
    expect(new Set(teams.flat().map((player) => player.id)).size).toBe(16);
  });

  it("keeps the teams close, whatever the draw", () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      expect(spread(balanceTeams(PLAYERS, new Map(), seeded(seed)))).toBeLessThan(1.5);
    }
  });

  it("spreads the positions when the players allow it", () => {
    const teams = balanceTeams(PLAYERS, new Map(), seeded(3));
    for (const team of teams) {
      expect(team.filter((player) => player.linePosition === "defesa")).toHaveLength(1);
      expect(team.filter((player) => player.linePosition === "ataque")).toHaveLength(1);
    }
  });

  it("gives different teams on a redraw", () => {
    const draws = [1, 2, 3, 4, 5, 6].map((seed) =>
      balanceTeams(PLAYERS, new Map(), seeded(seed))
        .map((team) => team.map((player) => player.id).sort().join())
        .sort()
        .join("|"),
    );
    expect(new Set(draws).size).toBeGreaterThan(1);
  });

  it("avoids a pair that keeps playing together when the balance allows it", () => {
    const equal = POSITIONS.flatMap((position, group) =>
      [0, 1, 2, 3].map((index) => line(`g${group}-${index}`, 7, position)),
    );
    const history = buildPairHistory(
      Array.from({ length: 10 }, (_, index) => session(`s${index}`, `2026-01-${10 + index}`, ["g0-0", "g3-0"])),
    );

    for (let seed = 1; seed <= 10; seed += 1) {
      const teams = balanceTeams(equal, history, seeded(seed));
      const team = teams.find((item) => item.some((player) => player.id === "g0-0"));
      expect(team?.some((player) => player.id === "g3-0")).toBe(false);
    }
  });
});

describe("buildPairHistory", () => {
  it("counts recent nights more than old ones", () => {
    const history = buildPairHistory([session("old", "2026-01-01", ["a", "b"]), session("new", "2026-02-01", ["a", "c"])]);
    expect(history.get("a|c")).toBe(2);
    expect(history.get("a|b")).toBeCloseTo(1.9);
    expect(history.has("b|c")).toBe(false);
  });
});
