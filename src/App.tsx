import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AccountButton } from "./components/AccountButton";
import { CardArtDefs } from "./components/cardArt";
import { LiveBar } from "./components/LiveBar";
import { EmptyState } from "./components/Page";
import { TabBar } from "./components/TabBar";
import { RankingPage } from "./pages/RankingPage";

const RELOAD_KEY = "reloaded-for-new-version";

// A deploy removes the old page files, and a phone with the app still open asks for those names on
// the next tap. One reload picks up the new version instead of leaving a blank screen.
function loadPage<T>(load: () => Promise<T>): Promise<T> {
  return load()
    .then((page) => {
      sessionStorage.removeItem(RELOAD_KEY);
      return page;
    })
    .catch((error: unknown) => {
      if (sessionStorage.getItem(RELOAD_KEY)) {
        throw error;
      }
      sessionStorage.setItem(RELOAD_KEY, "1");
      window.location.reload();
      return new Promise<T>(() => undefined);
    });
}

const CopaPage = lazy(() => loadPage(() => import("./pages/CopaPage")).then((module) => ({ default: module.CopaPage })));
const ImportarJogadoresPage = lazy(() =>
  loadPage(() => import("./pages/ImportarJogadoresPage")).then((module) => ({ default: module.ImportarJogadoresPage })),
);
const JogadoresPage = lazy(() =>
  loadPage(() => import("./pages/JogadoresPage")).then((module) => ({ default: module.JogadoresPage })),
);
const PartidaPage = lazy(() => loadPage(() => import("./pages/PartidaPage")).then((module) => ({ default: module.PartidaPage })));
const SorteioPage = lazy(() => loadPage(() => import("./pages/SorteioPage")).then((module) => ({ default: module.SorteioPage })));

export default function App() {
  return (
    <div className="app">
      <CardArtDefs />
      <header className="top-bar">
        <span className="top-bar__brand">Fut de Terça</span>
        <AccountButton />
      </header>
      <main className="app__main">
        <Suspense fallback={<EmptyState>Carregando...</EmptyState>}>
          <Routes>
            <Route path="/" element={<Navigate to="/ranking" replace />} />
            <Route path="/ranking" element={<RankingPage />} />
            <Route path="/jogadores" element={<JogadoresPage />} />
            <Route path="/jogadores/importar" element={<ImportarJogadoresPage />} />
            <Route path="/sorteio" element={<SorteioPage />} />
            <Route path="/copa" element={<CopaPage />} />
            <Route path="/partida" element={<PartidaPage />} />
            <Route path="/partida/:sessionId/:matchId" element={<PartidaPage />} />
            <Route path="*" element={<Navigate to="/ranking" replace />} />
          </Routes>
        </Suspense>
      </main>
      <LiveBar />
      <TabBar />
    </div>
  );
}
