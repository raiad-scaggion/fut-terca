import { useMemo, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { EmptyState, Page } from "../components/Page";
import { useAuth } from "../data/authContext";
import { applyImport, usePlayers } from "../data/players";
import {
  parsePlayersCsv,
  planImport,
  type ImportedPlayer,
  type ParsedCsvSheet,
} from "../lib/importCsv";

function PlanGroup({
  title,
  items,
}: {
  title: string;
  items: ImportedPlayer[];
}) {
  return (
    <details className="import-group">
      <summary className="import-group__summary">{title}</summary>
      {items.length === 0 ? (
        <p className="import-group__empty">Nenhum jogador neste grupo.</p>
      ) : (
        <ul className="import-group__list">
          {items.map((item) => (
            <li key={item.id}>{item.name}</li>
          ))}
        </ul>
      )}
    </details>
  );
}

export function ImportarJogadoresPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const { players, loading: playersLoading } = usePlayers();

  const [fileName, setFileName] = useState("");
  const [parsedSheet, setParsedSheet] = useState<ParsedCsvSheet | null>(null);
  const [parseError, setParseError] = useState("");
  const [writeError, setWriteError] = useState("");
  const [writing, setWriting] = useState(false);
  const [done, setDone] = useState(false);

  const plan = useMemo(
    () => (parsedSheet ? planImport(parsedSheet, players) : null),
    [parsedSheet, players],
  );

  if (authLoading) {
    return (
      <Page title="Importar planilha" subtitle="Sincronize os jogadores da aba players">
        <EmptyState>Carregando...</EmptyState>
      </Page>
    );
  }

  if (!isAdmin) {
    return (
      <Page title="Importar planilha" subtitle="Sincronize os jogadores da aba players">
        <EmptyState>
          <p className="import-guard__text">Só admins podem importar.</p>
          <Link to="/jogadores" className="button button--ghost button--link">
            Voltar para Jogadores
          </Link>
        </EmptyState>
      </Page>
    );
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setDone(false);
    setWriteError("");

    if (!file) {
      setFileName("");
      setParsedSheet(null);
      setParseError("");
      return;
    }

    setFileName(file.name);
    try {
      const text = await file.text();
      const parsed = parsePlayersCsv(text);
      setParsedSheet(parsed);
      setParseError("");
    } catch (err) {
      setParsedSheet(null);
      setParseError(
        err instanceof Error
          ? err.message
          : "Não deu para ler o arquivo CSV. Exporte a aba players da planilha de novo.",
      );
    }
  };

  const handleImport = async () => {
    if (!plan || writing) return;
    if (plan.create.length === 0 && plan.update.length === 0) return;

    setWriting(true);
    setWriteError("");
    try {
      await applyImport(plan);
      setDone(true);
    } catch {
      setWriteError(
        "Não deu para gravar no banco. Confira se sua conta tem permissão de admin e tente de novo.",
      );
    } finally {
      setWriting(false);
    }
  };

  const hasChanges = Boolean(
    plan && (plan.create.length > 0 || plan.update.length > 0),
  );

  return (
    <Page title="Importar planilha" subtitle="Sincronize os jogadores da aba players">
      <div className="import-header-actions">
        <Link to="/jogadores" className="button button--ghost button--link">
          ← Jogadores
        </Link>
      </div>

      <div className="import-card">
        <label className="file-picker">
          <span className="file-picker__label">Arquivo CSV da planilha</span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="file-picker__input"
          />
          {fileName && <span className="file-picker__name">{fileName}</span>}
        </label>
      </div>

      {parseError && (
        <div className="import-alert import-alert--error" role="alert">
          {parseError}
        </div>
      )}

      {plan && !playersLoading && (
        <div className="import-preview">
          <div className="import-section">
            <h2 className="import-section__title">Totais do arquivo</h2>
            <div className="import-totals-grid">
              <div className="import-total">
                <span className="import-total__val">{plan.totals.players}</span>
                <span className="import-total__label">jogadores</span>
              </div>
              <div className="import-total">
                <span className="import-total__val">{plan.totals.keepers}</span>
                <span className="import-total__label">goleiros</span>
              </div>
              <div className="import-total">
                <span className="import-total__val">{plan.totals.mensalistas}</span>
                <span className="import-total__label">mensalistas</span>
              </div>
              <div className="import-total">
                <span className="import-total__val">{plan.totals.goals}</span>
                <span className="import-total__label">gols</span>
              </div>
              <div className="import-total">
                <span className="import-total__val">{plan.totals.assists}</span>
                <span className="import-total__label">assistências</span>
              </div>
              <div className="import-total">
                <span className="import-total__val">{plan.totals.titles}</span>
                <span className="import-total__label">títulos</span>
              </div>
            </div>
          </div>

          <div className="import-section">
            <h2 className="import-section__title">Plano de importação</h2>
            <div className="import-groups">
              <PlanGroup
                title={`${plan.create.length} novos`}
                items={plan.create}
              />
              <PlanGroup
                title={`${plan.update.length} atualizados`}
                items={plan.update}
              />
              <PlanGroup
                title={`${plan.unchanged.length} sem mudança`}
                items={plan.unchanged}
              />
            </div>
          </div>

          {plan.warnings.length > 0 && (
            <div className="import-section">
              <h2 className="import-section__title">
                Avisos e mesclagens ({plan.warnings.length})
              </h2>
              <ul className="import-warnings">
                {plan.warnings.map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {writeError && (
            <div className="import-alert import-alert--error" role="alert">
              {writeError}
            </div>
          )}

          {done && (
            <div className="import-alert import-alert--success" role="status">
              <strong>Importação concluída</strong>
              <Link to="/jogadores" className="button button--primary button--link">
                Ir para Jogadores
              </Link>
            </div>
          )}

          <div className="import-actions">
            <button
              type="button"
              className="button button--primary"
              disabled={writing || !hasChanges}
              onClick={handleImport}
            >
              {writing ? "Importando..." : "Importar"}
            </button>
          </div>
        </div>
      )}
    </Page>
  );
}
