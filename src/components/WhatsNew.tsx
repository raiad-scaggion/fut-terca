import { useState } from "react";

// Each release gets a new version, so everyone sees its sheet once.
const VERSION = "2.4";
const SEEN_KEY = `whats-new-seen-${VERSION}`;

const NEWS = [
  {
    title: "Noites anteriores",
    text: "a Copa agora abre qualquer noite. Se faltou marcar um gol, uma assistência ou uma defesa, um admin abre a partida e corrige.",
  },
  { title: "OVR sem peso", text: "o OVR agora é a média simples das seis notas. Todas valem o mesmo, em qualquer posição." },
  { title: "Carta de Legend nova", text: "mármore branco com detalhes em ouro, no estilo das cartas de ícone do FIFA." },
  { title: "Contagem regressiva", text: "o Início mostra quanto falta para o jogo de terça, às 20h15, até o último segundo." },
  { title: "Siglas na votação", text: "o rebalanceamento tem a lista do que é cada nota logo no topo." },
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
