import { displayOvr, type Player, type PlayerBaseline } from "./players";
import type { MatchEventType, Session } from "./session";

export type PlayerStats = PlayerBaseline;

const EVENT_STAT: Record<MatchEventType, keyof PlayerStats> = {
  goal: "goals",
  assist: "assists",
  save: "saves",
};

// Season totals are always recomputed from the baseline and the events, so fixing a finished match
// fixes every table. Keepers play for every team, so a title goes only to the champion team's players.
export function computeStats(players: Player[], sessions: Session[]): Map<string, PlayerStats> {
  const stats = new Map(players.map((player) => [player.id, { ...player.baseline }]));

  for (const session of sessions) {
    for (const match of session.matches) {
      if (match.status !== "finished") {
        continue;
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
    for (const playerId of champion?.playerIds ?? []) {
      const playerStats = stats.get(playerId);
      if (playerStats) {
        playerStats.titles += 1;
      }
    }
  }

  return stats;
}

export type RankingKey = keyof PlayerStats | "ovr";

export type RankingRow = PlayerStats & {
  player: Player;
  ovr: number;
};

// A player who left stays in the ranking while they have numbers. One with none has nothing to show.
export function buildRanking(players: Player[], stats: Map<string, PlayerStats>, sortBy: RankingKey): RankingRow[] {
  return players
    .map((player) => {
      const playerStats = stats.get(player.id) ?? player.baseline;
      return { ...playerStats, player, ovr: displayOvr(player) };
    })
    .filter((row) => row.player.active || row.goals + row.assists + row.saves + row.titles > 0)
    .sort(
      (a, b) =>
        b[sortBy] - a[sortBy] ||
        b.goals - a.goals ||
        b.assists - a.assists ||
        a.player.name.localeCompare(b.player.name, "pt-BR", { sensitivity: "base" }),
    );
}
