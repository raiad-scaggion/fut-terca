import { describe, expect, it } from "vitest";
import {
  cardTier,
  defaultKeeperStats,
  displayOvr,
  isStatText,
  KEEPER_STATS,
  levelScore,
  LINE_STATS,
  normalizeName,
  normalizePlayer,
  positionCode,
  roleStats,
  statsFromText,
  type LinePosition,
  type LineStats,
} from "./players";

const line = (vel: number, fin: number, pas: number, dri: number, def: number, fis: number): LineStats => ({ vel, fin, pas, dri, def, fis });
const flat = (value: number) => line(value, value, value, value, value, value);
const withLine = (linePosition: LinePosition, stats: LineStats) => ({
  role: "line" as const,
  linePosition,
  stats: { line: stats, keeper: defaultKeeperStats() },
});

describe("normalizePlayer", () => {
  it("derives 0 to 100 stats from old 1 to 10 ratings", () => {
    const player = normalizePlayer("p1", {
      name: "  Teste  ",
      ratings: { speed: 0, finishing: 15, defense: "bad", passing: 7 },
    });

    expect(player).toEqual({
      id: "p1",
      name: "Teste",
      role: "line",
      linePosition: "meio",
      nationality: "br",
      club: "",
      isMonthly: false,
      joinDate: "",
      active: true,
      legend: false,
      createdAt: 0,
      stats: { line: line(10, 100, 70, 50, 50, 50), keeper: defaultKeeperStats() },
      baseline: { goals: 0, assists: 0, saves: 0, titles: 0 },
    });
  });

  it("gives keepers 99 on every stat when they have none", () => {
    const player = normalizePlayer("p34", { name: "Baguete", role: "keeper", ratings: { speed: 4, finishing: 4, defense: 4, passing: 4 } });
    expect(player.stats.keeper).toEqual({ pac: 99, pas: 99, sal: 99, mne: 99, pos: 99, ref: 99 });
    expect(displayOvr(player)).toBe(99);
  });

  it("prefers stored stats, clamps them to 0..100 and fills holes from the old ratings", () => {
    const player = normalizePlayer("p2", {
      name: "Novo",
      ratings: { speed: 6, finishing: 6, defense: 6, passing: 6 },
      stats: { line: { vel: 83, fin: 140, pas: -5, dri: "x", def: 71.6, fis: 64 }, keeper: { pac: 40 } },
    });
    expect(player.stats.line).toEqual(line(83, 100, 0, 50, 72, 64));
    expect(player.stats.keeper).toEqual({ pac: 40, pas: 99, sal: 99, mne: 99, pos: 99, ref: 99 });
  });

  it("only takes legend when it is exactly true", () => {
    expect(normalizePlayer("a", { legend: true }).legend).toBe(true);
    expect(normalizePlayer("b", { legend: "true" }).legend).toBe(false);
    expect(normalizePlayer("c", {}).legend).toBe(false);
  });

  it("keeps valid fields including legacyId and keeper role", () => {
    const player = normalizePlayer("p34", {
      name: "Baguete",
      role: "keeper",
      linePosition: "meio",
      nationality: "AR",
      club: "corinthians",
      isMonthly: true,
      joinDate: "2026-01-15",
      active: false,
      createdAt: 12345,
      legacyId: 34,
      baseline: { goals: 1, assists: 5, saves: 3, titles: 0 },
    });

    expect(player.role).toBe("keeper");
    expect(player.nationality).toBe("ar");
    expect(player.club).toBe("corinthians");
    expect(player.isMonthly).toBe(true);
    expect(player.joinDate).toBe("2026-01-15");
    expect(player.active).toBe(false);
    expect(player.legacyId).toBe(34);
    expect(player.baseline).toEqual({ goals: 1, assists: 5, saves: 3, titles: 0 });
  });

  it("falls back for unknown nationality or club", () => {
    const player = normalizePlayer("p2", { name: "Outro", nationality: "xx", club: "inexistente" });
    expect(player.nationality).toBe("br");
    expect(player.club).toBe("");
  });
});

