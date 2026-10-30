import { getClub } from "./clubs";
import { COUNTRIES, DEFAULT_COUNTRY } from "./countries";

export type PlayerRole = "line" | "keeper";
export type LinePosition = "ataque" | "meio" | "defesa";
export type CardTier = "gold" | "silver" | "bronze";

export type PlayerRatings = {
  speed: number;
  finishing: number;
  defense: number;
  passing: number;
};

export type PlayerBaseline = {
  goals: number;
  assists: number;
  saves: number;
  titles: number;
};

export type Player = {
  id: string;
  name: string;
  role: PlayerRole;
  isMonthly: boolean;
  joinDate: string;
  active: boolean;
  createdAt: number;
  legacyId?: number;
  linePosition: LinePosition;
  nationality: string;
  club: string;
  ratings: PlayerRatings;
  baseline: PlayerBaseline;
};

const WEIGHTS: Record<"keeper" | LinePosition, PlayerRatings> = {
  keeper: { speed: 0.24, finishing: 0.10, defense: 0.52, passing: 0.14 },
  ataque: { speed: 0.30, finishing: 0.55, defense: 0.00, passing: 0.15 },
  defesa: { speed: 0.32, finishing: 0.07, defense: 0.48, passing: 0.13 },
  meio: { speed: 0.30, finishing: 0.26, defense: 0.06, passing: 0.38 },
};

const POSITION_CODES: Record<LinePosition, "ATA" | "MEI" | "DEF"> = {
  ataque: "ATA",
  meio: "MEI",
  defesa: "DEF",
};

export function clampRating(value: unknown, fallback = 5): number {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return fallback;
  }
  return Math.max(1, Math.min(10, num));
}

function toCount(value: unknown): number {
  if (value === null || value === undefined || value === "") {
    return 0;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export function normalizeLinePosition(value: unknown): LinePosition {
  if (value === "ataque" || value === "meio" || value === "defesa") {
    return value;
  }
  return "meio";
}

export function normalizeRole(value: unknown): PlayerRole {
  return value === "keeper" ? "keeper" : "line";
}

export function normalizeJoinDate(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : "";
}

export function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const COUNTRY_CODES = new Set(COUNTRIES.map((country) => country.code));

export function normalizeNationality(value: unknown): string {
  if (typeof value !== "string") {
    return DEFAULT_COUNTRY;
  }
  const lower = value.trim().toLowerCase();
  return COUNTRY_CODES.has(lower) ? lower : DEFAULT_COUNTRY;
}

export function normalizeClub(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim();
  return getClub(trimmed) ? trimmed : "";
}

export function normalizePlayer(id: string, raw: Record<string, unknown>): Player {
  const rawRatings =
    raw.ratings && typeof raw.ratings === "object"
      ? (raw.ratings as Record<string, unknown>)
      : raw;
  const rawBaseline =
    raw.baseline && typeof raw.baseline === "object"
      ? (raw.baseline as Record<string, unknown>)
      : {};

  const player: Player = {
    id,
    name: typeof raw.name === "string" ? raw.name.trim() : "",
    role: normalizeRole(raw.role),
    isMonthly: typeof raw.isMonthly === "boolean" ? raw.isMonthly : false,
    joinDate: normalizeJoinDate(raw.joinDate),
    active: typeof raw.active === "boolean" ? raw.active : true,
    createdAt:
      typeof raw.createdAt === "number" && Number.isFinite(raw.createdAt)
        ? raw.createdAt
        : 0,
    linePosition: normalizeLinePosition(raw.linePosition),
    nationality: normalizeNationality(raw.nationality),
    club: normalizeClub(raw.club),
    ratings: {
      speed: clampRating(rawRatings.speed, 5),
      finishing: clampRating(rawRatings.finishing, 5),
      defense: clampRating(rawRatings.defense, 5),
      passing: clampRating(rawRatings.passing, 5),
    },
    baseline: {
      goals: toCount(rawBaseline.goals),
      assists: toCount(rawBaseline.assists),
      saves: toCount(rawBaseline.saves),
      titles: toCount(rawBaseline.titles),
    },
  };

  if (typeof raw.legacyId === "number" && Number.isFinite(raw.legacyId)) {
    player.legacyId = raw.legacyId;
  }

  return player;
}

export type OvrInput = Pick<Player, "role" | "linePosition" | "ratings">;

export function levelScore(player: OvrInput): number {
  const profile =
    player.role === "keeper" ? "keeper" : normalizeLinePosition(player.linePosition);
  const w = WEIGHTS[profile];
  const speed = clampRating(player.ratings?.speed, 5);
  const finishing = clampRating(player.ratings?.finishing, 5);
  const defense = clampRating(player.ratings?.defense, 5);
  const passing = clampRating(player.ratings?.passing, 5);

  return (
    speed * w.speed +
    finishing * w.finishing +
    defense * w.defense +
    passing * w.passing
  );
}

export function displayOvr(player: OvrInput): number {
  // Round to 6 decimals first to prevent floating point boundary drift like 85.49999999999999.
  const scaled = Math.round(levelScore(player) * 10 * 1e6) / 1e6;
  return Math.min(99, Math.round(scaled));
}

export function displayStat(rating: number): number {
  return Math.min(99, Math.round(clampRating(rating, 5) * 10));
}

export function cardTier(playerOrOvr: OvrInput | number): CardTier {
  const ovr =
    typeof playerOrOvr === "number" ? playerOrOvr : displayOvr(playerOrOvr);
  if (ovr >= 75) {
    return "gold";
  }
  if (ovr >= 51) {
    return "silver";
  }
  return "bronze";
}

export function positionCode(
  player: Pick<Player, "role" | "linePosition">,
): "GOL" | "ATA" | "MEI" | "DEF" {
  if (player.role === "keeper") {
    return "GOL";
  }
  return POSITION_CODES[normalizeLinePosition(player.linePosition)];
}

export function playerInitials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase() || "?";
}
