import { onValue } from "firebase/database";
import { useEffect, useState } from "react";
import { normalizeSession, type Session } from "../lib/session";
import { dbRef } from "./firebase";

export type SessionsState = {
  sessions: Session[];
  loading: boolean;
  error: string | null;
};

export function useSessions(): SessionsState {
  const [state, setState] = useState<SessionsState>({ sessions: [], loading: true, error: null });

  useEffect(
    () =>
      onValue(
        dbRef("sessions"),
        (snapshot) => {
          const raw = (snapshot.val() ?? {}) as Record<string, Record<string, unknown>>;
          const sessions = Object.entries(raw).map(([id, value]) => normalizeSession(id, value));
          setState({ sessions, loading: false, error: null });
        },
        () => {
          setState({
            sessions: [],
            loading: false,
            error: "Não deu para carregar as partidas. Verifique sua conexão e recarregue a página.",
          });
        },
      ),
    [],
  );

  return state;
}
