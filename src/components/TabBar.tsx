import { NavLink, useLocation } from "react-router-dom";

const TABS = [
  { to: "/", label: "Início" },
  { to: "/ranking", label: "Ranking" },
  { to: "/jogadores", label: "Jogadores" },
  { to: "/sorteio", label: "Sorteio" },
  { to: "/copa", label: "Copa" },
];

export function TabBar() {
  const { pathname } = useLocation();
  // A match opens from the Copa, so that tab stays lit while one is on screen.
  const inMatch = pathname.startsWith("/partida");

  return (
    <nav className="tab-bar" aria-label="Seções">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === "/"}
          className={({ isActive }) => `tab-bar__item${isActive || (inMatch && tab.to === "/copa") ? " is-active" : ""}`}
        >
          <span className="tab-bar__label">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
