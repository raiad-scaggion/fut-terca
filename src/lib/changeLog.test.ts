import { describe, expect, it } from "vitest";
import { describeEntry, diffPlayer, normalizeLogEntries, type LogEntry, type PlayerFields } from "./changeLog";
import { normalizePlayer } from "./players";
import type { Session } from "./session";

const fields: PlayerFields = {
  name: "Xana",
  role: "line",
  linePosition: "ataque",
  nationality: "br",
  club: "palmeiras",
  isMonthly: true,
  joinDate: "",
  ratings: { speed: 10, finishing: 9, defense: 3, passing: 8 },
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
  it("lists only what changed, with ratings by their short names", () => {
    const after = { ...fields, ratings: { ...fields.ratings, speed: 8, defense: 5 } };
    expect(diffPlayer(fields, after)).toEqual({ speed: { from: 10, to: 8 }, defense: { from: 3, to: 5 } });
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
