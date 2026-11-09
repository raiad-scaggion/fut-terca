import { useState } from "react";

// Each release gets a new version, so everyone sees its sheet once.
const VERSION = "2.2";
const SEEN_KEY = `whats-new-seen-${VERSION}`;

const NEWS = [
  { title: "Notas de 0 a 100", text: "as cartas agora têm seis notas: VEL, FIN, PAS, DRI, DEF e FIS. DRI e FIS são novas e começam em 50." },
  { title: "Notas de goleiro", text: "goleiro ganhou seis notas próprias: PAC, PAS, SAL, MNE, POS e REF." },
  { title: "Legends", text: "quem virou Legend sai das listas e do rebalanceamento, mas continua no ranking." },
  { title: "Rebalanceamento", text: "os admins dão notas para todo mundo, sem ver as notas dos outros. A média é publicada depois do ok do grupo." },
  { title: "Glossário", text: "o que quer dizer cada sigla do app, num lugar só. Fica no fim do Início e no menu da conta." },
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
