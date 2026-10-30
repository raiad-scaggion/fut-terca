import type { AwardKey } from "../lib/awards";
import type { Player } from "../lib/players";
import { PlayerCard } from "./PlayerCard";

type RankingCardProps = {
  player: Player;
  position: number;
  value: number;
  label: string;
  award?: AwardKey | null;
  awardMonth?: string;
  photo?: string;
  lead?: boolean;
};

export function RankingCard({ player, position, value, label, award, awardMonth, photo, lead = false }: RankingCardProps) {
  return (
    <article className={`ranking-card${lead ? " ranking-card--lead" : ""}`}>
      <PlayerCard player={player} award={award} awardMonth={awardMonth} photo={photo} />
      <div className="ranking-card__result">
        <span className="ranking-card__position">{position}º</span>
        <strong className="ranking-card__value">{value}</strong>
        <span className="ranking-card__label">{label}</span>
      </div>
    </article>
  );
}
