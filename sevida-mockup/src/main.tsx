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
// The product tour (Version 16) keeps which screens were seen, so the tour opens only on the first visit: that one entry stays.
try {
  const tour = window.localStorage.getItem("sevida-tour-seen-v1");
  window.localStorage.clear();
  if (tour) window.localStorage.setItem("sevida-tour-seen-v1", tour);
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
