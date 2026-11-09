import { useMemo, useState } from "react";
import { ExportImage } from "../components/ExportImage";
import { EmptyState, Page } from "../components/Page";
import { TeamCard } from "../components/TeamCard";
import { useAuth } from "../data/authContext";
import { usePlayers } from "../data/players";
import { useSessions } from "../data/sessions";
import { cancelSession, confirmSession, updateWeekly, useWeekly } from "../data/weekly";
import { renderTeamsImage, type TeamsImageData } from "../exports/teamsImage";
import { buildPairHistory } from "../lib/draw";
import { dayLabel, sessionDate } from "../lib/nightSummary";
import { displayOvr, normalizeName, type Player } from "../lib/players";
import type { Session } from "../lib/session";
import {
  addToTeam,
  clearWeekly,
  drawTeams,
  fillWithMonthly,
  isReadyToConfirm,
  nextOpenTeam,
  playingAs,
  removeFromTeams,
  setTeamColor,
  slotOf,
  TEAM_COLORS,
  togglePlayer,
  unassignedPlayerIds,
  WEEKLY_KEEPERS,
  WEEKLY_LINE_PLAYERS,
  type Slot,
  type TeamMode,
  type Weekly,
} from "../lib/weekly";

const WRITE_ERROR = "Não deu para salvar. Confira sua conexão e tente de novo.";

// Players as they play tonight: a keeper picked for outfield is shown and rated as a line player.
function pickPlayers(ids: string[], byId: Map<string, Player>, slot: Slot): Player[] {
  return ids.flatMap((id) => {
    const player = byId.get(id);
    return player ? [playingAs(player, slot)] : [];
  });
}

const OUT_OF_ROLE: Record<Slot, string> = { keeper: "no gol", line: "na linha" };

function missingForConfirm(weekly: Weekly): string {
  if (weekly.selectedIds.length < WEEKLY_LINE_PLAYERS) {
    return `Faltam ${WEEKLY_LINE_PLAYERS - weekly.selectedIds.length} jogadores de linha.`;
  }
  if (weekly.keeperIds.length < WEEKLY_KEEPERS) {
    return `Falta${WEEKLY_KEEPERS - weekly.keeperIds.length > 1 ? "m" : ""} ${WEEKLY_KEEPERS - weekly.keeperIds.length} goleiro${WEEKLY_KEEPERS - weekly.keeperIds.length > 1 ? "s" : ""}.`;
  }
  return "Complete os 4 times para confirmar.";
}

type PickChipProps = { player: Player; slot: Slot; selected: boolean; disabled?: boolean; onClick: () => void };

// The chip shows the player in the slot they're picked for, with a tag when it isn't their usual role.
function PickChip({ player, slot, selected, disabled, onClick }: PickChipProps) {
  const outOfRole = player.role !== slot;
  return (
    <button type="button" className={`pick-chip${selected ? " is-selected" : ""}`} aria-pressed={selected} disabled={disabled} onClick={onClick}>
      <span className="pick-chip__label">
        <span className="pick-chip__name">{player.name}</span>
        {outOfRole && <span className="pick-chip__tag">{OUT_OF_ROLE[slot]}</span>}
      </span>
      <span className="pick-chip__ovr">{displayOvr(playingAs(player, slot))}</span>
    </button>
  );
}

// Legends come after the regular players, in their own group at the end.
function legendsLast(list: Player[]): Player[] {
  return [...list.filter((player) => !player.legend), ...list.filter((player) => player.legend)];
}

type SlotSheetProps = { slot: Slot; players: Player[]; weekly: Weekly; onPick: (player: Player) => void; onClose: () => void };

// Lists the players of the other role, so anyone can keep goal tonight and any keeper can play outfield.
function SlotSheet({ slot, players, weekly, onPick, onClose }: SlotSheetProps) {
  const [search, setSearch] = useState("");
  const query = normalizeName(search);
  const candidates = legendsLast(
    players.filter(
      (player) =>
        player.active &&
        player.role !== slot &&
        slotOf(weekly, player.id) !== slot &&
        (!player.legend || query !== "") &&
        normalizeName(player.name).includes(query),
    ),
  );
  const title = slot === "keeper" ? "Quem vai pro gol?" : "Qual goleiro joga na linha?";

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <div className="sheet__handle" aria-hidden="true" />
        <div className="sheet__header">
          <h2 className="sheet__title">{title}</h2>
          <button type="button" className="button button--ghost" onClick={onClose}>
            Fechar
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
        {candidates.length > 0 ? (
          <div className="pick-grid">
            {candidates.map((player) => (
              <PickChip key={player.id} player={player} slot={slot} selected={false} onClick={() => onPick(player)} />
            ))}
          </div>
        ) : (
          <p className="draw-hint">Ninguém encontrado.</p>
        )}
      </div>
    </div>
  );
}

