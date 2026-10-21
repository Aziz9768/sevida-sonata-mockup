import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { SevidaThemeProvider } from "sevida-ui";
import "sevida-ui/fonts.css";
import { App } from "./App";
import { AccessProvider } from "./access";
import { AuthProvider } from "./auth";
import { GapsProvider } from "./careGaps";

// Demo only: start every page load with no remembered table settings (column choices, pins, saved views).
// Sign-in and care-gap actions live in sessionStorage and are kept, so a refresh does not log you out.
try {
  window.localStorage.clear();
} catch {
  /* storage blocked: nothing to clear */
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SevidaThemeProvider>
      <AccessProvider>
        <AuthProvider>
          <GapsProvider>
            <HashRouter>
              <App />
            </HashRouter>
          </GapsProvider>
        </AuthProvider>
      </AccessProvider>
    </SevidaThemeProvider>
  </StrictMode>,
);
