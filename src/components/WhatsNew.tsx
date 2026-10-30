import { useState } from "react";

const SEEN_KEY = "whats-new-seen-2.0";

const NEWS = [
  { title: "Cartas estilo FIFA", text: "com foto, bandeira e escudo do seu time." },
  { title: "Cartas especiais do mês", text: "Craque, Artilheiro, Garçom e Paredão ganham uma carta única no mês seguinte." },
  { title: "Ranking do mês", text: "além da temporada, agora com G+A e defesas." },
  { title: "Jogos e médias", text: "veja quantos jogos fez e sua média de gols, assistências e defesas." },
  { title: "Copa completa", text: "classificação após cada jogo, mata-mata e Gol de ouro na final." },
  { title: "Partida ao vivo", text: "o placar fica igual em todos os celulares, e dá para navegar com o jogo rolando." },
  { title: "Imagens para o WhatsApp", text: "os times da semana e o resumo da noite, com um toque." },
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
          Futerça 2.0
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
