import { describe, expect, it } from "vitest";
import night from "./fixtures/legacy-night-2026-11-03.json";
import { getMatchScore } from "./cup";
import { convertLegacyNight, missingLegacyPlayers } from "./legacyNight";
import { normalizePlayer } from "./players";
import { normalizeSession } from "./session";
import { championKeeperId, computeStats } from "./stats";

const keepers = { champion: "p23", other: "p42" };
const converted = convertLegacyNight(night, "2026-11-03", keepers);
const session = normalizeSession("s1", converted.session);

describe("convertLegacyNight", () => {
  it("keeps the teams, matches and scores of the old night", () => {
    expect(session.teams.map((team) => team.id)).toEqual(["t1", "t2", "t3", "t4"]);
    expect(session.teams[3].playerIds).toEqual(["p62", "p44", "p27", "p22"]);
    expect(session.matches).toHaveLength(10);
    expect(session.matches.every((match) => match.status === "finished")).toBe(true);
    const final = session.matches[9];
    expect(final).toMatchObject({ stage: "final", label: "Final", homeId: "t3", awayId: "t4" });
    expect(getMatchScore(final)).toEqual({ home: 1, away: 2 });
    const events = session.matches.flatMap((match) => match.events);
    expect(events.filter((event) => event.type === "goal")).toHaveLength(20);
    expect(events.filter((event) => event.type === "assist")).toHaveLength(9);
  });

  it("works out the champion with this app's rules", () => {
    expect(converted.championId).toBe("t4");
    expect(converted.session).toMatchObject({ date: "2026-11-03", status: "finished", championId: "t4" });
  });

  it("puts the champion keeper in the champion's goal and both keepers in every match", () => {
    expect(session.keeperIds).toEqual(["p23", "p42"]);
    for (const match of session.matches) {
      expect([match.keepers?.home, match.keepers?.away].sort()).toEqual(["p23", "p42"]);
      if (match.homeId === "t4") expect(match.keepers?.home).toBe("p23");
      if (match.awayId === "t4") expect(match.keepers?.away).toBe("p23");
    }
    expect(championKeeperId(session)).toBe("p23");
  });

  it("gives every player their games, goals and the title", () => {
    const ids = [...new Set(converted.players.map((player) => player.id)), "p23", "p42"];
    const players = ids.map((id) => normalizePlayer(id, { name: id }));
    const stats = computeStats(players, [session]);
    expect(stats.get("p23")).toMatchObject({ games: 10, saves: 0, titles: 1 });
    expect(stats.get("p42")).toMatchObject({ games: 10, saves: 0, titles: 0 });
    expect(stats.get("p22")?.titles).toBe(1);
    expect(stats.get("p35")?.titles).toBe(0);
    const goals = [...stats.values()].reduce((sum, item) => sum + item.goals, 0);
    expect(goals).toBe(20);
  });

  it("lists the old players this app doesn't have yet", () => {
    const known = converted.players
      .filter((player) => player.legacyId !== 70 && player.legacyId !== 71)
      .map((player) => normalizePlayer(player.id, { name: player.name }));
    expect(missingLegacyPlayers(night, known)).toEqual([
      { legacyId: 71, id: "p71", name: "Otavio" },
      { legacyId: 70, id: "p70", name: "Davi" },
    ]);
  });

  it("refuses a night that has no champion", () => {
    const unfinished = { ...night, matches: night.matches.slice(0, 6) };
    expect(() => convertLegacyNight(unfinished, "2026-11-03", keepers)).toThrow();
  });
});
