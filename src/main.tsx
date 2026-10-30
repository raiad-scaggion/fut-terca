import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./data/auth";
import "@fontsource/sofia-sans/latin-400.css";
import "@fontsource/sofia-sans/latin-500.css";
import "@fontsource/sofia-sans/latin-600.css";
import "@fontsource/sofia-sans/latin-700.css";
import "@fontsource/sofia-sans-extra-condensed/latin-400.css";
import "@fontsource/sofia-sans-extra-condensed/latin-500.css";
import "@fontsource/sofia-sans-extra-condensed/latin-600.css";
import "@fontsource/sofia-sans-extra-condensed/latin-700.css";
import "./index.css";
import "./match.css";
import "./photo.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </HashRouter>
  </StrictMode>,
);
