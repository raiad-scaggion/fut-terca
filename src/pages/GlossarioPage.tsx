import { Page } from "../components/Page";
import { KEEPER_COLUMNS, LINE_COLUMNS } from "../components/rankingColumns";
import { SpecialCardsInfo } from "../components/SpecialCardsInfo";
import { StatList } from "../components/StatGlossary";
import { KEEPER_STATS, LINE_STATS } from "../lib/players";

const POSITIONS: { code: string; name: string }[] = [
  { code: "ATA", name: "Ataque" },
  { code: "MEI", name: "Meio" },
  { code: "DEF", name: "Defesa" },
  { code: "GOL", name: "Goleiro" },
];

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
          <p>É a nota geral da carta: a média das seis notas, todas com o mesmo peso. O máximo é 99.</p>
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
