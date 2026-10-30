import type { Player } from "./players";
import type { Session } from "./session";
import {
  computeStats,
  monthOf,
  previousMonth,
  sessionsInMonth,
  zeroBaselines,
  type PlayerStats,
} from "./stats";

export type AwardKey = "craque" | "artilheiro" | "garcom" | "paredao";
export const AWARD_ORDER: AwardKey[] = ["craque", "artilheiro", "garcom", "paredao"];
export const AWARD_LABELS: Record<AwardKey, string> = {
  craque: "Craque do Mês",
  artilheiro: "Artilheiro",
  garcom: "Garçom",
  paredao: "Paredão",
};
export type MonthlyAwards = { month: string } & Record<AwardKey, string[]>;

function awardValue(stats: PlayerStats, key: AwardKey): number {
  switch (key) {
    case "craque":
      return stats.goals + stats.assists;
    case "artilheiro":
      return stats.goals;
    case "garcom":
      return stats.assists;
    case "paredao":
      return stats.saves;
  }
}

function winnersFor(players: Player[], stats: Map<string, PlayerStats>, key: AwardKey): string[] {
  let max = 0;
  for (const player of players) {
    const playerStats = stats.get(player.id);
    if (!playerStats) {
      continue;
    }
    const val = awardValue(playerStats, key);
    if (val > max) {
      max = val;
    }
  }
  if (max <= 0) {
    return [];
  }
  return players
    .filter((player) => {
      const playerStats = stats.get(player.id);
      return playerStats !== undefined && awardValue(playerStats, key) === max;
    })
    .map((player) => player.id);
}

export function getMonthlyAwards(
  players: Player[],
  sessions: Session[],
  month: string,
): MonthlyAwards {
  const stats = computeStats(zeroBaselines(players), sessionsInMonth(sessions, month));
  return {
    month,
    craque: winnersFor(players, stats, "craque"),
    artilheiro: winnersFor(players, stats, "artilheiro"),
    garcom: winnersFor(players, stats, "garcom"),
    paredao: winnersFor(players, stats, "paredao"),
  };
}

export function getCurrentAwards(
  players: Player[],
  sessions: Session[],
  today: string,
): MonthlyAwards {
  return getMonthlyAwards(players, sessions, previousMonth(monthOf(today)));
}

export function getPlayerAward(awards: MonthlyAwards, playerId: string): AwardKey | null {
  for (const key of AWARD_ORDER) {
    if (awards[key].includes(playerId)) {
      return key;
    }
  }
  return null;
}
