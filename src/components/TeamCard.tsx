import { TEAM_SIZE } from "../lib/draw";
import { displayOvr, positionCode, type Player } from "../lib/players";

type TeamCardProps = {
  name: string;
  color: string;
  players: Player[];
  active?: boolean;
  onSelect?: () => void;
  onRemovePlayer?: (player: Player) => void;
  onPickColor?: () => void;
};

export function TeamCard({ name, color, players, active, onSelect, onRemovePlayer, onPickColor }: TeamCardProps) {
  const average = players.length
    ? Math.round(players.reduce((sum, player) => sum + displayOvr(player), 0) / players.length)
    : null;
  const emptySlots = Math.max(0, TEAM_SIZE - players.length);

  return (
    <article className={`team-card${active ? " is-active" : ""}`} style={{ boxShadow: `inset 0 3px ${color}` }}>
      <header className="team-card__header">
        {onPickColor ? (
          <button type="button" className="team-card__color" style={{ background: color }} aria-label={`Mudar a cor do ${name}`} onClick={onPickColor} />
        ) : (
          <span className="team-card__color team-card__color--static" style={{ background: color }} aria-hidden="true" />
        )}
        {onSelect ? (
          <button type="button" className="team-card__name team-card__name--button" aria-pressed={active} onClick={onSelect}>
            {name}
          </button>
        ) : (
          <span className="team-card__name">{name}</span>
        )}
        {average !== null && <span className="team-card__ovr">{average}</span>}
      </header>

      <ul className="team-card__players">
        {players.map((player) => (
          <li key={player.id} className="team-card__player">
            <span className="team-card__player-pos">{positionCode(player)}</span>
            <span className="team-card__player-name">{player.name}</span>
            {onRemovePlayer ? (
              <button type="button" className="team-card__remove" aria-label={`Tirar ${player.name} do ${name}`} onClick={() => onRemovePlayer(player)}>
                ✕
              </button>
            ) : (
              <span className="team-card__player-ovr">{displayOvr(player)}</span>
            )}
          </li>
        ))}
        {onRemovePlayer &&
          Array.from({ length: emptySlots }, (_, index) => (
            <li key={index} className="team-card__player team-card__player--empty">
              Vaga
            </li>
          ))}
      </ul>
    </article>
  );
}
