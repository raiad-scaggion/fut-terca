import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ExportImage } from "../components/ExportImage";
import { EmptyState, Page } from "../components/Page";
import { StatInputs } from "../components/StatInputs";
import { useAuth } from "../data/authContext";
import { usePlayers } from "../data/players";
import {
  openRound,
  publishRebalance,
  saveVote,
  sendVotes,
  setAdminPlayer,
  useMyRebalance,
  useOwnerRebalance,
  useRebalanceRules,
  useRound,
} from "../data/rebalance";
import { renderRebalanceImage } from "../exports/rebalanceImage";
import { dayLabel } from "../lib/nightSummary";
import { cardTier, isStatText, positionCode, statText, type Player, type StatText } from "../lib/players";
import {
  adminProgress,
  computeAverages,
  exportText,
  averageLine,
  isCompleteVote,
  ovrWith,
  playersToRate,
  publishedCount,
  roleDefs,
  startingValues,
  type Average,
  type Round,
  type VotesByPlayer,
} from "../lib/rebalance";

const SAVE_ERROR = "Não deu para salvar. Tente de novo.";

function dateOf(ms: number | undefined): string {
  return ms ? dayLabel(new Date(ms)) : "";
}

type RateSheetProps = {
  player: Player;
  voteKey: string;
  votes: VotesByPlayer;
  onClose: () => void;
};

