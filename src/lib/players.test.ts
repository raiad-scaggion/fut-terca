import { describe, expect, it } from "vitest";
import {
  cardTier,
  displayOvr,
  displayStat,
  levelScore,
  normalizeName,
  normalizePlayer,
  positionCode,
} from "./players";

describe("normalizePlayer", () => {
  it("fills defaults for missing fields and clamps ratings to 1..10", () => {
    const player = normalizePlayer("p1", {
      name: "  Teste  ",
      ratings: { speed: 0, finishing: 15, defense: "bad", passing: 7 },
    });

    expect(player).toEqual({
      id: "p1",
      name: "Teste",
      role: "line",
      linePosition: "meio",
      isMonthly: false,
      joinDate: "",
      active: true,
      createdAt: 0,
      ratings: { speed: 1, finishing: 10, defense: 5, passing: 7 },
      baseline: { goals: 0, assists: 0, saves: 0, titles: 0 },
    });
  });

  it("keeps valid fields including legacyId and keeper role", () => {
    const player = normalizePlayer("p34", {
      name: "Baguete",
      role: "keeper",
      linePosition: "meio",
      isMonthly: true,
      joinDate: "2026-01-15",
      active: false,
      createdAt: 12345,
      legacyId: 34,
      ratings: { speed: 10, finishing: 10, defense: 10, passing: 10 },
      baseline: { goals: 1, assists: 5, saves: 3, titles: 0 },
    });

    expect(player.role).toBe("keeper");
    expect(player.isMonthly).toBe(true);
    expect(player.joinDate).toBe("2026-01-15");
    expect(player.active).toBe(false);
    expect(player.legacyId).toBe(34);
    expect(player.baseline).toEqual({ goals: 1, assists: 5, saves: 3, titles: 0 });
  });
});

describe("OVR and card tiers", () => {
  it("computes Neto (meio, 7/6/8/8) as OVR 72 and silver", () => {
    const neto = normalizePlayer("p69", {
      name: "Neto",
      role: "line",
      linePosition: "meio",
      ratings: { speed: 7, finishing: 6, defense: 8, passing: 8 },
    });

    expect(levelScore(neto)).toBeCloseTo(7.18, 5);
    expect(displayOvr(neto)).toBe(72);
    expect(cardTier(neto)).toBe("silver");
  });

  it("computes JP Canhoto (defesa, 6/7/8/8) as OVR 73 and silver", () => {
    const jp = normalizePlayer("p67", {
      name: "JP Canhoto",
      role: "line",
      linePosition: "defesa",
      ratings: { speed: 6, finishing: 7, defense: 8, passing: 8 },
    });

    expect(levelScore(jp)).toBeCloseTo(7.29, 5);
    expect(displayOvr(jp)).toBe(73);
    expect(cardTier(jp)).toBe("silver");
  });

  it("computes ataque and keeper weights accurately", () => {
    const xana = normalizePlayer("p63", {
      name: "Xana",
      role: "line",
      linePosition: "ataque",
      ratings: { speed: 10, finishing: 9, defense: 3, passing: 8 },
    });
    // 10*0.30 + 9*0.55 + 3*0 + 8*0.15 = 3.0 + 4.95 + 1.2 = 9.15 -> 92
    expect(displayOvr(xana)).toBe(92);
    expect(cardTier(xana)).toBe("gold");

    const keeper = normalizePlayer("p34", {
      name: "Baguete",
      role: "keeper",
      linePosition: "meio",
      ratings: { speed: 10, finishing: 10, defense: 10, passing: 10 },
    });
    expect(displayOvr(keeper)).toBe(99);
    expect(cardTier(keeper)).toBe("gold");
  });

  it("enforces tier boundaries at 50, 51, 74 and 75", () => {
    const ovr50 = normalizePlayer("b50", {
      linePosition: "meio",
      ratings: { speed: 5, finishing: 5, defense: 5, passing: 5 },
    });
    const ovr51 = normalizePlayer("s51", {
      linePosition: "meio",
      ratings: { speed: 5, finishing: 5, defense: 7, passing: 5 },
    });
    const ovr74 = normalizePlayer("s74", {
      linePosition: "ataque",
      ratings: { speed: 7, finishing: 8, defense: 5, passing: 6 },
    });
    const ovr75 = normalizePlayer("g75", {
      linePosition: "defesa",
      ratings: { speed: 8, finishing: 5, defense: 8, passing: 6 },
    });

    expect(displayOvr(ovr50)).toBe(50);
    expect(cardTier(ovr50)).toBe("bronze");

    expect(displayOvr(ovr51)).toBe(51);
    expect(cardTier(ovr51)).toBe("silver");

    expect(displayOvr(ovr74)).toBe(74);
    expect(cardTier(ovr74)).toBe("silver");

    expect(displayOvr(ovr75)).toBe(75);
    expect(cardTier(ovr75)).toBe("gold");
  });

  it("scales displayStat and caps at 99", () => {
    expect(displayStat(1)).toBe(10);
    expect(displayStat(7)).toBe(70);
    expect(displayStat(10)).toBe(99);
  });

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
