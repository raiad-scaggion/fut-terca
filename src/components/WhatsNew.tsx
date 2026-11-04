import { useState } from "react";

// Each release gets a new version, so everyone sees its sheet once.
const VERSION = "2.1";
const SEEN_KEY = `whats-new-seen-${VERSION}`;

const NEWS = [
  { title: "Tabela no Ranking", text: "todos os números numa tabela só, uma para a linha e outra para os goleiros. Toque no título da coluna para ordenar." },
  { title: "Médias por noite", text: "gols, assistências e títulos por noite, contando a partir de 03/11." },
  { title: "Gol contra", text: "conta para o outro time e não tira gol de ninguém." },
  { title: "Frango", text: "agora fica registrado quando o goleiro deixa passar um gol fácil." },
  { title: "Qualquer um no gol", text: "dá para escalar um jogador de linha no gol, ou um goleiro na linha." },
  { title: "A noite de 03/11", text: "já conta nos gols, assistências, títulos e no ranking de novembro." },
  { title: "Botão i", text: "toque para entender as colunas, o OVR, as cartas especiais e o desempate da Copa." },
];

// A browser that blocks storage would show this on every visit, so it counts as already seen.
function hasSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) !== null;
  } catch {
    return true;
  }
}

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Nothing to do: the sheet just closes for this visit.
  }
}

export function WhatsNew() {
  const [open, setOpen] = useState(() => !hasSeen());

  if (!open) {
    return null;
  }

  const close = () => {
    markSeen();
    setOpen(false);
  };

  return (
    <div className="sheet-backdrop" onClick={close}>
      <div className="sheet whats-new" role="dialog" aria-modal="true" aria-labelledby="whats-new-title" onClick={(event) => event.stopPropagation()}>
        <div className="sheet__handle" aria-hidden="true" />
        <h2 id="whats-new-title" className="whats-new__title">
          Futerça {VERSION}
        </h2>
        <p className="whats-new__subtitle">Novidades do app</p>
        <ul className="whats-new__list">
          {NEWS.map((item) => (
            <li key={item.title}>
              <strong>{item.title}:</strong> {item.text}
            </li>
          ))}
        </ul>
        <div className="sheet__actions">
          <button type="button" className="button button--primary" onClick={close}>
            Bora jogar
          </button>
        </div>
      </div>
    </div>
  );
}
