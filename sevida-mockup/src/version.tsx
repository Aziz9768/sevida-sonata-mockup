import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  useMediaQuery,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Button } from "sevida-ui";

/**
 * Versions of the mockup. Each one keeps its own look, so the team can switch between them and compare.
 * To add a version: add a row here (with its date), then read `useVersion().id` where the screens differ.
 * Never edit the behaviour of an older version: version 1 stays exactly as it was on its date.
 */
export type VersionId = 1 | 2;
export interface VersionInfo {
  id: VersionId;
  name: string;
  /** The day this version was frozen or created, as YYYY-MM-DD. */
  date: string;
  /** One line shown under the name in the dropdown. */
  summary: string;
  /** The list of changes compared with the version before it. */
  changes: string[];
}

export const VERSIONS: VersionInfo[] = [
  {
    id: 1,
    name: "Version 1",
    date: "2026-10-23",
    summary: "The mockup as it was before the member table change list.",
    changes: ["The starting point. Nothing changed."],
  },
  {
    id: 2,
    name: "Version 2",
    date: "2026-10-23",
    summary:
      "Member search column updates from the 10/22 call (Jira LPP-16069): slimmer Members list, grouped columns, a leaner sidebar.",
    changes: [
      "Members list: Insurance Number is now Subscriber ID, Sex is now Gender, Gaps is now Gap Measures, Gap Identified is now Gap Identified Date (one date for each gap measure).",
      "Members list: removed First Name, Last Name, Spoken Language, Age Group, Primary Care Provider, Care Team, Care Manager, State, County, Military Status, Closed Gaps, Evidence Date, Evidence, Diagnosis, Measure Results, Latest HbA1c, Next Appointment, Last Contact, Contact Result and Last Updated (Age Status was removed too).",
      "Members list: Race and Ethnicity are shown, with new Race Source and Ethnicity Source columns. New HEDIS Measures Eligibility column. Missing Evidence is kept as is.",
      "Members list: columns are grouped under Demographics and Care Gaps, A to Z in each group (in the table and in the Columns panel).",
      "Members list: Excluded From column removed. It moves to a new Excluded From tab on the Member page (each measure the member is excluded from and why).",
      "Member page: Diagnosis codes card on the Measures tab. HbA1c values (all of them) at the top of the Labs sub-tab. New Observation (Procedure) sub-tab under Records.",
      "Sidebar: Access Log and Analytics Option 2 are hidden, and Quality Measure Analytics is now called Analytics.",
    ],
  },
];
export const LATEST_VERSION: VersionId = 2;

const KEY = "sevida-mockup-version";
const isId = (x: unknown): x is VersionId =>
  VERSIONS.some((v) => v.id === x);

function readSaved(): VersionId {
  try {
    const n = Number(sessionStorage.getItem(KEY));
    if (isId(n)) return n;
  } catch {
    /* storage can be blocked */
  }
  return LATEST_VERSION;
}

/** Read outside React (for plain helper functions). The provider keeps it in step. */
let current: VersionId = readSaved();
export const getVersion = (): VersionId => current;

interface Ctx {
  version: VersionInfo;
  setVersion: (id: VersionId) => void;
}
const VersionContext = createContext<Ctx | null>(null);

export function VersionProvider({ children }: { children: ReactNode }) {
  const [id, setId] = useState<VersionId>(readSaved);
  current = id;
  const setVersion = useCallback((next: VersionId) => {
    current = next;
    try {
      sessionStorage.setItem(KEY, String(next));
    } catch {
      /* ignore */
    }
    setId(next);
  }, []);
  const value = useMemo<Ctx>(
    () => ({
      version: VERSIONS.find((v) => v.id === id) ?? VERSIONS[VERSIONS.length - 1],
      setVersion,
    }),
    [id, setVersion],
  );
  return (
    <VersionContext.Provider value={value}>{children}</VersionContext.Provider>
  );
}

export function useVersion(): Ctx {
  const c = useContext(VersionContext);
  if (!c) throw new Error("useVersion needs <VersionProvider>");
  return c;
}

/** 2026-10-23 -> "23 Oct 2026" */
export const fmtVersionDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

/** The Version dropdown in the header. */
export function VersionPicker() {
  const { version, setVersion } = useVersion();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const narrow = useMediaQuery("(max-width:599.95px)");
  return (
    <>
      <Tooltip title={version.summary}>
        <Button
          variant="secondary"
          aria-haspopup="menu"
          aria-label={`${version.name}, ${fmtVersionDate(version.date)}. Change version`}
          onClick={(e) => setAnchor(e.currentTarget)}
          endIcon={<ExpandMoreIcon />}
        >
          {narrow
            ? `V${version.id}`
            : `${version.name} · ${fmtVersionDate(version.date)}`}
        </Button>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        slotProps={{ paper: { sx: { minWidth: 280, maxWidth: "92vw" } } }}
      >
        {[...VERSIONS].reverse().map((v) => (
          <MenuItem
            key={v.id}
            selected={v.id === version.id}
            onClick={() => {
              setVersion(v.id);
              setAnchor(null);
            }}
          >
            <ListItemIcon>
              {v.id === version.id && <CheckIcon fontSize="small" />}
            </ListItemIcon>
            <ListItemText
              primary={`${v.name} · ${fmtVersionDate(v.date)}${v.id === LATEST_VERSION ? " (latest)" : ""}`}
              secondary={v.summary}
              slotProps={{
                secondary: { sx: { whiteSpace: "normal", maxWidth: 340 } },
              }}
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
