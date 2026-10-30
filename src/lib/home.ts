import { AWARD_ORDER, type AwardKey, type MonthlyAwards } from "./awards";
import { getChampion } from "./cup";
import type { Match, Session, Team } from "./session";

const TUESDAY = 2;
const DAY_MS = 24 * 60 * 60 * 1000;

export type HomeState =
  | { kind: "live"; session: Session; match: Match }
  | { kind: "cup"; session: Session; next: Match | null }
  | { kind: "next"; date: string; days: number };

export type AwardWinner = { playerId: string; awards: AwardKey[] };

function daysFrom(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

export function nextTuesday(from: string): string {
  const day = new Date(`${from}T00:00:00Z`).getUTCDay();
  return daysFrom(from, (TUESDAY - day + 7) % 7);
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

// A cup that already has its champion today pushes the countdown to the following Tuesday.
export function getHomeState(
  sessions: Session[],
  live: { sessionId: string | null; matchId: string | null },
  today: string,
): HomeState {
  const session = sessions.find((item) => item.id === live.sessionId);
  const match = session?.matches.find((item) => item.id === live.matchId);
  if (session && match) {
    return { kind: "live", session, match };
  }
  if (session && !getChampion(session)) {
    return { kind: "cup", session, next: session.matches.find((item) => item.status === "pending") ?? null };
  }

  const playedToday = sessions.some((item) => item.date === today && getChampion(item));
  const date = nextTuesday(playedToday ? daysFrom(today, 1) : today);
  return { kind: "next", date, days: daysBetween(today, date) };
}

export function getLastChampion(sessions: Session[]): { session: Session; team: Team } | null {
  const finished = sessions.flatMap((session) => {
    const team = getChampion(session);
    return team ? [{ session, team }] : [];
  });
  return finished.sort((a, b) => (b.session.createdAt ?? 0) - (a.session.createdAt ?? 0))[0] ?? null;
}

// One card per person: a player who won two awards appears once, with both names under the card.
export function listAwardWinners(awards: MonthlyAwards): AwardWinner[] {
  const winners = new Map<string, AwardKey[]>();
  for (const key of AWARD_ORDER) {
    for (const playerId of awards[key]) {
      winners.set(playerId, [...(winners.get(playerId) ?? []), key]);
    }
  }
  return [...winners].map(([playerId, won]) => ({ playerId, awards: won }));
}
