/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The site is served from https://raiad-scaggion.github.io/fut-terca/, so production assets need that base.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/fut-terca/" : "/",
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Firebase rarely changes, so a deploy doesn't make phones download it again at the pitch.
        manualChunks: { firebase: ["firebase/app", "firebase/auth", "firebase/database"] },
      },
    },
    chunkSizeWarningLimit: 700,
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
}));
