// What the monthly special cards mean. Shown on Início and Jogadores.
export function SpecialCardsInfo() {
  return (
    <>
      <p>No começo de cada mês, os melhores do mês anterior ganham uma carta especial, que vale o mês inteiro:</p>
      <ul>
        <li>
          <strong>Craque do Mês:</strong> mais gols + assistências
        </li>
        <li>
          <strong>Artilheiro:</strong> mais gols
        </li>
        <li>
          <strong>Garçom:</strong> mais assistências
        </li>
        <li>
          <strong>Paredão:</strong> mais defesas
        </li>
      </ul>
      <p>Empatou, todos ganham a carta.</p>
    </>
  );
}
