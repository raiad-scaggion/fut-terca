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

export function isTied(match: Match): boolean {
  const score = getMatchScore(match);
  return score.home === score.away;
}

// The final is the only match that can't end level: it goes on until a golden goal.
export function needsGoldenGoal(match: Match): boolean {
  return match.stage === "final" && isTied(match);
}

export function getMatchScore(match: Match): { home: number; away: number } {
  const goals = match.events.filter((event) => event.type === "goal");
  return {
    home: goals.filter((event) => event.teamId === match.homeId).length,
    away: goals.filter((event) => event.teamId === match.awayId).length,
  };
}

// There are no penalties. A tied semi or 3rd place match goes to whoever finished higher in the group.
export function getMatchWinnerId(session: Session, match: Match): string | null {
  const score = getMatchScore(match);
  if (score.home !== score.away) {
    return score.home > score.away ? match.homeId : match.awayId;
  }
  if (match.stage === "group" || match.stage === "final") {
    return null;
  }
  const table = getStandings(session).map((row) => row.team.id);
  return table.indexOf(match.homeId) < table.indexOf(match.awayId) ? match.homeId : match.awayId;
}

function getMatchLoserId(session: Session, match: Match): string | null {
  const winnerId = getMatchWinnerId(session, match);
  if (!winnerId) {
    return null;
  }
  return winnerId === match.homeId ? match.awayId : match.homeId;
}

function pointsAmong(session: Session, teamIds: string[]): Map<string, number> {
  const points = new Map(teamIds.map((id) => [id, 0]));
  const add = (id: string, value: number) => points.set(id, (points.get(id) ?? 0) + value);

  for (const match of session.matches) {
    if (match.stage !== "group" || match.status !== "finished" || !points.has(match.homeId) || !points.has(match.awayId)) {
      continue;
    }
    const score = getMatchScore(match);
    if (score.home === score.away) {
      add(match.homeId, 1);
      add(match.awayId, 1);
    } else {
      add(score.home > score.away ? match.homeId : match.awayId, 3);
    }
  }
  return points;
}

// Confronto direto first: the games among the teams level on points. If it separates only some of
// them, the rest are compared again among themselves. Then victories, goal difference, goals scored.
function breakTie(session: Session, rows: StandingRow[]): StandingRow[] {
  if (rows.length < 2) {
    return rows;
  }
  const direct = pointsAmong(session, rows.map((row) => row.team.id));
  const levels = [...new Set(direct.values())].sort((a, b) => b - a);
  if (levels.length > 1) {
    return levels.flatMap((level) => breakTie(session, rows.filter((row) => direct.get(row.team.id) === level)));
  }
  return [...rows].sort((a, b) => b.wins - a.wins || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor);
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

  const table = [...rows.values()].map((row) => ({ ...row, points: row.wins * 3 + row.draws, goalDiff: row.goalsFor - row.goalsAgainst }));
  const levels = [...new Set(table.map((row) => row.points))].sort((a, b) => b - a);
  return levels.flatMap((points) => breakTie(session, table.filter((row) => row.points === points)));
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
  const [loser1, loser2] = [getMatchLoserId(session, first), getMatchLoserId(session, second)];
  const [winner1, winner2] = [getMatchWinnerId(session, first), getMatchWinnerId(session, second)];
  if (loser1 && loser2 && winner1 && winner2) {
    place("third", THIRD, loser1, loser2);
    place("final", FINAL, winner1, winner2);
  }
  return changes;
}

export function getChampionId(session: Session): string | null {
  const final = session.matches.find((match) => match.stage === "final");
  return final?.status === "finished" ? getMatchWinnerId(session, final) : null;
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

function isTiedFinal(raw: RawSession, sessionId: string, matchId: string): boolean {
  const match = normalizeSession(sessionId, raw).matches.find((item) => item.id === matchId);
  return Boolean(match && needsGoldenGoal(match));
}

// Both return the new session for a transaction, or undefined to abort it. A second phone that
// finishes the same match at the same moment aborts here, and so does a final that's still level.
export function applyFinishMatch(raw: RawSession, sessionId: string, matchId: string, now: number): RawSession | undefined {
  const match = raw.matches?.[matchId];
  if (!match || match.status !== "live" || isTiedFinal(raw, sessionId, matchId)) {
    return undefined;
  }
  const timer = stopTimer(match.timer as MatchTimer, now);
  return syncCup({ ...raw, matches: { ...raw.matches, [matchId]: { ...match, status: "finished", timer } } }, sessionId);
}

export function applyFinishEdit(raw: RawSession, sessionId: string, matchId: string): RawSession | undefined {
  const match = raw.matches?.[matchId];
  if (!match || match.status !== "finished" || isTiedFinal(raw, sessionId, matchId)) {
    return undefined;
  }
  return syncCup(raw, sessionId);
}
