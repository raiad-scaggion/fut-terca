import { useMemo, useState } from "react";
import { EmptyState, Page } from "../components/Page";
import { TeamCard } from "../components/TeamCard";
import { useAuth } from "../data/authContext";
import { usePlayers } from "../data/players";
import { useSessions } from "../data/sessions";
import { cancelSession, confirmSession, updateWeekly, useWeekly } from "../data/weekly";
import { buildPairHistory } from "../lib/draw";
import { displayOvr, normalizeName, type Player } from "../lib/players";
import type { Session } from "../lib/session";
import {
  addToTeam,
  clearWeekly,
  drawTeams,
  fillWithMonthly,
  isReadyToConfirm,
  nextOpenTeam,
  removeFromTeams,
  setTeamColor,
  TEAM_COLORS,
  togglePlayer,
  unassignedPlayerIds,
  WEEKLY_KEEPERS,
  WEEKLY_LINE_PLAYERS,
  type TeamMode,
  type Weekly,
} from "../lib/weekly";

const WRITE_ERROR = "Não deu para salvar. Confira sua conexão e tente de novo.";

function pickPlayers(ids: string[], byId: Map<string, Player>): Player[] {
  return ids.flatMap((id) => byId.get(id) ?? []);
}

function missingForConfirm(weekly: Weekly): string {
  if (weekly.selectedIds.length < WEEKLY_LINE_PLAYERS) {
    return `Faltam ${WEEKLY_LINE_PLAYERS - weekly.selectedIds.length} jogadores de linha.`;
  }
  if (weekly.keeperIds.length < WEEKLY_KEEPERS) {
    return `Falta${WEEKLY_KEEPERS - weekly.keeperIds.length > 1 ? "m" : ""} ${WEEKLY_KEEPERS - weekly.keeperIds.length} goleiro${WEEKLY_KEEPERS - weekly.keeperIds.length > 1 ? "s" : ""}.`;
  }
  return "Complete os 4 times para confirmar.";
}

function PickChip({ player, selected, disabled, onClick }: { player: Player; selected: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`pick-chip${selected ? " is-selected" : ""}`} aria-pressed={selected} disabled={disabled} onClick={onClick}>
      <span className="pick-chip__name">{player.name}</span>
      <span className="pick-chip__ovr">{displayOvr(player)}</span>
    </button>
  );
}

