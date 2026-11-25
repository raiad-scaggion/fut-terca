import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { InfoTip } from "../components/InfoTip";
import { PlayerCardSheet } from "../components/PlayerCardSheet";
import { ExportImage } from "../components/ExportImage";
import { EmptyState, Page } from "../components/Page";
import { StartMatchSheet } from "../components/StartMatchSheet";
import { useAuth } from "../data/authContext";
import { useLive } from "../data/live";
import { usePlayers } from "../data/players";
import { useSessions } from "../data/sessions";
import { renderSummaryImage } from "../exports/summaryImage";
import { getChampion, getLiveStandings, getMatchScore, getMatchWinnerId, matchLabel } from "../lib/cup";
import { getCurrentAwards, getPlayerAward } from "../lib/awards";
import { buildNightSummary, dayLabel, sessionDate } from "../lib/nightSummary";
import { positionCode, type Player } from "../lib/players";
import { monthLabel } from "../lib/stats";
import { runningMatch, type Match, type Session, type Team } from "../lib/session";

function TeamName({ team, winner }: { team?: Team; winner: boolean }) {
  return (
    <span className={`cup-match__team${winner ? " is-winner" : ""}`}>
      <span className="cup-dot" style={{ background: team?.color }} aria-hidden="true" />
      <span className="cup-match__team-name">{team?.name ?? "A definir"}</span>
    </span>
  );
}

type MatchRowProps = {
  session: Session;
  match: Match;
  canStart: boolean;
  onStart: (match: Match) => void;
};

function MatchRow({ session, match, canStart, onStart }: MatchRowProps) {
  const team = (id: string) => session.teams.find((item) => item.id === id);
  const score = getMatchScore(match);
  const winnerId = match.status === "finished" ? getMatchWinnerId(session, match) : null;
  const tiedWinner = match.stage !== "group" && winnerId && score.home === score.away ? team(winnerId) : null;

  const body = (
    <>
      <span className="cup-match__label">{matchLabel(match)}</span>
      <div className="cup-match__line">
        <TeamName team={team(match.homeId)} winner={winnerId === match.homeId} />
        <span className="cup-match__score">{match.status === "pending" ? "x" : `${score.home} x ${score.away}`}</span>
        <TeamName team={team(match.awayId)} winner={winnerId === match.awayId} />
      </div>
      {tiedWinner && <span className="cup-match__note">{tiedWinner.name} vence pela classificação</span>}
      {match.status === "live" && <span className="cup-match__live">Ao vivo</span>}
    </>
  );

  if (match.status === "pending") {
    return (
      <article className="cup-match">
        {body}
        {canStart && (
          <button type="button" className="button button--primary cup-match__start" onClick={() => onStart(match)}>
            Começar
          </button>
        )}
      </article>
    );
  }

  return (
    <Link to={match.status === "live" ? "/partida" : `/partida/${session.id}/${match.id}`} className="cup-match">
      {body}
    </Link>
  );
}

type TeamPopoverProps = {
  team: Team;
  top: number;
  byId: Map<string, Player>;
  onPlayer: (player: Player) => void;
  onClose: () => void;
};

// A small list under the tapped row, so people can check who plays when the bibs don't match the team color.
function TeamPopover({ team, top, byId, onPlayer, onClose }: TeamPopoverProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const players = team.playerIds.map((id) => byId.get(id)).filter((player): player is Player => Boolean(player));

  return (
    <div className="team-popover__backdrop" onClick={onClose}>
      <div className="team-popover" role="dialog" aria-label={`Jogadores do ${team.name}`} style={{ top }} onClick={(event) => event.stopPropagation()}>
        <div className="team-popover__title">
          <span className="cup-dot" style={{ background: team.color }} aria-hidden="true" />
          {team.name}
        </div>
        {players.map((player) => (
          <button key={player.id} type="button" className="team-popover__player" onClick={() => onPlayer(player)}>
            <span>{player.name}</span>
            <span className="team-popover__code">{positionCode(player)}</span>
          </button>
        ))}
        {players.length === 0 && <p className="team-popover__empty">Não achei os jogadores deste time.</p>}
      </div>
    </div>
  );
}

