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
export type VersionId = 1 | 2 | 3 | 4 | 5 | 6;
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
  {
    id: 3,
    name: "Version 3",
    date: "2026-10-25",
    summary:
      "Built strictly from the final requirements sheet: Care Gaps first, a slim Members list, new Member page tabs, Analytics split by measure.",
    changes: [
      "Follows the final Google Sheet row by row. Anything the sheet does not mention is removed. The details are in Sevida-V3-gap-analysis.xlsx.",
      "Sidebar: Analytics (Overview, BCS, CCS, COL, GSD, WCV), then Care Gaps, then Members. Care Gaps opens first.",
      "Members list: Member Name, Tricare ID, Age, Gender, Gap Name(s) (the sheet says Open Gap(s), renamed because it read the same as # Open Gaps), # Open Gaps, Gap Identified Date. Other fields are in the Columns panel or only in filters. Age shows days, months or years. Age Min / Age Max filters, a fixed Age Range filter, and four demo young children.",
      "Member page: the header follows the sheet's wireframe (name, DOB, Tricare ID, Tricare Enrollment, Age, Genesis EHR ID with See all IDs, Military Status, Open Care Gaps, Gap Data Last Updated, and an Expand block with addresses, phone, email, marital status, race and ethnicity). The same header is on the Care Gap page. Care Gaps first, then Claims, Diagnoses, Labs, Observations, Procedures, Providers and Visits. Every member has records in every tab (the files' records plus routine demo records). The Care Gaps tab lists each gap with its identified and closed dates and explanations.",
      "Care Gaps list: one row per gap with a Gap Status filter (Open by default), # Open Gaps, Missing Evidence, Due Date, and the member list filters. Genesis EHR ID is a hidden column on Members and Care Gaps (sample data). Every displayed column sorts, except Actions.",
      "Care Gap page: Overview (why the gap is open, who is considered, what is left, due date) and Evidence (records found in the files). No actions, follow-up, history or closing.",
      "Measure rules: breast screening starts at 52 and also excludes a one-sided mastectomy, gender-affirming chest surgery, and age 66+ in an I-SNP or long-term institution. Cervical screening counts a high-risk HPV test and excludes palliative care. Colorectal screening excludes age 66+ in an I-SNP or long-term institution. Diabetes blood sugar uses the lowest final HbA1c. These change the Version 3 numbers only.",
      "Dashboards: Overview has a Gap in more than one measure filter. The period shows year to date. Trend range is picked per granularity. GSD shows total, over 8% and over 9%. Gender and # Open Gaps replace Sex and Open care gaps. Requirement tags are hidden.",
      "Admin: Rejected Rows by Reason, the Succeeded on retry and Failed on retry file load statuses, and a Nightly Run History Trend.",
      "Filters: Members, Care Gaps and the dashboards share the same facets and values (Gender, Age Range, Age Min / Max, Military Status with nine values, Race and Ethnicity with None, # Open Gaps with an operator). Every member has a military status.",
      "Consistency pass: the dashboards use the same names as the lists (BCS - Breast Cancer Screening, Date of Birth, Military Status, Age Range, Gender, # Open Gaps, Tricare ID search). Dashboard member counts, # Open Gaps and the Care Gaps list agree. The Care Gaps tab on a member lists earlier years with the status of the same gap this year.",
      "Not built: the 31 sheet rows marked Later (including the long Claims field list), and rows that are open questions or platform checks (listed in the gap analysis).",
    ],
  },
  {
    id: 4,
    name: "Version 4",
    date: "2026-10-26",
    summary:
      "Version 3 with Missing Evidence renamed to Recommended Actions, the Profile tab back on the Member page, and Closed Gaps / Gap Closed On columns.",
    changes: [
      "Everything else is the same as Version 3.",
      "Care Gaps list and Care Gap page: the Missing Evidence column / field is now called Recommended Actions (in the table, the Columns panel and the Care Gap Summary). The values are unchanged.",
      "Member page: the Profile tab is back as a sub tab (contact information, primary care provider, language, disability, race and ethnicity detail). It sits right after Care Gaps. Care Gaps is still the tab that opens first.",
      "Care Gaps list: Gap Status (Open / Closed) is now a column, shown by default right after Open Gap, as well as a filter. In Version 3 it was a filter only.",
      "Member header (Member page and Care Gap page): the original look is back (name, date of birth and enrollment chip on top, small-capital labels over values, a boxed expand button), with the sheet's fields: Tricare ID, Age, Genesis EHR ID with See all IDs, Military Status, Open Care Gaps, Gap Data Last Updated, and the address block when expanded.",
      "Care Gap page: the member name in the header is a link to the Member page.",
      "Care Gaps list: the gap name is a link that opens that care gap's page.",
      "Members list: new Closed Gaps column (the measures already closed, as chips). Gap Closed Date is now called Gap Closed On, on the Members list (column and date filter) and the Care Gaps list. Both are in the Columns panel, hidden by default.",
    ],
  },
  {
    id: 5,
    name: "Version 5",
    date: "2026-10-30",
    summary:
      "Version 4 with Analytics redesigned from the UX report: a scorecard Overview, one frame for every dashboard, 12 demo dashboards in 3 groups.",
    changes: [
      "Everything outside Analytics is the same as Version 4. Versions 1 to 4 keep their own Analytics pages.",
      "Sidebar: Analytics has Overview plus one entry per group (Preventive Screening, Chronic Condition Care, Child and Adolescent Health). The dashboards of a group are tabs inside it. The groups and tabs are drawn from one list in the code (analyticsRegistry.ts), so a new dashboard or a new group is one new row.",
      "Overview is a scorecard: one row per dashboard with the result, members counted (n), whether higher or lower is better, the change since last year (in words and an arrow), the benchmark, the status (a word and an icon, never colour alone) and the last updated date. Sortable, searchable and filterable, with a group level on top and the furthest-from-benchmark measure named in the first card.",
      "Every dashboard has the same frame in the same order: title once, one sentence with the age range, last updated, group tabs, one filter row (Age Range, Gap Status, Gender, Measurement Year, A to Z, same names as the app, working at once), a line that says which filters are on with one Reset, summary tiles, charts, member list.",
      "Every percentage shows its group size (n). Groups under 30 members are flagged Small group with a word and an icon. Every measure says Higher is better or Lower is better (GSD is lower).",
      "One page scroll, no scroll bars inside, no cut-off text, and the layout stacks to one column in a half-width window.",
      "Help is in one place (How to read this): plain words first, the HEDIS term second, the same words as the (i) icons. A loading skeleton shows while a dashboard draws. Copy link keeps the filters. Export and print are in one menu. Each page has its own browser tab title. A wrong address shows a Not Found page with links.",
      "Build notes: each part of the page is tagged Works with the embed (QuickSight can draw it) or Needs custom build (Sonata builds it). Use Hide build notes in the page header to turn the tags off.",
      "Demo: 12 dashboards in 3 groups. The five real measures (BCS, CCS, COL, GSD, WCV) read the demo members. The other seven (CHL, CBP, KED, SPC, CIS, IMA, LSC) use made-up repeatable numbers and have no member list. The benchmarks are demo values.",
      "Not built: role-based views, saved views, and care manager, team or provider filters (the data does not hold them yet).",
    ],
  },
  {
    id: 6,
    name: "Version 6",
    date: "2026-10-30",
    summary:
      "The same UX fixes as Version 5, but everything inside the dashboard uses only the QuickSight style guide. Nothing from the Sonata component set is drawn inside the dashboard box.",
    changes: [
      "Everything outside Analytics is the same as Version 5. Versions 1 to 5 keep their own Analytics pages.",
      "Inside the dashboard box only the QuickSight kit is used: toolbar, sheet tabs, one controls bar, KPI tiles, column chart, horizontal bar chart with a benchmark line, table visual, text box. Normal and Bold weights only, no shadows, no new colours, no new buttons. No Sonata cards, chips, tables or modals inside the box.",
      "Outside the box the app still owns: the sidebar, the page title and breadcrumb, the browser tab title, the loading skeleton, the Not Found page and the Copy link button.",
      "Overview: one sheet with the controls bar (Group, Measurement Year, Status, A to Z), a text box that says which filters are on, four KPI tiles, a Points From Benchmark column chart and the Scorecard as a table visual. Click a bar or a row to open that dashboard. Help is its own sheet.",
      "Every dashboard: the dashboards of a group are the sheet tabs (up to 7), plus a Help sheet. Same controls bar order on every dashboard (Age Range, Gap Status, Gender, Measurement Year). A text box says which filters are on. Reset is the toolbar Reset.",
      "Status is a symbol and a word inside coloured text (✔ Meets, ! Near, ✖ Misses) because QuickSight cannot draw a chip. Change since last year is an arrow and words. Higher is better or Lower is better is a line of text on the main KPI.",
      "Every percentage has its group size (n). Small groups (under 30) get a grey bar and the words small group, because a Sonata chip is not allowed. The benchmark is a dashed line on the charts.",
      "One page scroll. Tables show the full height with the first 25 members and Export to CSV in the visual menu, so there is no scroll bar inside the box. Chart labels are given enough room so nothing is cut with an ellipsis.",
      "Open questions for the QuickSight developers are tagged Ask Q31 to Q34 (symbol and word status from a calculated field, hiding the embed's own Filter button, keeping the controls in the page address so Copy link keeps them, full height tables). Use Hide questions for developers to turn the tags off.",
      "Demo: the same 12 dashboards and numbers as Version 5.",
    ],
  },
];
export const LATEST_VERSION: VersionId = 6;

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
