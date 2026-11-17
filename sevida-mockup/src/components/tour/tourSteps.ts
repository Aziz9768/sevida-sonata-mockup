/**
 * Version 16: the product tour. One short tour per screen (three to six steps), each step pointing at a real control.
 * A step finds its control with `target`: a CSS selector, or a function for "the button that says Filters".
 * When a control is not on the screen (a hidden column, a filter that is off), the tour skips that step instead of breaking.
 * To change a tour, edit the steps here; nothing else needs to move.
 */
export type TourScreen = "analytics" | "careGaps" | "gapDetail" | "members" | "memberDetail";

export interface TourStep {
  /** A CSS selector, or a function that returns the element (or null when it is not on the screen). */
  target: string | (() => Element | null);
  title: string;
  body: string;
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
        body: "Start on Overview for all measures together, then open BCS, CCS, COL, GSD or WCV to see one measure.",
        placement: "bottom-start",
      },
      {
        target: () => q('[role="combobox"]'),
        title: "Choose the data run",
        body: "The latest run is selected. Pick an older run to see how the numbers looked on that day.",
        placement: "bottom-start",
      },
      {
        target: () => q('input[aria-label^="Search Primary Care Manager"]')?.closest(".MuiInputBase-root") ?? q('input[aria-label^="Search Primary Care Manager"]'),
        title: "Look at one care manager",
        body: "Type a name or an NPI to narrow every number and chart on the page to that primary care manager.",
        placement: "bottom-start",
      },
      {
        target: () => byText("button", "Clear All Filters"),
        title: "Start again in one click",
        body: "Clear All Filters puts every filter back to its first value.",
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
        body: "Each tab shows how many gaps it holds. Pick a measure to see only its gaps.",
        placement: "bottom-start",
      },
      {
        target: () => toolbar("Filters"),
        title: "Filters",
        body: "Narrow the list by gap status, priority, due date, age and more.",
        placement: "left",
      },
      {
        target: () => toolbar("Columns"),
        title: "Columns",
        body: "Show or hide columns, for example Gap Source, Closure Source or Primary Care Manager.",
        placement: "left",
      },
      {
        target: () => q('button[aria-label^="Saved views"]'),
        title: "Saved views",
        body: "Save your filters and columns as a view, and open it again any time.",
        placement: "bottom-end",
      },
      {
        target: () => byStart("th", "Priority"),
        title: "Priority",
        body: "High means the due date is 30 days away or less. Medium is 31 to 60 days. Low is more than 60 days.",
        placement: "bottom-start",
      },
      {
        target: () => q('tbody a[href*="/gaps/"]'),
        title: "Open a gap",
        body: "Click a gap name to see why it is open and how to close it. Click a member name to open the member.",
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
        body: "Open the full member header: IDs, care manager, clinic and enrollment.",
        placement: "left",
      },
      {
        target: () => q('[role="tablist"]'),
        title: "Overview, Evidence and History",
        body: "Overview explains the gap. Evidence lists the records behind it. History shows every change, newest first.",
        placement: "bottom-start",
      },
      {
        target: () => card("Gap Summary"),
        title: "Gap Summary",
        body: "Status, priority, when the gap was identified, the due date and the days left.",
        placement: "top-start",
      },
      {
        target: () => card("Why The Gap Is Open") ?? card("Why The Gap Is Closed") ?? card("Why The Member Is Excluded"),
        title: "Why this gap",
        body: "The reason, in plain words, with a link to the records on the Evidence tab.",
        placement: "top-start",
      },
      {
        target: () => card("How To Close The Gap"),
        title: "How to close it",
        body: "The next step for the care manager to close the gap.",
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
        body: "Narrow the members by age, gender, state, number of open gaps and more.",
        placement: "left",
      },
      {
        target: () => toolbar("Columns"),
        title: "Columns",
        body: "Show or hide columns. Hidden ones, such as Earliest Gap Due Date, are one click away.",
        placement: "left",
      },
      {
        target: () => q('button[aria-label^="Saved views"]'),
        title: "Saved views",
        body: "Save your filters and columns as a view, and open it again any time.",
        placement: "bottom-end",
      },
      {
        target: () => byStart("th", "# Open Gaps"),
        title: "Open gaps",
        body: "How many open gaps each member has. Click the number to see those gaps in the Care Gaps List.",
        placement: "bottom-start",
      },
      {
        target: () => q('tbody a[href*="/members/"]'),
        title: "Open a member",
        body: "Click a name to open the member's record, with Care Gaps, Claims, Labs and more.",
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
        body: "Open the full member header: IDs, care manager, clinic and enrollment.",
        placement: "left",
      },
      {
        target: () => q('[role="tablist"]'),
        title: "One tab per kind of record",
        body: "Care Gaps, Claims, Diagnoses, Encounters, Immunizations, Labs, Medications, Observations, Procedures, Providers and Enrollment. The number is how many records it holds.",
        placement: "bottom-start",
      },
      {
        target: () => q("table"),
        title: "Every tab is a table",
        body: "Click a column name to sort. Use the (i) next to a name to see what it means.",
        placement: "top-start",
      },
      {
        target: () => toolbar("Columns"),
        title: "Columns",
        body: "Each tab has more columns that are hidden at first, for example Source and Created On.",
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
