import type { MatchTimer } from "./clock";

export type MatchEventType = "goal" | "assist" | "save";
export type MatchStage = "group" | "semi" | "third" | "final";
export type MatchStatus = "pending" | "live" | "finished";
export type SessionStatus = "draft" | "live" | "finished";

export type MatchEvent = {
  id: string;
  type: MatchEventType;
  playerId: string;
  teamId: string;
  at: number;
};

export type Match = {
  id: string;
  number: number;
  stage: MatchStage;
  label?: string;
  homeId: string;
  awayId: string;
  keepers?: { home: string; away: string };
  status: MatchStatus;
  timer?: MatchTimer;
  winnerId?: string;
  events: MatchEvent[];
};

export type Team = {
  id: string;
  name: string;
  color: string;
  playerIds: string[];
};

export type Session = {
  id: string;
  date: string;
  createdAt: number;
  status: SessionStatus;
  teams: Team[];
  keeperIds: string[];
  matches: Match[];
  championId?: string;
};

type Raw = Record<string, unknown>;

// Firebase returns lists as objects or sparse arrays, and leaves out empty ones.
function entries(value: unknown): [string, Raw][] {
  if (!value || typeof value !== "object") {
    return [];
  }
  return Object.entries(value).filter((entry): entry is [string, Raw] => Boolean(entry[1]) && typeof entry[1] === "object");
}

function stringList(value: unknown): string[] {
  if (!value || typeof value !== "object") {
    return [];
  }
  return Object.values(value).filter((item): item is string => typeof item === "string");
}

// Sessions keep pointing to their players forever, so a player found here can't be deleted.
export function isPlayerInSessions(playerId: string, sessions: Session[]): boolean {
  return sessions.some(
    (session) =>
      session.keeperIds.includes(playerId) ||
      session.teams.some((team) => team.playerIds.includes(playerId)) ||
      session.matches.some(
        (match) =>
          match.keepers?.home === playerId ||
          match.keepers?.away === playerId ||
          match.events.some((event) => event.playerId === playerId),
      ),
  );
}

export function normalizeSession(id: string, raw: Raw): Session {
  return {
    ...(raw as Omit<Session, "id" | "teams" | "keeperIds" | "matches">),
    id,
    teams: entries(raw.teams).map(([teamId, team]) => ({
      ...(team as Omit<Team, "id" | "playerIds">),
      id: teamId,
      playerIds: stringList(team.playerIds),
    })),
    keeperIds: stringList(raw.keeperIds),
    matches: entries(raw.matches)
      .map(([matchId, match]) => ({
        ...(match as Omit<Match, "id" | "events">),
        id: matchId,
        events: entries(match.events).map(([eventId, event]) => ({ ...(event as Omit<MatchEvent, "id">), id: eventId })),
      }))
      .sort((a, b) => a.number - b.number),
  };
}
