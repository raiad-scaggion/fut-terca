import { get, ref, serverTimestamp, update } from "firebase/database";
import type { LegacyImport, LegacyPlayer } from "../lib/legacyNight";
import { db, dbRef } from "./firebase";

// Read only. "fut-terca/live" belongs to the old app and this app never writes there.
export async function readLegacyNight(): Promise<Record<string, unknown> | null> {
  const snapshot = await get(ref(db, "fut-terca/live"));
  const value = snapshot.val() as unknown;
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

export function legacySessionId(date: string): string {
  return `legacy-${date}`;
}

// One multi-path write: the session and the players it needs land together or not at all.
export async function importLegacyNight(converted: LegacyImport, newPlayers: LegacyPlayer[]): Promise<void> {
  const date = String(converted.session.date);
  const existing = await get(dbRef("sessions"));
  const sessions = (existing.val() ?? {}) as Record<string, { date?: string }>;
  if (Object.values(sessions).some((session) => session?.date === date)) {
    throw new Error("Já existe uma noite com essa data.");
  }

  const payload: Record<string, unknown> = { [`sessions/${legacySessionId(date)}`]: converted.session };
  for (const player of newPlayers) {
    payload[`players/${player.id}`] = {
      name: player.name,
      role: "line",
      linePosition: "meio",
      isMonthly: false,
      joinDate: date,
      active: true,
      createdAt: serverTimestamp(),
      legacyId: player.legacyId,
      ratings: { speed: 5, finishing: 5, defense: 5, passing: 5 },
      baseline: { goals: 0, assists: 0, saves: 0, titles: 0 },
    };
  }
  await update(dbRef(""), payload);
}
