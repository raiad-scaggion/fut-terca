import {
  clampRating,
  normalizeJoinDate,
  normalizeName,
  type LinePosition,
  type Player,
  type PlayerBaseline,
  type PlayerRatings,
  type PlayerRole,
} from "./players";

export const REQUIRED_CSV_COLUMNS = [
  "id",
  "name",
  "goals",
  "assists",
  "championships",
  "speed",
  "finishing",
  "defense",
  "passing",
  "linePosition",
  "role",
  "isMonthly",
  "joinDate",
] as const;

export type ImportedPlayer = {
  id: string;
  legacyId?: number;
  name: string;
  role: PlayerRole;
  linePosition: LinePosition;
  isMonthly: boolean;
  joinDate: string;
  ratings: PlayerRatings;
  baseline: PlayerBaseline;
};

export type ImportTotals = {
  players: number;
  keepers: number;
  mensalistas: number;
  goals: number;
  assists: number;
  titles: number;
};

export type ParsedCsvSheet = {
  rows: ImportedPlayer[];
  warnings: string[];
  merges: string[];
  totals: ImportTotals;
};

export type ImportPlan = {
  create: ImportedPlayer[];
  update: ImportedPlayer[];
  unchanged: ImportedPlayer[];
  warnings: string[];
  merges: string[];
  totals: ImportTotals;
};

export function parseCsv(rawText: string): string[][] {
  const text = rawText.startsWith("\uFEFF") ? rawText.slice(1) : rawText;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\r" || ch === "\n") {
      if (ch === "\r" && text[i + 1] === "\n") {
        i += 1;
      }
      row.push(field);
      field = "";
      if (row.some((cell) => cell.trim() !== "")) {
        rows.push(row);
      }
      row = [];
    } else {
      field += ch;
    }
  }

  row.push(field);
  if (row.some((cell) => cell.trim() !== "")) {
    rows.push(row);
  }

  return rows;
}

function parseRatingCell(
  raw: string,
  column: string,
  rowLabel: string,
  warnings: string[],
): number {
  const trimmed = raw.trim();
  const parsed = trimmed === "" ? Number.NaN : Number(trimmed);
  if (!Number.isFinite(parsed)) {
    warnings.push(`${rowLabel}: nota '${column}' inválida ("${raw}"), usando 5.`);
    return 5;
  }
  return clampRating(parsed, 5);
}

function parseBaselineCell(
  raw: string,
  column: string,
  rowLabel: string,
  warnings: string[],
): number {
  const trimmed = raw.trim();
  const parsed = trimmed === "" ? Number.NaN : Number(trimmed);
  if (!Number.isFinite(parsed)) {
    warnings.push(`${rowLabel}: valor '${column}' inválido ("${raw}"), usando 0.`);
    return 0;
  }
  return parsed;
}

function parseLinePositionCell(
  raw: string,
  rowLabel: string,
  warnings: string[],
): LinePosition {
  const normalized = raw.trim().toLowerCase();
  if (normalized === "ataque" || normalized === "meio" || normalized === "defesa") {
    return normalized;
  }
  warnings.push(
    `${rowLabel}: posição '${raw}' inválida, usando 'meio'.`,
  );
  return "meio";
}

export function computeImportTotals(rows: ImportedPlayer[]): ImportTotals {
  return rows.reduce<ImportTotals>(
    (acc, player) => {
      acc.players += 1;
      if (player.role === "keeper") {
        acc.keepers += 1;
      }
      if (player.isMonthly) {
        acc.mensalistas += 1;
      }
      acc.goals += player.baseline.goals;
      acc.assists += player.baseline.assists;
      acc.titles += player.baseline.titles;
      return acc;
    },
    { players: 0, keepers: 0, mensalistas: 0, goals: 0, assists: 0, titles: 0 },
  );
}

