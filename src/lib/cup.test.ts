import { describe, expect, it } from "vitest";
import {
  applyFinishEdit,
  applyFinishMatch,
  getChampion,
  getMatchScore,
  getMatchWinnerId,
  getStandings,
  isNextRoundLocked,
  matchLabel,
  type RawSession,
} from "./cup";
import { normalizeSession, type Match } from "./session";
import { computeStats } from "./stats";
import { normalizePlayer } from "./players";
import { buildSession, normalizeWeekly } from "./weekly";

function newCup(): RawSession {
  const weekly = normalizeWeekly({
    keeperIds: ["k1", "k2"],
    teams: [1, 2, 3, 4].map((team) => ({ color: "#fff", playerIds: [1, 2, 3, 4].map((player) => `t${team}p${player}`) })),
  });
  return JSON.parse(JSON.stringify(buildSession(weekly, "2026-11-03", 1))) as RawSession;
}

const read = (raw: RawSession) => normalizeSession("s1", raw);

function byLabel(raw: RawSession, label: string): Match {
  const match = read(raw).matches.find((item) => matchLabel(item) === label);
  if (!match) {
    throw new Error(`No match "${label}"`);
  }
  return match;
}

function play(raw: RawSession, matchId: string, homeGoals: number, awayGoals: number, winnerId: string | null = null): RawSession {
  const match = raw.matches?.[matchId] as Record<string, string>;
  const goals = (teamId: string, count: number, side: string) =>
    Object.fromEntries(
      Array.from({ length: count }, (_, index) => [
        `${side}${index}`,
        { type: "goal", playerId: `${teamId}p1`, teamId, at: index },
      ]),
    );
  const live: RawSession = {
    ...raw,
    matches: {
      ...raw.matches,
      [matchId]: {
        ...raw.matches?.[matchId],
        status: "live",
        keepers: { home: "k1", away: "k2" },
        events: { ...goals(match.homeId, homeGoals, "h"), ...goals(match.awayId, awayGoals, "a") },
      },
    },
  };
  const finished = applyFinishMatch(live, "s1", matchId, winnerId, 100);
  if (!finished) {
    throw new Error("Match didn't finish");
  }
  return finished;
}

// t1 beats everyone, t2 beats t3 and t4, t3 beats t4: the table ends t1, t2, t3, t4.
function playGroup(raw: RawSession): RawSession {
  return read(raw)
    .matches.filter((match) => match.stage === "group")
    .reduce((cup, match) => {
      const homeWins = match.homeId < match.awayId;
      return play(cup, match.id, homeWins ? 2 : 0, homeWins ? 0 : 2);
    }, raw);
}

describe("getMatchScore and getMatchWinnerId", () => {
  const match = (goals: string[], winnerId?: string): Match => ({
    id: "m",
    number: 1,
    stage: "semi",
    homeId: "a",
    awayId: "b",
    status: "finished",
    winnerId,
    events: goals.map((teamId, index) => ({ id: `e${index}`, type: "goal", playerId: "x", teamId, at: 0 })),
  });

  it("counts goals only and finds the winner", () => {
    const withAssist = match(["a", "b", "a"]);
    withAssist.events.push({ id: "e9", type: "assist", playerId: "x", teamId: "b", at: 0 });
    expect(getMatchScore(withAssist)).toEqual({ home: 2, away: 1 });
    expect(getMatchWinnerId(withAssist)).toBe("a");
  });

  it("uses winnerId only on a tie, so a later score fix beats a stale pick", () => {
    expect(getMatchWinnerId(match(["a", "b"], "b"))).toBe("b");
    expect(getMatchWinnerId(match(["a"], "b"))).toBe("a");
    expect(getMatchWinnerId(match([]))).toBeNull();
  });
});

