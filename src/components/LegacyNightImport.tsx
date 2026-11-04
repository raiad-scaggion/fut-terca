import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { importLegacyNight, readLegacyNight } from "../data/legacyNight";
import type { Player } from "../lib/players";
import type { Session } from "../lib/session";
import { convertLegacyNight, missingLegacyPlayers, type LegacyImport } from "../lib/legacyNight";

// Temporary: brings in the night of 03/11/2026, played on the old app. Remove once it's imported.
const KEEPERS = { champion: "p23", other: "p42" };

function nightDate(createdAt: unknown): string {
  return new Date(Number(createdAt)).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
}

type Props = { players: Player[]; sessions: Session[] };

export function LegacyNightImport({ players, sessions }: Props) {
  const [night, setNight] = useState<Record<string, unknown> | null | undefined>(undefined);
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    readLegacyNight().then(setNight, () => setNight(null));
  }, []);

  const preview = useMemo(() => {
    if (!night) return null;
    const date = nightDate(night.createdAt);
    try {
      const converted: LegacyImport = convertLegacyNight(night, date, KEEPERS);
      return { date, converted, error: "" };
    } catch (err) {
      return { date, converted: null, error: err instanceof Error ? err.message : "Não deu para ler a noite." };
    }
  }, [night]);

  if (night === undefined) {
    return <p className="import-group__empty">Lendo o app antigo...</p>;
  }
  if (!night || !preview) {
    return <p className="import-group__empty">Não tem noite salva no app antigo.</p>;
  }
  if (!preview.converted) {
    return <div className="import-alert import-alert--error">{preview.error}</div>;
  }

  const { converted, date } = preview;
  const byId = new Map(players.map((player) => [player.id, player.name]));
  const newPlayers = missingLegacyPlayers(night, players);
  const alreadyImported = sessions.some((session) => session.date === date);
  const champion = (converted.session.teams as Record<string, { name: string; playerIds: string[] }>)[converted.championId];
  const names = (ids: string[]) => ids.map((id) => byId.get(id) ?? newPlayers.find((player) => player.id === id)?.name ?? id).join(", ");
  const events = Object.values(converted.session.matches ?? {}).flatMap((match) => Object.values((match.events ?? {}) as Record<string, { type: string }>));

  const handleImport = async () => {
    setWriting(true);
    setError("");
    try {
      await importLegacyNight(converted, newPlayers);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não deu para gravar no banco.");
    } finally {
      setWriting(false);
    }
  };

  return (
    <div className="import-preview">
      <ul className="import-warnings">
        <li>Data: {date.split("-").reverse().join("/")}</li>
        <li>
          Campeão: {champion.name} ({names(champion.playerIds)}) com {byId.get(KEEPERS.champion) ?? KEEPERS.champion} no gol
        </li>
        <li>
          {Object.keys(converted.session.matches ?? {}).length} jogos, {events.filter((event) => event.type === "goal").length} gols,{" "}
          {events.filter((event) => event.type === "assist").length} assistências
        </li>
        <li>Goleiros: {names([KEEPERS.champion, KEEPERS.other])}, sem defesas</li>
        {newPlayers.length > 0 && <li>Jogadores novos: {newPlayers.map((player) => player.name).join(", ")}</li>}
      </ul>

      {error && (
        <div className="import-alert import-alert--error" role="alert">
          {error}
        </div>
      )}

      {(done || alreadyImported) && (
        <div className="import-alert import-alert--success" role="status">
          <strong>{done ? "Noite importada" : "Essa noite já está no app"}</strong>
          <Link to="/copa" className="button button--primary button--link">
            Ver a copa
          </Link>
        </div>
      )}

      {!done && !alreadyImported && (
        <div className="import-actions">
          <button type="button" className="button button--primary" disabled={writing} onClick={handleImport}>
            {writing ? "Importando..." : "Importar noite"}
          </button>
        </div>
      )}
    </div>
  );
}
