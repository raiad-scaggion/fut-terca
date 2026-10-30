import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { EmptyState, Page } from "../components/Page";
import { useAuth } from "../data/authContext";
import { useNow } from "../data/clock";
import { useLive } from "../data/live";
import { addEvent, cancelMatch, finishEdit, finishMatch, removeEvent, setTimerRunning } from "../data/match";
import { usePlayers } from "../data/players";
import { useSessions } from "../data/sessions";
import { useMatchEffects } from "../hooks/useMatchEffects";
import { formatClock, getRemainingMs } from "../lib/clock";
import { getMatchScore, getMatchWinnerId, isNextRoundLocked, isTied, matchLabel, needsGoldenGoal } from "../lib/cup";
import type { Player } from "../lib/players";
import type { Match, MatchEvent, MatchEventType, Session, Team } from "../lib/session";

const EVENT_LABELS: Record<MatchEventType, string> = { goal: "Gol", assist: "Assistência", save: "Defesa" };
const WRITE_ERROR = "Não deu para salvar. Confira sua conexão e tente de novo.";

type Mark = (type: MatchEventType, playerId: string, teamId: string) => void;

type PlayerRowProps = {
  player: Player;
  team: Team;
  keeper: boolean;
  events: MatchEvent[];
  canEdit: boolean;
  onMark: Mark;
};

function PlayerRow({ player, team, keeper, events, canEdit, onMark }: PlayerRowProps) {
  const count = (type: MatchEventType) => events.filter((event) => event.playerId === player.id && event.type === type).length;
  const [goals, assists, saves] = [count("goal"), count("assist"), count("save")];

  return (
    <li className={`match-player${keeper ? " is-keeper" : ""}`}>
      <div className="match-player__top">
        <span className="match-player__name">{player.name}</span>
        <span className="match-player__counts">
          {goals > 0 && <span aria-label={`${goals} gols`}>{goals} G</span>}
          {assists > 0 && <span aria-label={`${assists} assistências`}>{assists} A</span>}
          {saves > 0 && <span aria-label={`${saves} defesas`}>{saves} D</span>}
        </span>
      </div>
      {canEdit && (
        <div className="match-player__actions">
          <button type="button" className="mark-btn mark-btn--goal" aria-label={`Gol de ${player.name}`} onClick={() => onMark("goal", player.id, team.id)}>
            + Gol
          </button>
          <button type="button" className="mark-btn" aria-label={`Assistência de ${player.name}`} onClick={() => onMark("assist", player.id, team.id)}>
            + Assist.
          </button>
          {keeper && (
            <button type="button" className="mark-btn mark-btn--save" aria-label={`Defesa de ${player.name}`} onClick={() => onMark("save", player.id, team.id)}>
              + Defesa
            </button>
          )}
        </div>
      )}
    </li>
  );
}

type TeamColumnProps = {
  team: Team;
  keeperId?: string;
  byId: Map<string, Player>;
  events: MatchEvent[];
  canEdit: boolean;
  onMark: Mark;
};

function TeamColumn({ team, keeperId, byId, events, canEdit, onMark }: TeamColumnProps) {
  const keeper = keeperId ? byId.get(keeperId) : undefined;
  const players = team.playerIds.flatMap((id) => byId.get(id) ?? []);

  return (
    <section className="match-team" style={{ boxShadow: `inset 0 3px ${team.color}` }} aria-label={team.name}>
      <h2 className="match-team__name">{team.name}</h2>
      <ul className="match-team__players">
        {players.map((player) => (
          <PlayerRow key={player.id} player={player} team={team} keeper={false} events={events} canEdit={canEdit} onMark={onMark} />
        ))}
        {keeper && <PlayerRow player={keeper} team={team} keeper events={events} canEdit={canEdit} onMark={onMark} />}
      </ul>
    </section>
  );
}

type FinishPanelProps = {
  session: Session;
  match: Match;
  home: Team;
  away: Team;
  confirmLabel: string;
  onConfirm: () => void;
  onBack: () => void;
};

