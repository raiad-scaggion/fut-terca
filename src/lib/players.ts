import { getClub } from "./clubs";
import { COUNTRIES, DEFAULT_COUNTRY } from "./countries";

export type PlayerRole = "line" | "keeper";
export type LinePosition = "ataque" | "meio" | "defesa";
export type CardTier = "gold" | "silver" | "bronze";

export type LineStatKey = "vel" | "fin" | "pas" | "dri" | "def" | "fis";
export type KeeperStatKey = "pac" | "pas" | "sal" | "mne" | "pos" | "ref";
export type LineStats = Record<LineStatKey, number>;
export type KeeperStats = Record<KeeperStatKey, number>;

// Each player keeps both sets, so switching role never loses the other set's numbers.
export type PlayerStats = { line: LineStats; keeper: KeeperStats };

export type StatDef<K extends string> = { key: K; short: string; label: string; hint: string };

// Card order: the first three go in the left column, the last three in the right one.
export const LINE_STATS: StatDef<LineStatKey>[] = [
  { key: "vel", short: "VEL", label: "Velocidade", hint: "Arranque e velocidade na corrida, com ou sem bola." },
  { key: "fin", short: "FIN", label: "Finalização", hint: "Pontaria e força no chute para fazer o gol." },
  { key: "pas", short: "PAS", label: "Passe", hint: "Precisão no passe curto, no lançamento e no cruzamento." },
  { key: "dri", short: "DRI", label: "Drible", hint: "Controle de bola e facilidade para passar pelo marcador." },
  { key: "def", short: "DEF", label: "Defesa", hint: "Marcação, desarme e leitura do jogo sem a bola." },
  { key: "fis", short: "FIS", label: "Físico", hint: "Força na dividida, fôlego e aguentar o jogo inteiro." },
];

export const KEEPER_STATS: StatDef<KeeperStatKey>[] = [
  {
    key: "pac",
    short: "PAC",
    label: "Ritmo / Velocidade",
    hint: "Velocidade de arranque para sair do gol em bolas enfiadas ou fechar o ângulo do atacante.",
  },
  {
    key: "pas",
    short: "PAS",
    label: "Passe / Chute",
    hint: "Precisão dos tiros de meta, lançamentos longos com os pés e reposições de bola.",
  },
  {
    key: "sal",
    short: "SAL",
    label: "Salto / Elasticidade",
    hint: "Capacidade de se esticar para alcançar chutes difíceis e bolas nos ângulos.",
  },
  {
    key: "mne",
    short: "MNE",
    label: "Manejo / Confiabilidade",
    hint: "Firmeza ao segurar a bola, evitando rebotes perigosos na área.",
  },
  {
    key: "pos",
    short: "POS",
    label: "Posicionamento",
    hint: "Posicionar-se bem em relação à bola e às traves, facilitando a defesa.",
  },
  {
    key: "ref",
    short: "REF",
    label: "Reflexos",
    hint: "Velocidade de reação para defesas de puro instinto à queima-roupa.",
  },
];

export const STAT_MIN = 0;
export const STAT_MAX = 100;
const NEW_LINE_STAT = 50;
const NEW_KEEPER_STAT = 99;

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
  legend: boolean;
  createdAt: number;
  legacyId?: number;
  linePosition: LinePosition;
  nationality: string;
  club: string;
  stats: PlayerStats;
  baseline: PlayerBaseline;
};

const POSITION_CODES: Record<LinePosition, "ATA" | "MEI" | "DEF"> = {
  ataque: "ATA",
  meio: "MEI",
  defesa: "DEF",
};

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

// Old 1 to 10 ratings, only read to derive the new stats.
export function clampRating(value: unknown, fallback = 5): number {
  const num = toNumber(value);
  return num === null ? fallback : Math.max(1, Math.min(10, num));
}

export function clampStat(value: unknown, fallback: number): number {
  const num = toNumber(value);
  return num === null ? fallback : Math.max(STAT_MIN, Math.min(STAT_MAX, Math.round(num)));
}

