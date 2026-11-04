import { push, runTransaction } from "firebase/database";
import { startTimer, stopTimer, type MatchTimer } from "../lib/clock";
import { applyFinishEdit, applyFinishMatch, type RawSession } from "../lib/cup";
import type { MatchEvent, MatchEventType } from "../lib/session";
import { serverNow } from "./clock";
import { dbRef } from "./firebase";
import { logOnly, writeWithLog } from "./log";

const matchPath = (sessionId: string, matchId: string) => `sessions/${sessionId}/matches/${matchId}`;

// Only one match runs at a time. The transaction stops two phones starting different matches.
export async function startMatch(
  sessionId: string,
  matchId: string,
  keepers: { home: string; away: string },
  durationSec: number,
): Promise<boolean> {
  const { committed } = await runTransaction(dbRef("live/matchId"), (current) => (current ? undefined : matchId));
  if (!committed) {
    return false;
  }
  const path = matchPath(sessionId, matchId);
  await writeWithLog({ action: "match.start", sessionId, matchId }, () => ({
    [`${path}/status`]: "live",
    [`${path}/keepers`]: keepers,
    [`${path}/timer`]: { durationSec, running: false, startedAt: 0, elapsedMs: 0 },
  }));
  return true;
}

export async function setTimerRunning(sessionId: string, matchId: string, running: boolean): Promise<void> {
  await runTransaction(dbRef(`${matchPath(sessionId, matchId)}/timer`), (timer: MatchTimer | null) => {
    if (!timer) {
      return timer;
    }
    return running ? startTimer(timer, serverNow()) : stopTimer(timer, serverNow());
  });
}

// Each event gets its own key, so two phones marking at once never overwrite each other.
export async function addEvent(sessionId: string, matchId: string, type: MatchEventType, playerId: string, teamId: string): Promise<void> {
  const eventId = push(dbRef(`${matchPath(sessionId, matchId)}/events`)).key ?? "";
  await writeWithLog({ action: "event.add", sessionId, matchId, playerId, eventType: type }, (logId) => ({
    [`${matchPath(sessionId, matchId)}/events/${eventId}`]: { type, playerId, teamId, at: serverNow(), logId },
  }));
}

export async function removeEvent(sessionId: string, matchId: string, event: MatchEvent): Promise<void> {
  await writeWithLog({ action: "event.remove", sessionId, matchId, playerId: event.playerId, eventType: event.type }, () => ({
    [`${matchPath(sessionId, matchId)}/events/${event.id}`]: null,
  }));
}

export async function finishMatch(sessionId: string, matchId: string): Promise<void> {
  const { committed, snapshot } = await runTransaction(dbRef(`sessions/${sessionId}`), (raw: RawSession | null) =>
    raw ? applyFinishMatch(raw, sessionId, matchId, serverNow()) : raw,
  );
  if (committed) {
    const cupOver = (snapshot.val() as RawSession).status === "finished";
    await writeWithLog({ action: "match.finish", sessionId, matchId }, () =>
      cupOver ? { "live/matchId": null, "live/sessionId": null } : { "live/matchId": null },
    );
  }
}

export async function finishEdit(sessionId: string, matchId: string): Promise<void> {
  const { committed } = await runTransaction(dbRef(`sessions/${sessionId}`), (raw: RawSession | null) =>
    raw ? applyFinishEdit(raw, sessionId, matchId) : raw,
  );
  if (committed) {
    await logOnly({ action: "match.fix", sessionId, matchId });
  }
}

export async function cancelMatch(sessionId: string, matchId: string, durationSec: number): Promise<void> {
  const path = matchPath(sessionId, matchId);
  await writeWithLog({ action: "match.cancel", sessionId, matchId }, () => ({
    [`${path}/status`]: "pending",
    [`${path}/keepers`]: null,
    [`${path}/events`]: null,
    [`${path}/timer`]: { durationSec, running: false, startedAt: 0, elapsedMs: 0 },
    "live/matchId": null,
  }));
}
