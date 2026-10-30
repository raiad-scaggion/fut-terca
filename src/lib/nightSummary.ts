import { getChampion, getMatchScore, getMatchWinnerId, matchLabel } from "./cup";
import type { Player } from "./players";
import type { Match, Session } from "./session";
import { championKeeperId } from "./stats";

export type ResultSide = {
  name: string;
  color: string;
  goals: number;
  winner: boolean;
};

export type NightResult = {
  id: string;
  label: string;
  stage: Match["stage"];
  home: ResultSide;
  away: ResultSide;
  decidedByTable: boolean;
};

export type NightPlayer = {
  id: string;
  name: string;
  goals: number;
  assists: number;
  saves: number;
};

export type NightSummary = {
  champion: { name: string; color: string; players: string[]; keeper?: string };
  results: NightResult[];
  players: NightPlayer[];
};

// Parsed at noon so a "YYYY-MM-DD" date can't slip to the day before in Brazil's time zone.
export function sessionDate(date: string): Date {
  return new Date(`${date}T12:00:00`);
}

export function dayLabel(date: Date): string {
  return date.toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
}

function buildResult(session: Session, match: Match): NightResult {
  const score = getMatchScore(match);
  const winnerId = getMatchWinnerId(session, match);
  const side = (teamId: string, goals: number): ResultSide => {
    const team = session.teams.find((item) => item.id === teamId);
    return { name: team?.name ?? "A definir", color: team?.color ?? "#9aa1ad", goals, winner: winnerId === teamId };
  };

  return {
    id: match.id,
    label: matchLabel(match),
    stage: match.stage,
    home: side(match.homeId, score.home),
    away: side(match.awayId, score.away),
    decidedByTable: match.stage !== "group" && score.home === score.away,
  };
}

function buildPlayers(session: Session, byId: Map<string, Player>): NightPlayer[] {
  const ids = [...session.teams.flatMap((team) => team.playerIds), ...session.keeperIds];
  const events = session.matches.filter((match) => match.status === "finished").flatMap((match) => match.events);
  const count = (id: string, type: string) => events.filter((event) => event.playerId === id && event.type === type).length;

  return ids
    .flatMap((id) => {
      const player = byId.get(id);
      return player ? [{ id, name: player.name, goals: count(id, "goal"), assists: count(id, "assist"), saves: count(id, "save") }] : [];
    })
    .sort(
      (a, b) =>
        b.goals - a.goals ||
        b.assists - a.assists ||
        b.saves - a.saves ||
        a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }),
    );
}

// Returns null until the cup has a champion, since the summary only makes sense at the end.
export function buildNightSummary(session: Session, byId: Map<string, Player>): NightSummary | null {
  const champion = getChampion(session);
  if (!champion) {
    return null;
  }

  const keeperId = championKeeperId(session);
  return {
    champion: {
      name: champion.name,
      color: champion.color,
      players: champion.playerIds.flatMap((id) => byId.get(id)?.name ?? []),
      keeper: keeperId ? byId.get(keeperId)?.name : undefined,
    },
    results: session.matches.filter((match) => match.status === "finished").map((match) => buildResult(session, match)),
    players: buildPlayers(session, byId),
  };
}
