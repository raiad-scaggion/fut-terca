import { onValue, push, runTransaction, serverTimestamp } from "firebase/database";
import { useEffect, useState } from "react";
import { buildSession, normalizeWeekly, type Weekly } from "../lib/weekly";
import { dbRef } from "./firebase";
import { writeWithLog } from "./log";

export type WeeklyState = {
  weekly: Weekly;
  liveSessionId: string | null;
  loading: boolean;
};

export function useWeekly(): WeeklyState {
  const [weekly, setWeekly] = useState<Weekly | null>(null);
  const [live, setLive] = useState<{ id: string | null } | null>(null);

  useEffect(() => onValue(dbRef("weekly"), (snapshot) => setWeekly(normalizeWeekly(snapshot.val()))), []);
  useEffect(() => onValue(dbRef("live/sessionId"), (snapshot) => setLive({ id: snapshot.val() as string | null })), []);

  return {
    weekly: weekly ?? normalizeWeekly(null),
    liveSessionId: live?.id ?? null,
    loading: weekly === null || live === null,
  };
}

export async function updateWeekly(edit: (weekly: Weekly) => Weekly): Promise<void> {
  await runTransaction(dbRef("weekly"), (current) => edit(normalizeWeekly(current)));
}

function today(): string {
  return new Date().toLocaleDateString("sv-SE");
}

// One multi-path write, so a session and the pointer to it can't exist without each other.
export async function confirmSession(weekly: Weekly): Promise<void> {
  const sessionId = push(dbRef("sessions")).key ?? "";
  await writeWithLog({ action: "session.create", sessionId }, () => ({
    [`sessions/${sessionId}`]: buildSession(weekly, today(), serverTimestamp()),
    "live/sessionId": sessionId,
  }));
}

export async function cancelSession(sessionId: string): Promise<void> {
  await writeWithLog({ action: "session.cancel", sessionId }, () => ({ [`sessions/${sessionId}`]: null, "live/sessionId": null }));
}
