import { useEffect } from "react";
import { usePhotos } from "../data/photos";
import type { AwardKey } from "../lib/awards";
import type { Player } from "../lib/players";
import { PlayerCard } from "./PlayerCard";
import { StatRadar } from "./StatRadar";

type PlayerCardSheetProps = {
  player: Player;
  award?: AwardKey | null;
  awardMonth?: string;
  onClose: () => void;
};

// A player's card and stat chart, for any screen that lists players. Editing stays on Jogadores.
export function PlayerCardSheet({ player, award, awardMonth, onClose }: PlayerCardSheetProps) {
  const photos = usePhotos();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={player.name} onClick={(event) => event.stopPropagation()}>
        <div className="sheet__handle" aria-hidden="true" />
        <div className="player-detail">
          <div className="sheet__header">
            <h2 className="sheet__title">{player.name}</h2>
            <button type="button" className="button button--ghost" onClick={onClose}>
              Fechar
            </button>
          </div>
          <div className="player-detail__card-wrap">
            <PlayerCard player={player} size="sheet" award={award} awardMonth={awardMonth} photo={photos[player.id]} />
          </div>
          <StatRadar player={player} />
        </div>
      </div>
    </div>
  );
}
