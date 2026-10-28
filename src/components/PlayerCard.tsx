import {
  cardTier,
  displayOvr,
  displayStat,
  playerInitials,
  positionCode,
  type Player,
} from "../lib/players";

type PlayerCardProps = {
  player: Pick<
    Player,
    "name" | "role" | "linePosition" | "ratings" | "isMonthly" | "active"
  >;
  onClick?: () => void;
  size?: "grid" | "sheet";
};

export function PlayerCard({ player, onClick, size = "grid" }: PlayerCardProps) {
  const tier = cardTier(player);
  const ovr = displayOvr(player);
  const pos = positionCode(player);
  const initials = playerInitials(player.name);
  const className = `fifa-card fifa-card--${tier} fifa-card--${size}${
    player.active === false ? " is-inactive" : ""
  }`;

  const content = (
    <>
      <div className="fifa-card__top">
        <div className="fifa-card__ovr-block">
          <span className="fifa-card__ovr">{ovr}</span>
          <span className="fifa-card__pos">{pos}</span>
        </div>
        {player.isMonthly && (
          <span className="fifa-card__badge">Mensalista</span>
        )}
      </div>
      <div className="fifa-card__avatar" aria-hidden="true">
        <span className="fifa-card__initials">{initials}</span>
      </div>
      <div className="fifa-card__name">{player.name || "Novo jogador"}</div>
      <div className="fifa-card__stats">
        <div className="fifa-card__stat">
          <span className="fifa-card__stat-val">
            {displayStat(player.ratings.speed)}
          </span>
          <span className="fifa-card__stat-key">VEL</span>
        </div>
        <div className="fifa-card__stat">
          <span className="fifa-card__stat-val">
            {displayStat(player.ratings.passing)}
          </span>
          <span className="fifa-card__stat-key">PAS</span>
        </div>
        <div className="fifa-card__stat">
          <span className="fifa-card__stat-val">
            {displayStat(player.ratings.finishing)}
          </span>
          <span className="fifa-card__stat-key">FIN</span>
        </div>
        <div className="fifa-card__stat">
          <span className="fifa-card__stat-val">
            {displayStat(player.ratings.defense)}
          </span>
          <span className="fifa-card__stat-key">DEF</span>
        </div>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}
