import { useMemo, useState } from "react";
import { EmptyState, Page } from "../components/Page";
import { RankingCard } from "../components/RankingCard";
import { usePlayers } from "../data/players";
import { useSessions } from "../data/sessions";
import {
  buildRanking,
  computeStats,
  listMonths,
  monthLabel,
  monthOf,
  sessionsInMonth,
  zeroBaselines,
  type RankingKey,
} from "../lib/stats";

type RankingTab = {
  key: RankingKey;
  tab: string;
  singular: string;
  plural: string;
};

const TABS: RankingTab[] = [
  { key: "goals", tab: "Gols", singular: "gol", plural: "gols" },
  { key: "assists", tab: "Assistências", singular: "assistência", plural: "assistências" },
  { key: "contributions", tab: "G+A", singular: "participação", plural: "participações" },
  { key: "saves", tab: "Defesas", singular: "defesa", plural: "defesas" },
  { key: "titles", tab: "Títulos", singular: "título", plural: "títulos" },
];

export function RankingPage() {
  const { players, loading: playersLoading, error: playersError } = usePlayers();
  const { sessions, loading: sessionsLoading, error: sessionsError } = useSessions();
  const today = new Date().toLocaleDateString("en-CA");
  const [tab, setTab] = useState(TABS[0]);
  const [scope, setScope] = useState<"season" | "month">("season");
  const [month, setMonth] = useState(monthOf(today));
  const [showKeepers, setShowKeepers] = useState(true);

  const months = useMemo(() => listMonths(sessions, today), [sessions, today]);
  const activeMonthLabel = monthLabel(month);

  const rows = useMemo(() => {
    const listed = showKeepers ? players : players.filter((player) => player.role !== "keeper");
    const stats =
      scope === "month"
        ? computeStats(zeroBaselines(players), sessionsInMonth(sessions, month))
        : computeStats(players, sessions);
    return buildRanking(listed, stats, tab.key);
  }, [players, sessions, tab, showKeepers, scope, month]);
  const error = playersError ?? sessionsError;

  return (
    <Page
      title="Ranking"
      subtitle={scope === "month" ? `Os melhores de ${activeMonthLabel}` : "Os melhores da temporada"}
    >
      <div className="segmented" role="group" aria-label="Período do ranking">
        <button
          type="button"
          className={`segmented__btn${scope === "season" ? " is-active" : ""}`}
          onClick={() => setScope("season")}
        >
          Temporada
        </button>
        <button
          type="button"
          className={`segmented__btn${scope === "month" ? " is-active" : ""}`}
          onClick={() => setScope("month")}
        >
          Mês
        </button>
      </div>

      {scope === "month" && (
        <label className="form-field">
          <span className="form-field__label">Mês</span>
          <select
            className="text-input"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          >
            {months.map((item) => (
              <option key={item} value={item}>
                {monthLabel(item)}
              </option>
            ))}
          </select>
        </label>
      )}

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
        <EmptyState>
          {scope === "month"
            ? `Ninguém tem ${tab.plural} em ${activeMonthLabel}.`
            : `Ninguém tem ${tab.plural} ainda.`}
        </EmptyState>
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
