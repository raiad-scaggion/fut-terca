import { CARD_THEMES } from "./cardTheme";
import { cardTier, KEEPER_STATS, LINE_STATS, type Player } from "../lib/players";
import { radarPoint, radarPolygon } from "../lib/radar";

const SIZE = 300;
const CENTER = SIZE / 2;
const RADIUS = 96;
const RINGS = [25, 50, 75, 100];

type StatRadarProps = {
  player: Pick<Player, "name" | "role" | "linePosition" | "stats">;
};

// The six stats as a hexagon, like the FIFA cards, in the color of the player's card.
export function StatRadar({ player }: StatRadarProps) {
  const keeper = player.role === "keeper";
  const defs = keeper ? KEEPER_STATS : LINE_STATS;
  const stats: Record<string, number> = keeper ? player.stats.keeper : player.stats.line;
  const values = defs.map(({ key }) => stats[key]);
  const color = CARD_THEMES[cardTier(player)].stops[1];
  const count = defs.length;

  return (
    <figure className="stat-radar">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`Notas de ${player.name}: ${defs.map(({ label }, i) => `${label} ${values[i]}`).join(", ")}`}>
        {RINGS.map((ring) => (
          <polygon key={ring} points={radarPolygon(Array(count).fill(ring), RADIUS, CENTER)} className="stat-radar__ring" />
        ))}
        {defs.map(({ key }, index) => {
          const [x, y] = radarPoint(index, count, 100, RADIUS, CENTER);
          return <line key={key} x1={CENTER} y1={CENTER} x2={x} y2={y} className="stat-radar__ring" />;
        })}
        <polygon points={radarPolygon(values, RADIUS, CENTER)} className="stat-radar__shape" fill={color} stroke={color} />
        {defs.map(({ key, short }, index) => {
          const [x, y] = radarPoint(index, count, 100, RADIUS + 30, CENTER);
          return (
            <text key={key} x={x} y={y} textAnchor="middle" className="stat-radar__label">
              <tspan x={x} dy="-0.2em" className="stat-radar__value">
                {values[index]}
              </tspan>
              <tspan x={x} dy="1.15em">
                {short}
              </tspan>
            </text>
          );
        })}
      </svg>
    </figure>
  );
}