export function parsePlayersCsv(csvText: string): ParsedCsvSheet {
  const table = parseCsv(csvText);
  if (table.length === 0) {
    throw new Error(
      "O arquivo está vazio. Exporte a aba players da planilha de novo.",
    );
  }

  const header = table[0].map((col) => col.trim());
  const colIndex = new Map<string, number>();
  header.forEach((col, idx) => {
    colIndex.set(col, idx);
  });

  for (const required of REQUIRED_CSV_COLUMNS) {
    if (!colIndex.has(required)) {
      throw new Error(
        `A coluna '${required}' não está no arquivo. Exporte a aba players da planilha de novo.`,
      );
    }
  }

  const getCell = (row: string[], col: (typeof REQUIRED_CSV_COLUMNS)[number]): string => {
    const idx = colIndex.get(col);
    return idx !== undefined && idx < row.length ? row[idx] : "";
  };

  const warnings: string[] = [];
  const merges: string[] = [];
  const byName = new Map<string, ImportedPlayer>();
  let fallbackIndex = 1;

  for (let r = 1; r < table.length; r += 1) {
    const rawRow = table[r];
    const lineNum = r + 1;
    const name = getCell(rawRow, "name").trim();

    if (!name) {
      warnings.push(`Linha ${lineNum}: nome vazio, linha ignorada.`);
      continue;
    }

    const rowLabel = `${name} (linha ${lineNum})`;
    const rawId = getCell(rawRow, "id").trim();
    const parsedId = rawId === "" ? Number.NaN : Number(rawId);
    const hasNumericId = Number.isFinite(parsedId);
    const legacyId = hasNumericId ? parsedId : undefined;
    const id = hasNumericId ? `p${parsedId}` : `p_row_${fallbackIndex++}`;

    if (!hasNumericId) {
      warnings.push(`${rowLabel}: id '${rawId}' inválido, usando chave '${id}'.`);
    }

    const goals = parseBaselineCell(getCell(rawRow, "goals"), "goals", rowLabel, warnings);
    const assists = parseBaselineCell(getCell(rawRow, "assists"), "assists", rowLabel, warnings);
    const titles = parseBaselineCell(
      getCell(rawRow, "championships"),
      "championships",
      rowLabel,
      warnings,
    );

    const speed = parseRatingCell(getCell(rawRow, "speed"), "speed", rowLabel, warnings);
    const finishing = parseRatingCell(
      getCell(rawRow, "finishing"),
      "finishing",
      rowLabel,
      warnings,
    );
    const defense = parseRatingCell(getCell(rawRow, "defense"), "defense", rowLabel, warnings);
    const passing = parseRatingCell(getCell(rawRow, "passing"), "passing", rowLabel, warnings);

    const rawRole = getCell(rawRow, "role").trim().toLowerCase();
    const role: PlayerRole = rawRole === "goleiro" ? "keeper" : "line";
    const linePosition = parseLinePositionCell(
      getCell(rawRow, "linePosition"),
      rowLabel,
      warnings,
    );

    const rawMonthly = getCell(rawRow, "isMonthly").trim();
    const isMonthly = rawMonthly === "TRUE" || rawMonthly === "true";
    const joinDate = normalizeJoinDate(getCell(rawRow, "joinDate"));

    const mapped: ImportedPlayer = {
      id,
      ...(legacyId !== undefined ? { legacyId } : {}),
      name,
      role,
      linePosition,
      isMonthly,
      joinDate,
      ratings: { speed, finishing, defense, passing },
      baseline: { goals, assists, saves: 0, titles },
    };

    const nameKey = normalizeName(name);
    const existing = byName.get(nameKey);

    if (!existing) {
      byName.set(nameKey, mapped);
      continue;
    }

    const mergeMsg = `Nome duplicado '${name}' mesclado com '${existing.name}' (id ${existing.id}).`;
    merges.push(mergeMsg);
    warnings.push(mergeMsg);

    existing.baseline = {
      goals: existing.baseline.goals + mapped.baseline.goals,
      assists: existing.baseline.assists + mapped.baseline.assists,
      saves: existing.baseline.saves + mapped.baseline.saves,
      titles: existing.baseline.titles + mapped.baseline.titles,
    };
    existing.ratings = {
      speed: Math.max(existing.ratings.speed, mapped.ratings.speed),
      finishing: Math.max(existing.ratings.finishing, mapped.ratings.finishing),
      defense: Math.max(existing.ratings.defense, mapped.ratings.defense),
      passing: Math.max(existing.ratings.passing, mapped.ratings.passing),
    };
    existing.role =
      existing.role === "keeper" || mapped.role === "keeper" ? "keeper" : "line";
    existing.isMonthly = existing.isMonthly || mapped.isMonthly;
    if (
      mapped.joinDate &&
      (!existing.joinDate || mapped.joinDate < existing.joinDate)
    ) {
      existing.joinDate = mapped.joinDate;
    }
    if (existing.role !== "keeper") {
      existing.linePosition = mapped.linePosition;
    }
  }

  const rows = Array.from(byName.values());
  return {
    rows,
    warnings,
    merges,
    totals: computeImportTotals(rows),
  };
}

