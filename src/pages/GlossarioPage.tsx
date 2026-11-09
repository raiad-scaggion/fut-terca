import { Page } from "../components/Page";
import { KEEPER_COLUMNS, LINE_COLUMNS } from "../components/rankingColumns";
import { SpecialCardsInfo } from "../components/SpecialCardsInfo";
import { KEEPER_STATS, KEEPER_WEIGHTS, LINE_STATS, LINE_WEIGHTS, type LinePosition, type StatDef } from "../lib/players";

const POSITIONS: { code: string; name: string; key?: LinePosition }[] = [
  { code: "ATA", name: "Ataque", key: "ataque" },
  { code: "MEI", name: "Meio", key: "meio" },
  { code: "DEF", name: "Defesa", key: "defesa" },
  { code: "GOL", name: "Goleiro" },
];

const percent = (weight: number) => `${Math.round(weight * 100)}%`;

function StatList({ defs }: { defs: StatDef<string>[] }) {
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

function ColumnList({ columns }: { columns: { key: string; label: string; name: string }[] }) {
  return (
    <dl className="glossary__list glossary__list--compact">
      {columns.map(({ key, label, name }) => (
        <div key={key} className="glossary__item">
          <dt className="glossary__code">{label}</dt>
          <dd>{name}</dd>
        </div>
      ))}
    </dl>
  );
}

export function GlossarioPage() {
  return (
    <Page title="Glossário" subtitle="O que quer dizer cada sigla do app.">
      <div className="glossary">
        <section className="glossary__section">
          <h2 className="draw-section__title">Notas de linha</h2>
          <p>Vão de 0 a 100.</p>
          <StatList defs={LINE_STATS} />
        </section>

        <section className="glossary__section">
          <h2 className="draw-section__title">Notas de goleiro</h2>
          <p>Também vão de 0 a 100. Goleiro tem seis notas próprias, diferentes das de linha.</p>
          <StatList defs={KEEPER_STATS} />
        </section>

        <section className="glossary__section">
          <h2 className="draw-section__title">Posições</h2>
          <dl className="glossary__list glossary__list--compact">
            {POSITIONS.map(({ code, name }) => (
              <div key={code} className="glossary__item">
                <dt className="glossary__code">{code}</dt>
                <dd>{name}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="glossary__section">
          <h2 className="draw-section__title">OVR</h2>
          <p>
            É a nota geral da carta. Sai das seis notas, e cada uma pesa diferente conforme a posição. O máximo é 99.
          </p>
          <div className="glossary__table-wrap">
            <table className="glossary__table">
              <caption>Peso de cada nota na linha</caption>
              <thead>
                <tr>
                  <th scope="col">Posição</th>
                  {LINE_STATS.map(({ key, short }) => (
                    <th key={key} scope="col">
                      {short}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {POSITIONS.filter((position) => position.key).map(({ code, key }) => (
                  <tr key={code}>
                    <th scope="row">{code}</th>
                    {LINE_STATS.map((stat) => (
                      <td key={stat.key}>{percent(LINE_WEIGHTS[key!][stat.key])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="glossary__table-wrap">
            <table className="glossary__table">
              <caption>Peso de cada nota no gol</caption>
              <thead>
                <tr>
                  <th scope="col">Posição</th>
                  {KEEPER_STATS.map(({ key, short }) => (
                    <th key={key} scope="col">
                      {short}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">GOL</th>
                  {KEEPER_STATS.map((stat) => (
                    <td key={stat.key}>{percent(KEEPER_WEIGHTS[stat.key])}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="glossary__section">
          <h2 className="draw-section__title">Cor da carta</h2>
          <dl className="glossary__list glossary__list--compact">
            <div className="glossary__item">
              <dt className="glossary__code glossary__code--gold">Ouro</dt>
              <dd>OVR 75 ou mais</dd>
            </div>
            <div className="glossary__item">
              <dt className="glossary__code glossary__code--silver">Prata</dt>
              <dd>OVR de 51 a 74</dd>
            </div>
            <div className="glossary__item">
              <dt className="glossary__code glossary__code--bronze">Bronze</dt>
              <dd>OVR 50 ou menos</dd>
            </div>
          </dl>
        </section>

        <section className="glossary__section">
          <h2 className="draw-section__title">Cartas especiais</h2>
          <SpecialCardsInfo />
        </section>

        <section className="glossary__section">
          <h2 className="draw-section__title">Legend</h2>
          <p>
            Um admin pode tornar um jogador Legend. Ele sai das listas de jogadores e do rebalanceamento, mas os números continuam no
            ranking. No sorteio, aparece quando alguém busca pelo nome.
          </p>
        </section>

        <section className="glossary__section">
          <h2 className="draw-section__title">Rebalanceamento</h2>
          <p>
            Rodada em que cada admin dá notas para todos os jogadores, menos para si mesmo, e ninguém vê as notas dos outros. O dono do app
            tira a média, manda no grupo do WhatsApp e, com o ok do pessoal, publica as notas novas nas cartas.
          </p>
        </section>

        <section className="glossary__section">
          <h2 className="draw-section__title">Ranking: tabela da linha</h2>
          <ColumnList columns={LINE_COLUMNS} />
        </section>

        <section className="glossary__section">
          <h2 className="draw-section__title">Ranking: tabela dos goleiros</h2>
          <ColumnList columns={KEEPER_COLUMNS} />
        </section>
      </div>
    </Page>
  );
}