function LiveSessionView({ session, byId, isAdmin }: { session: Session; byId: Map<string, Player>; isAdmin: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const started = session.matches.some((match) => match.status !== "pending");

  const handleCancel = async () => {
    setError("");
    try {
      await cancelSession(session.id);
    } catch {
      setError(WRITE_ERROR);
    }
  };

  return (
    <Page title="Sorteio" subtitle="Os times de hoje estão confirmados">
      <div className="teams-grid">
        {session.teams.map((team) => (
          <TeamCard key={team.id} name={team.name} color={team.color} players={pickPlayers(team.playerIds, byId)} />
        ))}
      </div>
      <p className="draw-keepers">Goleiros: {pickPlayers(session.keeperIds, byId).map((player) => player.name).join(" e ")}</p>

      {isAdmin && !started && (
        <div className="draw-section">
          {confirming ? (
            <div className="delete-player" role="alertdialog" aria-label="Cancelar copa">
              <strong>Cancelar a copa de hoje?</strong>
              <p className="delete-player__text">Os times voltam para o sorteio e os jogos são apagados.</p>
              {error && <p className="form-error">{error}</p>}
              <div className="delete-player__actions">
                <button type="button" className="button button--ghost" onClick={() => setConfirming(false)}>
                  Voltar
                </button>
                <button type="button" className="button button--danger" onClick={handleCancel}>
                  Cancelar copa
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="button button--danger-ghost" onClick={() => setConfirming(true)}>
              Cancelar copa
            </button>
          )}
        </div>
      )}
    </Page>
  );
}

export function SorteioPage() {
  const { isAdmin } = useAuth();
  const { players, loading: playersLoading } = usePlayers();
  const { sessions, loading: sessionsLoading } = useSessions();
  const { weekly, liveSessionId, loading: weeklyLoading } = useWeekly();

  const [search, setSearch] = useState("");
  const [activeTeam, setActiveTeam] = useState(0);
  const [colorTeam, setColorTeam] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);

  const byId = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const history = useMemo(() => buildPairHistory(sessions), [sessions]);
  const available = useMemo(() => {
    const query = normalizeName(search);
    return players.filter((player) => player.active && normalizeName(player.name).includes(query));
  }, [players, search]);

  const edit = async (change: (current: Weekly) => Weekly) => {
    setError("");
    try {
      await updateWeekly(change);
    } catch {
      setError(WRITE_ERROR);
    }
  };

  if (playersLoading || sessionsLoading || weeklyLoading) {
    return (
      <Page title="Sorteio">
        <EmptyState>Carregando...</EmptyState>
      </Page>
    );
  }

  const liveSession = sessions.find((session) => session.id === liveSessionId);
  if (liveSession) {
    return <LiveSessionView session={liveSession} byId={byId} isAdmin={isAdmin} />;
  }

  const hasTeams = weekly.teams.some((team) => team.playerIds.length > 0);

  if (!isAdmin) {
    return (
      <Page title="Sorteio" subtitle="Quem joga hoje e como ficam os times">
        {hasTeams ? (
          <div className="teams-grid">
            {weekly.teams.map((team, index) => (
              <TeamCard key={index} name={`Time ${index + 1}`} color={team.color} players={pickPlayers(team.playerIds, byId)} />
            ))}
          </div>
        ) : (
          <EmptyState>Os times ainda não saíram. Assim que forem sorteados, aparecem aqui.</EmptyState>
        )}
      </Page>
    );
  }

  const keepers = available.filter((player) => player.role === "keeper");
  const linePlayers = available.filter((player) => player.role === "line");
  const unassigned = pickPlayers(unassignedPlayerIds(weekly), byId);
  const lineFull = weekly.selectedIds.length >= WEEKLY_LINE_PLAYERS;
  const keepersFull = weekly.keeperIds.length >= WEEKLY_KEEPERS;
  const ready = isReadyToConfirm(weekly);
  const manual = weekly.mode === "manual";

  const handleAssign = async (playerId: string) => {
    const team = nextOpenTeam(weekly, activeTeam);
    const next = addToTeam(weekly, team, playerId);
    await edit((current) => addToTeam(current, team, playerId));
    setActiveTeam(nextOpenTeam(next, team));
  };

  const handleConfirm = async () => {
    setError("");
    setConfirming(true);
    try {
      await confirmSession(weekly);
    } catch {
      setError(WRITE_ERROR);
    } finally {
      setConfirming(false);
    }
  };

  const setMode = (mode: TeamMode) => {
    setColorTeam(null);
    return edit((current) => ({ ...current, mode }));
  };

  return (
    <Page title="Sorteio" subtitle="Quem joga hoje e como ficam os times">
      <section className="draw-section">
        <div className="draw-section__header">
          <h2 className="draw-section__title">Quem joga</h2>
          <div className="draw-counters">
            <span className={`draw-counter${lineFull ? " is-full" : ""}`}>
              {weekly.selectedIds.length}/{WEEKLY_LINE_PLAYERS} linha
            </span>
            <span className={`draw-counter${keepersFull ? " is-full" : ""}`}>
              {weekly.keeperIds.length}/{WEEKLY_KEEPERS} goleiros
            </span>
          </div>
        </div>

        <div className="draw-actions">
          <button type="button" className="button button--ghost" onClick={() => edit((current) => fillWithMonthly(current, players))}>
            Puxar mensalistas
          </button>
          <button type="button" className="button button--ghost" onClick={() => edit(clearWeekly)}>
            Limpar
          </button>
        </div>

        <input
          type="search"
          className="search-input"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar jogador..."
          aria-label="Buscar jogador"
        />

        <h3 className="draw-subtitle">Goleiros</h3>
        <div className="pick-grid">
          {keepers.map((player) => {
            const selected = weekly.keeperIds.includes(player.id);
            return (
              <PickChip
                key={player.id}
                player={player}
                selected={selected}
                disabled={!selected && keepersFull}
                onClick={() => edit((current) => togglePlayer(current, player))}
              />
            );
          })}
        </div>

        <h3 className="draw-subtitle">Linha</h3>
        <div className="pick-grid">
          {linePlayers.map((player) => {
            const selected = weekly.selectedIds.includes(player.id);
            return (
              <PickChip
                key={player.id}
                player={player}
                selected={selected}
                disabled={!selected && lineFull}
                onClick={() => edit((current) => togglePlayer(current, player))}
              />
            );
          })}
        </div>
      </section>

      <section className="draw-section">
        <h2 className="draw-section__title">Times</h2>

        <div className="segmented" role="group" aria-label="Como montar os times">
          <button type="button" className={`segmented__btn${manual ? "" : " is-active"}`} onClick={() => setMode("auto")}>
            Sorteio
          </button>
          <button type="button" className={`segmented__btn${manual ? " is-active" : ""}`} onClick={() => setMode("manual")}>
            Manual
          </button>
        </div>

        {manual ? (
          <>
            <p className="draw-hint">Toque no nome de um time e depois nos jogadores. Quando ele enche, o próximo time é escolhido sozinho.</p>
            {unassigned.length > 0 ? (
              <div className="pick-grid">
                {unassigned.map((player) => (
                  <PickChip key={player.id} player={player} selected={false} onClick={() => handleAssign(player.id)} />
                ))}
              </div>
            ) : (
              weekly.selectedIds.length === 0 && <p className="draw-hint">Escolha quem joga para montar os times.</p>
            )}
          </>
        ) : (
          <button
            type="button"
            className="button button--primary draw-button"
            disabled={!lineFull}
            onClick={() => edit((current) => drawTeams(current, players, history))}
          >
            {hasTeams ? "Sortear novamente" : "Sortear times"}
          </button>
        )}

        {(manual || hasTeams) && (
          <div className="teams-grid">
            {weekly.teams.map((team, index) => (
              <TeamCard
                key={index}
                name={`Time ${index + 1}`}
                color={team.color}
                players={pickPlayers(team.playerIds, byId)}
                active={manual && activeTeam === index}
                onSelect={manual ? () => setActiveTeam(index) : undefined}
                onRemovePlayer={manual ? (player) => edit((current) => removeFromTeams(current, player.id)) : undefined}
                onPickColor={() => setColorTeam(colorTeam === index ? null : index)}
              />
            ))}
          </div>
        )}

        {colorTeam !== null && (
          <div className="color-palette" role="group" aria-label={`Cor do Time ${colorTeam + 1}`}>
            {TEAM_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={`color-palette__swatch${weekly.teams[colorTeam].color === color ? " is-active" : ""}`}
                style={{ background: color }}
                aria-label={`Cor ${color}`}
                onClick={() => {
                  edit((current) => setTeamColor(current, colorTeam, color));
                  setColorTeam(null);
                }}
              />
            ))}
          </div>
        )}
      </section>

      {error && <p className="form-error">{error}</p>}

      <section className="draw-section">
        {!ready && <p className="draw-hint">{missingForConfirm(weekly)}</p>}
        <button type="button" className="button button--primary draw-button" disabled={!ready || confirming} onClick={handleConfirm}>
          {confirming ? "Confirmando..." : "Confirmar times"}
        </button>
      </section>
    </Page>
  );
}