describe("getStandings", () => {
  it("adds points and goals only after a match ends", () => {
    const started = newCup();
    const first = read(started).matches[0];
    const live = { ...started, matches: { ...started.matches, [first.id]: { ...started.matches?.[first.id], status: "live" } } };
    expect(getStandings(read(live)).every((row) => row.played === 0)).toBe(true);

    const table = getStandings(read(play(started, first.id, 3, 1)));
    expect(table[0]).toMatchObject({ played: 1, wins: 1, points: 3, goalsFor: 3, goalsAgainst: 1, goalDiff: 2 });
    expect(table[0].team.id).toBe(first.homeId);
  });

  it("gives a point each for a draw", () => {
    const table = getStandings(read(play(newCup(), "m1", 1, 1)));
    expect(table.filter((row) => row.points === 1)).toHaveLength(2);
  });

  it("orders by points, then goal difference, then goals scored", () => {
    let cup = play(newCup(), "m1", 1, 0);
    cup = play(cup, "m2", 3, 0);
    const [top] = getStandings(read(cup));
    expect(top.goalDiff).toBe(3);
  });
});

describe("the whole cup", () => {
  it("creates the semis after the group, 1st x 4th and 2nd x 3rd", () => {
    const beforeLast = read(newCup()).matches.slice(0, 5).reduce((cup, match) => play(cup, match.id, 1, 0), newCup());
    expect(read(beforeLast).matches).toHaveLength(6);

    const cup = playGroup(newCup());
    expect(read(cup).matches).toHaveLength(8);
    expect(byLabel(cup, "Semifinal 1")).toMatchObject({ stage: "semi", homeId: "t1", awayId: "t4", status: "pending" });
    expect(byLabel(cup, "Semifinal 2")).toMatchObject({ homeId: "t2", awayId: "t3" });
  });

  it("creates the 3rd place match and the final after both semis, then crowns the final's winner", () => {
    let cup = playGroup(newCup());
    cup = play(cup, byLabel(cup, "Semifinal 1").id, 2, 0);
    expect(read(cup).matches).toHaveLength(8);

    cup = play(cup, byLabel(cup, "Semifinal 2").id, 0, 1);
    expect(byLabel(cup, "Disputa de 3º lugar")).toMatchObject({ stage: "third", homeId: "t4", awayId: "t2" });
    expect(byLabel(cup, "Final")).toMatchObject({ stage: "final", homeId: "t1", awayId: "t3" });
    expect(getChampion(read(cup))).toBeNull();
    expect(cup.status).toBe("live");

    cup = play(cup, byLabel(cup, "Disputa de 3º lugar").id, 1, 0);
    cup = play(cup, byLabel(cup, "Final").id, 0, 2);
    expect(getChampion(read(cup))?.id).toBe("t3");
    expect(cup.championId).toBe("t3");
    expect(cup.status).toBe("finished");
  });

  it("settles a tied knockout match with the chosen winner", () => {
    let cup = playGroup(newCup());
    cup = play(cup, byLabel(cup, "Semifinal 1").id, 1, 1, "t4");
    cup = play(cup, byLabel(cup, "Semifinal 2").id, 1, 0);
    expect(byLabel(cup, "Final")).toMatchObject({ homeId: "t4", awayId: "t2" });
    expect(byLabel(cup, "Disputa de 3º lugar")).toMatchObject({ homeId: "t1", awayId: "t3" });
  });

  it("carries the last match's length to the new matches", () => {
    const cup = newCup();
    const matches = Object.fromEntries(
      Object.entries(cup.matches ?? {}).map(([id, match]) => [id, { ...match, timer: { durationSec: 480, running: false, startedAt: 0, elapsedMs: 0 } }]),
    );
    expect(byLabel(playGroup({ ...cup, matches }), "Semifinal 1").timer?.durationSec).toBe(480);
  });

  it("feeds the champion's titles to the stats, keeper included", () => {
    let cup = playGroup(newCup());
    cup = play(cup, byLabel(cup, "Semifinal 1").id, 2, 0);
    cup = play(cup, byLabel(cup, "Semifinal 2").id, 1, 0);
    cup = play(cup, byLabel(cup, "Disputa de 3º lugar").id, 1, 0);
    cup = play(cup, byLabel(cup, "Final").id, 1, 0);

    const players = ["t1p1", "t2p1", "k1", "k2"].map((id) => normalizePlayer(id, { name: id }));
    const stats = computeStats(players, [read(cup)]);
    expect(stats.get("t1p1")?.titles).toBe(1);
    expect(stats.get("t2p1")?.titles).toBe(0);
    expect(stats.get("k1")?.titles).toBe(1);
    expect(stats.get("k2")?.titles).toBe(0);
  });
});

