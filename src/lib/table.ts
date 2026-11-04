import { getMatchScore } from "./cup";
import type { Player } from "./players";
import type { Match, Session } from "./session";
import { championKeeperId, computeStats, perGame, zeroBaselines } from "./stats";

// The Ranking table has one view for outfield and one for goal, since a keeper's numbers are a
// different game. Totals (titles, goals, assists, saves) include the Sheet's baseline. Games, nights,
// averages and everything the Sheet never tracked count only what was played in the app.

export type LineRow = {
  player: Player;
  titles: number;
  goals: number;
  assists: number;
  contributions: number;
  games: number;
  nights: number;
  ownGoals: number;
  goalsPerNight: number | null;
  assistsPerNight: number | null;
  titlesPerNight: number | null;
};

export type KeeperRow = {
  player: Player;
  games: number;
  nights: number;
  saves: number;
  savesPerGame: number | null;
  conceded: number;
  concededPerGame: number | null;
  cleanSheets: number;
  howlers: number;
  ownGoals: number;
  titles: number;
  titlesPerNight: number | null;
};

type SlotTally = {
  lineGames: number;
  keeperGames: number;
  keeperNights: Set<string>;
  conceded: number;
  cleanSheets: number;
  keeperHowlers: number;
  keeperOwnGoals: number;
  keeperSaves: number;
  keeperTitles: number;
};

function average(value: number, count: number): number | null {
  return count === 0 ? null : perGame(value, count);
}

function keptSides(match: Match, playerId: string): ("home" | "away")[] {
  const sides: ("home" | "away")[] = [];
  if (match.keepers?.home === playerId) sides.push("home");
  if (match.keepers?.away === playerId) sides.push("away");
  return sides;
}

// Splits each player's app games by where they played: on a team's line or in a team's goal.
function tallySlots(players: Player[], sessions: Session[]): Map<string, SlotTally> {
  const tallies = new Map<string, SlotTally>(
    players.map((player) => [
      player.id,
      {
        lineGames: 0,
        keeperGames: 0,
        keeperNights: new Set<string>(),
        conceded: 0,
        cleanSheets: 0,
        keeperHowlers: 0,
        keeperOwnGoals: 0,
        keeperSaves: 0,
        keeperTitles: 0,
      },
    ]),
  );

  for (const session of sessions) {
    const teamById = new Map(session.teams.map((team) => [team.id, team]));

    for (const match of session.matches) {
      if (match.status !== "finished") {
        continue;
      }
      const score = getMatchScore(match);
      const keepers = new Set([match.keepers?.home, match.keepers?.away].filter((id): id is string => Boolean(id)));

      for (const teamId of [match.homeId, match.awayId]) {
        for (const playerId of teamById.get(teamId)?.playerIds ?? []) {
          const tally = tallies.get(playerId);
          if (tally && !keepers.has(playerId)) {
            tally.lineGames += 1;
          }
        }
      }

      for (const keeperId of keepers) {
        const tally = tallies.get(keeperId);
        if (!tally) {
          continue;
        }
        tally.keeperGames += 1;
        tally.keeperNights.add(session.id);
        for (const side of keptSides(match, keeperId)) {
          const against = side === "home" ? score.away : score.home;
          tally.conceded += against;
          if (against === 0) {
            tally.cleanSheets += 1;
          }
        }
        for (const event of match.events) {
          if (event.playerId !== keeperId) continue;
          if (event.type === "howler") tally.keeperHowlers += 1;
          if (event.type === "ownGoal") tally.keeperOwnGoals += 1;
          if (event.type === "save") tally.keeperSaves += 1;
        }
      }
    }

    const keeperId = session.championId ? championKeeperId(session) : undefined;
    const tally = keeperId ? tallies.get(keeperId) : undefined;
    if (tally) {
      tally.keeperTitles += 1;
    }
  }

  return tallies;
}

function hasNumbers(values: number[]): boolean {
  return values.some((value) => value > 0);
}

// Pass zeroBaselines(players) and one month's sessions for the month view.
export function buildLineTable(players: Player[], sessions: Session[]): LineRow[] {
  const totals = computeStats(players, sessions);
  const app = computeStats(zeroBaselines(players), sessions);
  const slots = tallySlots(players, sessions);

  return players.flatMap((player) => {
    const total = totals.get(player.id);
    const inApp = app.get(player.id);
    const slot = slots.get(player.id);
    if (!total || !inApp || !slot || (player.role !== "line" && slot.lineGames === 0)) {
      return [];
    }
    const row: LineRow = {
      player,
      titles: total.titles,
      goals: total.goals,
      assists: total.assists,
      contributions: total.goals + total.assists,
      games: slot.lineGames,
      nights: inApp.nights,
      ownGoals: total.ownGoals,
      goalsPerNight: average(inApp.goals, inApp.nights),
      assistsPerNight: average(inApp.assists, inApp.nights),
      titlesPerNight: average(inApp.titles, inApp.nights),
    };
    return hasNumbers([row.titles, row.goals, row.assists, row.games, row.ownGoals]) ? [row] : [];
  });
}

export function buildKeeperTable(players: Player[], sessions: Session[]): KeeperRow[] {
  const slots = tallySlots(players, sessions);

  return players.flatMap((player) => {
    const slot = slots.get(player.id);
    const usualKeeper = player.role === "keeper";
    if (!slot || (!usualKeeper && slot.keeperGames === 0)) {
      return [];
    }
    const nights = slot.keeperNights.size;
    const row: KeeperRow = {
      player,
      games: slot.keeperGames,
      nights,
      saves: (usualKeeper ? player.baseline.saves : 0) + slot.keeperSaves,
      savesPerGame: average(slot.keeperSaves, slot.keeperGames),
      conceded: slot.conceded,
      concededPerGame: average(slot.conceded, slot.keeperGames),
      cleanSheets: slot.cleanSheets,
      howlers: slot.keeperHowlers,
      ownGoals: slot.keeperOwnGoals,
      titles: (usualKeeper ? player.baseline.titles : 0) + slot.keeperTitles,
      titlesPerNight: average(slot.keeperTitles, nights),
    };
    return hasNumbers([row.games, row.saves, row.titles]) ? [row] : [];
  });
}

// Highest first. A missing average ("-") always goes last, and ties fall back to the name.
export function sortTable<T extends { player: Player }>(rows: T[], value: (row: T) => number | null): T[] {
  return [...rows].sort((a, b) => {
    const [x, y] = [value(a), value(b)];
    if (x !== y) {
      if (x === null) return 1;
      if (y === null) return -1;
      return y - x;
    }
    return a.player.name.localeCompare(b.player.name, "pt-BR", { sensitivity: "base" });
  });
}
