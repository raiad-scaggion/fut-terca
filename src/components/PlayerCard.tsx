import { AWARD_LABELS, type AwardKey } from "../lib/awards";
import { crestUrl, getClub } from "../lib/clubs";
import { flagUrl } from "../lib/countries";
import { cardTier, displayOvr, displayStat, positionCode, type Player } from "../lib/players";
import { CARD_PATH, CARD_THEMES } from "./cardTheme";

type PlayerCardProps = {
  player: Pick<Player, "name" | "role" | "linePosition" | "ratings" | "active" | "nationality" | "club">;
  award?: AwardKey | null;
  awardMonth?: string;
  photo?: string;
  onClick?: () => void;
  size?: "grid" | "sheet";
};

function Stat({ value, label, x, y, ink }: { value: number; label: string; x: number; y: number; ink: string }) {
  return (
    <>
      <text x={x} y={y} className="fut-card__stat" fill={ink}>
        {value}
      </text>
      <text x={x + 66} y={y} className="fut-card__stat fut-card__stat--label" fill={ink}>
        {label}
      </text>
    </>
  );
}

export function PlayerCard({ player, award, awardMonth, photo, onClick, size = "grid" }: PlayerCardProps) {
  const key = award ?? cardTier(player);
  const theme = CARD_THEMES[key];
  const tone = theme.dark ? "dark" : "light";
  const rule = `${theme.ink}66`;
  const club = getClub(player.club);
  const stamp = award ? [AWARD_LABELS[award], awardMonth].filter(Boolean).join(" · ").toUpperCase() : "";
  const className = `fut-card fut-card--${size}${player.active === false ? " is-inactive" : ""}`;

  const art = (
    <svg viewBox="-14 -6 598 930" className="fut-card__art" role="img" aria-label={`Card de ${player.name || "novo jogador"}`}>
      <path d={CARD_PATH} fill={`url(#fc-metal-${key})`} />
      <g clipPath="url(#fc-shape)">
        <rect width="570" height="910" fill={`url(#fc-lines-${tone})`} />
        {award && <use href={`#fc-engrave-${award}`} opacity=".2" />}
        <rect width="570" height="480" fill={`url(#fc-glow-${key})`} />
        <rect y="480" width="570" height="430" fill={`url(#fc-lower-${tone})`} />
        <rect width="570" height="910" fill={`url(#fc-sheen-${tone})`} />
      </g>
      <g clipPath="url(#fc-upper)">
        {photo ? (
          <image href={photo} x="170" y="96" width="390" height="390" preserveAspectRatio="xMidYMax meet" />
        ) : (
          <use href={`#fc-bust-on-${tone}`} />
        )}
      </g>
      <path d={CARD_PATH} transform="translate(285 455) scale(.952 .958) translate(-285 -455)" fill="none" stroke={rule} strokeWidth="1.6" />
      <path d={CARD_PATH} fill="none" stroke={`url(#fc-rim-${key})`} strokeWidth="4" />

      <text x="126" y="182" textAnchor="middle" className="fut-card__ovr" fill={theme.ink}>
        {displayOvr(player)}
      </text>
      <text x="126" y="234" textAnchor="middle" className="fut-card__pos" fill={theme.ink}>
        {positionCode(player)}
      </text>
      <rect x="90" y="256" width="72" height="1.6" fill={rule} />
      <image href={flagUrl(player.nationality)} x="84" y="274" width="84" height="59" preserveAspectRatio="xMidYMid slice" />
      <rect x="84" y="274" width="84" height="59" fill="none" stroke="#000" strokeOpacity=".25" />
      {club && (
        <>
          <rect x="90" y="350" width="72" height="1.6" fill={rule} />
          <image
            href={crestUrl(club)}
            x="78"
            y="364"
            width="96"
            height="96"
            preserveAspectRatio="xMidYMid meet"
            className={theme.dark ? "fut-card__crest--halo" : undefined}
          />
        </>
      )}

      <text x="285" y="556" textAnchor="middle" textLength={player.name.length > 13 ? 440 : undefined} lengthAdjust="spacingAndGlyphs" className="fut-card__name" fill={theme.ink}>
        {(player.name || "Novo jogador").toUpperCase()}
      </text>
      <rect x="96" y="580" width="378" height="1.6" fill={rule} />
      <Stat value={displayStat(player.ratings.speed)} label="VEL" x={106} y={652} ink={theme.ink} />
      <Stat value={displayStat(player.ratings.finishing)} label="FIN" x={106} y={722} ink={theme.ink} />
      <rect x="284" y="606" width="1.6" height="132" fill={rule} />
      <Stat value={displayStat(player.ratings.passing)} label="PAS" x={330} y={652} ink={theme.ink} />
      <Stat value={displayStat(player.ratings.defense)} label="DEF" x={330} y={722} ink={theme.ink} />
      {stamp ? (
        <text x="285" y="796" textAnchor="middle" className="fut-card__stamp" fill={theme.ink}>
          {stamp}
        </text>
      ) : (
        <rect x="255" y="780" width="60" height="1.6" fill={rule} />
      )}
    </svg>
  );

  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        {art}
      </button>
    );
  }

  return <div className={className}>{art}</div>;
}
