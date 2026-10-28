import { NavLink } from "react-router-dom";

const TABS = [
  { to: "/ranking", label: "Ranking", icon: "🏆" },
  { to: "/jogadores", label: "Jogadores", icon: "👥" },
  { to: "/sorteio", label: "Sorteio", icon: "🎲" },
  { to: "/copa", label: "Copa", icon: "🗓️" },
  { to: "/partida", label: "Partida", icon: "⚽" },
];

export function TabBar() {
  return (
    <nav className="tab-bar" aria-label="Seções">
      {TABS.map((tab) => (
        <NavLink key={tab.to} to={tab.to} className={({ isActive }) => `tab-bar__item${isActive ? " is-active" : ""}`}>
          <span className="tab-bar__icon" aria-hidden="true">
            {tab.icon}
          </span>
          <span className="tab-bar__label">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
