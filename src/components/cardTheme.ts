import type { AwardKey } from "../lib/awards";
import type { CardTier } from "../lib/players";

export type CardTheme = CardTier | AwardKey;

export const CARD_PATH =
  "M0 122C42 116 72 88 80 40C150 12 420 12 490 40C498 88 528 116 570 122L570 762C570 790 556 800 530 808C440 834 350 860 285 910C220 860 130 834 40 808C14 800 0 790 0 762Z";

type ThemeArt = {
  stops: string[];
  rim: [string, string];
  glow: string;
  ink: string;
  dark: boolean;
};

export const STOP_OFFSETS = [0, 0.22, 0.42, 0.62, 0.8, 1];

export const CARD_THEMES: Record<CardTheme, ThemeArt> = {
  gold: { stops: ["#fff3c4", "#e9cd7c", "#f8e7a8", "#c9a24a", "#e8cc7c", "#a67f2e"], rim: ["#fff8dc", "#8f6a22"], glow: "#fff4c9", ink: "#2b1f07", dark: false },
  silver: { stops: ["#ffffff", "#ccd2d8", "#f1f3f5", "#a3abb3", "#d5dade", "#7f878f"], rim: ["#ffffff", "#6c747c"], glow: "#ffffff", ink: "#191d22", dark: false },
  bronze: { stops: ["#f3cfa8", "#c98f5c", "#e9b98a", "#96603a", "#c48a58", "#6e4326"], rim: ["#fbdcbc", "#5e381f"], glow: "#ffd9b3", ink: "#23130a", dark: false },
  craque: { stops: ["#2c2616", "#14110a", "#2a2412", "#0a0806", "#1b170d", "#050403"], rim: ["#fbeab0", "#7d5f1e"], glow: "#f3d98a", ink: "#f3d98a", dark: true },
  artilheiro: { stops: ["#d8392b", "#8f1019", "#c22a24", "#5b0812", "#94131b", "#2c040b"], rim: ["#ffb98a", "#5c0a10"], glow: "#ff9a4d", ink: "#fff0d8", dark: true },
  garcom: { stops: ["#16a583", "#0a5e54", "#129476", "#063c38", "#0b6459", "#032523"], rim: ["#9df3d4", "#04403a"], glow: "#7cf0c8", ink: "#e9fff6", dark: true },
  paredao: { stops: ["#4663d8", "#232a86", "#3a52c4", "#14155a", "#262e90", "#0b0a38"], rim: ["#bcd0ff", "#141a66"], glow: "#9db8ff", ink: "#eef1ff", dark: true },
};