function hasDifferences(row: ImportedPlayer, existing: Player): boolean {
  return (
    row.name !== existing.name ||
    row.role !== existing.role ||
    row.linePosition !== existing.linePosition ||
    row.isMonthly !== existing.isMonthly ||
    row.joinDate !== existing.joinDate ||
    row.legacyId !== existing.legacyId ||
    row.ratings.speed !== existing.ratings.speed ||
    row.ratings.finishing !== existing.ratings.finishing ||
    row.ratings.defense !== existing.ratings.defense ||
    row.ratings.passing !== existing.ratings.passing ||
    row.baseline.goals !== existing.baseline.goals ||
    row.baseline.assists !== existing.baseline.assists ||
    row.baseline.saves !== existing.baseline.saves ||
    row.baseline.titles !== existing.baseline.titles
  );
}

export function planImport(
  source: string | ParsedCsvSheet | ImportedPlayer[],
  existingPlayers: Player[],
): ImportPlan {
  const parsed: ParsedCsvSheet =
    typeof source === "string"
      ? parsePlayersCsv(source)
      : Array.isArray(source)
        ? {
            rows: source,
            warnings: [],
            merges: [],
            totals: computeImportTotals(source),
          }
        : source;

  const byLegacyId = new Map<number, Player>();
  const byName = new Map<string, Player>();

  for (const player of existingPlayers) {
    if (typeof player.legacyId === "number" && Number.isFinite(player.legacyId)) {
      byLegacyId.set(player.legacyId, player);
    }
    byName.set(normalizeName(player.name), player);
  }

  const create: ImportedPlayer[] = [];
  const update: ImportedPlayer[] = [];
  const unchanged: ImportedPlayer[] = [];
  const warnings = [...parsed.warnings];
  const matchedIds = new Set<string>();

  for (const row of parsed.rows) {
    const matched =
      (row.legacyId !== undefined ? byLegacyId.get(row.legacyId) : undefined) ??
      byName.get(normalizeName(row.name));

    if (!matched) {
      create.push(row);
      continue;
    }

    // One row can match by id and another by name. Applying both would silently lose one of them.
    if (matchedIds.has(matched.id)) {
      warnings.push(`${row.name}: corresponde a '${matched.name}', que já está em outra linha. Linha ignorada.`);
      continue;
    }
    matchedIds.add(matched.id);

    const targetRow: ImportedPlayer = {
      ...row,
      id: matched.id,
    };

    if (hasDifferences(targetRow, matched)) {
      update.push(targetRow);
    } else {
      unchanged.push(targetRow);
    }
  }

  return {
    create,
    update,
    unchanged,
    warnings,
    merges: parsed.merges,
    totals: parsed.totals,
  };
}
