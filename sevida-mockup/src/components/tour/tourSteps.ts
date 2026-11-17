/**
 * Version 16: the product tour. One short tour per screen (four to six steps), each step pointing at a real control
 * and showing a small picture of it, what it does, why it matters, an example and one thing to try.
 * A step finds its control with `target`: a CSS selector, or a function for "the button that says Filters".
 * When a control is not on the screen (a hidden column, a filter that is off), the tour skips that step instead of breaking.
 * To change a tour, edit the steps here; nothing else needs to move.
 */
import type { VisualId } from "./tourVisuals";

export type TourScreen = "analytics" | "careGaps" | "gapDetail" | "members" | "memberDetail";

export interface TourStep {
  /** A CSS selector, or a function that returns the element (or null when it is not on the screen). */
  target: string | (() => Element | null);
  title: string;
  /** One or two plain sentences: what the control is. */
  body: string;
  /** Why it matters or when to use it (shown under the body). */
  detail?: string;
  /** A concrete example with real values (shown in a tinted box). */
  example?: string;
  /** One thing the person can do right now (shown with a pointer icon). */
  tryIt?: string;
  /** A small picture of the real control, drawn in tourVisuals.tsx. */
  visual?: VisualId;
  placement?: "top" | "bottom" | "left" | "right" | "bottom-start" | "bottom-end" | "top-start" | "top-end";
}

export interface TourDef {
  /** Shown in the Guide menu and read out to screen readers. */
  label: string;
  steps: TourStep[];
}

const main = () => document.querySelector("main") ?? document.body;
const q = (sel: string) => main().querySelector(sel);
/** The first element matching `sel` in the page whose text is exactly `text`. */
const byText = (sel: string, text: string) =>
  Array.from(main().querySelectorAll(sel)).find((e) => (e.textContent ?? "").replace(/\s+/g, " ").trim() === text) ?? null;
/** The first element matching `sel` whose text starts with `text`. */
const byStart = (sel: string, text: string) =>
  Array.from(main().querySelectorAll(sel)).find((e) => (e.textContent ?? "").replace(/\s+/g, " ").trim().startsWith(text)) ?? null;
/** A card on the page, found by its heading. */
const card = (heading: string) => {
  const h = byText("h2", heading);
  return (h?.closest(".MuiPaper-root") as Element | null) ?? h;
};
/** The buttons of a table toolbar (Filters, Columns) sit at the right edge and are named by their text. */
const toolbar = (name: string) => byText("button", name) ?? q(`button[aria-label="${name}"]`);

