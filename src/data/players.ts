import { onValue, push, serverTimestamp } from "firebase/database";
import { useEffect, useState } from "react";
import { diffPlayer, type PlayerFields } from "../lib/changeLog";
import type { ImportPlan } from "../lib/importCsv";
import {
  defaultKeeperStats,
  lineStatsFromRatings,
  normalizeClub,
  normalizeJoinDate,
  normalizeLinePosition,
  normalizeNationality,
  normalizePlayer,
  normalizeRole,
  normalizeStats,
  type LinePosition,
  type Player,
  type PlayerStats,
  type PlayerRole,
} from "../lib/players";
import { dbRef } from "./firebase";
import { writeWithLog } from "./log";

export type PlayersState = {
  players: Player[];
  loading: boolean;
  error: string | null;
};

export type PlayerInput = {
  id?: string;
  name: string;
  role: PlayerRole;
  linePosition: LinePosition;
  nationality: string;
  club: string;
  stats: PlayerStats;
  isMonthly: boolean;
  joinDate: string;
  active?: boolean;
};

export function usePlayers(): PlayersState {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () =>
      onValue(
        dbRef("players"),
        (snapshot) => {
          const raw = snapshot.val() as Record<string, unknown> | null;
          if (!raw || typeof raw !== "object") {
            setPlayers([]);
            setLoading(false);
            setError(null);
            return;
          }

          const list: Player[] = [];
          for (const [id, value] of Object.entries(raw)) {
            if (value && typeof value === "object") {
              list.push(normalizePlayer(id, value as Record<string, unknown>));
            }
          }

          list.sort((a, b) =>
            a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }),
          );

          setPlayers(list);
          setLoading(false);
          setError(null);
        },
        () => {
          setError(
            "Não deu para carregar os jogadores. Verifique sua conexão e recarregue a página.",
          );
          setLoading(false);
        },
      ),
    [],
  );

  return { players, loading, error };
}

export async function savePlayer(input: PlayerInput, previous?: Player): Promise<string> {
  const name = input.name.trim();
  const role = normalizeRole(input.role);
  const linePosition = normalizeLinePosition(input.linePosition);
  const nationality = normalizeNationality(input.nationality);
  const club = normalizeClub(input.club);
  const isMonthly = Boolean(input.isMonthly);
  const joinDate = normalizeJoinDate(input.joinDate);
  const stats = normalizeStats({ stats: input.stats });

  if (!input.id) {
    const id = push(dbRef("players")).key ?? "";
    await writeWithLog({ action: "player.create", playerId: id, playerName: name }, (logId) => ({
      [`players/${id}`]: {
        logId,
        name,
        role,
        linePosition,
        nationality,
        club,
        isMonthly,
        joinDate,
        active: true,
        createdAt: serverTimestamp(),
        stats,
        baseline: {
          goals: 0,
          assists: 0,
          saves: 0,
          titles: 0,
        },
      },
    }));
    return id;
  }

  const updates: PlayerFields = {
    name,
    role,
    linePosition,
    nationality,
    club,
    isMonthly,
    joinDate,
    stats,
  };

  if (typeof input.active === "boolean") {
    updates.active = input.active;
  }

  const id = input.id;
  const changes = previous ? diffPlayer(previous, updates) : undefined;
  await writeWithLog({ action: "player.edit", playerId: id, playerName: name, changes }, (logId) =>
    Object.fromEntries(Object.entries({ ...updates, logId }).map(([key, value]) => [`players/${id}/${key}`, value])),
  );
  return id;
}

// A Legend leaves the regular lists but can still be picked in the Sorteio.
export async function setLegend(player: Pick<Player, "id" | "name">, legend: boolean): Promise<void> {
  await writeWithLog(
    { action: legend ? "player.legend" : "player.unlegend", playerId: player.id, playerName: player.name },
    (logId) => ({ [`players/${player.id}/legend`]: legend, [`players/${player.id}/logId`]: logId }),
  );
}

export async function deletePlayer(player: Pick<Player, "id" | "name">): Promise<void> {
  await writeWithLog({ action: "player.delete", playerId: player.id, playerName: player.name }, () => ({
    [`players/${player.id}`]: null,
    [`photos/${player.id}`]: null,
  }));
}

export async function applyImport(plan: ImportPlan): Promise<void> {
  const count = plan.create.length + plan.update.length;
  if (count === 0) {
    return;
  }

  await writeWithLog({ action: "import", count }, (logId) => {
    const payload: Record<string, unknown> = {};

    for (const row of plan.create) {
      payload[`players/${row.id}`] = {
        logId,
        name: row.name,
        role: row.role,
        linePosition: row.linePosition,
        isMonthly: row.isMonthly,
        joinDate: row.joinDate,
        active: true,
        createdAt: serverTimestamp(),
        ...(row.legacyId !== undefined ? { legacyId: row.legacyId } : {}),
        stats: { line: lineStatsFromRatings(row.ratings), keeper: defaultKeeperStats() },
        baseline: row.baseline,
      };
    }

    for (const row of plan.update) {
      const path = `players/${row.id}`;
      payload[`${path}/logId`] = logId;
      payload[`${path}/name`] = row.name;
      payload[`${path}/role`] = row.role;
      payload[`${path}/linePosition`] = row.linePosition;
      payload[`${path}/isMonthly`] = row.isMonthly;
      payload[`${path}/joinDate`] = row.joinDate;
      if (row.legacyId !== undefined) {
        payload[`${path}/legacyId`] = row.legacyId;
      }
      payload[`${path}/baseline`] = row.baseline;
    }

    return payload;
  });
}
