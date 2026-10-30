import { Link, useLocation } from "react-router-dom";
import { useNow } from "../data/clock";
import { useLiveMatch } from "../data/live";
import { formatClock, getRemainingMs } from "../lib/clock";
import { getMatchScore } from "../lib/cup";

export function LiveBar() {
  const { session, match } = useLiveMatch();
  const { pathname } = useLocation();
  const now = useNow(Boolean(match?.timer?.running));

  if (!session || !match || pathname.startsWith("/partida")) {
    return null;
  }

  const home = session.teams.find((team) => team.id === match.homeId);
  const away = session.teams.find((team) => team.id === match.awayId);
  const score = getMatchScore(match);
  const remaining = getRemainingMs(match.timer, now);

  return (
    <Link to="/partida" className="live-bar" aria-label="Abrir a partida ao vivo">
      <span className="live-bar__dot" aria-hidden="true" />
      <span className="live-bar__team" style={{ color: home?.color }}>
        {home?.name}
      </span>
      <span className="live-bar__score">
        {score.home} x {score.away}
      </span>
      <span className="live-bar__team" style={{ color: away?.color }}>
        {away?.name}
      </span>
      <span className={`live-bar__clock${remaining < 0 ? " is-over" : ""}`}>{formatClock(remaining)}</span>
    </Link>
  );
}