describe("applyFinishMatch", () => {
  it("freezes the clock", () => {
    const cup = newCup();
    const running = {
      ...cup,
      matches: { ...cup.matches, m1: { ...cup.matches?.m1, status: "live", timer: { durationSec: 600, running: true, startedAt: 40, elapsedMs: 0 } } },
    };
    const timer = applyFinishMatch(running, "s1", "m1", null, 100)?.matches?.m1.timer;
    expect(timer).toMatchObject({ running: false, elapsedMs: 60 });
  });

  it("aborts when the match already ended on another phone", () => {
    const cup = play(newCup(), "m1", 1, 0);
    expect(applyFinishMatch(cup, "s1", "m1", null, 100)).toBeUndefined();
    expect(applyFinishMatch(cup, "s1", "m2", null, 100)).toBeUndefined();
  });
});

describe("applyFinishEdit", () => {
  function fixResult(raw: RawSession, matchId: string, homeGoals: number, awayGoals: number): RawSession {
    const match = raw.matches?.[matchId] as Record<string, string>;
    const events = Object.fromEntries([
      ...Array.from({ length: homeGoals }, (_, index) => [`h${index}`, { type: "goal", playerId: "x", teamId: match.homeId, at: 0 }]),
      ...Array.from({ length: awayGoals }, (_, index) => [`a${index}`, { type: "goal", playerId: "x", teamId: match.awayId, at: 0 }]),
    ]);
    const edited = applyFinishEdit({ ...raw, matches: { ...raw.matches, [matchId]: { ...raw.matches?.[matchId], events } } }, "s1", matchId, null);
    if (!edited) {
      throw new Error("Edit failed");
    }
    return edited;
  }

  it("updates the semis while they're still pending", () => {
    const cup = playGroup(newCup());
    const swapped = read(cup).matches
      .filter((match) => match.stage === "group")
      .reduce((current, match) => {
        const involved = [match.homeId, match.awayId];
        if (involved.includes("t1") && involved.includes("t2")) {
          return fixResult(current, match.id, match.homeId === "t2" ? 9 : 0, match.homeId === "t2" ? 0 : 9);
        }
        return current;
      }, cup);

    expect(byLabel(swapped, "Semifinal 1").homeId).toBe("t2");
    expect(read(swapped).matches).toHaveLength(8);
  });

  it("keeps the semis once they've started and says so", () => {
    let cup = playGroup(newCup());
    cup = play(cup, byLabel(cup, "Semifinal 1").id, 1, 0);
    const before = byLabel(cup, "Semifinal 1");
    const first = read(cup).matches[0];

    const edited = fixResult(cup, first.id, 0, 9);
    expect(byLabel(edited, "Semifinal 1")).toMatchObject({ homeId: before.homeId, awayId: before.awayId });
    expect(isNextRoundLocked(read(edited), first)).toBe(true);
  });

  it("changes the champion when the final's score is fixed", () => {
    let cup = playGroup(newCup());
    cup = play(cup, byLabel(cup, "Semifinal 1").id, 1, 0);
    cup = play(cup, byLabel(cup, "Semifinal 2").id, 1, 0);
    cup = play(cup, byLabel(cup, "Final").id, 1, 0);
    expect(cup.championId).toBe("t1");

    expect(fixResult(cup, byLabel(cup, "Final").id, 0, 1).championId).toBe("t2");
  });

  it("only applies to finished matches", () => {
    expect(applyFinishEdit(newCup(), "s1", "m1", null)).toBeUndefined();
  });
});
