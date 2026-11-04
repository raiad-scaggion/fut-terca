import { useMemo, useState } from "react";
import { EmptyState, Page } from "../components/Page";
import { InfoTip } from "../components/InfoTip";
import { RankingCard } from "../components/RankingCard";
import { StatsLegend, StatsTable, type StatsColumn } from "../components/StatsTable";
import { usePhotos } from "../data/photos";
import { usePlayers } from "../data/players";
import { useSessions } from "../data/sessions";
import { getCurrentAwards, getPlayerAward } from "../lib/awards";
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
import { buildKeeperTable, buildLineTable, type KeeperRow, type LineRow } from "../lib/table";

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

const LINE_COLUMNS: StatsColumn<LineRow>[] = [
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

const KEEPER_COLUMNS: StatsColumn<KeeperRow>[] = [
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

export function RankingPage() {
  const { players, loading: playersLoading, error: playersError } = usePlayers();
  const { sessions, loading: sessionsLoading, error: sessionsError } = useSessions();
  const today = new Date().toLocaleDateString("en-CA");
  const photos = usePhotos();
  const [tab, setTab] = useState(TABS[0]);
  const [scope, setScope] = useState<"season" | "month">("season");
  const [month, setMonth] = useState(monthOf(today));
  const [showKeepers, setShowKeepers] = useState(true);
  const [view, setView] = useState<"cards" | "table">("cards");
  const [tableSlot, setTableSlot] = useState<"line" | "keeper">("line");

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
  const table = useMemo(() => {
    const [listed, played] =
      scope === "month" ? [zeroBaselines(players), sessionsInMonth(sessions, month)] : [players, sessions];
    return { line: buildLineTable(listed, played), keeper: buildKeeperTable(listed, played) };
  }, [players, sessions, scope, month]);
  const awards = useMemo(() => getCurrentAwards(players, sessions, today), [players, sessions, today]);
  const awardMonth = monthLabel(awards.month).slice(0, 3);
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
            aria-selected={view === "cards" && item.key === tab.key}
            className={`filter-chip${view === "cards" && item.key === tab.key ? " is-active" : ""}`}
            onClick={() => {
              setTab(item);
              setView("cards");
            }}
          >
            {item.tab}
          </button>
        ))}
        <button
          type="button"
          role="tab"
          aria-selected={view === "table"}
          className={`filter-chip${view === "table" ? " is-active" : ""}`}
          onClick={() => setView("table")}
        >
          Tabela
        </button>
      </div>

      {view === "table" ? (
        <>
          <div className="segmented ranking-keepers" role="group" aria-label="Tabela da linha ou do gol">
            <button
              type="button"
              className={`segmented__btn${tableSlot === "line" ? " is-active" : ""}`}
              onClick={() => setTableSlot("line")}
            >
              Linha
            </button>
            <button
              type="button"
              className={`segmented__btn${tableSlot === "keeper" ? " is-active" : ""}`}
              onClick={() => setTableSlot("keeper")}
            >
              Goleiros
            </button>
          </div>
          <p className="table-help">
            Legenda{" "}
            <InfoTip label="O que significa cada coluna">
              <StatsLegend columns={tableSlot === "line" ? LINE_COLUMNS : KEEPER_COLUMNS} />
              <p>
                {scope === "month"
                  ? "Tudo conta só as partidas jogadas no app."
                  : tableSlot === "line"
                    ? "T, G e A somam o histórico da planilha. O resto conta só as partidas jogadas no app, desde 03/11."
                    : "D e T somam o histórico da planilha. O resto conta só as partidas jogadas no app, desde 03/11."}
              </p>
              <p>Toque no título de uma coluna para ordenar.</p>
            </InfoTip>
          </p>
          {error ? (
            <EmptyState>{error}</EmptyState>
          ) : playersLoading || sessionsLoading ? (
            <EmptyState>Carregando tabela...</EmptyState>
          ) : (tableSlot === "line" ? table.line : table.keeper).length === 0 ? (
            <EmptyState>Ninguém jogou {scope === "month" ? `em ${activeMonthLabel}` : "ainda"}.</EmptyState>
          ) : tableSlot === "line" ? (
            <StatsTable key="line" label="Tabela da linha" rows={table.line} columns={LINE_COLUMNS} defaultSort="titles" />
          ) : (
            <StatsTable key="keeper" label="Tabela dos goleiros" rows={table.keeper} columns={KEEPER_COLUMNS} defaultSort="games" />
          )}
        </>
      ) : (
        <>
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
          {rows.map((row, index) => (
            <RankingCard
              key={row.player.id}
              player={row.player}
              position={row.position}
              value={row.value}
              label={row.value === 1 ? tab.singular : tab.plural}
              award={getPlayerAward(awards, row.player.id)}
              awardMonth={awardMonth}
              photo={photos[row.player.id]}
              lead={index === 0}
            />
          ))}
        </div>
      )}
        </>
      )}
    </Page>
  );
}
