import { onValue } from "firebase/database";
import { useEffect, useMemo, useState } from "react";
import type { Match, Session } from "../lib/session";
import { dbRef } from "./firebase";
import { useSessions } from "./sessions";

export type LiveIds = {
  sessionId: string | null;
  matchId: string | null;
  loading: boolean;
};

export function useLive(): LiveIds {
  const [live, setLive] = useState<LiveIds>({ sessionId: null, matchId: null, loading: true });

  useEffect(
    () =>
      onValue(dbRef("live"), (snapshot) => {
        const value = (snapshot.val() ?? {}) as { sessionId?: string; matchId?: string };
        setLive({ sessionId: value.sessionId ?? null, matchId: value.matchId ?? null, loading: false });
      }),
    [],
  );

  return live;
}

export function useLiveMatch(): { session: Session | null; match: Match | null } {
  const { sessionId, matchId } = useLive();
  const { sessions } = useSessions();

  return useMemo(() => {
    const session = sessions.find((item) => item.id === sessionId) ?? null;
    return { session, match: session?.matches.find((item) => item.id === matchId) ?? null };
  }, [sessions, sessionId, matchId]);
}
