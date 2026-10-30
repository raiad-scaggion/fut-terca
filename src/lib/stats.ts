import { displayOvr, type Player, type PlayerBaseline } from "./players";
import type { MatchEventType, Session } from "./session";

export type PlayerStats = PlayerBaseline & { games: number };
export type RankingKey = keyof PlayerBaseline | "contributions";

const EVENT_STAT: Record<MatchEventType, keyof PlayerBaseline> = {
  goal: "goals",
  assist: "assists",
  save: "saves",
};

const MONTH_NAMES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

// The keeper who defended the champion's goal in the final wins the title with that team.
export function championKeeperId(session: Session): string | undefined {
  const final = session.matches.find((match) => match.stage === "final");
  if (!final?.keepers || !session.championId) {
    return undefined;
  }
  return final.homeId === session.championId ? final.keepers.home : final.keepers.away;
}

// Season totals are always recomputed from the baseline and the events, so fixing a finished match
// fixes every table.
export function computeStats(players: Player[], sessions: Session[]): Map<string, PlayerStats> {
  const stats = new Map<string, PlayerStats>(
    players.map((player) => [player.id, { ...player.baseline, games: 0 }]),
  );

  for (const session of sessions) {
    const teamById = new Map(session.teams.map((team) => [team.id, team]));

    for (const match of session.matches) {
      if (match.status !== "finished") {
        continue;
      }

      const played = new Set<string>();
      for (const playerId of teamById.get(match.homeId)?.playerIds ?? []) {
        played.add(playerId);
      }
      for (const playerId of teamById.get(match.awayId)?.playerIds ?? []) {
        played.add(playerId);
      }
      if (match.keepers?.home) {
        played.add(match.keepers.home);
      }
      if (match.keepers?.away) {
        played.add(match.keepers.away);
      }
      for (const playerId of played) {
        const playerStats = stats.get(playerId);
        if (playerStats) {
          playerStats.games += 1;
        }
      }

      for (const event of match.events) {
        const playerStats = stats.get(event.playerId);
        const stat = EVENT_STAT[event.type];
        if (playerStats && stat) {
          playerStats[stat] += 1;
        }
      }
    }

    const champion = session.teams.find((team) => team.id === session.championId);
    const keeperId = champion ? championKeeperId(session) : undefined;
    for (const playerId of [...(champion?.playerIds ?? []), ...(keeperId ? [keeperId] : [])]) {
      const playerStats = stats.get(playerId);
      if (playerStats) {
        playerStats.titles += 1;
      }
    }
  }

  return stats;
}

export type RankingRow = {
  player: Player;
  value: number;
  position: number;
};

function rankingValue(row: PlayerStats | PlayerBaseline, key: RankingKey): number {
  return key === "contributions" ? row.goals + row.assists : row[key];
}

// Only players with something to show are listed, including ones who left the group. Equal values
// share a position (1, 2, 2, 4), since nobody really beat anybody on a tie.
export function buildRanking(players: Player[], stats: Map<string, PlayerStats>, key: RankingKey): RankingRow[] {
  const sorted = players
    .map((player) => ({
      player,
      value: rankingValue(stats.get(player.id) ?? player.baseline, key),
    }))
    .filter((row) => row.value > 0)
    .sort(
      (a, b) =>
        b.value - a.value ||
        displayOvr(b.player) - displayOvr(a.player) ||
        a.player.name.localeCompare(b.player.name, "pt-BR", { sensitivity: "base" }),
    );

  let position = 0;
  return sorted.map((row, index) => {
    if (index === 0 || row.value !== sorted[index - 1].value) {
      position = index + 1;
    }
    return { ...row, position };
  });
}

export function zeroBaselines(players: Player[]): Player[] {
  return players.map((player) => ({
    ...player,
    baseline: { goals: 0, assists: 0, saves: 0, titles: 0 },
  }));
}

export function monthOf(date: string): string {
  return date.slice(0, 7);
}

export function sessionsInMonth(sessions: Session[], month: string): Session[] {
  return sessions.filter((session) => monthOf(session.date) === month);
}

export function listMonths(sessions: Session[], today: string): string[] {
  const months = new Set<string>();
  const current = monthOf(today);
  if (current) {
    months.add(current);
  }
  for (const session of sessions) {
    const month = monthOf(session.date);
    if (month) {
      months.add(month);
    }
  }
  return [...months].sort((a, b) => b.localeCompare(a));
}

export function previousMonth(month: string): string {
  const [yearPart, monthPart] = month.split("-");
  const year = Number(yearPart);
  const monthNum = Number(monthPart);
  if (monthNum === 1) {
    return `${year - 1}-12`;
  }
  return `${year}-${String(monthNum - 1).padStart(2, "0")}`;
}

// Parsed by hand so no time zone can shift the month.
export function monthLabel(month: string): string {
  const [yearPart, monthPart] = month.split("-");
  const name = MONTH_NAMES[Number(monthPart) - 1] ?? monthPart;
  return `${name} de ${yearPart}`;
}

export function perGame(value: number, games: number): number {
  return games === 0 ? 0 : value / games;
}

export function formatAverage(value: number): string {
  return value.toFixed(2).replace(".", ",");
}
