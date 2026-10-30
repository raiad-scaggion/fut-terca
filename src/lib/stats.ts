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

export type RankingRow = {
  player: Player;
  value: number;
  position: number;
};

// Only players with something to show are listed, including ones who left the group. Equal values
// share a position (1, 2, 2, 4), since nobody really beat anybody on a tie.
export function buildRanking(players: Player[], stats: Map<string, PlayerStats>, key: keyof PlayerStats): RankingRow[] {
  const sorted = players
    .map((player) => ({ player, value: (stats.get(player.id) ?? player.baseline)[key] }))
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
