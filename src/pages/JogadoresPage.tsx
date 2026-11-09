import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { DeletePlayer } from "../components/DeletePlayer";
import { EmptyState, Page } from "../components/Page";
import { PhotoEditor } from "../components/PhotoEditor";
import { PlayerCard } from "../components/PlayerCard";
import { useAuth } from "../data/authContext";
import { removePhoto, usePhotos } from "../data/photos";
import { savePlayer, setLegend, usePlayers } from "../data/players";
import { useSessions } from "../data/sessions";
import { getCurrentAwards, getPlayerAward } from "../lib/awards";
import { InfoTip } from "../components/InfoTip";
import { SpecialCardsInfo } from "../components/SpecialCardsInfo";
import { StatInputs } from "../components/StatInputs";
import { CLUBS } from "../lib/clubs";
import { COUNTRIES, DEFAULT_COUNTRY } from "../lib/countries";
import {
  cardTier,
  displayOvr,
  isStatText,
  KEEPER_STATS,
  LINE_STATS,
  newPlayerStats,
  normalizeName,
  positionCode,
  statsFromText,
  statText,
  type LinePosition,
  type Player,
  type PlayerRole,
  type PlayerStats,
  type StatText,
} from "../lib/players";
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

const POSITIONS: { value: LinePosition; label: string }[] = [
  { value: "defesa", label: "Defesa" },
  { value: "meio", label: "Meio" },
  { value: "ataque", label: "Ataque" },
];

const TIER_LABELS: Record<"gold" | "silver" | "bronze", string> = {
  gold: "Ouro",
  silver: "Prata",
  bronze: "Bronze",
};

type FormDraft = {
  id?: string;
  name: string;
  role: PlayerRole;
  linePosition: LinePosition;
  nationality: string;
  club: string;
  // Both sets are kept, so switching role in the form never loses the other set.
  stats: PlayerStats;
  lineText: StatText;
  keeperText: StatText;
  isMonthly: boolean;
  joinDate: string;
  active: boolean;
};

function statsDraft(stats: PlayerStats) {
  return { stats, lineText: statText(stats.line), keeperText: statText(stats.keeper) };
}

function draftStats(draft: FormDraft): PlayerStats {
  return {
    line: statsFromText(LINE_STATS, draft.lineText, draft.stats.line),
    keeper: statsFromText(KEEPER_STATS, draft.keeperText, draft.stats.keeper),
  };
}

function createEmptyDraft(): FormDraft {
  return {
    name: "",
    role: "line",
    linePosition: "meio",
    nationality: DEFAULT_COUNTRY,
    club: "",
    ...statsDraft(newPlayerStats()),
    isMonthly: false,
    joinDate: "",
    active: true,
  };
}

function createDraftFromPlayer(player: Player): FormDraft {
  return {
    id: player.id,
    name: player.name,
    role: player.role,
    linePosition: player.linePosition,
    nationality: player.nationality,
    club: player.club,
    ...statsDraft(player.stats),
    isMonthly: player.isMonthly,
    joinDate: player.joinDate,
    active: player.active,
  };
}

