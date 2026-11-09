import { describe, expect, it } from "vitest";
import { describeEntry, diffPlayer, normalizeLogEntries, type LogEntry, type PlayerFields } from "./changeLog";
import { defaultKeeperStats, normalizePlayer } from "./players";
import type { Session } from "./session";

const fields: PlayerFields = {
  name: "Xana",
  role: "line",
  linePosition: "ataque",
  nationality: "br",
  club: "palmeiras",
  isMonthly: true,
  joinDate: "",
  stats: { line: { vel: 90, fin: 85, pas: 80, dri: 75, def: 30, fis: 70 }, keeper: defaultKeeperStats() },
};

function entry(extra: Partial<LogEntry>): LogEntry {
  return { id: "l1", by: "a@b.com", name: "A", uid: "u1", at: 1, action: "player.create", ...extra };
}

const session: Session = {
  id: "s1",
  date: "2026-11-03",
  createdAt: 1,
  status: "live",
  teams: [],
  keeperIds: [],
  matches: [{ id: "m1", number: 3, stage: "group", homeId: "t1", awayId: "t2", status: "finished", events: [] }],
};

const context = { byId: new Map([["p63", normalizePlayer("p63", { name: "Xana" })]]), sessions: [session] };

describe("diffPlayer", () => {
  it("lists only what changed, with stats by their keys", () => {
    const after = { ...fields, stats: { ...fields.stats, line: { ...fields.stats.line, vel: 83, def: 45 } } };
    expect(diffPlayer(fields, after)).toEqual({ vel: { from: 90, to: 83 }, def: { from: 30, to: 45 } });
  });

  it("prefixes keeper stats so they never clash with the outfield PAS", () => {
    const after = { ...fields, stats: { ...fields.stats, keeper: { ...fields.stats.keeper, pas: 70 } } };
    const changes = diffPlayer(fields, after);
    expect(changes).toEqual({ gk_pas: { from: 99, to: 70 } });
    expect(describeEntry(entry({ action: "player.edit", playerId: "p63", changes }), context)).toBe("Editou Xana: PAS (gol) 99 → 70");
  });

  it("is empty when nothing changed", () => {
    expect(diffPlayer(fields, { ...fields })).toEqual({});
  });

  it("tracks deactivation only when the form sends it", () => {
    expect(diffPlayer({ ...fields, active: true }, { ...fields, active: false })).toEqual({ active: { from: true, to: false } });
    expect(diffPlayer({ ...fields, active: true }, fields)).toEqual({});
  });
});

describe("describeEntry", () => {
  it("describes the 2.2 actions", () => {
    expect(describeEntry(entry({ action: "player.legend", playerId: "p63" }), context)).toBe("Tornou Xana Legend");
    expect(describeEntry(entry({ action: "player.unlegend", playerId: "p63" }), context)).toBe("Trouxe Xana de volta ao elenco");
    expect(describeEntry(entry({ action: "rebalance.publish", count: 36 }), context)).toBe("Publicou o rebalanceamento (36 jogadores)");
    expect(describeEntry(entry({ action: "rebalance.open" }), context)).toBe("Abriu um novo rebalanceamento");
  });

  it("still reads old entries with 1 to 10 keys", () => {
    const changes = { passing: { from: 7, to: 8 } };
    expect(describeEntry(entry({ action: "player.edit", playerId: "p63", changes }), context)).toBe("Editou Xana: PAS 7 → 8");
  });

  it("writes a rating change the way the cards show it", () => {
    const text = describeEntry(
      entry({ action: "player.edit", playerId: "p63", changes: { speed: { from: 10, to: 8 }, isMonthly: { from: true, to: false } } }),
      context,
    );
    expect(text).toBe("Editou Xana: VEL 10 → 8, Mensalista sim → não");
  });

  it("names the match and the night of an event", () => {
    const text = describeEntry(entry({ action: "event.remove", playerId: "p63", eventType: "goal", sessionId: "s1", matchId: "m1" }), context);
    expect(text).toBe("Desfez gol de Xana em Jogo 3 de 3 de novembro");
  });

  it("falls back to the stored name of a deleted player", () => {
    expect(describeEntry(entry({ action: "player.delete", playerId: "gone", playerName: "Fulano" }), context)).toBe("Excluiu Fulano");
  });
});

describe("normalizeLogEntries", () => {
  it("puts the newest first and drops broken rows", () => {
    const list = normalizeLogEntries({ a: { at: 1, action: "import" }, b: { at: 3, action: "import" }, c: "junk", d: { action: "import" } });
    expect(list.map((item) => item.id)).toEqual(["b", "a"]);
  });
});
