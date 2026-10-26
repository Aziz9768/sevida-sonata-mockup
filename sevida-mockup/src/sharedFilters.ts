// One set of filter names, values and groups for the Dashboard and the Members list.
// Rule: the same idea has the same name, the same values and the same control on both screens.
// Both screens read from this file, so a change here shows up on both.
import { getVersion } from "./version";
import { a1cBands, measures, stateLabel } from "./data";
import type { MeasureState } from "./data";
import { V3_GAP_LABEL } from "./v3Data";

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
const v3L = (v3: string, old: string) => (getVersion() >= 3 ? v3 : old);
export const LABEL = {
  get year() { return v3L("Measurement Year", "Measurement year"); },
  member: "Member",
  measure: "Measure",
  get result() { return v3L("Measure Result", "Measure result"); },
  get dob() { return v3L("Date of Birth", "Date of birth"); },
  age: "Age",
  /** Version 3 uses the member list words (Gender, # Open Gaps) and Title Case, so the dashboards and the lists read as one product. */
  get sex() { return v3L("Gender", "Sex"); },
  get ageGroup() { return v3L("Age Range", "Age group"); },
  race: "Race",
  ethnicity: "Ethnicity",
  get provider() { return v3L("Primary Care Provider", "Primary care provider"); },
  get excluded() { return v3L("Excluded From", "Excluded from"); },
  get evDate() { return v3L("Evidence Date", "Evidence date"); },
  get a1c() { return v3L("Lowest HbA1c", "Latest HbA1c"); },
  get openGaps() { return v3L("# Open Gaps", "Open care gaps"); },
  state: "State",
  county: "County",
  get military() { return v3L("Military Status", "Military status"); },
};

/** "Everything" is always called All. */
export const ALL = "All";

/** The Measure result filter. Same words as the result chips in the app. Not in this measure is not a choice (those members are not counted). */
export const RESULT_STATES: MeasureState[] = [
  "Excluded",
  "Met",
  "Review",
  "Gap",
];
export const resultOptions = RESULT_STATES.map((s) => ({
  value: s,
  label: stateLabel[s],
}));

export const SEX_VALUES = ["Female", "Male"];
export const YES_NO = ["No", "Yes"];
export const MILITARY_VALUES = ["Active", "Not military", "Retired"];

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
export const measureOptions = [...measures]
  .sort((a, b) => a.code.localeCompare(b.code))
  .map((x) => ({
    value: x.code,
    label: `${x.code} · ${x.name}`,
  }));

/** The same list, with the Version 3 gap names ("BCS - Breast Cancer Screening") so the dashboards read like the Care Gaps list. */
export const measureOptionsFor = () =>
  getVersion() >= 3
    ? measureOptions
        .map((o) => ({ value: o.value, label: V3_GAP_LABEL[o.value as keyof typeof V3_GAP_LABEL] }))
        .sort((a, b) => a.label.localeCompare(b.label))
    : measureOptions;

/** Where a piece of evidence came from. */
export const EVIDENCE_SYSTEMS = [
  "Claim (supplemental, $0)",
  "EHR (supplemental)",
  "EHR pharmacy (supplemental)",
  "Lab feed (supplemental)",
  "Paid claim",
  "Pharmacy claim",
];
export const A1C_VALUES: string[] = a1cBands;
