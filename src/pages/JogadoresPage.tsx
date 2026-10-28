import { EmptyState, Page } from "../components/Page";

export function JogadoresPage() {
  return (
    <Page title="Jogadores" subtitle="Cartas e notas de cada um">
      <EmptyState>Nenhum jogador cadastrado ainda.</EmptyState>
    </Page>
  );
}
