import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { EmptyState, Page } from "../components/Page";
import { PlayerCard } from "../components/PlayerCard";
import { useAuth } from "../data/authContext";
import { savePlayer, usePlayers } from "../data/players";
import { useSessions } from "../data/sessions";
import {
  cardTier,
  clampRating,
  displayOvr,
  normalizeName,
  positionCode,
  type LinePosition,
  type Player,
  type PlayerRatings,
  type PlayerRole,
} from "../lib/players";
import { computeStats } from "../lib/stats";

type FilterKey = "all" | "monthly" | "keepers" | "inactive";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "monthly", label: "Mensalistas" },
  { key: "keepers", label: "Goleiros" },
  { key: "inactive", label: "Inativos" },
];

const POSITIONS: { value: LinePosition; label: string }[] = [
  { value: "defesa", label: "Defesa" },
  { value: "meio", label: "Meio" },
  { value: "ataque", label: "Ataque" },
];

const RATING_FIELDS: { key: keyof PlayerRatings; label: string; short: string }[] = [
  { key: "speed", label: "Velocidade", short: "VEL" },
  { key: "finishing", label: "Finalização", short: "FIN" },
  { key: "defense", label: "Defesa", short: "DEF" },
  { key: "passing", label: "Passe", short: "PAS" },
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
  ratings: PlayerRatings;
  isMonthly: boolean;
  joinDate: string;
  active: boolean;
};

function createEmptyDraft(): FormDraft {
  return {
    name: "",
    role: "line",
    linePosition: "meio",
    ratings: { speed: 5, finishing: 5, defense: 5, passing: 5 },
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
    ratings: { ...player.ratings },
    isMonthly: player.isMonthly,
    joinDate: player.joinDate,
    active: player.active,
  };
}

export function JogadoresPage() {
  const { isAdmin } = useAuth();
  const { players, loading, error } = usePlayers();
  const { sessions } = useSessions();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<FormDraft | null>(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedPlayer = useMemo(
    () => (selectedId ? players.find((p) => p.id === selectedId) ?? null : null),
    [players, selectedId],
  );

  const selectedStats = useMemo(
    () => (selectedPlayer ? computeStats([selectedPlayer], sessions).get(selectedPlayer.id) : undefined),
    [selectedPlayer, sessions],
  );

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
      if (filter === "inactive") {
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

  const stepRating = (key: keyof PlayerRatings, delta: number) => {
    setEditingDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        ratings: {
          ...prev.ratings,
          [key]: clampRating(prev.ratings[key] + delta, 5),
        },
      };
    });
  };

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

    setSaving(true);
    setFormError("");
    try {
      const savedId = await savePlayer({
        id: editingDraft.id,
        name: trimmedName,
        role: editingDraft.role,
        linePosition: editingDraft.linePosition,
        ratings: editingDraft.ratings,
        isMonthly: editingDraft.isMonthly,
        joinDate: editingDraft.joinDate,
        ...(editingDraft.id ? { active: editingDraft.active } : {}),
      });

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

  return (
    <Page title="Jogadores" subtitle="Cartas e notas de cada um">
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
                  className={`ovr-preview ovr-preview--${cardTier(editingDraft)}`}
                  aria-live="polite"
                >
                  <div className="ovr-preview__score">
                    <span className="ovr-preview__value">
                      {displayOvr(editingDraft)}
                    </span>
                    <span className="ovr-preview__pos">
                      {positionCode(editingDraft)}
                    </span>
                  </div>
                  <div className="ovr-preview__meta">
                    <strong>{editingDraft.name.trim() || "Novo jogador"}</strong>
                    <span>Carta {TIER_LABELS[cardTier(editingDraft)]}</span>
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
                  <span className="form-field__label">Notas (1 a 10)</span>
                  <div className="rating-steppers">
                    {RATING_FIELDS.map(({ key, label, short }) => {
                      const val = editingDraft.ratings[key];
                      return (
                        <div key={key} className="rating-stepper">
                          <div className="rating-stepper__info">
                            <span className="rating-stepper__short">{short}</span>
                            <span className="rating-stepper__label">{label}</span>
                          </div>
                          <div className="rating-stepper__controls">
                            <button
                              type="button"
                              className="stepper-btn"
                              aria-label={`Diminuir ${label}`}
                              disabled={val <= 1}
                              onClick={() => stepRating(key, -1)}
                            >
                              −
                            </button>
                            <span className="rating-stepper__value">{val}</span>
                            <button
                              type="button"
                              className="stepper-btn"
                              aria-label={`Aumentar ${label}`}
                              disabled={val >= 10}
                              onClick={() => stepRating(key, 1)}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
              selectedStats && (
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
                    <PlayerCard player={selectedPlayer} size="sheet" />
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
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="sheet__actions">
                      <button
                        type="button"
                        className="button button--primary"
                        onClick={() => openEditPlayer(selectedPlayer)}
                      >
                        Editar
                      </button>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      )}
    </Page>
  );
}
