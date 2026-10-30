export type MatchTimer = {
  durationSec: number;
  running: boolean;
  startedAt: number;
  elapsedMs: number;
};

// `now` must come from the shared server clock, so every phone shows the same time.
export function getRemainingMs(timer: MatchTimer | undefined, now: number): number {
  if (!timer) {
    return 0;
  }
  const elapsed = timer.elapsedMs + (timer.running ? Math.max(0, now - timer.startedAt) : 0);
  return timer.durationSec * 1000 - elapsed;
}

// Past the end the clock keeps counting up, shown with a "+".
export function formatClock(ms: number): string {
  const totalSeconds = Math.floor(Math.abs(ms) / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${ms < 0 ? "+" : ""}${minutes}:${seconds}`;
}

export function startTimer(timer: MatchTimer, now: number): MatchTimer {
  return timer.running ? timer : { ...timer, running: true, startedAt: now };
}

export function stopTimer(timer: MatchTimer, now: number): MatchTimer {
  if (!timer.running) {
    return timer;
  }
  return { ...timer, running: false, startedAt: 0, elapsedMs: timer.elapsedMs + Math.max(0, now - timer.startedAt) };
}
