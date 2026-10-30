import { cardTier, playerInitials, positionCode, type Player } from "../lib/players";

type RankingCardProps = {
  player: Player;
  position: number;
  value: number;
  label: string;
};

export function RankingCard({ player, position, value, label }: RankingCardProps) {
  return (
    <div className={`fifa-card fifa-card--${cardTier(player)} ranking-card${player.active ? "" : " is-inactive"}`}>
      <div className="fifa-card__top">
        <span className="fifa-card__pos">{positionCode(player)}</span>
        <span className="ranking-card__position">#{position}</span>
      </div>
      <div className="fifa-card__avatar" aria-hidden="true">
        <span className="fifa-card__initials">{playerInitials(player.name)}</span>
      </div>
      <div className="fifa-card__name">{player.name}</div>
      <div className="ranking-card__stat">
        <span className="ranking-card__value">{value}</span>
        <span className="ranking-card__label">{label}</span>
      </div>
    </div>
  );
}
