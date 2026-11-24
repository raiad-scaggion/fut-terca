import { useEffect, useRef } from "react";
import { isFinalTick } from "../lib/clock";

function tone(context: AudioContext, frequency: number, seconds: number) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "square";
  oscillator.frequency.value = frequency;
  gain.gain.value = 0.15;
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + seconds);
}

// Keeps the screen on while it's mounted, beeps each of the last 10 seconds and whistles at zero.
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
        tone(audio.current, 2200, 1.2);
      }
    } else if (running && isFinalTick(previous.current, remainingMs)) {
      navigator.vibrate?.(80);
      if (audio.current) {
        tone(audio.current, 1400, 0.12);
      }
    }
    previous.current = remainingMs;
  }, [remainingMs, running]);
}
