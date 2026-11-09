import { describe, expect, it } from "vitest";
import { normalizePlayer, type Player } from "./players";
import {
  adminProgress,
  computeAverages,
  exportText,
  isCompleteVote,
  normalizeRound,
  normalizeVotes,
  playersToRate,
  publishedCount,
  publishPaths,
  startingValues,
  type Vote,
} from "./rebalance";

const lineVote = (vel: number, fin: number, pas: number, dri: number, def: number, fis: number): Vote => ({
  values: { vel, fin, pas, dri, def, fis },
  at: 1,
});
const keeperVote = (value: number): Vote => ({ values: { pac: value, pas: value, sal: value, mne: value, pos: value, ref: value }, at: 1 });

const xana = normalizePlayer("p63", { name: "Xana", linePosition: "ataque", ratings: { speed: 8, finishing: 8, defense: 4, passing: 7 } });
const mose = normalizePlayer("p37", { name: "Mose", linePosition: "meio", ratings: { speed: 6, finishing: 6, defense: 6, passing: 6 } });
const kadu = normalizePlayer("k1", { name: "Kadu", role: "keeper" });
const old = normalizePlayer("p70", { name: "Davi", active: false });
const legend = normalizePlayer("p10", { name: "Lenda", legend: true });
const players: Player[] = [kadu, mose, old, legend, xana];

describe("playersToRate", () => {
  it("leaves out inactive players, Legends and the admin's own player, with keepers last", () => {
    expect(playersToRate(players, "p63").map((player) => player.name)).toEqual(["Mose", "Kadu"]);
    expect(playersToRate(players, null).map((player) => player.name)).toEqual(["Mose", "Xana", "Kadu"]);
  });
});

describe("votes", () => {
  it("only counts a vote with all six numbers of the player's current role", () => {
    expect(isCompleteVote(xana, lineVote(80, 80, 80, 80, 80, 80))).toBe(true);
    expect(isCompleteVote(xana, { values: { vel: 80, fin: 80 }, at: 1 })).toBe(false);
    expect(isCompleteVote(kadu, lineVote(80, 80, 80, 80, 80, 80))).toBe(false);
    expect(isCompleteVote(kadu, undefined)).toBe(false);
  });

  it("drops values that are not whole numbers from 0 to 100", () => {
    expect(normalizeVotes({ p63: { vel: 80, fin: 101, pas: 7.5, dri: "9", def: 0, at: 5 } })).toEqual({
      p63: { values: { vel: 80, def: 0 }, at: 5 },
    });
    expect(normalizeVotes(null)).toEqual({});
  });

  it("counts progress and drops when a new player shows up", () => {
    const votes = { p37: lineVote(60, 60, 60, 60, 60, 60), k1: keeperVote(90) };
    expect(adminProgress(players, "p63", votes)).toEqual({ done: 2, total: 2, remaining: 0 });
    const newcomer = normalizePlayer("n1", { name: "Novato" });
    expect(adminProgress([...players, newcomer], "p63", votes)).toEqual({ done: 2, total: 3, remaining: 1 });
    expect(adminProgress(players.map((p) => (p.id === "k1" ? { ...p, legend: true } : p)), "p63", votes)).toEqual({ done: 1, total: 1, remaining: 0 });
  });

  it("starts the sheet from the saved vote, or from the current numbers", () => {
    expect(startingValues(xana, undefined)).toEqual({ vel: 80, fin: 80, pas: 70, dri: 50, def: 40, fis: 50 });
    expect(startingValues(xana, lineVote(1, 2, 3, 4, 5, 6))).toEqual({ vel: 1, fin: 2, pas: 3, dri: 4, def: 5, fis: 6 });
  });
});

describe("normalizeRound", () => {
  it("treats a missing round as open", () => {
    expect(normalizeRound(null)).toEqual({ status: "open", openedAt: 0 });
    expect(normalizeRound({ status: "closed", openedAt: 1, publishedAt: 2 })).toEqual({ status: "closed", openedAt: 1, publishedAt: 2 });
  });
});

describe("computeAverages", () => {
  const votes = {
    "a,com": { p63: lineVote(80, 90, 70, 81, 40, 60), p37: lineVote(60, 60, 60, 60, 60, 60) },
    "b,com": { p63: lineVote(85, 91, 70, 80, 41, 61), p37: { values: { vel: 99 }, at: 1 } },
    // Xana's own admin: anything saved for Xana is ignored.
    "xana,com": { p63: lineVote(99, 99, 99, 99, 99, 99), k1: keeperVote(91) },
  };
  const averages = computeAverages(players, votes, { "xana,com": "p63" });
  const byName = Object.fromEntries(averages.map((average) => [average.player.name, average]));

  it("averages complete votes, rounded, and counts them", () => {
    // VEL (80+85)/2 = 82.5 -> 83, DRI 80.5 -> 81, DEF 40.5 -> 41, FIS 60.5 -> 61
    expect(byName.Xana.values).toEqual({ vel: 83, fin: 91, pas: 70, dri: 81, def: 41, fis: 61 });
    expect(byName.Xana.votes).toBe(2);
    expect(byName.Mose.votes).toBe(1);
    expect(byName.Kadu.values).toEqual({ pac: 91, pas: 91, sal: 91, mne: 91, pos: 91, ref: 91 });
  });

  it("keeps the current numbers of players nobody rated", () => {
    const none = computeAverages(players, {}, {});
    expect(none.every((average) => average.votes === 0)).toBe(true);
    expect(none.find((average) => average.player.id === "p37")!.values).toEqual(mose.stats.line);
    expect(publishedCount(none)).toBe(0);
    expect(publishPaths(none, "log1")).toEqual({});
  });

  it("skips Legends and inactive players", () => {
    expect(averages.map((average) => average.player.name)).toEqual(["Mose", "Xana", "Kadu"]);
  });

  it("writes only the role's set and the logId for each rated player", () => {
    expect(publishPaths(averages, "log1")).toEqual({
      "players/p37/stats/line": { vel: 60, fin: 60, pas: 60, dri: 60, def: 60, fis: 60 },
      "players/p37/logId": "log1",
      "players/p63/stats/line": { vel: 83, fin: 91, pas: 70, dri: 81, def: 41, fis: 61 },
      "players/p63/logId": "log1",
      "players/k1/stats/keeper": { pac: 91, pas: 91, sal: 91, mne: 91, pos: 91, ref: 91 },
      "players/k1/logId": "log1",
    });
  });

  it("exports one line per player, outfield then keepers", () => {
    const text = exportText(averages);
    expect(text.split("\n")).toEqual([
      "*Rebalanceamento do Fut de Terça*",
      "",
      "*Linha*",
      `Mose (MEI) 60: VEL 60 · FIN 60 · PAS 60 · DRI 60 · DEF 60 · FIS 60`,
      `Xana (ATA) ${byName.Xana.ovr}: VEL 83 · FIN 91 · PAS 70 · DRI 81 · DEF 41 · FIS 61`,
      "",
      "*Goleiros*",
      "Kadu (GOL) 91: PAC 91 · PAS 91 · SAL 91 · MNE 91 · POS 91 · REF 91",
    ]);
    expect(exportText(computeAverages([mose], {}, {}))).toContain("(sem votos, ficam as notas atuais)");
  });
});