export const TOURS: Record<TourScreen, TourDef> = {
  analytics: {
    label: "Analytics",
    steps: [
      {
        target: () => q('[role="tablist"]'),
        title: "One tab per measure",
        visual: "measureTabs",
        body: "Overview shows all measures together. Each other tab, such as BCS, CCS, COL, GSD or WCV, shows one measure on its own.",
        detail: "Use Overview to see where the whole population stands. Open a measure when you need to know why its rate is low.",
        example: "BCS is breast cancer screening. Its tab shows only the BCS rate, trend and gaps.",
        tryIt: "Click the BCS tab, then come back to Overview.",
        placement: "bottom-start",
      },
      {
        target: () => q('[role="combobox"]'),
        title: "Choose the data run",
        visual: "dataRun",
        body: "The latest data run is selected. Pick an older run to see the numbers as they were on that day.",
        detail: "Every number and chart on the page comes from the run you choose, so two people on different runs will see different numbers.",
        example: "Compare today's run with last week's to see whether the rate went up.",
        tryIt: "Open the list and look at the runs it offers.",
        placement: "bottom-start",
      },
      {
        target: () => q('input[aria-label^="Search Primary Care Manager"]')?.closest(".MuiInputBase-root") ?? q('input[aria-label^="Search Primary Care Manager"]'),
        title: "Look at one care manager",
        visual: "pcmSearch",
        body: "Type a name or an NPI to narrow every number and chart on the page to that primary care manager.",
        detail: "Helpful in one-to-one reviews, when you only want the members that one care manager looks after.",
        example: "Type Mitchell, or the NPI 1000000905.",
        tryIt: "Type a name, then clear it again.",
        placement: "bottom-start",
      },
      {
        target: () => byText("button", "Clear All Filters"),
        title: "Start again in one click",
        visual: "clearFilters",
        body: "Clear All Filters puts the run, the year and the care manager back to their first values.",
        detail: "If a number looks wrong, check the filters first. This button removes any doubt.",
        tryIt: "Use it any time the page looks narrower than you expect.",
        placement: "bottom-end",
      },
    ],
  },
  careGaps: {
    label: "Care Gaps List",
    steps: [
      {
        target: () => q('[role="tablist"]'),
        title: "All gaps, or one measure",
        visual: "gapTabs",
        body: "Every tab shows how many gaps it holds. All Gaps lists everything. A measure tab lists only that measure.",
        detail: "Work one measure at a time when a team is focused on it, for example a breast cancer screening drive.",
        example: "Open BCS to see only breast cancer screening gaps.",
        tryIt: "Click a measure tab and watch the table change.",
        placement: "bottom-start",
      },
      {
        target: () => toolbar("Filters"),
        title: "Filters",
        visual: "filters",
        body: "Narrow the list by gap status, priority, due date, age and more.",
        detail: "Filters stack. Each one you add narrows the list further, so you can reach a short list fast.",
        example: "Gap Status Open + Priority High gives the gaps that need action first.",
        tryIt: "Open Filters and choose Priority: High.",
        placement: "left",
      },
      {
        target: () => toolbar("Columns"),
        title: "Columns",
        visual: "columns",
        body: "Show or hide columns. Some are hidden at first, such as Gap Source, Closure Source and Primary Care Manager.",
        detail: "Show only what you need so the table is easy to scan.",
        example: "Turn on Primary Care Manager to see who looks after each member.",
        tryIt: "Open Columns and switch one on.",
        placement: "left",
      },
      {
        target: () => q('button[aria-label^="Saved views"]'),
        title: "Saved views",
        visual: "savedViews",
        body: "Save the filters and columns you have set as a named view, and open it again later with one click.",
        detail: "A saved view is for lists you open again and again, so you never rebuild the same filters.",
        example: "Save High priority + Open as High priority, due this month.",
        tryIt: "Set a filter, open Saved views and save it.",
        placement: "bottom-end",
      },
      {
        target: () => byStart("th", "Priority"),
        title: "Priority",
        visual: "priority",
        body: "Priority tells you how soon a gap needs action. It follows the due date.",
        detail: "High: 30 days or fewer left. Medium: 31 to 60 days left. Low: more than 60 days left. The list opens with High first.",
        example: "A gap due in 12 days is High. One due in 45 days is Medium. One due in 80 days is Low.",
        tryIt: "Click the Priority heading to sort.",
        placement: "bottom-start",
      },
      {
        target: () => q('tbody a[href*="/gaps/"]'),
        title: "Open a gap",
        visual: "openGap",
        body: "Click a gap name to see why it is open and how to close it. Click a member name to open that member.",
        detail: "The gap page gives the reason, the evidence and the next step, so you do not have to look it up.",
        tryIt: "Click any underlined gap name.",
        placement: "bottom-start",
      },
    ],
  },
  gapDetail: {
    label: "Care Gap Details",
    steps: [
      {
        target: () => q('button[aria-label="Show all member details"]'),
        title: "Member details",
        visual: "memberHeader",
        body: "The header shows who this gap belongs to. Open it to see the full member details: IDs, care manager, clinic and enrollment.",
        detail: "Check the care manager and clinic here before you reach out, so the right person acts on the gap.",
        tryIt: "Click the arrow to expand the header.",
        placement: "left",
      },
      {
        target: () => q('[role="tablist"]'),
        title: "Overview, Evidence and History",
        visual: "detailTabs",
        body: "Overview explains the gap. Evidence lists the records behind it. History shows every change, newest first.",
        detail: "Go to Evidence when you need proof, for example the claim or lab that shows a screening was done.",
        tryIt: "Open Evidence to see the records.",
        placement: "bottom-start",
      },
      {
        target: () => card("Gap Summary"),
        title: "Gap Summary",
        visual: "gapSummary",
        body: "The facts of the gap: its status, priority, when it was identified, the due date and the days remaining.",
        detail: "Priority comes from the days left. 30 days or fewer means High.",
        example: "Due 11/11/2026 with 26 Days Remaining means High priority.",
        placement: "top-start",
      },
      {
        target: () => card("Why The Gap Is Open") ?? card("Why The Gap Is Closed") ?? card("Why The Member Is Excluded"),
        title: "Why this gap",
        visual: "whyOpen",
        body: "The reason, in plain words, with a link to the records on the Evidence tab.",
        detail: "It says what the system looked for and did not find (or found), so you can trust the status.",
        tryIt: "Click the link to jump to the evidence.",
        placement: "top-start",
      },
      {
        target: () => card("How To Close The Gap"),
        title: "How to close it",
        visual: "howToClose",
        body: "The next step for the care manager to close the gap.",
        detail: "Do the step, then record the evidence through claims, an EHR or lab feed. The gap shows as Closed once the evidence is confirmed. Doing the activity alone does not close it.",
        placement: "top-start",
      },
    ],
  },
  members: {
    label: "Members List",
    steps: [
      {
        target: () => toolbar("Filters"),
        title: "Filters",
        visual: "filters",
        body: "Narrow the members by age, gender, state, number of open gaps and more.",
        detail: "Filters stack. Each one you add narrows the list further, so you can reach a short list fast.",
        example: "Age 50 to 74 + at least one open gap gives the women due for screening.",
        tryIt: "Open Filters and set an age range.",
        placement: "left",
      },
      {
        target: () => toolbar("Columns"),
        title: "Columns",
        visual: "columns",
        body: "Show or hide columns. Hidden ones, such as Earliest Gap Due Date, are one click away.",
        detail: "Choose the columns that fit your task, then save them as a view if you will need them again.",
        tryIt: "Open Columns and switch one on.",
        placement: "left",
      },
      {
        target: () => q('button[aria-label^="Saved views"]'),
        title: "Saved views",
        visual: "savedViews",
        body: "Save the filters and columns you have set as a named view, and open it again later with one click.",
        detail: "A saved view is for lists you open again and again, so you never rebuild the same filters.",
        example: "Save Age 50 to 74 + open gaps as Screening outreach list.",
        placement: "bottom-end",
      },
      {
        target: () => byStart("th", "# Open Gaps"),
        title: "Open gaps",
        visual: "openGapsCount",
        body: "How many open gaps each member has. Click the number to see those gaps in the Care Gaps List.",
        detail: "Members with the most open gaps are the best place to start, because one call can close several.",
        tryIt: "Click a number in this column.",
        placement: "bottom-start",
      },
      {
        target: () => q('tbody a[href*="/members/"]'),
        title: "Open a member",
        visual: "openMember",
        body: "Click a name to open the member's record, with Care Gaps, Claims, Labs, Medications and more.",
        detail: "Everything known about the member is on one page, one tab per kind of record.",
        tryIt: "Click any underlined member name.",
        placement: "bottom-start",
      },
    ],
  },
  memberDetail: {
    label: "Member Details",
    steps: [
      {
        target: () => q('button[aria-label="Show all member details"]'),
        title: "Member details",
        visual: "memberHeader",
        body: "The header shows who this member is. Open it to see the full details: IDs, care manager, clinic and enrollment.",
        detail: "Check the care manager and clinic here before you reach out.",
        tryIt: "Click the arrow to expand the header.",
        placement: "left",
      },
      {
        target: () => q('[role="tablist"]'),
        title: "One tab per kind of record",
        visual: "recordTabs",
        body: "Care Gaps, Claims, Diagnoses, Encounters, Immunizations, Labs, Medications, Observations, Procedures, Providers and Enrollment.",
        detail: "The number on a tab is how many records it holds, so an empty tab is easy to spot.",
        example: "Open Labs to see lab results, with their units and reference ranges.",
        tryIt: "Click the Claims tab.",
        placement: "bottom-start",
      },
      {
        target: () => q("table"),
        title: "Every tab is a table",
        visual: "sortTable",
        body: "Click a column name to sort. Use the (i) next to a name to see what the column means.",
        detail: "The same table works on every tab, so once you know one you know them all.",
        example: "Click Date to put the newest record first.",
        tryIt: "Click a column heading.",
        placement: "top-start",
      },
      {
        target: () => toolbar("Columns"),
        title: "Columns",
        visual: "columns",
        body: "Each tab has more columns that are hidden at first, for example Source and Created On.",
        detail: "Turn them on when you need to know where a record came from.",
        tryIt: "Open Columns and switch one on.",
        placement: "left",
      },
    ],
  },
};

/** The tour that belongs to an address, or null when the screen has none. */
export function screenFor(pathname: string): TourScreen | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "dashboards" || parts[0] === "quicksight") return "analytics";
  if (parts[0] === "care-gaps" && parts.length === 1) return "careGaps";
  if (parts[0] === "members") return parts.length === 1 ? "members" : parts[2] === "gaps" && parts.length >= 4 ? "gapDetail" : "memberDetail";
  return null;
}
