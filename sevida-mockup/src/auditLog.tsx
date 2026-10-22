// The access log for administrators (FR-306, FR-308, NFR-06).
// Two lists: who signed in or was turned away, and which member records were opened.
// The history is made up, the same every time. New rows are added while the demo is used (sign in, sign out, switch role,
// open a member, hit a page the role cannot open) and live in the browser for the visit. The real log is written by the server.
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { DEMO_NOW, hashOf, members } from "./data";
import { useAuth } from "./auth";
import { canSeeMember, roleById, useRole } from "./roles";
import type { RoleId } from "./roles";

export type SignInEvent =
  | "Signed in"
  | "Sign-in failed"
  | "Signed out"
  | "Session expired"
  | "Access denied"
  | "Role switched (demo)"
  | "Run started again";
export type SignInOutcome = "Success" | "Failed" | "Denied";
export interface SignInEntry {
  id: string;
  at: string;
  user: string;
  role: string;
  event: SignInEvent;
  outcome: SignInOutcome;
  detail: string;
}
export type MemberScreen =
  | "Member page"
  | "Care gap page"
  | "Measure result page"
  | "Member list export";
export interface MemberAccessEntry {
  id: string;
  at: string;
  user: string;
  role: string;
  memberId: string;
  memberName: string;
  screen: MemberScreen;
  outcome: "Allowed" | "Denied";
}
interface State {
  signIns: SignInEntry[];
  memberAccess: MemberAccessEntry[];
}

/** People in the made-up history, with the demo role each one has. */
const PEOPLE: { name: string; role: RoleId }[] = [
  { name: "Dana Lee", role: "administrator" },
  { name: "Samir Patel", role: "quality" },
  { name: "Aisha Khan", role: "quality" },
  { name: "Rita Gomez", role: "care-manager" },
  { name: "Maria L. Rivera, MD", role: "clinician" },
  { name: "Tom Becker", role: "executive" },
];
const roleLabel = (id: RoleId) => roleById(id).label;

const day = (back: number, hour: number, minute: number) =>
  new Date(
    DEMO_NOW.getFullYear(),
    DEMO_NOW.getMonth(),
    DEMO_NOW.getDate() - back,
    hour,
    minute,
  ).toISOString();

/** The demo's "today" (see DEMO_NOW) with the clock time of right now, so new rows sit after the made-up history. */
const demoNow = () => {
  const t = new Date();
  return new Date(
    DEMO_NOW.getFullYear(),
    DEMO_NOW.getMonth(),
    DEMO_NOW.getDate(),
    Math.max(t.getHours(), 18),
    t.getMinutes(),
    t.getSeconds(),
  ).toISOString();
};

let counter = 0;
const nid = (p: string) => `${p}-${Date.now().toString(36)}-${++counter}`;
const pick = <T,>(xs: T[], seed: string) => xs[hashOf(seed) % xs.length];

