import { matchLabel } from "./cup";
import { dayLabel, sessionDate } from "./nightSummary";
import type { Player } from "./players";
import type { MatchEventType, Session } from "./session";

export type LogAction =
  | "player.create"
  | "player.edit"
  | "player.delete"
  | "photo.save"
  | "photo.remove"
  | "import"
  | "session.create"
  | "session.cancel"
  | "match.start"
  | "match.finish"
  | "match.fix"
  | "match.cancel"
  | "event.add"
  | "event.remove";

type Value = string | number | boolean;
export type FieldChange = { from: Value; to: Value };

// What the app sends. Who and when are added by the data layer, and the rules check both.
export type LogInput = {
  action: LogAction;
  playerId?: string;
  playerName?: string;
  sessionId?: string;
  matchId?: string;
  eventType?: MatchEventType;
  changes?: Record<string, FieldChange>;
  count?: number;
};

export type LogEntry = LogInput & {
  id: string;
  by: string;
  name: string;
  uid: string;
  at: number;
};

export type PlayerFields = Pick<
  Player,
  "name" | "role" | "linePosition" | "nationality" | "club" | "isMonthly" | "joinDate" | "ratings"
> & { active?: boolean };

const FIELD_LABELS: Record<string, string> = {
  name: "Nome",
  role: "Função",
  linePosition: "Posição",
  nationality: "País",
  club: "Time do coração",
  isMonthly: "Mensalista",
  joinDate: "Entrada",
  active: "Ativo",
  speed: "VEL",
  finishing: "FIN",
  passing: "PAS",
  defense: "DEF",
};

const EVENT_NAMES: Record<MatchEventType, string> = {
  goal: "gol",
  assist: "assistência",
  save: "defesa",
  ownGoal: "gol contra",
  howler: "frango",
};

// Ratings are flattened because database keys can't hold the "." of "ratings.speed".
function flatten(fields: PlayerFields): Record<string, Value> {
  const { ratings, ...rest } = fields;
  const flat: Record<string, Value> = { ...rest, ...ratings };
  if (rest.active === undefined) {
    delete flat.active;
  }
  return flat;
}

export function diffPlayer(before: PlayerFields, after: PlayerFields): Record<string, FieldChange> {
  const from = flatten(before);
  const to = flatten(after);
  const changes: Record<string, FieldChange> = {};
  for (const key of Object.keys(FIELD_LABELS)) {
    if (key in to && from[key] !== to[key]) {
      changes[key] = { from: from[key] ?? "", to: to[key] };
    }
  }
  return changes;
}

export function normalizeLogEntries(raw: unknown): LogEntry[] {
  if (!raw || typeof raw !== "object") {
    return [];
  }
  return Object.entries(raw as Record<string, Omit<LogEntry, "id">>)
    .filter(([, entry]) => entry && typeof entry === "object" && typeof entry.at === "number")
    .map(([id, entry]) => ({ ...entry, id }))
    .sort((a, b) => b.at - a.at);
}

function showValue(value: Value): string {
  if (typeof value === "boolean") {
    return value ? "sim" : "não";
  }
  return value === "" ? "vazio" : String(value);
}

export function describeChanges(changes: Record<string, FieldChange> | undefined): string {
  return Object.entries(changes ?? {})
    .map(([key, change]) => `${FIELD_LABELS[key] ?? key} ${showValue(change.from)} → ${showValue(change.to)}`)
    .join(", ");
}

type Context = { byId: Map<string, Player>; sessions: Session[] };

function matchName(entry: LogEntry, sessions: Session[]): string {
  const session = sessions.find((item) => item.id === entry.sessionId);
  const match = session?.matches.find((item) => item.id === entry.matchId);
  if (!session) {
    return "uma partida apagada";
  }
  const day = dayLabel(sessionDate(session.date));
  return match ? `${matchLabel(match)} de ${day}` : `a copa de ${day}`;
}

export function describeEntry(entry: LogEntry, { byId, sessions }: Context): string {
  const player = (entry.playerId && byId.get(entry.playerId)?.name) || entry.playerName || "um jogador apagado";
  const event = entry.eventType ? EVENT_NAMES[entry.eventType] : "lance";

  switch (entry.action) {
    case "player.create":
      return `Cadastrou ${player}`;
    case "player.edit":
      return `Editou ${player}: ${describeChanges(entry.changes) || "sem mudanças"}`;
    case "player.delete":
      return `Excluiu ${player}`;
    case "photo.save":
      return `Trocou a foto de ${player}`;
    case "photo.remove":
      return `Removeu a foto de ${player}`;
    case "import":
      return `Importou a planilha (${entry.count ?? 0} jogadores)`;
    case "session.create":
      return `Confirmou os times de ${matchName(entry, sessions)}`;
    case "session.cancel":
      return "Cancelou a copa da noite";
    case "match.start":
      return `Começou ${matchName(entry, sessions)}`;
    case "match.finish":
      return `Encerrou ${matchName(entry, sessions)}`;
    case "match.fix":
      return `Concluiu a correção de ${matchName(entry, sessions)}`;
    case "match.cancel":
      return `Cancelou ${matchName(entry, sessions)}`;
    case "event.add":
      return `Marcou ${event} de ${player} em ${matchName(entry, sessions)}`;
    case "event.remove":
      return `Desfez ${event} de ${player} em ${matchName(entry, sessions)}`;
    default:
      return "Alteração desconhecida";
  }
}
