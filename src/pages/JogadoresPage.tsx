import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DeletePlayer } from "../components/DeletePlayer";
import { EmptyState, Page } from "../components/Page";
import { PhotoEditor } from "../components/PhotoEditor";
import { PlayerCard } from "../components/PlayerCard";
import { PlayerForm } from "../components/PlayerForm";
import { StatRadar } from "../components/StatRadar";
import { useAuth } from "../data/authContext";
import { removePhoto, usePhotos } from "../data/photos";
import { setLegend, usePlayers } from "../data/players";
import { useSessions } from "../data/sessions";
import { getCurrentAwards, getPlayerAward } from "../lib/awards";
import { InfoTip } from "../components/InfoTip";
import { SpecialCardsInfo } from "../components/SpecialCardsInfo";
import { normalizeName, type Player } from "../lib/players";
import { isPlayerInSessions } from "../lib/session";
import { computeStats, formatAverage, monthLabel, perGame, zeroBaselines } from "../lib/stats";

type FilterKey = "all" | "monthly" | "keepers" | "legends" | "inactive";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "monthly", label: "Mensalistas" },
  { key: "keepers", label: "Goleiros" },
  { key: "legends", label: "Legends" },
  { key: "inactive", label: "Inativos" },
];

export function JogadoresPage() {
  const { isAdmin } = useAuth();
  const { players, loading, error } = usePlayers();
  const { sessions, loading: sessionsLoading } = useSessions();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Set while the form is open. A null player creates a new one.
  const [editing, setEditing] = useState<{ player: Player | null } | null>(null);
  const [legendStep, setLegendStep] = useState<"idle" | "confirm" | "saving">("idle");
  const [legendError, setLegendError] = useState("");

  const selectedPlayer = useMemo(
    () => (selectedId ? players.find((p) => p.id === selectedId) ?? null : null),
    [players, selectedId],
  );

  const selectedStats = useMemo(
    () => (selectedPlayer ? computeStats([selectedPlayer], sessions).get(selectedPlayer.id) : undefined),
    [selectedPlayer, sessions],
  );

  const selectedAppStats = useMemo(
    () =>
      selectedPlayer
        ? computeStats(zeroBaselines([selectedPlayer]), sessions).get(selectedPlayer.id)
        : undefined,
    [selectedPlayer, sessions],
  );

  const awards = useMemo(() => getCurrentAwards(players, sessions, new Date().toLocaleDateString("en-CA")), [players, sessions]);
  const awardMonth = monthLabel(awards.month).slice(0, 3);

  const photos = usePhotos();
  const [editingPhoto, setEditingPhoto] = useState(false);
  const [removingPhoto, setRemovingPhoto] = useState(false);

  // The form handles its own Escape, so this one only closes the detail sheet.
  const detailOpen = selectedPlayer !== null && editing === null;

  useEffect(() => {
    if (!detailOpen) {
      return undefined;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [detailOpen]);

  const filteredPlayers = useMemo(() => {
    const query = normalizeName(search);
    return players.filter((player) => {
      if (filter === "legends") {
        if (!player.legend) return false;
      } else if (player.legend) {
        return false;
      } else if (filter === "inactive") {
        if (player.active) return false;
      } else {
        if (!player.active) return false;
        if (filter === "monthly" && !player.isMonthly) return false;
        if (filter === "keepers" && player.role !== "keeper") return false;
      }

      if (query && !normalizeName(player.name).includes(query)) {
        return false;
      }
      return true;
    });
  }, [players, filter, search]);

  const closeSheet = useCallback(() => {
    setSelectedId(null);
    setEditing(null);
  }, []);

  const handleSaved = (savedId: string | null, deactivated: boolean) => {
    setEditing(null);
    if (deactivated) {
      setSelectedId(null);
    } else if (savedId) {
      setSelectedId(savedId);
    }
  };

  const changeLegend = async (player: Player) => {
    setLegendStep("saving");
    setLegendError("");
    try {
      await setLegend(player, !player.legend);
      setLegendStep("idle");
    } catch {
      setLegendError("Não deu para salvar. Tente de novo.");
      setLegendStep("confirm");
    }
  };

  useEffect(() => {
    setLegendStep("idle");
    setLegendError("");
  }, [selectedId]);

  return (
    <Page
      title="Jogadores"
      subtitle="Cartas e notas de cada um"
      info={
        <InfoTip label="O que é o OVR e as cores das cartas">
          <p>
            <strong>OVR</strong> é a nota geral da carta, até 99. É a média das seis notas do jogador, de 0 a 100, com
            pesos diferentes para ataque, meio e defesa. O goleiro tem notas próprias, todas com o mesmo peso.
          </p>
          <p>
            O que cada sigla quer dizer está no <Link to="/glossario">Glossário</Link>.
          </p>
          <p>A cor da carta vem do OVR: ouro a partir de 75, prata de 51 a 74 e bronze até 50.</p>
          <SpecialCardsInfo />
        </InfoTip>
      }
    >
      {isAdmin && (
        <div className="players-admin-bar">
          <button
            type="button"
            className="button button--primary"
            onClick={() => {
              setSelectedId(null);
              setEditing({ player: null });
            }}
          >
            + Jogador
          </button>
          <Link to="/jogadores/importar" className="button button--ghost button--link">
            Importar planilha
          </Link>
        </div>
      )}

      <div className="players-toolbar">
        <input
          type="search"
          className="search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar jogador..."
          aria-label="Buscar jogador"
        />
        <div className="filter-chips" role="tablist" aria-label="Filtrar jogadores">
          {FILTERS.map((item) => {
            const active = filter === item.key;
            return (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={active}
                className={`filter-chip${active ? " is-active" : ""}`}
                onClick={() => setFilter(item.key)}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <EmptyState>{error}</EmptyState>
      ) : loading ? (
        <EmptyState>Carregando jogadores...</EmptyState>
      ) : players.length === 0 ? (
        <EmptyState>
          Nenhum jogador cadastrado ainda.
          {isAdmin ? " Adicione um jogador ou importe a planilha." : ""}
        </EmptyState>
      ) : filteredPlayers.length === 0 ? (
        <EmptyState>
          Nenhum jogador encontrado nesse filtro. Tente limpar a busca ou trocar de aba.
        </EmptyState>
      ) : (
        <div className="players-grid">
          {filteredPlayers.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              award={getPlayerAward(awards, player.id)}
              awardMonth={awardMonth}
              photo={photos[player.id]}
              onClick={() => {
                setSelectedId(player.id);
              }}
            />
          ))}
        </div>
      )}

      {editing && (
        <PlayerForm player={editing.player} players={players} onClose={closeSheet} onSaved={handleSaved} />
      )}

      {detailOpen && (
        <div className="sheet-backdrop" onClick={closeSheet}>
          <div
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={selectedPlayer?.name ?? "Jogador"}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sheet__handle" aria-hidden="true" />

            {selectedPlayer && selectedStats && selectedAppStats && (
                <div className="player-detail">
                  <div className="sheet__header">
                    <h2 className="sheet__title">{selectedPlayer.name}</h2>
                    <button
                      type="button"
                      className="button button--ghost"
                      onClick={closeSheet}
                    >
                      Fechar
                    </button>
                  </div>

                  <div className="player-detail__card-wrap">
                    <PlayerCard player={selectedPlayer} size="sheet" award={getPlayerAward(awards, selectedPlayer.id)} awardMonth={awardMonth} photo={photos[selectedPlayer.id]} />
                    {isAdmin && (
                      <div className="player-detail__photo-actions">
                        <button type="button" className="button button--ghost" onClick={() => setEditingPhoto(true)}>
                          {photos[selectedPlayer.id] ? "Trocar foto" : "Adicionar foto"}
                        </button>
                        {photos[selectedPlayer.id] && (
                          <button
                            type="button"
                            className="button button--ghost"
                            disabled={removingPhoto}
                            onClick={async () => {
                              setRemovingPhoto(true);
                              try {
                                await removePhoto(selectedPlayer.id);
                              } finally {
                                setRemovingPhoto(false);
                              }
                            }}
                          >
                            Remover foto
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <StatRadar player={selectedPlayer} />

                  <div className="baseline-section">
                    <h3 className="baseline-section__title">
                      Totais da temporada
                    </h3>
                    <div
                      className={`baseline-grid${
                        selectedPlayer.role === "keeper"
                          ? " baseline-grid--four"
                          : ""
                      }`}
                    >
                      <div className="baseline-stat">
                        <span className="baseline-stat__val">
                          {selectedStats.goals}
                        </span>
                        <span className="baseline-stat__label">Gols</span>
                      </div>
                      <div className="baseline-stat">
                        <span className="baseline-stat__val">
                          {selectedStats.assists}
                        </span>
                        <span className="baseline-stat__label">Assistências</span>
                      </div>
                      <div className="baseline-stat">
                        <span className="baseline-stat__val">
                          {selectedStats.titles}
                        </span>
                        <span className="baseline-stat__label">Títulos</span>
                      </div>
                      {selectedPlayer.role === "keeper" && (
                        <div className="baseline-stat">
                          <span className="baseline-stat__val">
                            {selectedStats.saves}
                          </span>
                          <span className="baseline-stat__label">Defesas</span>
                        </div>
                      )}
                      <div className="baseline-stat">
                        <span className="baseline-stat__val">
                          {selectedAppStats.games}
                        </span>
                        <span className="baseline-stat__label">Jogos</span>
                      </div>
                      <div className="baseline-stat">
                        <span className="baseline-stat__val">
                          {selectedAppStats.games === 0
                            ? "-"
                            : formatAverage(perGame(selectedAppStats.goals, selectedAppStats.nights))}
                        </span>
                        <span className="baseline-stat__label">Gols/noite</span>
                      </div>
                      <div className="baseline-stat">
                        <span className="baseline-stat__val">
                          {selectedAppStats.games === 0
                            ? "-"
                            : formatAverage(perGame(selectedAppStats.assists, selectedAppStats.nights))}
                        </span>
                        <span className="baseline-stat__label">Assist./noite</span>
                      </div>
                      <div className="baseline-stat">
                        <span className="baseline-stat__val">
                          {selectedAppStats.games === 0
                            ? "-"
                            : formatAverage(perGame(selectedAppStats.saves, selectedAppStats.games))}
                        </span>
                        <span className="baseline-stat__label">Defesas/jogo</span>
                      </div>
                      <div className="baseline-stat">
                        <span className="baseline-stat__val">
                          {selectedAppStats.ownGoals}
                        </span>
                        <span className="baseline-stat__label">Gols contra</span>
                      </div>
                      {(selectedPlayer.role === "keeper" || selectedAppStats.howlers > 0) && (
                        <div className="baseline-stat">
                          <span className="baseline-stat__val">
                            {selectedAppStats.howlers}
                          </span>
                          <span className="baseline-stat__label">Frangos</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {isAdmin && (
                    <>
                      <div className="sheet__actions">
                        <button
                          type="button"
                          className="button button--primary"
                          onClick={() => setEditing({ player: selectedPlayer })}
                        >
                          Editar
                        </button>
                      </div>
                      <div className="legend-action">
                        {legendStep === "idle" ? (
                          <button type="button" className="button button--ghost" onClick={() => setLegendStep("confirm")}>
                            {selectedPlayer.legend ? "Voltar ao elenco" : "Tornar Legend"}
                          </button>
                        ) : (
                          <div className="delete-player" role="alertdialog" aria-label={selectedPlayer.legend ? "Voltar ao elenco" : "Tornar Legend"}>
                            <strong>
                              {selectedPlayer.legend
                                ? `Trazer ${selectedPlayer.name} de volta ao elenco?`
                                : `Tornar ${selectedPlayer.name} Legend?`}
                            </strong>
                            <p className="delete-player__text">
                              {selectedPlayer.legend
                                ? "Volta para as listas e para o rebalanceamento."
                                : "Sai das listas e do rebalanceamento, mas os números continuam no ranking. Ainda dá para escalar no sorteio."}
                            </p>
                            {legendError && <p className="form-error">{legendError}</p>}
                            <div className="delete-player__actions">
                              <button type="button" className="button button--ghost" disabled={legendStep === "saving"} onClick={() => setLegendStep("idle")}>
                                Cancelar
                              </button>
                              <button type="button" className="button button--primary" disabled={legendStep === "saving"} onClick={() => changeLegend(selectedPlayer)}>
                                {legendStep === "saving" ? "Salvando..." : "Confirmar"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="sheet__danger">
                        <DeletePlayer
                          key={selectedPlayer.id}
                          player={selectedPlayer}
                          stats={selectedStats}
                          inSessions={sessionsLoading ? null : isPlayerInSessions(selectedPlayer.id, sessions)}
                          onDeleted={() => setSelectedId(null)}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
          </div>
        </div>
      )}
      {editingPhoto && selectedPlayer && (
        <PhotoEditor playerId={selectedPlayer.id} playerName={selectedPlayer.name} onClose={() => setEditingPhoto(false)} />
      )}
    </Page>
  );
}
