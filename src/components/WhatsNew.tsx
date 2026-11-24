import { useState } from "react";

// Each release gets a new version, so everyone sees its sheet once.
const VERSION = "2.5";
const SEEN_KEY = `whats-new-seen-${VERSION}`;

const NEWS = [
  { title: "Cronômetro automático", text: "o tempo começa a contar assim que a partida começa. Se um time não estiver pronto, é só pausar." },
  {
    title: "Fim de jogo chamativo",
    text: "no último minuto o cronômetro fica vermelho e pisca. Nos 10 segundos finais ele cresce e apita a cada segundo.",
  },
  {
    title: "Minimizar a partida",
    text: "toque na seta no alto da partida, ou arraste o placar para baixo, e veja a tabela da Copa já com o placar do jogo que está rolando.",
  },
  { title: "OVR com peso por posição", text: "cada nota pesa conforme a posição: ataque, meio ou defesa. Os pesos estão no Glossário." },
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