function toCount(value: unknown): number {
  return toNumber(value) ?? 0;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

export function defaultKeeperStats(): KeeperStats {
  return { pac: NEW_KEEPER_STAT, pas: NEW_KEEPER_STAT, sal: NEW_KEEPER_STAT, mne: NEW_KEEPER_STAT, pos: NEW_KEEPER_STAT, ref: NEW_KEEPER_STAT };
}

// Old ratings were 1 to 10 and shown × 10, so they convert × 10. Drible and Físico are new.
export function lineStatsFromRatings(ratings: Record<string, unknown> | null): LineStats {
  const old = (key: string) => Math.round(clampRating(ratings?.[key], 5) * 10);
  return { vel: old("speed"), fin: old("finishing"), pas: old("passing"), dri: NEW_LINE_STAT, def: old("defense"), fis: NEW_LINE_STAT };
}

export function normalizeStats(raw: Record<string, unknown>): PlayerStats {
  const stats = asRecord(raw.stats);
  const line = asRecord(stats?.line);
  const keeper = asRecord(stats?.keeper);
  // Before 2.2 ratings lived in "ratings"; the very first imports had them at the top level.
  const derivedLine = lineStatsFromRatings(asRecord(raw.ratings) ?? raw);
  const derivedKeeper = defaultKeeperStats();

  return {
    line: line
      ? (Object.fromEntries(LINE_STATS.map(({ key }) => [key, clampStat(line[key], derivedLine[key])])) as LineStats)
      : derivedLine,
    keeper: keeper
      ? (Object.fromEntries(KEEPER_STATS.map(({ key }) => [key, clampStat(keeper[key], derivedKeeper[key])])) as KeeperStats)
      : derivedKeeper,
  };
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
    .replace(/[̀-ͯ]/g, "");
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
  const rawBaseline = asRecord(raw.baseline) ?? {};

  const player: Player = {
    id,
    name: typeof raw.name === "string" ? raw.name.trim() : "",
    role: normalizeRole(raw.role),
    isMonthly: typeof raw.isMonthly === "boolean" ? raw.isMonthly : false,
    joinDate: normalizeJoinDate(raw.joinDate),
    active: typeof raw.active === "boolean" ? raw.active : true,
    legend: raw.legend === true,
    createdAt:
      typeof raw.createdAt === "number" && Number.isFinite(raw.createdAt)
        ? raw.createdAt
        : 0,
    linePosition: normalizeLinePosition(raw.linePosition),
    nationality: normalizeNationality(raw.nationality),
    club: normalizeClub(raw.club),
    stats: normalizeStats(raw),
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

export type StatLine = { key: string; short: string; label: string; value: number };

// The six stats of the player's current role, in card order.
export function roleStats(player: Pick<Player, "role" | "stats">): StatLine[] {
  if (player.role === "keeper") {
    return KEEPER_STATS.map(({ key, short, label }) => ({ key, short, label, value: player.stats.keeper[key] }));
  }
  return LINE_STATS.map(({ key, short, label }) => ({ key, short, label, value: player.stats.line[key] }));
}

// Number inputs keep text while the person types, so an emptied field doesn't jump to 0.
export type StatText = Record<string, string>;

export function statText(values: Record<string, number>): StatText {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, String(value)]));
}

export function isStatText(text: string | undefined): boolean {
  return typeof text === "string" && /^\d{1,3}$/.test(text.trim()) && Number(text) <= STAT_MAX;
}

export function newPlayerStats(): PlayerStats {
  return {
    line: { vel: NEW_LINE_STAT, fin: NEW_LINE_STAT, pas: NEW_LINE_STAT, dri: NEW_LINE_STAT, def: NEW_LINE_STAT, fis: NEW_LINE_STAT },
    keeper: defaultKeeperStats(),
  };
}

// Reads the typed text back into numbers. A field that isn't a valid number keeps the fallback.
export function statsFromText<K extends string>(defs: StatDef<K>[], text: StatText, fallback: Record<K, number>): Record<K, number> {
  return Object.fromEntries(
    defs.map(({ key }) => [key, isStatText(text[key]) ? Number(text[key]) : fallback[key]]),
  ) as Record<K, number>;
}

export type OvrInput = Pick<Player, "role" | "linePosition" | "stats">;

// Plain average of the role's six stats, all with the same weight, on the same 0 to 100 scale.
export function levelScore(player: OvrInput): number {
  if (player.role === "keeper") {
    return KEEPER_STATS.reduce((sum, { key }) => sum + clampStat(player.stats.keeper[key], 50), 0) / KEEPER_STATS.length;
  }
  return LINE_STATS.reduce((sum, { key }) => sum + clampStat(player.stats.line[key], 50), 0) / LINE_STATS.length;
}

export function displayOvr(player: OvrInput): number {
  // Round to 6 decimals first to prevent floating point boundary drift like 85.49999999999999.
  const scaled = Math.round(levelScore(player) * 1e6) / 1e6;
  return Math.min(99, Math.round(scaled));
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
