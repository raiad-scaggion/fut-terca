import type { KeeperRow, LineRow } from "../lib/table";
import type { StatsColumn } from "./StatsTable";

// The Ranking table columns. The Glossário lists the same names.
export const LINE_COLUMNS: StatsColumn<LineRow>[] = [
  { key: "titles", label: "T", name: "Títulos", value: (row) => row.titles },
  { key: "goals", label: "G", name: "Gols", value: (row) => row.goals },
  { key: "assists", label: "A", name: "Assistências", value: (row) => row.assists },
  { key: "contributions", label: "G+A", name: "Gols + assistências", value: (row) => row.contributions },
  { key: "games", label: "J", name: "Jogos na linha", value: (row) => row.games },
  { key: "ownGoals", label: "GC", name: "Gols contra", value: (row) => row.ownGoals },
  { key: "goalsPerNight", label: "G/N", name: "Gols por noite", value: (row) => row.goalsPerNight, average: true },
  { key: "assistsPerNight", label: "A/N", name: "Assistências por noite", value: (row) => row.assistsPerNight, average: true },
  { key: "titlesPerNight", label: "T/N", name: "Títulos por noite", value: (row) => row.titlesPerNight, average: true },
];

export const KEEPER_COLUMNS: StatsColumn<KeeperRow>[] = [
  { key: "games", label: "J", name: "Jogos no gol", value: (row) => row.games },
  { key: "saves", label: "D", name: "Defesas", value: (row) => row.saves },
  { key: "savesPerGame", label: "D/J", name: "Defesas por jogo", value: (row) => row.savesPerGame, average: true },
  { key: "conceded", label: "GS", name: "Gols sofridos", value: (row) => row.conceded },
  { key: "concededPerGame", label: "GS/J", name: "Gols sofridos por jogo", value: (row) => row.concededPerGame, average: true },
  { key: "cleanSheets", label: "SG", name: "Jogos sem sofrer gol", value: (row) => row.cleanSheets },
  { key: "howlers", label: "FR", name: "Frangos", value: (row) => row.howlers },
  { key: "ownGoals", label: "GC", name: "Gols contra", value: (row) => row.ownGoals },
  { key: "titles", label: "T", name: "Títulos no gol", value: (row) => row.titles },
  { key: "titlesPerNight", label: "T/N", name: "Títulos por noite no gol", value: (row) => row.titlesPerNight, average: true },
];