function RateSheet({ player, voteKey, votes, onClose }: RateSheetProps) {
  const defs = roleDefs(player);
  const [text, setText] = useState<StatText>(() => statText(startingValues(player, votes[player.id])));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const valid = defs.every(({ key }) => isStatText(text[key]));
  const values = Object.fromEntries(defs.map(({ key }) => [key, Number(text[key])]));
  const ovr = valid ? ovrWith(player, values) : null;

  const handleSave = async () => {
    if (!valid) {
      setError("Cada nota precisa ser um número inteiro de 0 a 100.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await saveVote(voteKey, player.id, values);
      onClose();
    } catch {
      setError(SAVE_ERROR);
      setSaving(false);
    }
  };

  return (
    <div className="sheet-backdrop" onClick={saving ? undefined : onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={`Avaliar ${player.name}`} onClick={(event) => event.stopPropagation()}>
        <div className="sheet__handle" aria-hidden="true" />
        <div className="sheet__header">
          <h2 className="sheet__title">Avaliar {player.name}</h2>
          <button type="button" className="button button--ghost" onClick={onClose} disabled={saving}>
            Fechar
          </button>
        </div>
        <div className={`ovr-preview ovr-preview--${ovr === null ? "bronze" : cardTier(ovr)}`} aria-live="polite">
          <div className="ovr-preview__score">
            <span className="ovr-preview__value">{ovr ?? "?"}</span>
            <span className="ovr-preview__pos">{positionCode(player)}</span>
          </div>
          <div className="ovr-preview__meta">
            <strong>{player.name}</strong>
            <span>OVR com as suas notas</span>
          </div>
        </div>
        <p className="rebalance-sheet__hint">
          {isCompleteVote(player, votes[player.id])
            ? "Essas são as notas que você salvou."
            : "Começa com as notas atuais. Mude o que achar justo."}{" "}
          Só você vê as notas que deu.
        </p>
        <StatInputs defs={defs} values={text} onChange={(key, value) => setText({ ...text, [key]: value })} disabled={saving} />
        {error && <p className="form-error">{error}</p>}
        <div className="sheet__actions">
          <button type="button" className="button button--ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="button" className="button button--primary" onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

type VotingProps = {
  players: Player[];
  voteKey: string;
  ownPlayerId: string;
  votes: VotesByPlayer;
  sent: number | null;
};

function Voting({ players, voteKey, ownPlayerId, votes, sent }: VotingProps) {
  const [rating, setRating] = useState<Player | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const list = useMemo(() => playersToRate(players, ownPlayerId), [players, ownPlayerId]);
  const progress = adminProgress(players, ownPlayerId, votes);
  const groups = [
    { title: "Linha", items: list.filter((player) => player.role !== "keeper") },
    { title: "Goleiros", items: list.filter((player) => player.role === "keeper") },
  ].filter((group) => group.items.length);

  const handleSend = async () => {
    setSending(true);
    setError("");
    try {
      await sendVotes(voteKey);
    } catch {
      setError(SAVE_ERROR);
    }
    setSending(false);
  };

  return (
    <>
      <div className="rebalance-progress" aria-live="polite">
        <strong className="rebalance-progress__count">
          {progress.done}/{progress.total}
        </strong>
        <span>
          {progress.remaining === 0
            ? sent
              ? "Avaliações enviadas. Dá para mudar qualquer nota até a publicação."
              : "Você avaliou todo mundo. Agora é só enviar."
            : `Faltam ${progress.remaining} ${progress.remaining === 1 ? "jogador" : "jogadores"}.`}
        </span>
      </div>
      {progress.remaining === 0 && !sent && (
        <button type="button" className="button button--primary rebalance-send" onClick={handleSend} disabled={sending}>
          {sending ? "Enviando..." : "Enviar avaliações"}
        </button>
      )}
      {error && <p className="form-error">{error}</p>}

      {groups.map((group) => (
        <section key={group.title} className="draw-section">
          <h2 className="draw-section__title">{group.title}</h2>
          <div className="rebalance-grid">
            {group.items.map((player) => {
              const done = isCompleteVote(player, votes[player.id]);
              return (
                <button key={player.id} type="button" className={`rebalance-tile${done ? " is-done" : ""}`} onClick={() => setRating(player)}>
                  <span className="rebalance-tile__name">{player.name}</span>
                  <span className="rebalance-tile__meta">
                    {positionCode(player)} · {done ? "Avaliado" : "Falta"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {rating && <RateSheet key={rating.id} player={rating} voteKey={voteKey} votes={votes} onClose={() => setRating(null)} />}
    </>
  );
}

function shownEmail(key: string): string {
  return key.split(",").join(".");
}

type OwnerPanelProps = { players: Player[]; round: Round };

function OwnerPanel({ players, round }: OwnerPanelProps) {
  const { admins, adminPlayers, votes, sent } = useOwnerRebalance(true);
  const [averages, setAverages] = useState<Average[] | null>(null);
  const [confirm, setConfirm] = useState<"publish" | "open" | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const byId = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const linkable = useMemo(() => [...players].filter((player) => !player.legend).sort((a, b) => a.name.localeCompare(b.name)), [players]);

  if (admins.loading || adminPlayers.loading || votes.loading) {
    return <EmptyState>Carregando o painel...</EmptyState>;
  }
  if (admins.error || votes.error) {
    return <EmptyState>Não deu para ler os votos. Confira se as regras novas do banco já estão ativas.</EmptyState>;
  }

  const text = averages ? exportText(averages) : "";
  const closed = round.status === "closed";

  const run = async (action: () => Promise<void>, after?: () => void) => {
    setSaving(true);
    setError("");
    try {
      await action();
      after?.();
      setConfirm(null);
    } catch {
      setError(SAVE_ERROR);
    }
    setSaving(false);
  };

  const handleLink = (key: string, playerId: string) => run(() => setAdminPlayer(key, playerId || null));

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
      setError("Não deu para copiar. Selecione o texto abaixo e copie na mão.");
    }
  };

  return (
    <section className="rebalance-owner">
      <h2 className="draw-section__title">Painel do dono</h2>
      <p className="rebalance-owner__status">
        {closed
          ? `Rodada publicada em ${dateOf(round.publishedAt)}.`
          : `Rodada aberta${round.openedAt ? ` desde ${dateOf(round.openedAt)}` : ""}.`}
      </p>

      <ul className="rebalance-admins">
        {admins.value.map((key) => {
          const ownId = adminPlayers.value[key] ?? null;
          const progress = adminProgress(players, ownId, votes.value[key] ?? {});
          return (
            <li key={key} className="rebalance-admin">
              <div className="rebalance-admin__who">
                <strong>{(ownId && byId.get(ownId)?.name) || "Sem jogador"}</strong>
                <span className="rebalance-admin__email">{shownEmail(key)}</span>
              </div>
              <span className={`rebalance-admin__count${sent.value[key] ? " is-sent" : ""}`}>
                {progress.done}/{progress.total}
                {sent.value[key] ? " · Enviou" : ""}
              </span>
              <select
                className="rebalance-admin__link"
                aria-label={`Jogador de ${shownEmail(key)}`}
                value={ownId ?? ""}
                disabled={saving}
                onChange={(event) => handleLink(key, event.target.value)}
              >
                <option value="">Sem jogador</option>
                {linkable.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
              </select>
            </li>
          );
        })}
      </ul>

      {!closed && (
        <button type="button" className="button button--primary" onClick={() => setAverages(computeAverages(players, votes.value, adminPlayers.value))}>
          {averages ? "Calcular de novo" : "Calcular médias"}
        </button>
      )}

      {averages && !closed && (
        <div className="rebalance-result">
          <ul className="rebalance-result__list">
            {averages.map((average) => (
              <li key={average.player.id} className={average.votes === 0 ? "is-empty" : undefined}>
                {averageLine(average)} <span className="rebalance-result__votes">({average.votes} {average.votes === 1 ? "voto" : "votos"})</span>
              </li>
            ))}
          </ul>
          <div className="export-actions">
            <button type="button" className="button button--ghost" onClick={handleCopy}>
              {copied ? "Copiado" : "Copiar texto"}
            </button>
            <ExportImage
              label="Baixar imagem"
              title="Rebalanceamento"
              fileName="rebalanceamento.png"
              render={(photo) => renderRebalanceImage(averages, photo)}
            />
          </div>
          <textarea className="rebalance-result__text" readOnly value={text} rows={6} aria-label="Texto para o WhatsApp" />

          {confirm === "publish" ? (
            <div className="delete-player" role="alertdialog" aria-label="Publicar">
              <strong>Publicar as notas de {publishedCount(averages)} jogadores?</strong>
              <p className="delete-player__text">As notas novas entram nas cartas na hora e a rodada fecha. Quem não recebeu voto fica como está.</p>
              <div className="delete-player__actions">
                <button type="button" className="button button--ghost" disabled={saving} onClick={() => setConfirm(null)}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="button button--primary"
                  disabled={saving}
                  onClick={() => run(() => publishRebalance(averages, round), () => setAverages(null))}
                >
                  {saving ? "Publicando..." : "Publicar"}
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="button button--primary" disabled={publishedCount(averages) === 0} onClick={() => setConfirm("publish")}>
              Publicar
            </button>
          )}
        </div>
      )}

      {closed &&
        (confirm === "open" ? (
          <div className="delete-player" role="alertdialog" aria-label="Abrir rebalanceamento">
            <strong>Abrir um novo rebalanceamento?</strong>
            <p className="delete-player__text">Os votos da rodada anterior são apagados e todos os admins começam do zero.</p>
            <div className="delete-player__actions">
              <button type="button" className="button button--ghost" disabled={saving} onClick={() => setConfirm(null)}>
                Cancelar
              </button>
              <button type="button" className="button button--primary" disabled={saving} onClick={() => run(openRound)}>
                {saving ? "Abrindo..." : "Abrir"}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="button button--primary" onClick={() => setConfirm("open")}>
            Abrir rebalanceamento
          </button>
        ))}

      {error && <p className="form-error">{error}</p>}
    </section>
  );
}

export function RebalanceamentoPage() {
  const { user, isAdmin, isOwner, loading: authLoading } = useAuth();
  const rules = useRebalanceRules();
  const ready = isAdmin && rules === "ready";
  const { players, loading: playersLoading, error: playersError } = usePlayers();
  const round = useRound(ready);
  const mine = useMyRebalance(ready ? user?.email ?? null : null);

  const info = (
    <p className="page__subtitle">
      Cada admin dá notas para todo mundo, menos para si mesmo. Ninguém vê as notas dos outros. No fim, o dono do app tira a média, manda no
      grupo e publica. As siglas estão no <Link to="/glossario">Glossário</Link>.
    </p>
  );

  const body = () => {
    if (authLoading || rules === "checking") {
      return <EmptyState>Carregando...</EmptyState>;
    }
    if (!isAdmin) {
      return <EmptyState>Essa página é só para os admins.</EmptyState>;
    }
    if (rules === "missing") {
      return <EmptyState>O rebalanceamento abre assim que as regras novas do banco estiverem ativas. Fale com o dono do app.</EmptyState>;
    }
    if (playersError) {
      return <EmptyState>{playersError}</EmptyState>;
    }
    if (playersLoading || round.loading || mine.ownPlayer.loading || mine.votes.loading || mine.sent.loading) {
      return <EmptyState>Carregando...</EmptyState>;
    }

    const closed = round.value.status === "closed";
    return (
      <>
        {closed ? (
          <EmptyState>
            O último rebalanceamento foi publicado em {dateOf(round.value.publishedAt)}. As notas novas já estão nas cartas.
          </EmptyState>
        ) : !mine.ownPlayer.value ? (
          <EmptyState>Seu e-mail ainda não está ligado ao seu jogador. Peça para o dono do app fazer isso, aí a votação libera.</EmptyState>
        ) : (
          <Voting players={players} voteKey={mine.key!} ownPlayerId={mine.ownPlayer.value} votes={mine.votes.value} sent={mine.sent.value} />
        )}
        {isOwner && <OwnerPanel players={players} round={round.value} />}
      </>
    );
  };

  return (
    <Page title="Rebalanceamento">
      {info}
      {body()}
    </Page>
  );
}
