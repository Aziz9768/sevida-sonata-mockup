import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Box, Button, Paper, Popper, Typography } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { useVersion } from "../../version";
import { TOURS, screenFor } from "./tourSteps";
import type { TourScreen, TourStep } from "./tourSteps";

/**
 * Version 16: the product tour.
 *  - First visit to a screen: its tour opens by itself, once.
 *  - The Guide button in the top bar opens it again at any time (see GuideButton).
 *  - Every step can be skipped; Esc, the arrow keys and Enter work; focus goes back to where it was.
 *  - A step whose control is not on the screen is skipped.
 * The "seen" list is kept in this browser. A real product would keep it per user on the server, so it follows them to another computer.
 * For tests and screenshots: sessionStorage "sevida-tour" = "off" stops the automatic tour.
 */

const STORE = "sevida-tour-seen-v1";
const readSeen = (): Partial<Record<TourScreen, string>> => {
  try {
    return JSON.parse(localStorage.getItem(STORE) ?? "{}") ?? {};
  } catch {
    return {};
  }
};
const writeSeen = (s: Partial<Record<TourScreen, string>>) => {
  try {
    localStorage.setItem(STORE, JSON.stringify(s));
  } catch {
    /* storage can be blocked: the tour then shows each time, which is harmless */
  }
};
const autoOff = () => {
  try {
    return sessionStorage.getItem("sevida-tour") === "off";
  } catch {
    return false;
  }
};

const find = (step: TourStep): Element | null => {
  const el = typeof step.target === "function" ? step.target() : document.querySelector(step.target);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 ? el : null;
};

interface TourCtx {
  /** The tour of the screen that is open now, or null when this screen has none. */
  screen: TourScreen | null;
  running: boolean;
  start: () => void;
  /** Forget which tours were seen, so every screen shows its tour again on the next visit. */
  resetSeen: () => void;
  /** Where focus returns to when a tour ends if nothing better is known. */
  setReturnFocus: (el: HTMLElement | null) => void;
}
const Ctx = createContext<TourCtx>({ screen: null, running: false, start: () => {}, resetSeen: () => {}, setReturnFocus: () => {} });
export const useTour = () => useContext(Ctx);

export function TourProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { version } = useVersion();
  const on = version.id >= 16;
  const screen = on ? screenFor(pathname) : null;
  const [run, setRun] = useState<{ screen: TourScreen; steps: TourStep[]; i: number } | null>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const fallbackFocus = useRef<HTMLElement | null>(null);

  const runRef = useRef(run);
  runRef.current = run;
  const close = useCallback((markSeen = true) => {
    const r = runRef.current;
    if (r && markSeen) writeSeen({ ...readSeen(), [r.screen]: new Date().toISOString() });
    setRun(null);
    const back = returnTo.current && document.contains(returnTo.current) ? returnTo.current : fallbackFocus.current;
    returnTo.current = null;
    setTimeout(() => back?.focus?.(), 0);
  }, []);

  /** Open the tour of a screen: wait a moment for the page to draw, keep only the steps whose control is there. */
  const open = useCallback((s: TourScreen) => {
    let tries = 0;
    const attempt = () => {
      const steps = TOURS[s].steps.filter((st) => find(st));
      if (steps.length) {
        returnTo.current = (document.activeElement as HTMLElement | null) ?? null;
        setRun({ screen: s, steps: TOURS[s].steps, i: TOURS[s].steps.findIndex((st) => find(st)) });
      } else if (++tries < 12) timer = window.setTimeout(attempt, 250);
    };
    let timer = window.setTimeout(attempt, 400);
    return () => window.clearTimeout(timer);
  }, []);

  // First visit: open by itself, once per screen.
  useEffect(() => {
    if (!screen || autoOff() || readSeen()[screen]) return;
    return open(screen);
  }, [screen, open]);

  // Leaving the screen ends its tour.
  useEffect(() => {
    const r = runRef.current;
    if (r && r.screen !== screen) {
      writeSeen({ ...readSeen(), [r.screen]: new Date().toISOString() });
      setRun(null);
    }
  }, [screen]);

  const ctx = useMemo<TourCtx>(
    () => ({
      screen,
      running: !!run,
      start: () => screen && open(screen),
      resetSeen: () => writeSeen({}),
      setReturnFocus: (el) => {
        fallbackFocus.current = el;
      },
    }),
    [screen, run, open],
  );

  return (
    <Ctx.Provider value={ctx}>
      {children}
      {run && on && <TourOverlay run={run} setRun={setRun} onClose={close} />}
    </Ctx.Provider>
  );
}

