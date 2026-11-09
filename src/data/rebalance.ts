import { get, onValue, serverTimestamp, set } from "firebase/database";
import { useEffect, useState } from "react";
import { emailKey } from "../lib/admin";
import {
  normalizeAllVotes,
  normalizeRound,
  normalizeVotes,
  publishedCount,
  publishPaths,
  type Average,
  type Round,
  type VotesByAdmin,
  type VotesByPlayer,
} from "../lib/rebalance";
import { dbRef } from "./firebase";
import { writeWithLog } from "./log";

type Loadable<T> = { value: T; loading: boolean; error: boolean };

// Listens to one path. A permission error counts as "no data" plus an error flag.
function useValue<T>(path: string | null, read: (raw: unknown) => T, empty: T): Loadable<T> {
  const [state, setState] = useState<Loadable<T>>({ value: empty, loading: path !== null, error: false });

  useEffect(() => {
    if (!path) {
      setState({ value: empty, loading: false, error: false });
      return undefined;
    }
    setState((current) => ({ ...current, loading: true }));
    return onValue(
      dbRef(path),
      (snapshot) => setState({ value: read(snapshot.val()), loading: false, error: false }),
      () => setState({ value: empty, loading: false, error: true }),
    );
    // read and empty are module-level helpers or constants at every call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  return state;
}

export type RulesState = "checking" | "ready" | "missing";

// The 2.2 rules hide everything under "rebalance" except the paths each person may read. Under the
// old rules this probe path is public, which means the votes would be public too, so voting waits.
export function useRebalanceRules(): RulesState {
  const [state, setState] = useState<RulesState>("checking");

  useEffect(() => {
    let current = true;
    get(dbRef("rebalance/probe"))
      .then(() => current && setState("missing"))
      .catch(() => current && setState("ready"));
    return () => {
      current = false;
    };
  }, []);

  return state;
}

const asString = (raw: unknown) => (typeof raw === "string" ? raw : null);
const asNumber = (raw: unknown) => (typeof raw === "number" ? raw : null);
const asStringMap = (raw: unknown): Record<string, string> =>
  raw && typeof raw === "object"
    ? Object.fromEntries(Object.entries(raw as Record<string, unknown>).filter((entry): entry is [string, string] => typeof entry[1] === "string"))
    : {};
const asTrueKeys = (raw: unknown): string[] =>
  raw && typeof raw === "object" ? Object.keys(raw as Record<string, unknown>).filter((key) => (raw as Record<string, unknown>)[key] === true) : [];
const asNumberMap = (raw: unknown): Record<string, number> =>
  raw && typeof raw === "object"
    ? Object.fromEntries(Object.entries(raw as Record<string, unknown>).filter((entry): entry is [string, number] => typeof entry[1] === "number"))
    : {};

const NO_VOTES: VotesByPlayer = {};
const NO_ADMIN_VOTES: VotesByAdmin = {};
const NO_MAP: Record<string, string> = {};
const NO_KEYS: string[] = [];
const NO_TIMES: Record<string, number> = {};

export function useRound(enabled: boolean): Loadable<Round> {
  return useValue(enabled ? "rebalance/round" : null, normalizeRound, normalizeRound(null));
}

// The admin's own data. Each path is readable only by that admin (and the owner).
export function useMyRebalance(email: string | null) {
  const key = email ? emailKey(email) : null;
  const ownPlayer = useValue(key ? `adminPlayers/${key}` : null, asString, null);
  const votes = useValue(key ? `rebalance/votes/${key}` : null, normalizeVotes, NO_VOTES);
  const sent = useValue(key ? `rebalance/sent/${key}` : null, asNumber, null);
  return { key, ownPlayer, votes, sent };
}

// Owner only: every admin, their linked player, their votes and who sent.
export function useOwnerRebalance(isOwner: boolean) {
  const admins = useValue(isOwner ? "admins" : null, asTrueKeys, NO_KEYS);
  const adminPlayers = useValue(isOwner ? "adminPlayers" : null, asStringMap, NO_MAP);
  const votes = useValue(isOwner ? "rebalance/votes" : null, normalizeAllVotes, NO_ADMIN_VOTES);
  const sent = useValue(isOwner ? "rebalance/sent" : null, asNumberMap, NO_TIMES);
  return { admins, adminPlayers, votes, sent };
}

export function saveVote(key: string, playerId: string, values: Record<string, number>): Promise<void> {
  return set(dbRef(`rebalance/votes/${key}/${playerId}`), { ...values, at: serverTimestamp() });
}

export function sendVotes(key: string): Promise<void> {
  return set(dbRef(`rebalance/sent/${key}`), serverTimestamp());
}

export function setAdminPlayer(key: string, playerId: string | null): Promise<void> {
  return set(dbRef(`adminPlayers/${key}`), playerId);
}

// One write: every averaged player's stats, the log entry and the closed round.
export function publishRebalance(averages: Average[], round: Round): Promise<void> {
  return writeWithLog({ action: "rebalance.publish", count: publishedCount(averages) }, (logId) => ({
    ...publishPaths(averages, logId),
    "rebalance/round": { status: "closed", openedAt: round.openedAt, publishedAt: serverTimestamp() },
  }));
}

// A new round starts clean: no votes and nobody marked as sent.
export function openRound(): Promise<void> {
  return writeWithLog({ action: "rebalance.open" }, () => ({
    "rebalance/votes": null,
    "rebalance/sent": null,
    "rebalance/round": { status: "open", openedAt: serverTimestamp() },
  }));
}

