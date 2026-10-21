// A pretend sign-in for the demo: username admin, password 123. Nothing is sent anywhere.
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export interface DemoUser { name: string; initials: string; email: string; /** The matching person in Access. Missing on older saved sign-ins, which means the local admin. */ personId?: string }

const KEY = 'sonata-demo-user';
const read = (): DemoUser | null => {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as DemoUser) : null;
  } catch {
    return null;
  }
};
const write = (u: DemoUser | null) => {
  try {
    if (u) sessionStorage.setItem(KEY, JSON.stringify(u));
    else sessionStorage.removeItem(KEY);
  } catch {
    /* the demo still works for this visit without storage */
  }
};

/** The demo's only account. */
export const DEMO_USERNAME = 'admin';
export const DEMO_PASSWORD = '123';

const demoUser = (): DemoUser => ({ name: 'Admin', initials: 'AD', email: DEMO_USERNAME, personId: 'p-admin' });

export const initialsOf = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

interface AuthValue { user: DemoUser | null; /** True after signing out, until the next sign-in. */ signedOut: boolean; signIn: (username: string, password: string) => boolean; /** Sign in as someone the partner has already confirmed (the demo's partner login). */ signInAs: (user: DemoUser) => void; signOut: () => void }
const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DemoUser | null>(read);
  const [signedOut, setSignedOut] = useState(false);
  const signIn = useCallback((username: string, password: string) => {
    if (username.trim().toLowerCase() !== DEMO_USERNAME || password !== DEMO_PASSWORD) return false;
    const u = demoUser();
    write(u);
    setUser(u);
    setSignedOut(false);
    return true;
  }, []);
  const signInAs = useCallback((u: DemoUser) => {
    write(u);
    setUser(u);
    setSignedOut(false);
  }, []);
  const signOut = useCallback(() => {
    write(null);
    setUser(null);
    setSignedOut(true);
  }, []);
  const value = useMemo(() => ({ user, signedOut, signIn, signInAs, signOut }), [user, signedOut, signIn, signInAs, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
