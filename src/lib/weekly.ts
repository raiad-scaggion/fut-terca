import { balanceTeams, TEAM_COUNT, TEAM_SIZE, type PairHistory } from "./draw";
import type { Player } from "./players";

export const WEEKLY_LINE_PLAYERS = TEAM_COUNT * TEAM_SIZE;
export const WEEKLY_KEEPERS = 2;
export const DEFAULT_MATCH_SECONDS = 10 * 60;

export const TEAM_COLORS = ["#f5c842", "#4f9dff", "#e05060", "#3dd68c", "#b57bff", "#ff9a3d", "#f1f2f4", "#ff6fae"];

export type TeamMode = "auto" | "manual";

export type WeeklyTeam = {
  color: string;
  playerIds: string[];
};

export type Weekly = {
  selectedIds: string[];
  keeperIds: string[];
  mode: TeamMode;
  teams: WeeklyTeam[];
};

function stringList(value: unknown): string[] {
  if (!value || typeof value !== "object") {
    return [];
  }
  return Object.values(value).filter((item): item is string => typeof item === "string");
}

function emptyTeams(): WeeklyTeam[] {
  return Array.from({ length: TEAM_COUNT }, (_, index) => ({ color: TEAM_COLORS[index], playerIds: [] }));
}

// Firebase leaves out empty lists, so a team with no players comes back without playerIds.
export function normalizeWeekly(raw: unknown): Weekly {
  const value = (raw ?? {}) as Record<string, unknown>;
  const stored = value.teams && typeof value.teams === "object" ? Object.values(value.teams as object) : [];

  return {
    selectedIds: stringList(value.selectedIds),
    keeperIds: stringList(value.keeperIds),
    mode: value.mode === "manual" ? "manual" : "auto",
    teams: emptyTeams().map((team, index) => {
      const saved = stored[index] as Partial<WeeklyTeam> | undefined;
      return { color: saved?.color ?? team.color, playerIds: stringList(saved?.playerIds) };
    }),
  };
}

function withoutPlayer(teams: WeeklyTeam[], playerId: string): WeeklyTeam[] {
  return teams.map((team) => ({ ...team, playerIds: team.playerIds.filter((id) => id !== playerId) }));
}

export function togglePlayer(weekly: Weekly, player: Player): Weekly {
  if (player.role === "keeper") {
    if (weekly.keeperIds.includes(player.id)) {
      return { ...weekly, keeperIds: weekly.keeperIds.filter((id) => id !== player.id) };
    }
    return weekly.keeperIds.length < WEEKLY_KEEPERS ? { ...weekly, keeperIds: [...weekly.keeperIds, player.id] } : weekly;
  }

  if (weekly.selectedIds.includes(player.id)) {
    return {
      ...weekly,
      selectedIds: weekly.selectedIds.filter((id) => id !== player.id),
      teams: withoutPlayer(weekly.teams, player.id),
    };
  }
  return weekly.selectedIds.length < WEEKLY_LINE_PLAYERS ? { ...weekly, selectedIds: [...weekly.selectedIds, player.id] } : weekly;
}

// Fills the free spots with mensalistas and keeps anyone already picked.
export function fillWithMonthly(weekly: Weekly, players: Player[]): Weekly {
  const monthly = players.filter((player) => player.active && player.isMonthly);
  const fill = (current: string[], candidates: Player[], limit: number) =>
    [...current, ...candidates.map((player) => player.id).filter((id) => !current.includes(id))].slice(0, limit);

  return {
    ...weekly,
    selectedIds: fill(weekly.selectedIds, monthly.filter((player) => player.role === "line"), WEEKLY_LINE_PLAYERS),
    keeperIds: fill(weekly.keeperIds, monthly.filter((player) => player.role === "keeper"), WEEKLY_KEEPERS),
  };
}

export function clearWeekly(weekly: Weekly): Weekly {
  return { selectedIds: [], keeperIds: [], mode: weekly.mode, teams: emptyTeams() };
}

export function drawTeams(weekly: Weekly, players: Player[], history: PairHistory, random: () => number = Math.random): Weekly {
  const selected = players.filter((player) => weekly.selectedIds.includes(player.id));
  if (selected.length !== WEEKLY_LINE_PLAYERS) {
    return weekly;
  }

  const drawn = balanceTeams(selected, history, random);
  return {
    ...weekly,
    teams: weekly.teams.map((team, index) => ({ ...team, playerIds: drawn[index].map((player) => player.id) })),
  };
}

export function addToTeam(weekly: Weekly, teamIndex: number, playerId: string): Weekly {
  if (weekly.teams[teamIndex].playerIds.length >= TEAM_SIZE) {
    return weekly;
  }
  return {
    ...weekly,
    teams: withoutPlayer(weekly.teams, playerId).map((team, index) =>
      index === teamIndex ? { ...team, playerIds: [...team.playerIds, playerId] } : team,
    ),
  };
}

export function removeFromTeams(weekly: Weekly, playerId: string): Weekly {
  return { ...weekly, teams: withoutPlayer(weekly.teams, playerId) };
}

export function nextOpenTeam(weekly: Weekly, fromIndex: number): number {
  for (let step = 0; step < TEAM_COUNT; step += 1) {
    const index = (fromIndex + step) % TEAM_COUNT;
    if (weekly.teams[index].playerIds.length < TEAM_SIZE) {
      return index;
    }
  }
  return fromIndex;
}

// Two teams can't share a color, so picking one that's taken swaps the two.
export function setTeamColor(weekly: Weekly, teamIndex: number, color: string): Weekly {
  const previous = weekly.teams[teamIndex].color;
  return {
    ...weekly,
    teams: weekly.teams.map((team, index) => {
      if (index === teamIndex) {
        return { ...team, color };
      }
      return team.color === color ? { ...team, color: previous } : team;
    }),
  };
}

export function unassignedPlayerIds(weekly: Weekly): string[] {
  const assigned = new Set(weekly.teams.flatMap((team) => team.playerIds));
  return weekly.selectedIds.filter((id) => !assigned.has(id));
}

export function isReadyToConfirm(weekly: Weekly): boolean {
  return weekly.keeperIds.length === WEEKLY_KEEPERS && weekly.teams.every((team) => team.playerIds.length === TEAM_SIZE);
}

// Circle method: every team plays every other once, spread across rounds.
export function buildRoundRobin(teamIds: string[]): [string, string][] {
  const ids = [...teamIds];
  const pairs: [string, string][] = [];
  for (let round = 0; round < ids.length - 1; round += 1) {
    for (let i = 0; i < ids.length / 2; i += 1) {
      pairs.push([ids[i], ids[ids.length - 1 - i]]);
    }
    ids.splice(1, 0, ids.pop() as string);
  }
  return pairs;
}

export function buildSession(weekly: Weekly, date: string, createdAt: unknown) {
  const teams = Object.fromEntries(
    weekly.teams.map((team, index) => [`t${index + 1}`, { name: `Time ${index + 1}`, color: team.color, playerIds: team.playerIds }]),
  );
  const matches = Object.fromEntries(
    buildRoundRobin(Object.keys(teams)).map(([homeId, awayId], index) => [
      `m${index + 1}`,
      {
        number: index + 1,
        stage: "group",
        homeId,
        awayId,
        status: "pending",
        timer: { durationSec: DEFAULT_MATCH_SECONDS, running: false, startedAt: 0, elapsedMs: 0 },
      },
    ]),
  );

  return { date, createdAt, status: "live", teams, keeperIds: weekly.keeperIds, matches };
}
