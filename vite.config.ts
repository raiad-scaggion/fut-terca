/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The site is served from https://raiad-scaggion.github.io/fut-terca/, so production assets need that base.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/fut-terca/" : "/",
  plugins: [react()],
  test: {
    include: ["src/**/*.test.ts"],
  },
}));
