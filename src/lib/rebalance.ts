import {
  displayOvr,
  KEEPER_STATS,
  LINE_STATS,
  positionCode,
  type KeeperStats,
  type LineStats,
  type Player,
  type PlayerStats,
  type StatDef,
} from "./players";

// One admin's numbers for one player. Only the keys of the player's role at the time are saved.
export type Vote = { values: Record<string, number>; at: number };
export type VotesByPlayer = Record<string, Vote>;
export type VotesByAdmin = Record<string, VotesByPlayer>;

export type RoundStatus = "open" | "closed";
export type Round = { status: RoundStatus; openedAt: number; publishedAt?: number };

export type AdminProgress = { done: number; total: number; remaining: number };

export type Average = {
  player: Player;
  // The averaged set for the player's role. Players nobody rated keep their current numbers.
  values: Record<string, number>;
  votes: number;
  ovr: number;
};

export function roleDefs(player: Pick<Player, "role">): StatDef<string>[] {
  return player.role === "keeper" ? KEEPER_STATS : LINE_STATS;
}

export function currentValues(player: Pick<Player, "role" | "stats">): Record<string, number> {
  return player.role === "keeper" ? { ...player.stats.keeper } : { ...player.stats.line };
}

// A round nobody opened yet counts as open, so the first one starts with the release.
export function normalizeRound(raw: unknown): Round {
  const value = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    status: value.status === "closed" ? "closed" : "open",
    openedAt: typeof value.openedAt === "number" ? value.openedAt : 0,
    ...(typeof value.publishedAt === "number" ? { publishedAt: value.publishedAt } : {}),
  };
}

function isStatValue(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100;
}

export function normalizeVotes(raw: unknown): VotesByPlayer {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  const votes: VotesByPlayer = {};
  for (const [playerId, rawVote] of Object.entries(raw as Record<string, unknown>)) {
    if (!rawVote || typeof rawVote !== "object") {
      continue;
    }
    const { at, ...rest } = rawVote as Record<string, unknown>;
    const values = Object.fromEntries(Object.entries(rest).filter(([, value]) => isStatValue(value))) as Record<string, number>;
    votes[playerId] = { values, at: typeof at === "number" ? at : 0 };
  }
  return votes;
}

export function normalizeAllVotes(raw: unknown): VotesByAdmin {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  return Object.fromEntries(Object.entries(raw as Record<string, unknown>).map(([key, value]) => [key, normalizeVotes(value)]));
}

// Every active player who isn't a Legend, minus the admin's own player. Outfield first, then keepers.
export function playersToRate(players: Player[], ownPlayerId: string | null): Player[] {
  const list = players.filter((player) => player.active && !player.legend && player.id !== ownPlayerId);
  return [...list.filter((player) => player.role !== "keeper"), ...list.filter((player) => player.role === "keeper")];
}

// A vote counts only when it has all six numbers of the player's current role.
export function isCompleteVote(player: Pick<Player, "role">, vote: Vote | undefined): vote is Vote {
  return Boolean(vote) && roleDefs(player).every(({ key }) => isStatValue(vote!.values[key]));
}

export function adminProgress(players: Player[], ownPlayerId: string | null, votes: VotesByPlayer): AdminProgress {
  const list = playersToRate(players, ownPlayerId);
  const done = list.filter((player) => isCompleteVote(player, votes[player.id])).length;
  return { done, total: list.length, remaining: list.length - done };
}

// What the admin sees in the sheet: their saved vote, or the player's current numbers.
export function startingValues(player: Player, vote: Vote | undefined): Record<string, number> {
  return isCompleteVote(player, vote)
    ? Object.fromEntries(roleDefs(player).map(({ key }) => [key, vote.values[key]]))
    : currentValues(player);
}

export function computeAverages(players: Player[], votes: VotesByAdmin, adminPlayers: Record<string, string>): Average[] {
  return playersToRate(players, null).map((player) => {
    const complete = Object.entries(votes)
      .filter(([admin]) => adminPlayers[admin] !== player.id)
      .map(([, byPlayer]) => byPlayer[player.id])
      .filter((vote): vote is Vote => isCompleteVote(player, vote));

    const values =
      complete.length === 0
        ? currentValues(player)
        : Object.fromEntries(
            roleDefs(player).map(({ key }) => [
              key,
              Math.round(complete.reduce((sum, vote) => sum + vote.values[key], 0) / complete.length),
            ]),
          );

    return { player, values, votes: complete.length, ovr: ovrWith(player, values) };
  });
}

// The OVR the player would have with these numbers for their role.
export function ovrWith(player: Player, values: Record<string, number>): number {
  return displayOvr({ ...player, stats: withValues(player, values) });
}

function withValues(player: Pick<Player, "role" | "stats">, values: Record<string, number>): PlayerStats {
  return player.role === "keeper"
    ? { ...player.stats, keeper: values as KeeperStats }
    : { ...player.stats, line: values as LineStats };
}

export function averageLine(average: Average): string {
  const stats = roleDefs(average.player)
    .map(({ key, short }) => `${short} ${average.values[key]}`)
    .join(" · ");
  const note = average.votes === 0 ? " (sem votos, ficam as notas atuais)" : "";
  return `${average.player.name} (${positionCode(average.player)}) ${average.ovr}: ${stats}${note}`;
}

export function exportText(averages: Average[]): string {
  const line = averages.filter((average) => average.player.role !== "keeper");
  const keepers = averages.filter((average) => average.player.role === "keeper");
  const parts = ["*Rebalanceamento do Fut de Terça*"];
  if (line.length) {
    parts.push("", "*Linha*", ...line.map(averageLine));
  }
  if (keepers.length) {
    parts.push("", "*Goleiros*", ...keepers.map(averageLine));
  }
  return parts.join("\n");
}

// The multi-path write that publishes the averages. Players nobody rated are left alone.
export function publishPaths(averages: Average[], logId: string): Record<string, unknown> {
  const paths: Record<string, unknown> = {};
  for (const average of averages) {
    if (average.votes === 0) {
      continue;
    }
    const set = average.player.role === "keeper" ? "keeper" : "line";
    paths[`players/${average.player.id}/stats/${set}`] = average.values;
    paths[`players/${average.player.id}/logId`] = logId;
  }
  return paths;
}

export function publishedCount(averages: Average[]): number {
  return averages.filter((average) => average.votes > 0).length;
}
