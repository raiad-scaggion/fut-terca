import { limitToLast, onValue, orderByKey, push, query, serverTimestamp, update } from "firebase/database";
import { useEffect, useState } from "react";
import { normalizeLogEntries, type LogEntry, type LogInput } from "../lib/changeLog";
import { auth, dbRef } from "./firebase";

const LOG_LIMIT = 300;

// The database refuses undefined values, and optional fields are left out instead.
function compact(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}

// Saves a change and its log entry in one write, so neither can exist without the other. The rules
// check the author fields against the login, and player and event writes must carry the new logId.
export async function writeWithLog(entry: LogInput, build: (logId: string) => Record<string, unknown>): Promise<void> {
  const logId = push(dbRef("log")).key ?? "";
  const user = auth.currentUser;
  await update(dbRef(""), {
    ...build(logId),
    [`log/${logId}`]: compact({
      ...entry,
      by: user?.email ?? "",
      name: user?.displayName ?? "",
      uid: user?.uid ?? "",
      at: serverTimestamp(),
    }),
  });
}

// For writes that must stay transactions (finishing a match), the entry goes right after.
export function logOnly(entry: LogInput): Promise<void> {
  return writeWithLog(entry, () => ({}));
}

export type LogState = { entries: LogEntry[]; loading: boolean; error: string | null };

export function useChangeLog(): LogState {
  const [state, setState] = useState<LogState>({ entries: [], loading: true, error: null });

  useEffect(
    () =>
      onValue(
        query(dbRef("log"), orderByKey(), limitToLast(LOG_LIMIT)),
        (snapshot) => setState({ entries: normalizeLogEntries(snapshot.val()), loading: false, error: null }),
        () => setState({ entries: [], loading: false, error: "Só o dono do app pode ver o histórico." }),
      ),
    [],
  );

  return state;
}
