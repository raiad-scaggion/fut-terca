import { stopTimer, type MatchTimer } from "./clock";
import { normalizeSession, type Match, type MatchStage, type Session, type Team } from "./session";
import { DEFAULT_MATCH_SECONDS } from "./weekly";

const SEMI_1 = "Semifinal 1";
const SEMI_2 = "Semifinal 2";
const THIRD = "Disputa de 3º lugar";
const FINAL = "Final";

export type RawSession = Record<string, unknown> & { matches?: Record<string, Record<string, unknown>> };

export type StandingRow = {
  team: Team;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
};

export function matchLabel(match: Match): string {
  return match.label ?? `Jogo ${match.number}`;
}

export function isKnockout(match: Match): boolean {
  return match.stage !== "group";
}

export function getMatchScore(match: Match): { home: number; away: number } {
  const goals = match.events.filter((event) => event.type === "goal");
  return {
    home: goals.filter((event) => event.teamId === match.homeId).length,
    away: goals.filter((event) => event.teamId === match.awayId).length,
  };
}

// A knockout match can't end tied, so a draw needs winnerId (penalties or the group's own rule).
export function getMatchWinnerId(match: Match): string | null {
  const score = getMatchScore(match);
  if (score.home === score.away) {
    return match.winnerId ?? null;
  }
  return score.home > score.away ? match.homeId : match.awayId;
}

function getMatchLoserId(match: Match): string | null {
  const winnerId = getMatchWinnerId(match);
  if (!winnerId) {
    return null;
  }
  return winnerId === match.homeId ? match.awayId : match.homeId;
}

// Counts group matches only, and only once they end, so the table never moves during a match.
export function getStandings(session: Session): StandingRow[] {
  const rows = new Map(
    session.teams.map((team) => [
      team.id,
      { team, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0 },
    ]),
  );

  for (const match of session.matches) {
    const home = rows.get(match.homeId);
    const away = rows.get(match.awayId);
    if (match.stage !== "group" || match.status !== "finished" || !home || !away) {
      continue;
    }
    const score = getMatchScore(match);
    home.played += 1;
    away.played += 1;
    home.goalsFor += score.home;
    home.goalsAgainst += score.away;
    away.goalsFor += score.away;
    away.goalsAgainst += score.home;
    if (score.home > score.away) {
      home.wins += 1;
      away.losses += 1;
    } else if (score.home < score.away) {
      away.wins += 1;
      home.losses += 1;
    } else {
      home.draws += 1;
      away.draws += 1;
    }
  }

  return [...rows.values()]
    .map((row) => ({ ...row, points: row.wins * 3 + row.draws, goalDiff: row.goalsFor - row.goalsAgainst }))
    .sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor);
}

type PlayoffChange = {
  id: string;
  isNew: boolean;
  number: number;
  stage: MatchStage;
  label: string;
  homeId: string;
  awayId: string;
};

// Works out the next knockout round. A round that was already created follows later edits to the
// results while it's still pending; once it has started, its matchups stay as they are.
function getPlayoffChanges(session: Session): PlayoffChange[] {
  const { matches } = session;
  const changes: PlayoffChange[] = [];
  let nextNumber = matches.length + 1;

  const place = (stage: MatchStage, label: string, homeId: string, awayId: string) => {
    const existing = matches.find((match) => match.label === label);
    if (!existing) {
      const number = nextNumber;
      nextNumber += 1;
      changes.push({ id: `m${number}`, isNew: true, number, stage, label, homeId, awayId });
    } else if (existing.status === "pending" && (existing.homeId !== homeId || existing.awayId !== awayId)) {
      changes.push({ id: existing.id, isNew: false, number: existing.number, stage, label, homeId, awayId });
    }
  };

  const group = matches.filter((match) => match.stage === "group");
  if (group.length === 0 || group.some((match) => match.status !== "finished")) {
    return changes;
  }
  const table = getStandings(session);
  place("semi", SEMI_1, table[0].team.id, table[3].team.id);
  place("semi", SEMI_2, table[1].team.id, table[2].team.id);

  const semis = [SEMI_1, SEMI_2].map((label) => matches.find((match) => match.label === label));
  const [first, second] = semis;
  if (!first || !second || first.status !== "finished" || second.status !== "finished") {
    return changes;
  }
  const [loser1, loser2] = [getMatchLoserId(first), getMatchLoserId(second)];
  const [winner1, winner2] = [getMatchWinnerId(first), getMatchWinnerId(second)];
  if (loser1 && loser2 && winner1 && winner2) {
    place("third", THIRD, loser1, loser2);
    place("final", FINAL, winner1, winner2);
  }
  return changes;
}

export function getChampionId(session: Session): string | null {
  const final = session.matches.find((match) => match.stage === "final");
  return final?.status === "finished" ? getMatchWinnerId(final) : null;
}

export function getChampion(session: Session): Team | null {
  return session.teams.find((team) => team.id === getChampionId(session)) ?? null;
}

// True when fixing this match can no longer change who plays the next round.
export function isNextRoundLocked(session: Session, match: Match): boolean {
  const nextStages: MatchStage[] = match.stage === "group" ? ["semi"] : match.stage === "semi" ? ["third", "final"] : [];
  return session.matches.some((other) => nextStages.includes(other.stage) && other.status !== "pending");
}

function lastDuration(session: Session): number {
  const finished = session.matches.filter((match) => match.status === "finished");
  return finished[finished.length - 1]?.timer?.durationSec ?? DEFAULT_MATCH_SECONDS;
}

function syncCup(raw: RawSession, sessionId: string): RawSession {
  const session = normalizeSession(sessionId, raw);
  const durationSec = lastDuration(session);
  const matches = { ...raw.matches };

  for (const change of getPlayoffChanges(session)) {
    const { id, isNew, ...fields } = change;
    const timer: MatchTimer = { durationSec, running: false, startedAt: 0, elapsedMs: 0 };
    matches[id] = isNew ? { ...fields, status: "pending", timer } : { ...matches[id], homeId: fields.homeId, awayId: fields.awayId };
  }

  const next = { ...raw, matches };
  const championId = getChampionId(normalizeSession(sessionId, next));
  return { ...next, championId, status: championId ? "finished" : "live" };
}

// Both return the new session for a transaction, or undefined to abort it. A second phone that
// finishes the same match at the same moment aborts here.
export function applyFinishMatch(raw: RawSession, sessionId: string, matchId: string, winnerId: string | null, now: number): RawSession | undefined {
  const match = raw.matches?.[matchId];
  if (!match || match.status !== "live") {
    return undefined;
  }
  const timer = stopTimer(match.timer as MatchTimer, now);
  return syncCup({ ...raw, matches: { ...raw.matches, [matchId]: { ...match, status: "finished", timer, winnerId } } }, sessionId);
}

export function applyFinishEdit(raw: RawSession, sessionId: string, matchId: string, winnerId: string | null): RawSession | undefined {
  const match = raw.matches?.[matchId];
  if (!match || match.status !== "finished") {
    return undefined;
  }
  return syncCup({ ...raw, matches: { ...raw.matches, [matchId]: { ...match, winnerId } } }, sessionId);
}