type StandingsProps = {
  session: Session;
  onTeam: (team: Team, top: number) => void;
};

function Standings({ session, onTeam }: StandingsProps) {
  const liveMatch = session.matches.find((match) => match.status === "live" && match.stage === "group");
  const playing = (id: string) => liveMatch?.homeId === id || liveMatch?.awayId === id;

  return (
    <table className="standings">
      <thead>
        <tr>
          <th scope="col" className="standings__team">
            Classificação{" "}
            <InfoTip label="Como funciona a classificação e o desempate">
              <p>Vitória vale 3 pontos e empate vale 1.</p>
              <p>A partida ao vivo já entra na tabela com o placar do momento.</p>
              <p>
                Empate em pontos: primeiro o confronto direto entre os times empatados, depois o número de vitórias, o
                saldo de gols e os gols marcados.
              </p>
              <p>
                No mata-mata não tem pênalti. Semifinal ou 3º lugar empatado fica com quem terminou na frente nos
                grupos. A final não acaba empatada: segue no gol de ouro.
              </p>
            </InfoTip>
          </th>
          <th scope="col" title="Pontos">
            P
          </th>
          <th scope="col" title="Jogos">
            J
          </th>
          <th scope="col" title="Vitórias">
            V
          </th>
          <th scope="col" title="Empates">
            E
          </th>
          <th scope="col" title="Derrotas">
            D
          </th>
          <th scope="col" title="Saldo de gols">
            SG
          </th>
        </tr>
      </thead>
      <tbody>
        {getLiveStandings(session).map((row, index) => (
          <tr key={row.team.id}>
            <th scope="row" className="standings__team">
              <span className="standings__position">{index + 1}</span>
              <button
                type="button"
                className="standings__team-button"
                aria-label={`Ver jogadores do ${row.team.name}`}
                onClick={(event) => onTeam(row.team, event.currentTarget.getBoundingClientRect().bottom)}
              >
                <span className="cup-dot" style={{ background: row.team.color }} aria-hidden="true" />
                {row.team.name}
                {playing(row.team.id) && <span className="standings__live">ao vivo</span>}
              </button>
            </th>
            <td className="standings__points">{row.points}</td>
            <td>{row.played}</td>
            <td>{row.wins}</td>
            <td>{row.draws}</td>
            <td>{row.losses}</td>
            <td>{row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function CopaPage() {
  const { isAdmin } = useAuth();
  const { players, loading: playersLoading } = usePlayers();
  const { sessions, loading } = useSessions();
  const live = useLive();
  const [starting, setStarting] = useState<Match | null>(null);
  const [openTeam, setOpenTeam] = useState<{ team: Team; top: number } | null>(null);
  const [cardPlayer, setCardPlayer] = useState<Player | null>(null);
  const [params, setParams] = useSearchParams();

  const byId = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const awards = useMemo(() => getCurrentAwards(players, sessions, new Date().toLocaleDateString("en-CA")), [players, sessions]);
  const nights = useMemo(
    () => [...sessions].sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt ?? 0) - (a.createdAt ?? 0)),
    [sessions],
  );
  const current = useMemo(() => {
    const latest = [...sessions].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))[0];
    return sessions.find((item) => item.id === live.sessionId) ?? latest ?? null;
  }, [sessions, live.sessionId]);
  // A past night opens from the picker, so an admin can fix a match someone forgot to mark.
  const session = sessions.find((item) => item.id === params.get("noite")) ?? current;
  const past = Boolean(session && current && session.id !== current.id);

  if (loading || live.loading) {
    return (
      <Page title="Copa">
        <EmptyState>Carregando...</EmptyState>
      </Page>
    );
  }

  if (!session) {
    return (
      <Page title="Copa" subtitle="Fase de grupos, mata-mata e o campeão da noite">
        <EmptyState>Nenhuma copa hoje. Confirme os times no Sorteio para começar.</EmptyState>
      </Page>
    );
  }

  const champion = getChampion(session);
  // The image is frozen when it opens, so the button waits for the names to arrive.
  const summary = playersLoading ? null : buildNightSummary(session, byId);
  const group = session.matches.filter((match) => match.stage === "group");
  const knockout = session.matches.filter((match) => match.stage !== "group");
  const running = runningMatch(session, live.matchId);
  const canStart = isAdmin && !running && session.id === live.sessionId;
  // If another phone starts a match while the sheet is open, its pointer must not count as stale.
  const staleId = running ? null : live.matchId;
  const row = (match: Match) => <MatchRow key={match.id} session={session} match={match} canStart={canStart} onStart={setStarting} />;

  return (
    <Page
      title="Copa"
      subtitle={past ? `Noite de ${dayLabel(sessionDate(session.date))}` : session.status === "finished" ? "A copa acabou" : "Fase de grupos, mata-mata e o campeão da noite"}
    >
      {nights.length > 1 && (
        <label className="form-field cup-night">
          <span className="form-field__label">Noite</span>
          <select
            className="text-input"
            value={session.id}
            onChange={(event) => setParams(event.target.value === current?.id ? {} : { noite: event.target.value }, { replace: true })}
          >
            {nights.map((night) => (
              <option key={night.id} value={night.id}>
                {dayLabel(sessionDate(night.date))}
                {night.id === current?.id ? " (atual)" : ""}
              </option>
            ))}
          </select>
        </label>
      )}

      {isAdmin && past && (
        <p className="draw-hint cup-night__hint">
          Esqueceram de marcar algum lance? Abra a partida e toque em Corrigir partida. Se ninguém lembra em qual jogo saiu uma
          assistência ou defesa, pode marcar em qualquer partida do time do jogador nessa noite, que o total dele fica certo. Gol
          precisa ir na partida certa, porque muda o placar.
        </p>
      )}

      {champion && (
        <section className="champion">
          <span className="champion__label">Campeão da noite</span>
          <strong className="champion__team" style={{ color: champion.color }}>
            {champion.name}
          </strong>
          <span className="champion__players">{champion.playerIds.flatMap((id) => byId.get(id)?.name ?? []).join(", ")}</span>
        </section>
      )}

      {summary && (
        <ExportImage
          label="Exportar resumo da noite"
          title="Resumo da noite"
          fileName="resumo-fut-de-terca.png"
          render={(photo) => renderSummaryImage(summary, dayLabel(sessionDate(session.date)), photo)}
        />
      )}

      {/* Keeps the popover on screen when the tapped row is near the bottom. */}
      <Standings session={session} onTeam={(team, bottom) => setOpenTeam({ team, top: Math.min(bottom + 4, window.innerHeight - 260) })} />

      <section className="draw-section cup-section">
        <h2 className="draw-section__title">Fase de grupos</h2>
        {group.map(row)}
      </section>

      {knockout.length > 0 && (
        <section className="draw-section">
          <h2 className="draw-section__title">Mata-mata</h2>
          {knockout.map(row)}
        </section>
      )}

      {openTeam && (
        <TeamPopover
          team={openTeam.team}
          top={openTeam.top}
          byId={byId}
          onPlayer={(player) => {
            setOpenTeam(null);
            setCardPlayer(player);
          }}
          onClose={() => setOpenTeam(null)}
        />
      )}

      {cardPlayer && (
        <PlayerCardSheet
          player={cardPlayer}
          award={getPlayerAward(awards, cardPlayer.id)}
          awardMonth={monthLabel(awards.month).slice(0, 3)}
          onClose={() => setCardPlayer(null)}
        />
      )}

      {starting && (
        <StartMatchSheet session={session} match={starting} staleId={staleId} byId={byId} onClose={() => setStarting(null)} />
      )}
    </Page>
  );
}
