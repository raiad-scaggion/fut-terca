import { useMemo } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/Page";
import { PlayerCard } from "../components/PlayerCard";
import { RankingCard } from "../components/RankingCard";
import { useAuth } from "../data/authContext";
import { useNow } from "../data/clock";
import { useLive } from "../data/live";
import { usePhotos } from "../data/photos";
import { usePlayers } from "../data/players";
import { useSessions } from "../data/sessions";
import { AWARD_LABELS, getCurrentAwards, getPlayerAward } from "../lib/awards";
import { formatClock, getRemainingMs } from "../lib/clock";
import { getMatchScore, matchLabel } from "../lib/cup";
import { getHomeState, getLastChampion, listAwardWinners, type HomeState } from "../lib/home";
import { dayLabel, sessionDate } from "../lib/nightSummary";
import type { Match, Session } from "../lib/session";
import { buildRanking, computeStats, monthLabel } from "../lib/stats";

function PitchLines() {
  return (
    <svg className="home-hero__pitch" viewBox="0 0 240 120" aria-hidden="true">
      <path d="M2 120A118 118 0 0 1 238 120" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M112 120A8 8 0 0 1 128 120Z" fill="currentColor" />
    </svg>
  );
}

function LiveScore({ session, match }: { session: Session; match: Match }) {
  const now = useNow(Boolean(match.timer?.running));
  const team = (id: string) => session.teams.find((item) => item.id === id);
  const home = team(match.homeId);
  const away = team(match.awayId);
  const score = getMatchScore(match);
  const remaining = getRemainingMs(match.timer, now);

  return (
    <div className="home-score">
      <span className="home-score__team" style={{ color: home?.color }}>
        {home?.name}
      </span>
      <strong className="home-score__goals">
        {score.home} x {score.away}
      </strong>
      <span className="home-score__team" style={{ color: away?.color }}>
        {away?.name}
      </span>
      <span className={`home-score__clock${remaining < 0 ? " is-over" : ""}`}>{formatClock(remaining)}</span>
    </div>
  );
}

function countdownTitle(days: number): string {
  if (days === 0) {
    return "Hoje tem fut";
  }
  return days === 1 ? "É amanhã" : `Faltam ${days} dias`;
}

function Hero({ state }: { state: HomeState }) {
  const { isAdmin } = useAuth();

  if (state.kind === "live") {
    return (
      <section className="home-hero">
        <PitchLines />
        <span className="home-hero__status">
          <span className="live-bar__dot" aria-hidden="true" />
          {matchLabel(state.match)}
        </span>
        <h1 className="home-hero__title">Bola rolando</h1>
        <LiveScore session={state.session} match={state.match} />
        <Link to="/partida" className="button button--primary button--link home-hero__action">
          Ver a partida
        </Link>
      </section>
    );
  }

  if (state.kind === "cup") {
    const team = (id: string) => state.session.teams.find((item) => item.id === id)?.name ?? "A definir";
    return (
      <section className="home-hero">
        <PitchLines />
        <h1 className="home-hero__title">A copa está rolando</h1>
        <p className="home-hero__text">
          {state.next
            ? `Próximo jogo: ${team(state.next.homeId)} x ${team(state.next.awayId)}`
            : "Veja a classificação e os resultados da noite."}
        </p>
        <Link to="/copa" className="button button--primary button--link home-hero__action">
          Ver a copa
        </Link>
      </section>
    );
  }

  return (
    <section className="home-hero">
      <PitchLines />
      <h1 className="home-hero__title">{countdownTitle(state.days)}</h1>
      <p className="home-hero__text">
        {state.days === 0 ? "Terça" : "Próximo jogo: terça"}, {dayLabel(sessionDate(state.date))}
      </p>
      {isAdmin && (
        <Link to="/sorteio" className="button button--primary button--link home-hero__action">
          Montar os times
        </Link>
      )}
    </section>
  );
}

export function HomePage() {
  const { players, loading: playersLoading, error: playersError } = usePlayers();
  const { sessions, loading: sessionsLoading, error: sessionsError } = useSessions();
  const live = useLive();
  const photos = usePhotos();
  const today = new Date().toLocaleDateString("en-CA");

  const awards = useMemo(() => getCurrentAwards(players, sessions, today), [players, sessions, today]);
  const winners = useMemo(() => listAwardWinners(awards), [awards]);
  const leaders = useMemo(() => {
    const stats = computeStats(players, sessions);
    return [
      { row: buildRanking(players, stats, "goals")[0], singular: "gol", plural: "gols" },
      { row: buildRanking(players, stats, "assists")[0], singular: "assistência", plural: "assistências" },
    ].filter((leader) => leader.row);
  }, [players, sessions]);

  const error = playersError ?? sessionsError;
  if (error) {
    return <EmptyState>{error}</EmptyState>;
  }
  if (playersLoading || sessionsLoading || live.loading) {
    return <EmptyState>Carregando...</EmptyState>;
  }

  const byId = new Map(players.map((player) => [player.id, player]));
  const champion = getLastChampion(sessions);
  const awardMonth = monthLabel(awards.month);

  return (
    <div className="home">
      <Hero state={getHomeState(sessions, live, today)} />

      {winners.length > 0 ? (
        <section className="home__section">
          <h2 className="draw-section__title">Cartas de {awardMonth.split(" ")[0]}</h2>
          <div className="players-grid">
            {winners.flatMap((winner) => {
              const player = byId.get(winner.playerId);
              return player
                ? [
                    <article key={player.id} className="ranking-card">
                      <PlayerCard
                        player={player}
                        award={getPlayerAward(awards, player.id)}
                        awardMonth={awardMonth.slice(0, 3)}
                        photo={photos[player.id]}
                      />
                      <span className="home__award">{winner.awards.map((key) => AWARD_LABELS[key]).join(" e ")}</span>
                    </article>,
                  ]
                : [];
            })}
          </div>
        </section>
      ) : (
        leaders.length > 0 && (
          <section className="home__section">
            <h2 className="draw-section__title">Líderes da temporada</h2>
            <div className="players-grid">
              {leaders.map(({ row, singular, plural }) => (
                <RankingCard
                  key={singular}
                  player={row.player}
                  position={row.position}
                  value={row.value}
                  label={row.value === 1 ? singular : plural}
                  photo={photos[row.player.id]}
                />
              ))}
            </div>
          </section>
        )
      )}

      <Link to="/ranking" className="button button--ghost button--link home__ranking">
        Ver o ranking completo
      </Link>

      {champion && (
        <section className="home__section">
          <h2 className="draw-section__title">Último campeão</h2>
          <div className="champion home__champion">
            <strong className="champion__team" style={{ color: champion.team.color }}>
              {champion.team.name}
            </strong>
            <span className="champion__players">
              {champion.team.playerIds.flatMap((id) => byId.get(id)?.name ?? []).join(", ")}
            </span>
            <span className="champion__label">{dayLabel(sessionDate(champion.session.date))}</span>
          </div>
        </section>
      )}
    </div>
  );
}
