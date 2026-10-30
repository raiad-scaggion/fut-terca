import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { startMatch } from "../data/match";
import { matchLabel } from "../lib/cup";
import type { Player } from "../lib/players";
import type { Match, Session } from "../lib/session";

const MIN_MINUTES = 1;
const MAX_MINUTES = 60;

type StartMatchSheetProps = {
  session: Session;
  match: Match;
  byId: Map<string, Player>;
  onClose: () => void;
};

export function StartMatchSheet({ session, match, byId, onClose }: StartMatchSheetProps) {
  const navigate = useNavigate();
  const lastPlayed = [...session.matches].reverse().find((item) => item.keepers);
  const [first, second] = session.keeperIds;

  const [homeKeeper, setHomeKeeper] = useState(lastPlayed?.keepers?.home ?? first);
  const [minutes, setMinutes] = useState(Math.round((lastPlayed?.timer?.durationSec ?? match.timer?.durationSec ?? 600) / 60));
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  const home = session.teams.find((team) => team.id === match.homeId);
  const away = session.teams.find((team) => team.id === match.awayId);
  const awayKeeper = homeKeeper === first ? second : first;
  const keeperName = (id: string) => byId.get(id)?.name ?? "Goleiro";

  const handleStart = async () => {
    setStarting(true);
    setError("");
    try {
      if (await startMatch(session.id, match.id, { home: homeKeeper, away: awayKeeper }, minutes * 60)) {
        navigate("/partida");
        return;
      }
      setError("Já tem uma partida em andamento.");
    } catch {
      setError("Não deu para começar a partida. Tente de novo.");
    }
    setStarting(false);
  };

  return (
    <div className="sheet-backdrop" onClick={() => !starting && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={`Começar ${matchLabel(match)}`} onClick={(event) => event.stopPropagation()}>
        <div className="sheet__handle" aria-hidden="true" />
        <div className="sheet__header">
          <h2 className="sheet__title">{matchLabel(match)}</h2>
          <button type="button" className="button button--ghost" disabled={starting} onClick={onClose}>
            Fechar
          </button>
        </div>

        <div className="form-field">
          <span className="form-field__label">Quem defende o {home?.name}?</span>
          <div className="segmented" role="group" aria-label={`Goleiro do ${home?.name}`}>
            {session.keeperIds.map((id) => (
              <button key={id} type="button" className={`segmented__btn${homeKeeper === id ? " is-active" : ""}`} onClick={() => setHomeKeeper(id)}>
                {keeperName(id)}
              </button>
            ))}
          </div>
          <p className="draw-hint">
            {keeperName(awayKeeper)} defende o {away?.name}.
          </p>
        </div>

        <div className="form-field">
          <span className="form-field__label">Minutos de jogo</span>
          <div className="minutes-stepper">
            <button type="button" className="stepper-btn" aria-label="Menos um minuto" disabled={minutes <= MIN_MINUTES} onClick={() => setMinutes(minutes - 1)}>
              −
            </button>
            <span className="minutes-stepper__value">{minutes}</span>
            <button type="button" className="stepper-btn" aria-label="Mais um minuto" disabled={minutes >= MAX_MINUTES} onClick={() => setMinutes(minutes + 1)}>
              +
            </button>
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="sheet__actions">
          <button type="button" className="button button--primary" disabled={starting} onClick={handleStart}>
            {starting ? "Começando..." : "Começar partida"}
          </button>
        </div>
      </div>
    </div>
  );
}
