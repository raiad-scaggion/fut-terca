import { useMemo, useState } from "react";
import { EmptyState, Page } from "../components/Page";
import { useAuth } from "../data/authContext";
import { useChangeLog } from "../data/log";
import { usePlayers } from "../data/players";
import { useSessions } from "../data/sessions";
import { describeEntry, type LogEntry } from "../lib/changeLog";

function dayOf(at: number): string {
  return new Date(at).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}

function timeOf(at: number): string {
  return new Date(at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function groupByDay(entries: LogEntry[]): [string, LogEntry[]][] {
  const days = new Map<string, LogEntry[]>();
  for (const entry of entries) {
    const day = dayOf(entry.at);
    days.set(day, [...(days.get(day) ?? []), entry]);
  }
  return [...days];
}

export function HistoricoPage() {
  const { isOwner, loading: authLoading } = useAuth();

  if (authLoading) {
    return <EmptyState>Carregando...</EmptyState>;
  }
  if (!isOwner) {
    return (
      <Page title="Histórico">
        <EmptyState>Só o dono do app vê o histórico de alterações.</EmptyState>
      </Page>
    );
  }
  return <ChangeLog />;
}

function ChangeLog() {
  const { entries, loading, error } = useChangeLog();
  const { players } = usePlayers();
  const { sessions } = useSessions();
  const [playerId, setPlayerId] = useState("");

  const byId = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const touched = useMemo(() => {
    const ids = new Set(entries.flatMap((entry) => (entry.playerId ? [entry.playerId] : [])));
    return players.filter((player) => ids.has(player.id));
  }, [entries, players]);
  const shown = playerId ? entries.filter((entry) => entry.playerId === playerId) : entries;

  return (
    <Page title="Histórico" subtitle="Quem mudou o quê, do mais novo para o mais antigo">
      {touched.length > 0 && (
        <label className="form-field">
          <span className="form-field__label">Jogador</span>
          <select className="text-input" value={playerId} onChange={(event) => setPlayerId(event.target.value)}>
            <option value="">Todos</option>
            {touched.map((player) => (
              <option key={player.id} value={player.id}>
                {player.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {error ? (
        <EmptyState>{error}</EmptyState>
      ) : loading ? (
        <EmptyState>Carregando histórico...</EmptyState>
      ) : shown.length === 0 ? (
        <EmptyState>Nenhuma alteração registrada ainda. O histórico conta a partir de 4 de novembro.</EmptyState>
      ) : (
        groupByDay(shown).map(([day, items]) => (
          <section key={day} className="history">
            <h2 className="history__day">{day}</h2>
            <ul className="history__list">
              {items.map((entry) => (
                <li key={entry.id} className="history__item">
                  <span className="history__text">{describeEntry(entry, { byId, sessions })}</span>
                  <span className="history__meta">
                    {timeOf(entry.at)} · {entry.name || entry.by}
                    {entry.name && <span className="history__email"> ({entry.by})</span>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </Page>
  );
}
