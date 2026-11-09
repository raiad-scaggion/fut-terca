const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// Kickoff is 20:15 in Brasília. Brazil has had no daylight saving time since 2019, so the offset is fixed.
export const KICKOFF_TIME = "20:15";

export function kickoffMs(date: string): number {
  return Date.parse(`${date}T${KICKOFF_TIME}:00-03:00`);
}

export type CountdownParts = { days: number; hours: number; minutes: number; seconds: number };

export function splitRemaining(ms: number): CountdownParts {
  const total = Math.max(0, Math.ceil(ms / SECOND));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

// From calm to chaos as kickoff gets closer. The page styles each stage a little louder than the last.
export type CountdownStage = "calm" | "warm" | "hot" | "hotter" | "crazy" | "insane" | "final" | "kickoff";

export function countdownStage(ms: number): CountdownStage {
  if (ms <= 0) return "kickoff";
  if (ms <= MINUTE) return "final";
  if (ms <= 10 * MINUTE) return "insane";
  if (ms <= HOUR) return "crazy";
  if (ms <= 6 * HOUR) return "hotter";
  if (ms <= DAY) return "hot";
  if (ms <= 3 * DAY) return "warm";
  return "calm";
}

export const COUNTDOWN_PHRASES: Record<CountdownStage, string> = {
  calm: "Ainda dá tempo de descansar a perna",
  warm: "Já pode separar a chuteira",
  hot: "Falta menos de um dia. Dorme cedo",
  hotter: "Hoje tem fut. Não marca mais nada",
  crazy: "Sai de casa agora!",
  insane: "Tá chegando, tá chegando!",
  final: "AQUECE, AQUECE, AQUECE!",
  kickoff: "Hoje tem fut",
};
