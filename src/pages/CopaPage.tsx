import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ExportImage } from "../components/ExportImage";
import { EmptyState, Page } from "../components/Page";
import { StartMatchSheet } from "../components/StartMatchSheet";
import { useAuth } from "../data/authContext";
import { useLive } from "../data/live";
import { usePlayers } from "../data/players";
import { useSessions } from "../data/sessions";
import { renderSummaryImage } from "../exports/summaryImage";
import { getChampion, getMatchScore, getMatchWinnerId, getStandings, matchLabel } from "../lib/cup";
import { buildNightSummary, dayLabel, sessionDate } from "../lib/nightSummary";
import type { Match, Session, Team } from "../lib/session";

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

function Standings({ session }: { session: Session }) {
  return (
    <table className="standings">
      <thead>
        <tr>
          <th scope="col" className="standings__team">
            Classificação
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
        {getStandings(session).map((row, index) => (
          <tr key={row.team.id}>
            <th scope="row" className="standings__team">
              <span className="standings__position">{index + 1}</span>
              <span className="cup-dot" style={{ background: row.team.color }} aria-hidden="true" />
              {row.team.name}
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

  const byId = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const session = useMemo(() => {
    const latest = [...sessions].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))[0];
    return sessions.find((item) => item.id === live.sessionId) ?? latest ?? null;
  }, [sessions, live.sessionId]);

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
  const canStart = isAdmin && !live.matchId && session.id === live.sessionId;
  const row = (match: Match) => <MatchRow key={match.id} session={session} match={match} canStart={canStart} onStart={setStarting} />;

  return (
    <Page title="Copa" subtitle={champion ? "A copa acabou" : "Fase de grupos, mata-mata e o campeão da noite"}>
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

      <Standings session={session} />

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

      {starting && <StartMatchSheet session={session} match={starting} byId={byId} onClose={() => setStarting(null)} />}
    </Page>
  );
}
