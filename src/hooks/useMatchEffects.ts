import { useEffect, useRef } from "react";

function whistle(context: AudioContext) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "square";
  oscillator.frequency.value = 2200;
  gain.gain.value = 0.15;
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 1.2);
}

// Keeps the screen on while it's mounted, and whistles when a running clock reaches zero.
export function useMatchEffects(remainingMs: number, running: boolean) {
  const audio = useRef<AudioContext | null>(null);
  const previous = useRef(remainingMs);

  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    let released = false;

    const acquire = async () => {
      try {
        lock = (await navigator.wakeLock?.request("screen")) ?? null;
        if (released) {
          await lock?.release();
        }
      } catch {
        lock = null;
      }
    };
    // The browser drops the lock whenever the page is hidden.
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void acquire();
      }
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      released = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release();
    };
  }, []);

  // Browsers only allow sound after a tap, so the first tap on the screen unlocks it.
  useEffect(() => {
    const unlock = () => {
      audio.current ??= new AudioContext();
      void audio.current.resume();
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  useEffect(() => {
    if (running && previous.current > 0 && remainingMs <= 0) {
      navigator.vibrate?.([400, 150, 400]);
      if (audio.current) {
        whistle(audio.current);
      }
    }
    previous.current = remainingMs;
  }, [remainingMs, running]);
}