export function JogadoresPage() {
  const { isAdmin } = useAuth();
  const { players, loading, error } = usePlayers();
  const { sessions, loading: sessionsLoading } = useSessions();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<FormDraft | null>(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
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

  const sheetOpen = selectedPlayer !== null || editingDraft !== null;

  useEffect(() => {
    if (!sheetOpen) {
      return undefined;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) {
        setSelectedId(null);
        setEditingDraft(null);
        setFormError("");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sheetOpen, saving]);

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

  const closeSheet = () => {
    if (saving) return;
    setSelectedId(null);
    setEditingDraft(null);
    setFormError("");
  };

  const openNewPlayer = () => {
    setSelectedId(null);
    setFormError("");
    setEditingDraft(createEmptyDraft());
  };

  const openEditPlayer = (player: Player) => {
    setFormError("");
    setEditingDraft(createDraftFromPlayer(player));
  };

  const setStatText = (set: "lineText" | "keeperText", key: string, value: string) => {
    setEditingDraft((prev) => (prev ? { ...prev, [set]: { ...prev[set], [key]: value } } : prev));
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

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingDraft || saving) return;

    const trimmedName = editingDraft.name.trim();
    if (!trimmedName) {
      setFormError("Informe o nome do jogador.");
      return;
    }

    const normalizedTarget = normalizeName(trimmedName);
    const duplicate = players.find(
      (p) => p.id !== editingDraft.id && normalizeName(p.name) === normalizedTarget,
    );
    if (duplicate) {
      setFormError("Já existe um jogador com esse nome.");
      return;
    }

    const statSet = editingDraft.role === "keeper" ? editingDraft.keeperText : editingDraft.lineText;
    if (!Object.values(statSet).every((value) => isStatText(value))) {
      setFormError("Cada nota precisa ser um número inteiro de 0 a 100.");
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      const savedId = await savePlayer({
        id: editingDraft.id,
        name: trimmedName,
        role: editingDraft.role,
        linePosition: editingDraft.linePosition,
        nationality: editingDraft.nationality,
        club: editingDraft.club,
        stats: draftStats(editingDraft),
        isMonthly: editingDraft.isMonthly,
        joinDate: editingDraft.joinDate,
        ...(editingDraft.id ? { active: editingDraft.active } : {}),
      }, players.find((p) => p.id === editingDraft.id));

      const wasDeactivated = Boolean(editingDraft.id && !editingDraft.active);
      setEditingDraft(null);
      if (wasDeactivated) {
        setSelectedId(null);
      } else if (savedId) {
        setSelectedId(savedId);
      }
    } catch {
      setFormError("Não deu para salvar o jogador. Tente de novo.");
    } finally {
      setSaving(false);
    }
  };

  const previewOvr = editingDraft ? displayOvr({ ...editingDraft, stats: draftStats(editingDraft) }) : 0;

  return (
    <Page
      title="Jogadores"
      subtitle="Cartas e notas de cada um"
      info={
        <InfoTip label="O que é o OVR e as cores das cartas">
          <p>
            <strong>OVR</strong> é a nota geral da carta, até 99. Ela junta as seis notas do jogador, de 0 a 100, com pesos
            que mudam com a posição: no ataque pesa mais a finalização, no meio o passe e o drible, na defesa a defesa. O
            goleiro tem notas próprias.
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
            onClick={openNewPlayer}
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
                setEditingDraft(null);
                setFormError("");
                setSelectedId(player.id);
              }}
            />
          ))}
        </div>
      )}

      {sheetOpen && (
        <div className="sheet-backdrop" onClick={closeSheet}>
          <div
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={
              editingDraft
                ? editingDraft.id
                  ? "Editar jogador"
                  : "Novo jogador"
                : selectedPlayer?.name ?? "Jogador"
            }
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sheet__handle" aria-hidden="true" />

            {editingDraft ? (
              <form className="player-form" onSubmit={handleSave} noValidate>
                <div className="sheet__header">
                  <h2 className="sheet__title">
                    {editingDraft.id ? "Editar jogador" : "Novo jogador"}
                  </h2>
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={closeSheet}
                    disabled={saving}
                  >
                    Fechar
                  </button>
                </div>

                <div
                  className={`ovr-preview ovr-preview--${cardTier(previewOvr)}`}
                  aria-live="polite"
                >
                  <div className="ovr-preview__score">
                    <span className="ovr-preview__value">
                      {previewOvr}
                    </span>
                    <span className="ovr-preview__pos">
                      {positionCode(editingDraft)}
                    </span>
                  </div>
                  <div className="ovr-preview__meta">
                    <strong>{editingDraft.name.trim() || "Novo jogador"}</strong>
                    <span>Carta {TIER_LABELS[cardTier(previewOvr)]}</span>
                  </div>
                </div>

                <label className="form-field">
                  <span className="form-field__label">Nome *</span>
                  <input
                    type="text"
                    className="text-input"
                    value={editingDraft.name}
                    onChange={(e) =>
                      setEditingDraft({ ...editingDraft, name: e.target.value })
                    }
                    placeholder="Ex.: Neto"
                    required
                    autoFocus
                  />
                </label>

                <label className="form-field">
                  <span className="form-field__label">Nacionalidade</span>
                  <select
                    className="text-input"
                    value={editingDraft.nationality}
                    onChange={(e) =>
                      setEditingDraft({
                        ...editingDraft,
                        nationality: e.target.value,
                      })
                    }
                  >
                    {COUNTRIES.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-field">
                  <span className="form-field__label">Time do coração</span>
                  <select
                    className="text-input"
                    value={editingDraft.club}
                    onChange={(e) =>
                      setEditingDraft({
                        ...editingDraft,
                        club: e.target.value,
                      })
                    }
                  >
                    <option value="">Nenhum</option>
                    {CLUBS.map((club) => (
                      <option key={club.id} value={club.id}>
                        {club.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="form-field">
                  <span className="form-field__label">Função</span>
                  <div className="segmented" role="group" aria-label="Função">
                    <button
                      type="button"
                      className={`segmented__btn${
                        editingDraft.role === "line" ? " is-active" : ""
                      }`}
                      onClick={() =>
                        setEditingDraft({ ...editingDraft, role: "line" })
                      }
                    >
                      Linha
                    </button>
                    <button
                      type="button"
                      className={`segmented__btn${
                        editingDraft.role === "keeper" ? " is-active" : ""
                      }`}
                      onClick={() =>
                        setEditingDraft({ ...editingDraft, role: "keeper" })
                      }
                    >
                      Goleiro
                    </button>
                  </div>
                </div>

                {editingDraft.role === "line" && (
                  <div className="form-field">
                    <span className="form-field__label">Posição</span>
                    <div className="segmented" role="group" aria-label="Posição">
                      {POSITIONS.map((pos) => (
                        <button
                          key={pos.value}
                          type="button"
                          className={`segmented__btn${
                            editingDraft.linePosition === pos.value
                              ? " is-active"
                              : ""
                          }`}
                          onClick={() =>
                            setEditingDraft({
                              ...editingDraft,
                              linePosition: pos.value,
                            })
                          }
                        >
                          {pos.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="form-field">
                  <span className="form-field__label">
                    {editingDraft.role === "keeper" ? "Notas de goleiro (0 a 100)" : "Notas (0 a 100)"}
                  </span>
                  {editingDraft.role === "keeper" ? (
                    <StatInputs
                      defs={KEEPER_STATS}
                      values={editingDraft.keeperText}
                      onChange={(key, value) => setStatText("keeperText", key, value)}
                    />
                  ) : (
                    <StatInputs
                      defs={LINE_STATS}
                      values={editingDraft.lineText}
                      onChange={(key, value) => setStatText("lineText", key, value)}
                    />
                  )}
                </div>

                <label className="switch-row">
                  <span className="switch-row__label">Mensalista</span>
                  <input
                    type="checkbox"
                    className="switch-row__input"
                    checked={editingDraft.isMonthly}
                    onChange={(e) =>
                      setEditingDraft({
                        ...editingDraft,
                        isMonthly: e.target.checked,
                      })
                    }
                  />
                </label>

                <label className="form-field">
                  <span className="form-field__label">Data de entrada</span>
                  <input
                    type="date"
                    className="text-input"
                    value={editingDraft.joinDate}
                    onChange={(e) =>
                      setEditingDraft({
                        ...editingDraft,
                        joinDate: e.target.value,
                      })
                    }
                  />
                </label>

                {editingDraft.id && (
                  <label className="switch-row">
                    <span className="switch-row__label">Ativo</span>
                    <input
                      type="checkbox"
                      className="switch-row__input"
                      checked={editingDraft.active}
                      onChange={(e) =>
                        setEditingDraft({
                          ...editingDraft,
                          active: e.target.checked,
                        })
                      }
                    />
                  </label>
                )}

                {formError && <p className="form-error">{formError}</p>}

                <div className="sheet__actions">
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={closeSheet}
                    disabled={saving}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="button button--primary"
                    disabled={saving}
                  >
                    {saving ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </form>
            ) : (
              selectedPlayer &&
              selectedStats &&
              selectedAppStats && (
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
                          onClick={() => openEditPlayer(selectedPlayer)}
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
              )
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
