import { Navigate, Route, Routes } from "react-router-dom";
import { AccountButton } from "./components/AccountButton";
import { TabBar } from "./components/TabBar";
import { CopaPage } from "./pages/CopaPage";
import { JogadoresPage } from "./pages/JogadoresPage";
import { PartidaPage } from "./pages/PartidaPage";
import { RankingPage } from "./pages/RankingPage";
import { SorteioPage } from "./pages/SorteioPage";

export default function App() {
  return (
    <div className="app">
      <header className="top-bar">
        <span className="top-bar__brand">Fut de Terça</span>
        <AccountButton />
      </header>
      <main className="app__main">
        <Routes>
          <Route path="/" element={<Navigate to="/ranking" replace />} />
          <Route path="/ranking" element={<RankingPage />} />
          <Route path="/jogadores" element={<JogadoresPage />} />
          <Route path="/sorteio" element={<SorteioPage />} />
          <Route path="/copa" element={<CopaPage />} />
          <Route path="/partida" element={<PartidaPage />} />
          <Route path="*" element={<Navigate to="/ranking" replace />} />
        </Routes>
      </main>
      <TabBar />
    </div>
  );
}
