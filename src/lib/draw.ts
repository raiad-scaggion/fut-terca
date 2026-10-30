import { levelScore, type LinePosition, type Player } from "./players";
import type { Session } from "./session";

export const TEAM_COUNT = 4;
export const TEAM_SIZE = 4;

// The team total comes first. Position spread and repeated pairs only settle what's left.
const BALANCE_WEIGHT = 1;
const POSITION_WEIGHT = 0.5;
const REPEAT_WEIGHT = 0.25;

const IDEAL_POSITIONS: Record<LinePosition, number> = { defesa: 1, meio: 2, ataque: 1 };

const PAIR_INCREMENT = 2;
const PAIR_DECAY = 0.95;

const RESTARTS = 40;
const CANDIDATES = 5;
const CANDIDATE_MARGIN = 0.5;

export type PairHistory = Map<string, number>;

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

// Derived from past sessions, so a discarded draw never counts as having played together.
// Recent nights weigh more than old ones.
export function buildPairHistory(sessions: Session[]): PairHistory {
  const history: PairHistory = new Map();
  const newestFirst = [...sessions].sort((a, b) => b.date.localeCompare(a.date));

  newestFirst.forEach((session, age) => {
    const weight = PAIR_INCREMENT * PAIR_DECAY ** age;
    for (const team of session.teams) {
      team.playerIds.forEach((a, index) => {
        for (const b of team.playerIds.slice(index + 1)) {
          const key = pairKey(a, b);
          history.set(key, (history.get(key) ?? 0) + weight);
        }
      });
    }
  });

  return history;
}

export function teamTotal(team: Player[]): number {
  return team.reduce((sum, player) => sum + levelScore(player), 0);
}

function positionImbalance(team: Player[]): number {
  return (Object.keys(IDEAL_POSITIONS) as LinePosition[]).reduce((total, position) => {
    const count = team.filter((player) => player.linePosition === position).length;
    return total + Math.abs(count - IDEAL_POSITIONS[position]);
  }, 0);
}

function repeatPenalty(team: Player[], history: PairHistory): number {
  let total = 0;
  team.forEach((a, index) => {
    for (const b of team.slice(index + 1)) {
      total += history.get(pairKey(a.id, b.id)) ?? 0;
    }
  });
  return total;
}

function cost(teams: Player[][], history: PairHistory): number {
  const totals = teams.map(teamTotal);
  const mean = totals.reduce((sum, total) => sum + total, 0) / totals.length;
  const variance = totals.reduce((sum, total) => sum + (total - mean) ** 2, 0);
  const positions = teams.reduce((sum, team) => sum + positionImbalance(team), 0);
  const repeats = teams.reduce((sum, team) => sum + repeatPenalty(team, history), 0);
  return variance * BALANCE_WEIGHT + positions * POSITION_WEIGHT + repeats * REPEAT_WEIGHT;
}

function shuffled<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function deal(players: Player[]): Player[][] {
  return Array.from({ length: TEAM_COUNT }, (_, index) => players.slice(index * TEAM_SIZE, (index + 1) * TEAM_SIZE));
}

// Swaps two players whenever that lowers the cost, until no swap helps.
function improve(teams: Player[][], history: PairHistory): number {
  let best = cost(teams, history);
  let improved = true;

  while (improved) {
    improved = false;
    for (let t1 = 0; t1 < teams.length; t1 += 1) {
      for (let t2 = t1 + 1; t2 < teams.length; t2 += 1) {
        for (let i = 0; i < teams[t1].length; i += 1) {
          for (let j = 0; j < teams[t2].length; j += 1) {
            [teams[t1][i], teams[t2][j]] = [teams[t2][j], teams[t1][i]];
            const next = cost(teams, history);
            if (next < best - 1e-6) {
              best = next;
              improved = true;
            } else {
              [teams[t1][i], teams[t2][j]] = [teams[t2][j], teams[t1][i]];
            }
          }
        }
      }
    }
  }

  return best;
}

function signature(teams: Player[][]): string {
  return teams
    .map((team) => team.map((player) => player.id).sort().join(","))
    .sort()
    .join("|");
}

// Tries many random starts and picks among the best results, so "Sortear novamente" gives a
// different draw without giving up balance.
export function balanceTeams(players: Player[], history: PairHistory = new Map(), random: () => number = Math.random): Player[][] {
  const results = new Map<string, { teams: Player[][]; cost: number }>();

  for (let run = 0; run < RESTARTS; run += 1) {
    const teams = deal(shuffled(players, random));
    const result = improve(teams, history);
    results.set(signature(teams), { teams, cost: result });
  }

  const ranked = [...results.values()].sort((a, b) => a.cost - b.cost);
  const options = ranked.filter((result) => result.cost <= ranked[0].cost + CANDIDATE_MARGIN).slice(0, CANDIDATES);
  return options[Math.floor(random() * options.length)].teams;
}
