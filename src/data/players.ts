import { onValue, push, remove, serverTimestamp, set, update } from "firebase/database";
import { useEffect, useState } from "react";
import type { ImportPlan } from "../lib/importCsv";
import {
  clampRating,
  normalizeClub,
  normalizeJoinDate,
  normalizeLinePosition,
  normalizeNationality,
  normalizePlayer,
  normalizeRole,
  type LinePosition,
  type Player,
  type PlayerRatings,
  type PlayerRole,
} from "../lib/players";
import { dbRef } from "./firebase";

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
  ratings: PlayerRatings;
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

export async function savePlayer(input: PlayerInput): Promise<string> {
  const name = input.name.trim();
  const role = normalizeRole(input.role);
  const linePosition = normalizeLinePosition(input.linePosition);
  const nationality = normalizeNationality(input.nationality);
  const club = normalizeClub(input.club);
  const isMonthly = Boolean(input.isMonthly);
  const joinDate = normalizeJoinDate(input.joinDate);
  const ratings: PlayerRatings = {
    speed: clampRating(input.ratings.speed, 5),
    finishing: clampRating(input.ratings.finishing, 5),
    defense: clampRating(input.ratings.defense, 5),
    passing: clampRating(input.ratings.passing, 5),
  };

  if (!input.id) {
    const newRef = push(dbRef("players"));
    await set(newRef, {
      name,
      role,
      linePosition,
      nationality,
      club,
      isMonthly,
      joinDate,
      active: true,
      createdAt: serverTimestamp(),
      ratings,
      baseline: {
        goals: 0,
        assists: 0,
        saves: 0,
        titles: 0,
      },
    });
    return newRef.key ?? "";
  }

  const updates: Record<string, unknown> = {
    name,
    role,
    linePosition,
    nationality,
    club,
    isMonthly,
    joinDate,
    ratings,
  };

  if (typeof input.active === "boolean") {
    updates.active = input.active;
  }

  await update(dbRef(`players/${input.id}`), updates);
  return input.id;
}

export async function setPlayerActive(id: string, active: boolean): Promise<void> {
  await update(dbRef(`players/${id}`), { active });
}

export async function deletePlayer(id: string): Promise<void> {
  await remove(dbRef(`players/${id}`));
}

export async function applyImport(plan: ImportPlan): Promise<void> {
  const payload: Record<string, unknown> = {};

  for (const row of plan.create) {
    payload[row.id] = {
      name: row.name,
      role: row.role,
      linePosition: row.linePosition,
      isMonthly: row.isMonthly,
      joinDate: row.joinDate,
      active: true,
      createdAt: serverTimestamp(),
      ...(row.legacyId !== undefined ? { legacyId: row.legacyId } : {}),
      ratings: row.ratings,
      baseline: row.baseline,
    };
  }

  for (const row of plan.update) {
    payload[`${row.id}/name`] = row.name;
    payload[`${row.id}/role`] = row.role;
    payload[`${row.id}/linePosition`] = row.linePosition;
    payload[`${row.id}/isMonthly`] = row.isMonthly;
    payload[`${row.id}/joinDate`] = row.joinDate;
    if (row.legacyId !== undefined) {
      payload[`${row.id}/legacyId`] = row.legacyId;
    }
    payload[`${row.id}/ratings`] = row.ratings;
    payload[`${row.id}/baseline`] = row.baseline;
  }

  if (Object.keys(payload).length === 0) {
    return;
  }

  await update(dbRef("players"), payload);
}
