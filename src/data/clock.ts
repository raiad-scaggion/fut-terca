import { onValue, ref } from "firebase/database";
import { useEffect, useState } from "react";
import { db } from "./firebase";

let serverOffset = 0;

onValue(ref(db, ".info/serverTimeOffset"), (snapshot) => {
  serverOffset = (snapshot.val() as number | null) ?? 0;
});

// Phones' own clocks disagree, so anything shared uses the database's clock.
export function serverNow(): number {
  return Date.now() + serverOffset;
}

export function useNow(active: boolean, intervalMs = 250): number {
  const [now, setNow] = useState(serverNow);

  useEffect(() => {
    if (!active) {
      return undefined;
    }
    const timer = window.setInterval(() => setNow(serverNow()), intervalMs);
    return () => window.clearInterval(timer);
  }, [active, intervalMs]);

  return now;
}
