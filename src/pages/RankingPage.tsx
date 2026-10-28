import { EmptyState, Page } from "../components/Page";

export function RankingPage() {
  return (
    <Page title="Ranking" subtitle="Gols, assistências, defesas e títulos da temporada">
      <EmptyState>As estatísticas aparecem aqui depois que a planilha for importada.</EmptyState>
    </Page>
  );
}
