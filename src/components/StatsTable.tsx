import { useState } from "react";
import type { Player } from "../lib/players";
import { formatAverage } from "../lib/stats";
import { sortTable } from "../lib/table";

export type StatsColumn<T> = {
  key: string;
  label: string;
  name: string;
  value: (row: T) => number | null;
  average?: boolean;
};

type StatsTableProps<T> = {
  label: string;
  rows: T[];
  columns: StatsColumn<T>[];
  defaultSort: string;
};

function format(value: number | null, average?: boolean): string {
  if (value === null) {
    return "-";
  }
  return average ? formatAverage(value) : String(value);
}

// The name column stays put while the numbers scroll sideways. Tapping a header sorts by it.
export function StatsTable<T extends { player: Player }>({ label, rows, columns, defaultSort }: StatsTableProps<T>) {
  const [sortKey, setSortKey] = useState(defaultSort);
  const column = columns.find((item) => item.key === sortKey) ?? columns[0];
  const sorted = sortTable(rows, column.value);

  return (
    <div className="stats-table" role="region" aria-label={label} tabIndex={0}>
      <table>
        <thead>
          <tr>
            <th scope="col" className="stats-table__name">
              Jogador
            </th>
            {columns.map((item) => (
              <th key={item.key} scope="col" aria-sort={item.key === column.key ? "descending" : undefined}>
                <button
                  type="button"
                  className={`stats-table__sort${item.key === column.key ? " is-active" : ""}`}
                  title={item.name}
                  aria-label={`Ordenar por ${item.name}`}
                  onClick={() => setSortKey(item.key)}
                >
                  {item.label}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, index) => (
            <tr key={row.player.id}>
              <th scope="row" className="stats-table__name">
                <span className="stats-table__pos">{index + 1}</span>
                {row.player.name}
              </th>
              {columns.map((item) => (
                <td key={item.key} className={item.key === column.key ? "is-active" : undefined}>
                  {format(item.value(row), item.average)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StatsLegend({ columns }: { columns: Pick<StatsColumn<never>, "key" | "label" | "name">[] }) {
  return (
    <dl className="stats-legend">
      {columns.map((item) => (
        <div key={item.key} className="stats-legend__item">
          <dt>{item.label}</dt>
          <dd>{item.name}</dd>
        </div>
      ))}
    </dl>
  );
}
