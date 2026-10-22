// Roles for the demo (FR-302 to 304, 401, 509, 706).
// In the real product the roles come from Keycloak at sign-in. Here a "View as" picker in the header
// switches the role so each one can be shown. The role list is a DRAFT: the doc proposes these five,
// Madigan has not confirmed them (open question 8).
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { careTeamOf, members, primaryCareOf } from "./data";
import type { Member } from "./data";

export type RoleId =
  "administrator" | "quality" | "care-manager" | "clinician" | "executive";
/** The keys of the sidebar items (see App.tsx). */
export type NavKey =
  | "quicksight"
  | "dashboards"
  | "members"
  | "care-gaps"
  | "measures"
  | "access-log";
/** Which members a role sees: everyone, the care manager's own caseload, the clinician's own patients, or none (totals only). */
export type MemberScope = "all" | "caseload" | "patients" | "none";

export interface RoleDef {
  id: RoleId;
  label: string;
  /** One line shown under the picker and in the tooltip. */
  purpose: string;
  menus: NavKey[];
  scope: MemberScope;
  /** Who the demo pretends to be. Only the scoped roles need one: it picks their members. */
  person?: string;
  /** Member page tabs, and kinds of record inside Records, this role does not get. */
  hiddenTabs: string[];
  /** Sees the Admin sheet: rows the loading step rejected, with member IDs. */
  dataQuality: boolean;
}

const ALL_MENUS: NavKey[] = [
  "quicksight",
  "dashboards",
  "members",
  "care-gaps",
  "measures",
];

export const roles: RoleDef[] = [
  {
    id: "administrator",
    label: "Administrator",
    purpose:
      "Everything, including who signed in and who looked at which member.",
    menus: [...ALL_MENUS, "access-log"],
    scope: "all",
    hiddenTabs: [],
    dataQuality: true,
  },
  {
    id: "quality",
    label: "Quality analyst",
    purpose: "Measure results, dashboards and every member.",
    menus: ALL_MENUS,
    scope: "all",
    hiddenTabs: [],
    dataQuality: true,
  },
  {
    id: "care-manager",
    label: "Care manager",
    purpose: "Their own caseload and its care gaps. No dashboards, no claims.",
    menus: ["members", "care-gaps"],
    scope: "caseload",
    person: "Rita Gomez",
    hiddenTabs: ["claims", "all"],
    dataQuality: false,
  },
  {
    id: "clinician",
    label: "Clinician",
    purpose:
      "Their own patients: clinical records and care gaps. No enrollment, no claims.",
    menus: ["members", "care-gaps"],
    scope: "patients",
    person: "Maria L. Rivera, MD",
    hiddenTabs: ["enrollment", "claims", "all"],
    dataQuality: false,
  },
  {
    id: "executive",
    label: "Executive",
    purpose: "Totals and rates only. No member names, lists or pages.",
    menus: ["quicksight", "dashboards", "measures"],
    scope: "none",
    hiddenTabs: [],
    dataQuality: false,
  },
];
export const roleById = (id: RoleId) => roles.find((r) => r.id === id)!;

const KEY = "sonata-demo-role";
const readRole = (): RoleId => {
  try {
    const v = sessionStorage.getItem(KEY) as RoleId | null;
    return v && roles.some((r) => r.id === v) ? v : "administrator";
  } catch {
    return "administrator";
  }
};

/** Does this role see this member? */
export const canSeeMember = (r: RoleDef, m: Member): boolean =>
  r.scope === "all"
    ? true
    : r.scope === "caseload"
      ? careTeamOf(m).manager === r.person
      : r.scope === "patients"
        ? primaryCareOf(m)?.p.name === r.person
        : false;

/** Which menu a address belongs to. null = not behind a menu (home redirect). */
export function navKeyForPath(pathname: string): NavKey | "analytics" | null {
  const [first] = pathname.split("/").filter(Boolean);
  switch (first) {
    case "members":
      return "members";
    case "care-gaps":
      return "care-gaps";
    case "measures":
      return "measures";
    case "access-log":
      return "access-log";
    case "quicksight":
      return "quicksight";
    case "dashboards":
      return "dashboards";
    case "dashboard":
      return "analytics";
    default:
      return null;
  }
}

interface RoleValue {
  role: RoleDef;
  setRole: (id: RoleId) => void;
  /** Members this role may see. */
  visible: Member[];
  canSee: (m: Member) => boolean;
  /** May open lists of members or a member page (false for the executive: totals only). */
  memberLists: boolean;
  /** May open this address? */
  canOpen: (pathname: string) => boolean;
  /** Where this role lands first. */
  home: string;
}
const Ctx = createContext<RoleValue | null>(null);

const HREF: Record<NavKey, string> = {
  quicksight: "/quicksight",
  dashboards: "/dashboards",
  members: "/members",
  "care-gaps": "/care-gaps",
  measures: "/measures",
  "access-log": "/access-log",
};

export function RoleProvider({
  children,
  initial,
}: {
  children: ReactNode;
  initial?: RoleId;
}) {
  const [id, setId] = useState<RoleId>(() => initial ?? readRole());
  const setRole = useCallback((next: RoleId) => {
    setId(next);
    try {
      sessionStorage.setItem(KEY, next);
    } catch {
      /* the demo still works for this visit without storage */
    }
  }, []);
  const value = useMemo<RoleValue>(() => {
    const role = roleById(id);
    const visible =
      role.scope === "all"
        ? members
        : members.filter((m) => canSeeMember(role, m));
    const canOpen = (pathname: string) => {
      const k = navKeyForPath(pathname);
      if (k === null) return true;
      if (k === "analytics")
        return (
          role.menus.includes("dashboards") || role.menus.includes("quicksight")
        );
      return role.menus.includes(k);
    };
    const home = role.menus.includes("members")
      ? HREF.members
      : HREF[role.menus[0]];
    return {
      role,
      setRole,
      visible,
      canSee: (m) => canSeeMember(role, m),
      memberLists: role.scope !== "none",
      canOpen,
      home,
    };
  }, [id, setRole]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRole(): RoleValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useRole must be used inside <RoleProvider>");
  return v;
}
