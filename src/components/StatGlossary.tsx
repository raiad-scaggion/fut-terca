import { KEEPER_STATS, LINE_STATS, type StatDef } from "../lib/players";

export function StatList({ defs }: { defs: StatDef<string>[] }) {
  return (
    <dl className="glossary__list">
      {defs.map(({ key, short, label, hint }) => (
        <div key={key} className="glossary__item">
          <dt>
            <span className="glossary__code">{short}</span> {label}
          </dt>
          <dd>{hint}</dd>
        </div>
      ))}
    </dl>
  );
}

// Collapsible list of every stat, shown on top of the Rebalanceamento so admins can check it while voting.
export function StatGlossary() {
  return (
    <details className="stat-glossary">
      <summary className="stat-glossary__summary">O que é cada nota?</summary>
      <div className="stat-glossary__body">
        <h2 className="stat-glossary__title">Jogador de linha</h2>
        <StatList defs={LINE_STATS} />
        <h2 className="stat-glossary__title">Goleiro</h2>
        <StatList defs={KEEPER_STATS} />
      </div>
    </details>
  );
}
