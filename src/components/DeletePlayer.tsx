import { useState } from "react";
import { deletePlayer } from "../data/players";
import type { Player } from "../lib/players";
import type { PlayerStats } from "../lib/stats";

type DeletePlayerProps = {
  player: Player;
  stats: PlayerStats;
  // null while the sessions are still loading, when it isn't safe to say the player is free.
  inSessions: boolean | null;
  onDeleted: () => void;
};

export function DeletePlayer({ player, stats, inSessions, onDeleted }: DeletePlayerProps) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  if (inSessions) {
    return <p className="delete-player__note">Este jogador já tem partidas registradas. Para tirá-lo das listas, desative em Editar.</p>;
  }

  if (!confirming) {
    return (
      <button type="button" className="button button--danger-ghost" disabled={inSessions === null} onClick={() => setConfirming(true)}>
        Excluir jogador
      </button>
    );
  }

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    try {
      await deletePlayer(player.id);
      onDeleted();
    } catch {
      setError("Não deu para excluir. Tente de novo.");
      setDeleting(false);
    }
  };

  const hasNumbers = stats.goals + stats.assists + stats.titles + stats.saves > 0;

  return (
    <div className="delete-player" role="alertdialog" aria-label={`Excluir ${player.name}`}>
      <strong>Excluir {player.name}?</strong>
      <p className="delete-player__text">
        {hasNumbers ? "Os números desse jogador somem do ranking. " : ""}
        Não dá para desfazer.
      </p>
      {error && <p className="form-error">{error}</p>}
      <div className="delete-player__actions">
        <button type="button" className="button button--ghost" disabled={deleting} onClick={() => setConfirming(false)}>
          Cancelar
        </button>
        <button type="button" className="button button--danger" disabled={deleting} onClick={handleDelete}>
          {deleting ? "Excluindo..." : "Excluir"}
        </button>
      </div>
    </div>
  );
}