function TourOverlay({
  run,
  setRun,
  onClose,
}: {
  run: { screen: TourScreen; steps: TourStep[]; i: number };
  setRun: (f: (r: { screen: TourScreen; steps: TourStep[]; i: number } | null) => { screen: TourScreen; steps: TourStep[]; i: number } | null) => void;
  onClose: (markSeen?: boolean) => void;
}) {
  const { steps, i } = run;
  const step = steps[i];
  const [rect, setRect] = useState<DOMRect | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  // The steps that can be shown right now, so Back and Next skip a control that is missing.
  const shown = steps.map((s, k) => (find(s) ? k : -1)).filter((k) => k >= 0);
  const pos = shown.indexOf(i);
  const last = pos === shown.length - 1;
  const go = useCallback(
    (to: number) => setRun((r) => (r ? { ...r, i: to } : r)),
    [setRun],
  );
  const next = () => (last ? onClose() : go(shown[pos + 1]));
  const back = () => pos > 0 && go(shown[pos - 1]);

  // Keep the highlight on the control, also when the page scrolls, resizes or shifts.
  useEffect(() => {
    const el = find(step);
    if (!el) {
      // The control went away (a filter was cleared, the page changed): move on, or end the tour.
      const after = shown.find((k) => k > i);
      if (after !== undefined) go(after);
      else onClose();
      return;
    }
    el.scrollIntoView({ block: "center", inline: "nearest" });
    const measure = () => {
      const t = find(step);
      setRect(t ? t.getBoundingClientRect() : null);
    };
    measure();
    const id = window.setInterval(measure, 200);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, step]);

  useEffect(() => {
    nextRef.current?.focus({ preventScroll: true });
  }, [i]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        back();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, pos, last]);

  const anchor = useMemo(
    () => (rect ? { getBoundingClientRect: () => rect, contextElement: undefined } : null),
    [rect],
  );
  if (!rect || !anchor || !step) return null;
  const pad = 5;

  return (
    <>
      {/* A light dim and a ring around the real control. Clicks pass through, so the page is never blocked. */}
      <Box
        aria-hidden
        sx={{
          position: "fixed",
          zIndex: 1450,
          pointerEvents: "none",
          top: rect.top - pad,
          left: rect.left - pad,
          width: rect.width + pad * 2,
          height: rect.height + pad * 2,
          borderRadius: "8px",
          border: "2px solid",
          borderColor: "secondary.main",
          boxShadow: "0 0 0 9999px rgba(20, 24, 45, 0.28)",
          transition: "top .18s, left .18s, width .18s, height .18s",
        }}
      />
      <Popper
        open
        anchorEl={anchor as unknown as HTMLElement}
        placement={step.placement ?? "bottom-start"}
        sx={{ zIndex: 1460 }}
        modifiers={[
          { name: "offset", options: { offset: [0, 14] } },
          { name: "preventOverflow", options: { padding: 12 } },
          { name: "flip", options: { padding: 12 } },
        ]}
      >
        <Paper
          role="dialog"
          aria-modal={false}
          aria-label={`Product tour, ${TOURS[run.screen].label}: ${step.title}`}
          elevation={8}
          sx={{ width: 340, maxWidth: "calc(100vw - 24px)", p: 2, borderRadius: "10px" }}
        >
          <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1, mb: 0.5 }}>
            <Typography component="h2" sx={{ fontSize: "1rem", fontWeight: 700, lineHeight: 1.35 }}>
              {step.title}
            </Typography>
            <Button
              size="small"
              onClick={() => onClose()}
              endIcon={<CloseRoundedIcon fontSize="small" />}
              sx={{ flexShrink: 0, minWidth: 0, mt: -0.5, mr: -1, textTransform: "none", color: "text.secondary", fontWeight: 400 }}
            >
              Skip tour
            </Button>
          </Box>
          <Typography sx={{ fontSize: ".9375rem", color: "text.primary", mb: 2 }}>{step.body}</Typography>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography aria-live="polite" sx={{ fontSize: ".8125rem", color: "text.secondary" }}>
              {pos + 1} of {shown.length}
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              {pos > 0 && (
                <Button size="small" variant="outlined" onClick={back}>
                  Back
                </Button>
              )}
              <Button ref={nextRef} size="small" variant="contained" onClick={next}>
                {last ? "Done" : "Next"}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Popper>
    </>
  );
}
