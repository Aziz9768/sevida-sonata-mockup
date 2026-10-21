// One set of filter names, values and groups for the Dashboard and the Members list.
// Rule: the same idea has the same name, the same values and the same control on both screens.
// Both screens read from this file, so a change here shows up on both.
import { a1cBands, measures, stateLabel } from "./data";
import type { MeasureState } from "./data";

/** Age groups, by age on December 31 of the measurement year. Used by the Age group filter and the age chart. */
export const AGE_GROUPS: { label: string; lo: number; hi: number }[] = [
  { label: "Under 3", lo: 0, hi: 2 },
  { label: "3–11", lo: 3, hi: 11 },
  { label: "12–17", lo: 12, hi: 17 },
  { label: "18–21", lo: 18, hi: 21 },
  { label: "22–39", lo: 22, hi: 39 },
  { label: "40–49", lo: 40, hi: 49 },
  { label: "50–64", lo: 50, hi: 64 },
  { label: "65 and over", lo: 65, hi: 200 },
];
export const ageGroupFor = (age: number) =>
  AGE_GROUPS.find((b) => age >= b.lo && age <= b.hi)?.label ?? "Unknown";

/** Filter names. */
export const LABEL = {
  year: "Measurement year",
  member: "Member",
  measure: "Measure",
  result: "Measure result",
  dob: "Date of birth",
  age: "Age",
  sex: "Sex",
  multiGap: "Gaps in more than one measure",
  ageGroup: "Age group",
  race: "Race",
  ethnicity: "Ethnicity",
  provider: "Primary care provider",
  excluded: "Excluded from",
  evDate: "Evidence date",
  evSystem: "Evidence source system",
  a1c: "Latest HbA1c",
  openGaps: "Open care gaps",
  state: "State",
  county: "County",
  military: "Military status",
} as const;

/** "Everything" is always called All. */
export const ALL = "All";

/** The Measure result filter. Same words as the result chips in the app. Not in this measure is not a choice (those members are not counted). */
export const RESULT_STATES: MeasureState[] = [
  "Met",
  "Gap",
  "Review",
  "Excluded",
];
export const resultOptions = RESULT_STATES.map((s) => ({
  value: s,
  label: stateLabel[s],
}));

export const SEX_VALUES = ["Female", "Male"];
export const YES_NO = ["Yes", "No"];
export const MILITARY_VALUES = ["Active", "Retired", "Not military"];

export const optionsOf = (list: string[]) =>
  list.map((v) => ({ value: v, label: v }));

/** Open care gaps: how many measures a member has not met yet. */
export const openGapsLabel = (n: number) =>
  n === 0
    ? "No open gaps"
    : n >= 4
      ? "4 or more open gaps"
      : `${n} open ${n === 1 ? "gap" : "gaps"}`;
export const OPEN_GAP_VALUES = [0, 1, 2, 3, 4].map(openGapsLabel);

/** Measures as "CODE · full name" (the Measure and Excluded from filters). */
export const measureOptions = measures.map((x) => ({
  value: x.code,
  label: `${x.code} · ${x.name}`,
}));

/** Where a piece of evidence came from. */
export const EVIDENCE_SYSTEMS = [
  "Paid claim",
  "Claim (supplemental, $0)",
  "Lab feed (supplemental)",
  "EHR (supplemental)",
  "EHR pharmacy (supplemental)",
  "Pharmacy claim",
];
export const A1C_VALUES: string[] = a1cBands;
