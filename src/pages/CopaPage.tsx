import { EmptyState, Page } from "../components/Page";

export function CopaPage() {
  return (
    <Page title="Copa" subtitle="Fase de grupos, mata-mata e o campeão da noite">
      <EmptyState>Nenhuma copa hoje. Confirme os times no Sorteio para começar.</EmptyState>
    </Page>
  );
}
