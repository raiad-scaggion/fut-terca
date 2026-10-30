import { useMemo, useState } from "react";
import { EmptyState, Page } from "../components/Page";
import { usePlayers } from "../data/players";
import { useSessions } from "../data/sessions";
import { positionCode } from "../lib/players";
import { buildRanking, computeStats, type RankingKey } from "../lib/stats";

const COLUMNS: { key: RankingKey; short: string; label: string }[] = [
  { key: "goals", short: "G", label: "Gols" },
  { key: "assists", short: "A", label: "Assistências" },
  { key: "saves", short: "D", label: "Defesas" },
  { key: "titles", short: "T", label: "Títulos" },
  { key: "ovr", short: "OVR", label: "Overall" },
];

export function RankingPage() {
  const { players, loading: playersLoading, error: playersError } = usePlayers();
  const { sessions, loading: sessionsLoading, error: sessionsError } = useSessions();
  const [sortBy, setSortBy] = useState<RankingKey>("goals");

  const rows = useMemo(() => buildRanking(players, computeStats(players, sessions), sortBy), [players, sessions, sortBy]);
  const error = playersError ?? sessionsError;

  return (
    <Page title="Ranking" subtitle="Toque em uma coluna para ordenar">
      {error ? (
        <EmptyState>{error}</EmptyState>
      ) : playersLoading || sessionsLoading ? (
        <EmptyState>Carregando ranking...</EmptyState>
      ) : rows.length === 0 ? (
        <EmptyState>Nenhum jogador cadastrado ainda. Importe a planilha em Jogadores.</EmptyState>
      ) : (
        <table className="ranking">
          <thead>
            <tr>
              <th scope="col" className="ranking__position">
                <span className="visually-hidden">Posição</span>
              </th>
              <th scope="col" className="ranking__name">
                Jogador
              </th>
              {COLUMNS.map((column) => (
                <th key={column.key} scope="col" aria-sort={sortBy === column.key ? "descending" : "none"}>
                  <button
                    type="button"
                    className={`ranking__sort${sortBy === column.key ? " is-active" : ""}`}
                    aria-label={`Ordenar por ${column.label}`}
                    onClick={() => setSortBy(column.key)}
                  >
                    {column.short}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.player.id} className={row.player.active ? undefined : "is-inactive"}>
                <td className="ranking__position">{index + 1}</td>
                <th scope="row" className="ranking__name">
                  <span className="ranking__player">{row.player.name}</span>
                  <span className="ranking__pos">{positionCode(row.player)}</span>
                </th>
                {COLUMNS.map((column) => (
                  <td key={column.key} className={sortBy === column.key ? "is-active" : undefined}>
                    {row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Page>
  );
}
