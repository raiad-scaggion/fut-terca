import { describe, expect, it } from "vitest";
import { parseCsv, parsePlayersCsv, planImport } from "./importCsv";
import { cardTier, displayOvr, normalizePlayer, type Player } from "./players";

const HEADER =
  "id,name,goals,assists,championships,speed,finishing,defense,passing,linePosition,role,isMonthly,joinDate";

const SAMPLE_CSV = [
  HEADER,
  "69,Neto,2,0,1,7,6,8,8,meio,linha,FALSE,",
  "67,JP Canhoto,1,0,1,6,7,8,8,defesa,linha,FALSE,",
  "63,Xana,31,5,4,10,9,3,8,ataque,linha,TRUE,2025-05-10",
  "34,Baguete,1,5,0,10,10,10,10,meio,goleiro,TRUE,",
  "23,Xester,5,5,0,10,10,10,10,meio,goleiro,TRUE,",
].join("\r\n");

describe("parseCsv", () => {
  it("strips UTF-8 BOM, handles CRLF/LF, blank lines, commas and doubled quotes in quoted fields", () => {
    const raw =
      '\uFEFFcol1,col2,col3\r\n\r\n"a, b","he said ""oi""",plain\n   \nx,y,z';
    expect(parseCsv(raw)).toEqual([
      ["col1", "col2", "col3"],
      ["a, b", 'he said "oi"', "plain"],
      ["x", "y", "z"],
    ]);
  });
});

describe("parsePlayersCsv", () => {
  it("throws a clear message naming any missing required column", () => {
    const badCsv =
      "id,name,goals,assists,championships,speed,defense,passing,linePosition,role,isMonthly,joinDate\n1,Neto,0,0,0,5,5,5,meio,linha,FALSE,";
    expect(() => parsePlayersCsv(badCsv)).toThrow(
      "A coluna 'finishing' não está no arquivo. Exporte a aba players da planilha de novo.",
    );
  });

  it("supports columns in any order, skips empty names, clamps/defaults bad values and reports warnings", () => {
    const reordered = [
      "name,id,role,linePosition,speed,finishing,defense,passing,goals,assists,championships,isMonthly,joinDate",
      " ,99,linha,meio,5,5,5,5,0,0,0,FALSE,",
      "Teste,10,goleiro,invalida,0,12,abc,8,2,xyz,1,true,2026-02-10",
      "Outro,11,linha,ataque,6,7,5,6,1,0,0,no,10/02/2026",
    ].join("\n");

    const result = parsePlayersCsv(reordered);
    expect(result.rows).toHaveLength(2);
    expect(result.warnings.length).toBeGreaterThanOrEqual(4);

    const [teste, outro] = result.rows;
    expect(teste).toEqual({
      id: "p10",
      legacyId: 10,
      name: "Teste",
      role: "keeper",
      linePosition: "meio",
      isMonthly: true,
      joinDate: "2026-02-10",
      ratings: { speed: 1, finishing: 10, defense: 5, passing: 8 },
      baseline: { goals: 2, assists: 0, saves: 0, titles: 1 },
    });
    expect(outro.isMonthly).toBe(false);
    expect(outro.joinDate).toBe("");
  });

  it("merges duplicate names (ignoring accents and case) the way the old app did", () => {
    const csv = [
      HEADER,
      "10,João,2,1,1,6,7,5,8,meio,linha,FALSE,2026-03-10",
      "11,joao,3,4,0,8,5,6,7,ataque,goleiro,TRUE,2026-01-05",
    ].join("\n");

    const result = parsePlayersCsv(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.merges).toHaveLength(1);

    const merged = result.rows[0];
    expect(merged.id).toBe("p10");
    expect(merged.legacyId).toBe(10);
    expect(merged.name).toBe("João");
    expect(merged.role).toBe("keeper");
    expect(merged.isMonthly).toBe(true);
    expect(merged.joinDate).toBe("2026-01-05");
    expect(merged.ratings).toEqual({
      speed: 8,
      finishing: 7,
      defense: 6,
      passing: 8,
    });
    expect(merged.baseline).toEqual({
      goals: 5,
      assists: 5,
      saves: 0,
      titles: 1,
    });
  });

  it("computes file totals and preserves player keys and OVR", () => {
    const parsed = parsePlayersCsv(SAMPLE_CSV);

    expect(parsed.totals).toEqual({
      players: 5,
      keepers: 2,
      mensalistas: 3,
      goals: 40,
      assists: 15,
      titles: 6,
    });
    expect(parsed.warnings).toEqual([]);
    expect(parsed.merges).toEqual([]);

    const keepers = parsed.rows.filter((p) => p.role === "keeper").map((p) => p.name);
    expect(keepers).toEqual(["Baguete", "Xester"]);

    const neto = parsed.rows.find((p) => p.name === "Neto")!;
    expect(neto.id).toBe("p69");
    expect(displayOvr(neto)).toBe(72);
    expect(cardTier(neto)).toBe("silver");
  });
});

describe("planImport", () => {
  it("plans creates on first run and 0 creates / 0 updates on second run", () => {
    const firstPlan = planImport(SAMPLE_CSV, []);
    expect(firstPlan.create).toHaveLength(5);
    expect(firstPlan.update).toHaveLength(0);
    expect(firstPlan.unchanged).toHaveLength(0);

    // Simulate database state after applying the first import, including deactivated players and timestamps.
    const existingPlayers: Player[] = firstPlan.create.map((row, idx) =>
      normalizePlayer(row.id, {
        ...row,
        active: idx !== 0,
        createdAt: 1700000000000 + idx,
      }),
    );

    const secondPlan = planImport(SAMPLE_CSV, existingPlayers);
    expect(secondPlan.create).toHaveLength(0);
    expect(secondPlan.update).toHaveLength(0);
    expect(secondPlan.unchanged).toHaveLength(5);
  });

  it("matches by legacyId first, then by normalized name, and detects updates", () => {
    const existing: Player[] = [
      normalizePlayer("p69", {
        name: "Neto Antigo",
        legacyId: 69,
        role: "line",
        linePosition: "meio",
        isMonthly: false,
        joinDate: "",
        ratings: { speed: 7, finishing: 6, defense: 8, passing: 8 },
        baseline: { goals: 2, assists: 0, saves: 0, titles: 1 },
      }),
      normalizePlayer("-PushKey1", {
        name: "jp canhoto",
        role: "line",
        linePosition: "defesa",
        isMonthly: false,
        joinDate: "",
        ratings: { speed: 6, finishing: 7, defense: 8, passing: 8 },
        baseline: { goals: 1, assists: 0, saves: 0, titles: 1 },
      }),
    ];

    const plan = planImport(SAMPLE_CSV, existing);
    expect(plan.create).toHaveLength(3);
    expect(plan.update).toHaveLength(2);
    expect(plan.update.map((p) => p.id)).toEqual(["p69", "-PushKey1"]);
  });
});