function FinishPanel({ session, match, home, away, confirmLabel, onConfirm, onBack }: FinishPanelProps) {
  const score = getMatchScore(match);

  if (needsGoldenGoal(match)) {
    return (
      <div className="finish-panel" role="alertdialog" aria-label="Final empatada">
        <strong>A final não termina empatada</strong>
        <p className="delete-player__text">Vale o gol de ouro: a partida continua e o primeiro gol decide. Marque o gol para encerrar.</p>
        <button type="button" className="button button--ghost" onClick={onBack}>
          Voltar
        </button>
      </div>
    );
  }

  const winnerId = getMatchWinnerId(session, match);
  const tiedKnockout = match.stage !== "group" && isTied(match);

  return (
    <div className="finish-panel" role="alertdialog" aria-label={confirmLabel}>
      <strong>{confirmLabel}?</strong>
      <p className="delete-player__text">
        {home.name} {score.home} x {score.away} {away.name}
      </p>
      {tiedKnockout && (
        <p className="delete-player__text">Empate: {winnerId === home.id ? home.name : away.name} vence por ter ficado à frente na fase de grupos.</p>
      )}
      <div className="delete-player__actions">
        <button type="button" className="button button--ghost" onClick={onBack}>
          Voltar
        </button>
        <button type="button" className="button button--primary" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}

type MatchScreenProps = {
  session: Session;
  match: Match;
  byId: Map<string, Player>;
  isAdmin: boolean;
};

function MatchScreen({ session, match, byId, isAdmin }: MatchScreenProps) {
  const navigate = useNavigate();
  const [panel, setPanel] = useState<"finish" | "cancel" | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");

  const live = match.status === "live";
  const running = live && Boolean(match.timer?.running);
  const now = useNow(running);
  const remaining = getRemainingMs(match.timer, now);
  useMatchEffects(remaining, running);

  const home = session.teams.find((team) => team.id === match.homeId);
  const away = session.teams.find((team) => team.id === match.awayId);
  if (!home || !away) {
    return <EmptyState>Não achei os times desta partida.</EmptyState>;
  }

  const canEdit = isAdmin && (live || editing);
  const score = getMatchScore(match);
  const newestFirst = [...match.events].sort((a, b) => b.at - a.at);
  const teamName = (id: string) => (id === home.id ? home.name : away.name);

  const attempt = async (action: () => Promise<void>) => {
    setError("");
    try {
      await action();
    } catch {
      setError(WRITE_ERROR);
    }
  };

  const mark: Mark = (type, playerId, teamId) => void attempt(() => addEvent(session.id, match.id, type, playerId, teamId));

  const handleFinish = () =>
    attempt(async () => {
      await finishMatch(session.id, match.id);
      navigate("/copa");
    });

  const handleFinishEdit = () =>
    attempt(async () => {
      await finishEdit(session.id, match.id);
      setEditing(false);
      setPanel(null);
    });

  const handleCancel = () =>
    attempt(async () => {
      await cancelMatch(session.id, match.id, match.timer?.durationSec ?? 600);
      navigate("/copa");
    });

  return (
    <section className="match">
      <header className="match__header">
        <div className="match__top">
          <span className="match__label">{matchLabel(match)}</span>
          {live ? (
            <div className={`match__clock${remaining < 0 ? " is-over" : ""}`} role="timer">
              {formatClock(remaining)}
            </div>
          ) : (
            <span className="match__ended">Partida encerrada</span>
          )}
        </div>
        <div className="match__scoreboard">
          <span className="match__team">
            <span className="match__bar" style={{ background: home.color }} aria-hidden="true" />
            <span className="match__team-name">{home.name}</span>
          </span>
          <span className="match__score">{score.home}</span>
          <span className="match__score">{score.away}</span>
          <span className="match__team">
            <span className="match__bar" style={{ background: away.color }} aria-hidden="true" />
            <span className="match__team-name">{away.name}</span>
          </span>
        </div>
        {live && (
          <>
            {remaining <= 0 && needsGoldenGoal(match) && <span className="golden-goal">Gol de ouro: o primeiro gol decide</span>}
            {isAdmin && (
              <button
                type="button"
                className={`button ${running ? "button--ghost" : "button--primary"} match__clock-button`}
                onClick={() => attempt(() => setTimerRunning(session.id, match.id, !running))}
              >
                {running ? "Pausar" : match.timer?.elapsedMs ? "Continuar" : "Iniciar cronômetro"}
              </button>
            )}
          </>
        )}
      </header>

      <div className="match__teams">
        <TeamColumn team={home} keeperId={match.keepers?.home} byId={byId} events={match.events} canEdit={canEdit} onMark={mark} />
        <TeamColumn team={away} keeperId={match.keepers?.away} byId={byId} events={match.events} canEdit={canEdit} onMark={mark} />
      </div>

      {error && <p className="form-error">{error}</p>}

      {newestFirst.length > 0 && (
        <section className="match-log" aria-label="Lances">
          <h2 className="draw-section__title">Lances</h2>
          <ul className="match-log__list">
            {newestFirst.map((event) => (
              <li key={event.id} className="match-log__item">
                <span className="match-log__text">
                  <strong>{EVENT_LABELS[event.type]}</strong> {byId.get(event.playerId)?.name ?? "?"}
                  <span className="match-log__team"> ({teamName(event.teamId)})</span>
                </span>
                {canEdit && (
                  <button type="button" className="match-log__undo" onClick={() => attempt(() => removeEvent(session.id, match.id, event.id))}>
                    Desfazer
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {isAdmin && live && (
        <div className="match__footer">
          {panel === "finish" && <FinishPanel session={session} match={match} home={home} away={away} confirmLabel="Encerrar partida" onConfirm={handleFinish} onBack={() => setPanel(null)} />}
          {panel === "cancel" && (
            <div className="delete-player" role="alertdialog" aria-label="Cancelar partida">
              <strong>Cancelar esta partida?</strong>
              <p className="delete-player__text">O placar e os lances são apagados, e o jogo volta para a lista.</p>
              <div className="delete-player__actions">
                <button type="button" className="button button--ghost" onClick={() => setPanel(null)}>
                  Voltar
                </button>
                <button type="button" className="button button--danger" onClick={handleCancel}>
                  Cancelar partida
                </button>
              </div>
            </div>
          )}
          {panel === null && (
            <>
              <button type="button" className="button button--primary match__wide" onClick={() => setPanel("finish")}>
                Encerrar partida
              </button>
              <button type="button" className="button button--danger-ghost" onClick={() => setPanel("cancel")}>
                Cancelar partida
              </button>
            </>
          )}
        </div>
      )}

      {match.status === "finished" && (
        <div className="match__footer">
          {editing && isNextRoundLocked(session, match) && (
            <p className="draw-hint">O mata-mata seguinte já começou, então os confrontos dele não mudam. Os números e a tabela mudam normalmente.</p>
          )}
          {isAdmin && !editing && (
            <button type="button" className="button button--ghost match__wide" onClick={() => setEditing(true)}>
              Corrigir partida
            </button>
          )}
          {editing &&
            (panel === "finish" ? (
              <FinishPanel session={session} match={match} home={home} away={away} confirmLabel="Concluir correção" onConfirm={handleFinishEdit} onBack={() => setPanel(null)} />
            ) : (
              <button type="button" className="button button--primary match__wide" onClick={() => setPanel("finish")}>
                Concluir correção
              </button>
            ))}
          <Link to="/copa" className="button button--ghost button--link match__wide">
            Voltar para a Copa
          </Link>
        </div>
      )}
    </section>
  );
}

export function PartidaPage() {
  const params = useParams();
  const { isAdmin } = useAuth();
  const live = useLive();
  const { players, loading: playersLoading } = usePlayers();
  const { sessions, loading: sessionsLoading } = useSessions();

  const byId = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);

  if (live.loading || playersLoading || sessionsLoading) {
    return (
      <Page title="Partida">
        <EmptyState>Carregando...</EmptyState>
      </Page>
    );
  }

  const session = sessions.find((item) => item.id === (params.sessionId ?? live.sessionId));
  const match = session?.matches.find((item) => item.id === (params.matchId ?? live.matchId));

  if (!session || !match || match.status === "pending") {
    return (
      <Page title="Partida">
        <EmptyState>Nenhuma partida em andamento. Comece uma na Copa.</EmptyState>
      </Page>
    );
  }

  return <MatchScreen key={match.id} session={session} match={match} byId={byId} isAdmin={isAdmin} />;
}
