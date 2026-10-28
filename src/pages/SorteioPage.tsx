import { EmptyState, Page } from "../components/Page";

export function SorteioPage() {
  return (
    <Page title="Sorteio" subtitle="Quem joga hoje e como ficam os times">
      <EmptyState>Escolha os 16 jogadores de linha e os 2 goleiros para montar os times.</EmptyState>
    </Page>
  );
}
