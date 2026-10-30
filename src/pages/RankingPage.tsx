import { useMemo, useState } from "react";
import { EmptyState, Page } from "../components/Page";
import { RankingCard } from "../components/RankingCard";
import { usePlayers } from "../data/players";
import { useSessions } from "../data/sessions";
import { buildRanking, computeStats, type PlayerStats } from "../lib/stats";

type RankingTab = {
  key: keyof PlayerStats;
  tab: string;
  singular: string;
  plural: string;
};

const TABS: RankingTab[] = [
  { key: "titles", tab: "Títulos", singular: "título", plural: "títulos" },
  { key: "goals", tab: "Gols", singular: "gol", plural: "gols" },
  { key: "assists", tab: "Assistências", singular: "assistência", plural: "assistências" },
];

export function RankingPage() {
  const { players, loading: playersLoading, error: playersError } = usePlayers();
  const { sessions, loading: sessionsLoading, error: sessionsError } = useSessions();
  const [tab, setTab] = useState(TABS[0]);

  const [showKeepers, setShowKeepers] = useState(true);

  const rows = useMemo(() => {
    const listed = showKeepers ? players : players.filter((player) => player.role !== "keeper");
    return buildRanking(listed, computeStats(players, sessions), tab.key);
  }, [players, sessions, tab, showKeepers]);
  const error = playersError ?? sessionsError;

  return (
    <Page title="Ranking" subtitle="Os melhores da temporada">
      <div className="filter-chips ranking-tabs" role="tablist" aria-label="Escolher ranking">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={item.key === tab.key}
            className={`filter-chip${item.key === tab.key ? " is-active" : ""}`}
            onClick={() => setTab(item)}
          >
            {item.tab}
          </button>
        ))}
      </div>

      <label className="switch-row ranking-keepers">
        <span className="switch-row__label">Mostrar goleiros</span>
        <input
          type="checkbox"
          className="switch-row__input"
          checked={showKeepers}
          onChange={(event) => setShowKeepers(event.target.checked)}
        />
      </label>

      {error ? (
        <EmptyState>{error}</EmptyState>
      ) : playersLoading || sessionsLoading ? (
        <EmptyState>Carregando ranking...</EmptyState>
      ) : rows.length === 0 ? (
        <EmptyState>Ninguém tem {tab.plural} ainda.</EmptyState>
      ) : (
        <div className="players-grid">
          {rows.map((row) => (
            <RankingCard
              key={row.player.id}
              player={row.player}
              position={row.position}
              value={row.value}
              label={row.value === 1 ? tab.singular : tab.plural}
            />
          ))}
        </div>
      )}
    </Page>
  );
}