describe("OVR and card tiers", () => {
  it("weighs a meio by passing and dribbling", () => {
    // Neto's old 7/6/8/8: .15*70 + .15*60 + .30*80 + .25*50 + .05*80 + .10*50 = 65
    const neto = normalizePlayer("p69", { linePosition: "meio", ratings: { speed: 7, finishing: 6, defense: 8, passing: 8 } });
    expect(levelScore(neto)).toBeCloseTo(65, 5);
    expect(displayOvr(neto)).toBe(65);
    expect(cardTier(neto)).toBe("silver");
  });

  it("weighs a defesa mostly by defense", () => {
    // .15*60 + .05*70 + .10*80 + .05*50 + .45*80 + .20*50 = 69
    expect(displayOvr(withLine("defesa", line(60, 70, 80, 50, 80, 50)))).toBe(69);
  });

  it("weighs an ataque by finishing and ignores defense", () => {
    // .20*90 + .35*95 + .10*80 + .20*85 + 0*30 + .15*70 = 86.75
    const xana = withLine("ataque", line(90, 95, 80, 85, 30, 70));
    expect(displayOvr(xana)).toBe(87);
    expect(cardTier(xana)).toBe("gold");
    expect(displayOvr(withLine("ataque", line(90, 95, 80, 85, 0, 70)))).toBe(87);
  });

  it("weighs a keeper by the keeper set only", () => {
    // .05*60 + .05*50 + .25*90 + .20*80 + .20*85 + .25*95 = 84.75
    const keeper = {
      role: "keeper" as const,
      linePosition: "meio" as const,
      stats: { line: flat(10), keeper: { pac: 60, pas: 50, sal: 90, mne: 80, pos: 85, ref: 95 } },
    };
    expect(displayOvr(keeper)).toBe(85);
  });

  it("caps OVR at 99", () => {
    expect(displayOvr(withLine("meio", flat(100)))).toBe(99);
  });

  it("enforces tier boundaries at 50, 51, 74 and 75", () => {
    expect(cardTier(withLine("meio", flat(50)))).toBe("bronze");
    expect(cardTier(withLine("meio", flat(51)))).toBe("silver");
    expect(cardTier(withLine("meio", flat(74)))).toBe("silver");
    expect(cardTier(withLine("meio", flat(75)))).toBe("gold");
  });

  it("lists the six stats of the current role in card order", () => {
    const player = normalizePlayer("k", { role: "keeper" });
    expect(roleStats(player).map((stat) => stat.short)).toEqual(["PAC", "PAS", "SAL", "MNE", "POS", "REF"]);
    expect(roleStats({ ...player, role: "line" }).map((stat) => stat.short)).toEqual(["VEL", "FIN", "PAS", "DRI", "DEF", "FIS"]);
  });
});

describe("stat text", () => {
  it("accepts whole numbers from 0 to 100 only", () => {
    expect(["0", "83", "100", " 7 "].every((text) => isStatText(text))).toBe(true);
    expect(["", "101", "-1", "7.5", "abc", undefined].some((text) => isStatText(text))).toBe(false);
  });

  it("reads typed text back and keeps the fallback for bad fields", () => {
    const text = { vel: "83", fin: "", pas: "100", dri: "x", def: "0", fis: "64" };
    expect(statsFromText(LINE_STATS, text, flat(50))).toEqual(line(83, 50, 100, 50, 0, 64));
    expect(Object.keys(statsFromText(KEEPER_STATS, {}, defaultKeeperStats()))).toEqual(["pac", "pas", "sal", "mne", "pos", "ref"]);
  });
});

describe("names and codes", () => {
  it("returns position codes for keepers and outfield positions", () => {
    expect(positionCode({ role: "keeper", linePosition: "meio" })).toBe("GOL");
    expect(positionCode({ role: "line", linePosition: "ataque" })).toBe("ATA");
    expect(positionCode({ role: "line", linePosition: "meio" })).toBe("MEI");
    expect(positionCode({ role: "line", linePosition: "defesa" })).toBe("DEF");
  });

  it("normalizes names by trimming, lowercasing and stripping accents", () => {
    expect(normalizeName("  Luís Fellype ")).toBe("luis fellype");
    expect(normalizeName("João Victor")).toBe("joao victor");
  });
});
