import { useEffect, useState, type FormEvent } from "react";
import { savePlayer } from "../data/players";
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
import { StatInputs } from "./StatInputs";

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

function createDraft(player: Player | null): FormDraft {
  if (!player) {
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

type PlayerFormProps = {
  // null creates a new player.
  player: Player | null;
  players: Player[];
  onClose: () => void;
  onSaved: (savedId: string | null, deactivated: boolean) => void;
};

export function PlayerForm({ player, players, onClose, onSaved }: PlayerFormProps) {
  const [draft, setDraft] = useState(() => createDraft(player));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const update = (patch: Partial<FormDraft>) => setDraft((prev) => ({ ...prev, ...patch }));
  const setStatText = (set: "lineText" | "keeperText", key: string, value: string) =>
    setDraft((prev) => ({ ...prev, [set]: { ...prev[set], [key]: value } }));

  const close = () => {
    if (!saving) onClose();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [saving, onClose]);

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;

    const trimmedName = draft.name.trim();
    if (!trimmedName) {
      setError("Informe o nome do jogador.");
      return;
    }

    const normalizedTarget = normalizeName(trimmedName);
    if (players.some((p) => p.id !== draft.id && normalizeName(p.name) === normalizedTarget)) {
      setError("Já existe um jogador com esse nome.");
      return;
    }

    const statSet = draft.role === "keeper" ? draft.keeperText : draft.lineText;
    if (!Object.values(statSet).every((value) => isStatText(value))) {
      setError("Cada nota precisa ser um número inteiro de 0 a 100.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const savedId = await savePlayer(
        {
          id: draft.id,
          name: trimmedName,
          role: draft.role,
          linePosition: draft.linePosition,
          nationality: draft.nationality,
          club: draft.club,
          stats: draftStats(draft),
          isMonthly: draft.isMonthly,
          joinDate: draft.joinDate,
          ...(draft.id ? { active: draft.active } : {}),
        },
        player ?? undefined,
      );
      onSaved(savedId ?? null, Boolean(draft.id && !draft.active));
    } catch {
      setError("Não deu para salvar o jogador. Tente de novo.");
      setSaving(false);
    }
  };

  const title = draft.id ? "Editar jogador" : "Novo jogador";
  const previewOvr = displayOvr({ ...draft, stats: draftStats(draft) });

  return (
    <div className="sheet-backdrop" onClick={close}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet__handle" aria-hidden="true" />
        <form className="player-form" onSubmit={handleSave} noValidate>
          <div className="sheet__header">
            <h2 className="sheet__title">{title}</h2>
            <button type="button" className="button button--ghost" onClick={close} disabled={saving}>
              Fechar
            </button>
          </div>

          <div className={`ovr-preview ovr-preview--${cardTier(previewOvr)}`} aria-live="polite">
            <div className="ovr-preview__score">
              <span className="ovr-preview__value">{previewOvr}</span>
              <span className="ovr-preview__pos">{positionCode(draft)}</span>
            </div>
            <div className="ovr-preview__meta">
              <strong>{draft.name.trim() || "Novo jogador"}</strong>
              <span>Carta {TIER_LABELS[cardTier(previewOvr)]}</span>
            </div>
          </div>

          <label className="form-field">
            <span className="form-field__label">Nome *</span>
            <input
              type="text"
              className="text-input"
              value={draft.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="Ex.: Neto"
              required
              autoFocus
            />
          </label>

          <label className="form-field">
            <span className="form-field__label">Nacionalidade</span>
            <select className="text-input" value={draft.nationality} onChange={(e) => update({ nationality: e.target.value })}>
              {COUNTRIES.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span className="form-field__label">Time do coração</span>
            <select className="text-input" value={draft.club} onChange={(e) => update({ club: e.target.value })}>
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
                className={`segmented__btn${draft.role === "line" ? " is-active" : ""}`}
                onClick={() => update({ role: "line" })}
              >
                Linha
              </button>
              <button
                type="button"
                className={`segmented__btn${draft.role === "keeper" ? " is-active" : ""}`}
                onClick={() => update({ role: "keeper" })}
              >
                Goleiro
              </button>
            </div>
          </div>

          {draft.role === "line" && (
            <div className="form-field">
              <span className="form-field__label">Posição</span>
              <div className="segmented" role="group" aria-label="Posição">
                {POSITIONS.map((pos) => (
                  <button
                    key={pos.value}
                    type="button"
                    className={`segmented__btn${draft.linePosition === pos.value ? " is-active" : ""}`}
                    onClick={() => update({ linePosition: pos.value })}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="form-field">
            <span className="form-field__label">
              {draft.role === "keeper" ? "Notas de goleiro (0 a 100)" : "Notas (0 a 100)"}
            </span>
            {draft.role === "keeper" ? (
              <StatInputs
                defs={KEEPER_STATS}
                values={draft.keeperText}
                onChange={(key, value) => setStatText("keeperText", key, value)}
              />
            ) : (
              <StatInputs
                defs={LINE_STATS}
                values={draft.lineText}
                onChange={(key, value) => setStatText("lineText", key, value)}
              />
            )}
          </div>

          <label className="switch-row">
            <span className="switch-row__label">Mensalista</span>
            <input
              type="checkbox"
              className="switch-row__input"
              checked={draft.isMonthly}
              onChange={(e) => update({ isMonthly: e.target.checked })}
            />
          </label>

          <label className="form-field">
            <span className="form-field__label">Data de entrada</span>
            <input type="date" className="text-input" value={draft.joinDate} onChange={(e) => update({ joinDate: e.target.value })} />
          </label>

          {draft.id && (
            <label className="switch-row">
              <span className="switch-row__label">Ativo</span>
              <input
                type="checkbox"
                className="switch-row__input"
                checked={draft.active}
                onChange={(e) => update({ active: e.target.checked })}
              />
            </label>
          )}

          {error && <p className="form-error">{error}</p>}

          <div className="sheet__actions">
            <button type="button" className="button button--ghost" onClick={close} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="button button--primary" disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
