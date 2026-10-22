// Idle sessions expire (FR-307). After SESSION_IDLE_MINUTES with no mouse, key, scroll or touch the person is signed out and
// sees a "Your session expired" page. Signing in again brings them back to the page they were on.
// In real life Keycloak ends the session; the length is its setting, not ours. "Expire session now" in the View As menu is a demo shortcut.
import { useCallback, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "./auth";
import { useAudit, useWho } from "./auditLog";

/** The idle limit. A setting in the real product. */
export const SESSION_IDLE_MINUTES = 15;

const RETURN_KEY = "sonata-demo-return";
export const readReturnPath = (): string | null => {
  try {
    return sessionStorage.getItem(RETURN_KEY);
  } catch {
    return null;
  }
};
export const clearReturnPath = () => {
  try {
    sessionStorage.removeItem(RETURN_KEY);
  } catch {
    /* nothing to clear */
  }
};

/** Ends the session and shows the Session Expired page. */
export function useExpireSession() {
  const { signOut } = useAuth();
  const { logSignIn } = useAudit();
  const who = useWho();
  const { pathname, search } = useLocation();
  return useCallback(() => {
    try {
      sessionStorage.setItem(RETURN_KEY, `${pathname}${search}`);
    } catch {
      /* the person simply lands on the home page after signing in */
    }
    logSignIn(
      who,
      "Session expired",
      "Success",
      `No activity for ${SESSION_IDLE_MINUTES} minutes`,
    );
    // Signing out sends the app to the Session Expired page: a saved return path means "expired".
    signOut();
  }, [pathname, search, logSignIn, who, signOut]);
}

/** Watches for activity. Put it once inside the signed-in app. */
export function IdleWatcher() {
  const expire = useExpireSession();
  const expireRef = useRef(expire);
  expireRef.current = expire;
  useEffect(() => {
    let last = Date.now();
    const touch = () => {
      last = Date.now();
    };
    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    const timer = window.setInterval(() => {
      if (Date.now() - last >= SESSION_IDLE_MINUTES * 60_000)
        expireRef.current();
    }, 5000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, touch));
      window.clearInterval(timer);
    };
  }, []);
  return null;
}