function seed(): State {
  const signIns: SignInEntry[] = [];
  let i = 0;
  for (let back = 14; back >= 0; back--) {
    for (const p of PEOPLE) {
      const h = hashOf(`${back}-${p.name}`);
      if (h % 3 === 0) continue; // not everyone signs in every day
      const hour = 7 + (h % 9);
      const minute = (h >> 3) % 60;
      signIns.push({
        id: `s${i++}`,
        at: day(back, hour, minute),
        user: p.name,
        role: roleLabel(p.role),
        event: "Signed in",
        outcome: "Success",
        detail: "Through the partner login (Microsoft Entra ID)",
      });
      if (h % 5 === 0)
        signIns.push({
          id: `s${i++}`,
          at: day(back, hour + 3, (minute + 20) % 60),
          user: p.name,
          role: roleLabel(p.role),
          event: "Signed out",
          outcome: "Success",
          detail: "Chose Sign out",
        });
      if (h % 11 === 0)
        signIns.push({
          id: `s${i++}`,
          at: day(back, hour + 2, (minute + 40) % 60),
          user: p.name,
          role: roleLabel(p.role),
          event: "Session expired",
          outcome: "Success",
          detail: "No activity for 15 minutes",
        });
    }
  }
  const denied: [number, string, RoleId, string][] = [
    [9, "Tom Becker", "executive", "Tried to open the Members list"],
    [6, "Rita Gomez", "care-manager", "Tried to open Quality Measure Analytics"],
    [3, "Maria L. Rivera, MD", "clinician", "Tried to open a member who is not her patient"],
    [1, "Rita Gomez", "care-manager", "Tried to open the Access log"],
  ];
  for (const [back, user, role, detail] of denied)
    signIns.push({
      id: `s${i++}`,
      at: day(back, 10, 12 + back),
      user,
      role: roleLabel(role),
      event: "Access denied",
      outcome: "Denied",
      detail,
    });
  const failed: [number, string, string][] = [
    [11, "jsmith", "Unknown user name"],
    [8, "Aisha Khan", "Partner login was cancelled"],
    [5, "tessa.brandt", "Person is disabled in Sonata"],
    [2, "admin", "Wrong password"],
  ];
  for (const [back, user, detail] of failed)
    signIns.push({
      id: `s${i++}`,
      at: day(back, 8, 5 + back),
      user,
      role: "–",
      event: "Sign-in failed",
      outcome: "Failed",
      detail,
    });

  const screens: MemberScreen[] = [
    "Member page",
    "Member page",
    "Member page",
    "Care gap page",
    "Care gap page",
    "Measure result page",
  ];
  const memberAccess: MemberAccessEntry[] = [];
  let j = 0;
  for (let back = 14; back >= 0; back--) {
    for (const p of PEOPLE) {
      if (p.role === "executive") continue; // totals only: no member pages
      const def = roleById(p.role);
      const mine = members.filter((m) => canSeeMember(def, m));
      if (!mine.length) continue;
      const count = 1 + (hashOf(`${back}${p.name}`) % 3);
      for (let k = 0; k < count; k++) {
        const m = pick(mine, `${back}-${p.name}-${k}`);
        const h = hashOf(`${back}-${p.name}-${k}-t`);
        memberAccess.push({
          id: `m${j++}`,
          at: day(back, 8 + (h % 9), (h >> 4) % 60),
          user: p.name,
          role: roleLabel(p.role),
          memberId: m.id,
          memberName: m.name,
          screen: pick(screens, `${back}-${p.name}-${k}-s`),
          outcome: "Allowed",
        });
      }
    }
  }
  // One refused try, to show the column.
  const rita = roleById("care-manager");
  const outsider = members.find((m) => !canSeeMember(rita, m))!;
  memberAccess.push({
    id: `m${j++}`,
    at: day(4, 14, 22),
    user: "Rita Gomez",
    role: roleLabel("care-manager"),
    memberId: outsider.id,
    memberName: outsider.name,
    screen: "Member page",
    outcome: "Denied",
  });
  const byTime = (a: { at: string }, b: { at: string }) =>
    b.at.localeCompare(a.at);
  return {
    signIns: signIns.sort(byTime),
    memberAccess: memberAccess.sort(byTime),
  };
}

const KEY = "sonata-demo-audit-v1";
function read(): State {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as State;
  } catch {
    /* start from the made-up history */
  }
  return seed();
}
function write(s: State) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* the demo still works for this visit */
  }
}

export interface Who {
  user: string;
  role: string;
}
interface AuditValue {
  state: State;
  logSignIn: (
    who: Who,
    event: SignInEvent,
    outcome: SignInOutcome,
    detail: string,
  ) => void;
  logMember: (
    who: Who,
    memberId: string,
    screen: MemberScreen,
    outcome: "Allowed" | "Denied",
  ) => void;
}
const Ctx = createContext<AuditValue | null>(null);

export function AuditProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(read);
  const ref = useRef(state);
  const commit = useCallback((next: State) => {
    ref.current = next;
    write(next);
    setState(next);
  }, []);
  const logSignIn = useCallback<AuditValue["logSignIn"]>(
    (who, event, outcome, detail) =>
      commit({
        ...ref.current,
        signIns: [
          { id: nid("s"), at: demoNow(), ...who, event, outcome, detail },
          ...ref.current.signIns,
        ],
      }),
    [commit],
  );
  const logMember = useCallback<AuditValue["logMember"]>(
    (who, memberId, screen, outcome) =>
      commit({
        ...ref.current,
        memberAccess: [
          {
            id: nid("m"),
            at: demoNow(),
            ...who,
            memberId,
            memberName: members.find((m) => m.id === memberId)?.name ?? memberId,
            screen,
            outcome,
          },
          ...ref.current.memberAccess,
        ],
      }),
    [commit],
  );
  const value = useMemo(
    () => ({ state, logSignIn, logMember }),
    [state, logSignIn, logMember],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAudit(): AuditValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAudit must be used inside <AuditProvider>");
  return v;
}

/** The person and role that new rows are written for: whoever is signed in, as the demo role they are viewing. */
export function useWho(): Who {
  const { user } = useAuth();
  const { role } = useRole();
  return { user: role.person ?? user?.name ?? "Unknown", role: role.label };
}