function ExportTeams({ data }: { data: TeamsImageData }) {
  return (
    <ExportImage
      label="Exportar imagem dos times"
      title="Imagem dos times"
      fileName="times-fut-de-terca.png"
      render={(photo) => renderTeamsImage(data, photo)}
    />
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
          <TeamCard key={team.id} name={team.name} color={team.color} players={pickPlayers(team.playerIds, byId, "line")} />
        ))}
      </div>
      <p className="draw-keepers">Goleiros: {pickPlayers(session.keeperIds, byId, "keeper").map((player) => player.name).join(" e ")}</p>

      <ExportTeams
        data={{
          teams: session.teams.map((team) => ({ name: team.name, color: team.color, players: pickPlayers(team.playerIds, byId, "line") })),
          keepers: pickPlayers(session.keeperIds, byId, "keeper"),
          day: dayLabel(sessionDate(session.date)),
        }}
      />

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
  const [slotSheet, setSlotSheet] = useState<Slot | null>(null);

  const byId = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const history = useMemo(() => buildPairHistory(sessions), [sessions]);
  const available = useMemo(() => {
    const query = normalizeName(search);
    // Legends show up when someone searches for them or after they are picked.
    return legendsLast(
      players.filter(
        (player) =>
          player.active &&
          (!player.legend || query !== "" || slotOf(weekly, player.id) !== null) &&
          normalizeName(player.name).includes(query),
      ),
    );
  }, [players, search, weekly]);

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
  const ready = isReadyToConfirm(weekly);
  const imageData: TeamsImageData = {
    teams: weekly.teams.map((team, index) => ({ name: `Time ${index + 1}`, color: team.color, players: pickPlayers(team.playerIds, byId, "line") })),
    keepers: pickPlayers(weekly.keeperIds, byId, "keeper"),
    day: dayLabel(new Date()),
  };

  if (!isAdmin) {
    return (
      <Page title="Sorteio" subtitle="Quem joga hoje e como ficam os times">
        {hasTeams ? (
          <>
            <div className="teams-grid">
              {weekly.teams.map((team, index) => (
                <TeamCard key={index} name={`Time ${index + 1}`} color={team.color} players={pickPlayers(team.playerIds, byId, "line")} />
              ))}
            </div>
            {ready && <ExportTeams data={imageData} />}
          </>
        ) : (
          <EmptyState>Os times ainda não saíram. Assim que forem sorteados, aparecem aqui.</EmptyState>
        )}
      </Page>
    );
  }

  // Each grid shows the usual players of that role plus whoever was moved into it tonight.
  const inSlot = (player: Player, slot: Slot) => {
    const picked = slotOf(weekly, player.id);
    return picked ? picked === slot : player.role === slot;
  };
  const keepers = available.filter((player) => inSlot(player, "keeper"));
  const linePlayers = available.filter((player) => inSlot(player, "line"));
  const unassigned = pickPlayers(unassignedPlayerIds(weekly), byId, "line");
  const lineFull = weekly.selectedIds.length >= WEEKLY_LINE_PLAYERS;
  const keepersFull = weekly.keeperIds.length >= WEEKLY_KEEPERS;
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
                slot="keeper"
                selected={selected}
                disabled={!selected && keepersFull}
                onClick={() => edit((current) => togglePlayer(current, player.id, "keeper"))}
              />
            );
          })}
        </div>
        <button type="button" className="button button--ghost draw-add" disabled={keepersFull} onClick={() => setSlotSheet("keeper")}>
          + Outro jogador no gol
        </button>

        <h3 className="draw-subtitle">Linha</h3>
        <div className="pick-grid">
          {linePlayers.map((player) => {
            const selected = weekly.selectedIds.includes(player.id);
            return (
              <PickChip
                key={player.id}
                player={player}
                slot="line"
                selected={selected}
                disabled={!selected && lineFull}
                onClick={() => edit((current) => togglePlayer(current, player.id, "line"))}
              />
            );
          })}
        </div>
        <button type="button" className="button button--ghost draw-add" disabled={lineFull} onClick={() => setSlotSheet("line")}>
          + Goleiro na linha
        </button>
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
                  <PickChip key={player.id} player={player} slot="line" selected={false} onClick={() => handleAssign(player.id)} />
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
                players={pickPlayers(team.playerIds, byId, "line")}
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
        {ready && <ExportTeams data={imageData} />}
        <button type="button" className="button button--primary draw-button" disabled={!ready || confirming} onClick={handleConfirm}>
          {confirming ? "Confirmando..." : "Confirmar times"}
        </button>
      </section>

      {slotSheet && (
        <SlotSheet
          slot={slotSheet}
          players={players}
          weekly={weekly}
          onPick={(player) => {
            setSlotSheet(null);
            edit((current) => togglePlayer(current, player.id, slotSheet));
          }}
          onClose={() => setSlotSheet(null)}
        />
      )}
    </Page>
  );
}
