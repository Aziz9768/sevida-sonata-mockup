/**
 * Version 3 helpers: values the final requirements sheet asks for that the demo data did not have
 * (Tricare ID, Age as days / months / years + months, Gender Other and Unknown, the nine Military Status values, "None" for
 * no race or ethnicity). They are made up per member, the same every time. Versions 1 and 2 never call these.
 */
import { DEMO_NOW, hashOf, ethnicityGroupOf, raceGroupOf } from "./data";
import type { Member, MeasureCode } from "./data";

/** The gap names as the sheet writes them (Navigation Menu and Members Page tabs). */
export const V3_GAP_LABEL: Record<MeasureCode, string> = {
  "BCS-E": "BCS - Breast Cancer Screening",
  "CCS-E": "CCS - Cervical Cancer Screening",
  "COL-E": "COL - Colorectal Cancer Screening",
  GSD: "GSD · Glycemic Status Assessment for Patients With Diabetes",
  WCV: "WCV · Child and Adolescent Well-Care Visits",
};
/** BCS-E is written BCS in the sheet. */
export const gapShort = (code: string) => code.replace(/-E$/, "");
export const v3GapOptions = (Object.keys(V3_GAP_LABEL) as MeasureCode[]).map(
  (c) => ({ value: c, label: V3_GAP_LABEL[c] }),
);

/** 11 digits, like a DoD benefits number. Sample data. */
export const tricareIdOf = (m: Member) =>
  String(10000000000 + (hashOf(`${m.id}-tricare`) % 80000000000));

/** Every ID a member can have. Tricare ID and Member ID show in the header, the rest open in the "See more IDs" pop-up. Sample data: only Member ID is real, the others are made up the same way every time. */
export interface MemberId {
  type: string;
  value: string;
  source: string;
}
export const memberIdsOf = (m: Member): MemberId[] => {
  const h = hashOf(m.id);
  return [
    { type: "Tricare ID", value: tricareIdOf(m), source: "Tricare enrollment file" },
    { type: "Member ID", value: m.id, source: "Sevida" },
    { type: "Subscriber ID", value: `SUB-${100000 + (h % 900000)}`, source: "Member file (insurance card)" },
    { type: "Genesis EHR ID", value: `EHR-${1000000 + (hashOf(`${m.id}-ehr`) % 9000000)}`, source: "Genesis EHR" },
  ];
};

const GENDER_OVERRIDE: Record<string, "Other" | "Unknown"> = {
  M1010: "Other",
  M1060: "Other",
  M1011: "Unknown",
  M1303: "Unknown",
};
export const GENDER_V3 = ["Male", "Female", "Other", "Unknown"];
export const genderV3 = (m: Member) =>
  GENDER_OVERRIDE[m.id] ?? (m.gender === "female" ? "Female" : "Male");

export const MILITARY_V3 = [
  "Active Duty",
  "Active Duty Family Member",
  "Guard/Reserve - Active",
  "Guard/Reserve Family Member",
  "Guard/Reserve - Inactive",
  "Retiree",
  "Retiree Family Member",
  "Survivor",
  "Other",
];
/** Members the file says nothing about show a dash. A few get each of the nine values so every filter choice finds someone. */
/** Every TRICARE member has a military status. Active and retired members come from the data; the rest are spread over the nine values, with family members for children. */
export const militaryV3 = (m: Member, year = DEMO_NOW.getFullYear()): string => {
  if (m.military === "Active") return "Active Duty";
  if (m.military === "Retired") return "Retiree";
  const h = hashOf(`${m.id}-mil`);
  const age = year - m.dob.getFullYear();
  const pool =
    age < 18
      ? ["Active Duty Family Member", "Retiree Family Member", "Guard/Reserve Family Member", "Survivor"]
      : [
          "Active Duty Family Member",
          "Retiree Family Member",
          "Retiree",
          "Guard/Reserve - Active",
          "Guard/Reserve - Inactive",
          "Guard/Reserve Family Member",
          "Active Duty",
          "Survivor",
          "Other",
        ];
  return pool[(h >>> 4) % pool.length];
};

export const NONE = "None";
export const raceV3 = (m: Member) =>
  m.raceCodes.length === 0 ? NONE : (raceGroupOf(m) ?? NONE);
export const ethnicityV3 = (m: Member) =>
  m.ethnicityCode === "" ? NONE : ethnicityGroupOf(m);

/* ------------------------------------------------------------------ age */

/** Whole months and days between a date of birth and the demo's today. */
export function ageParts(dob: Date, now: Date = DEMO_NOW) {
  let months =
    (now.getFullYear() - dob.getFullYear()) * 12 +
    (now.getMonth() - dob.getMonth());
  if (now.getDate() < dob.getDate()) months--;
  const days = Math.floor(
    (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) -
      Date.UTC(dob.getFullYear(), dob.getMonth(), dob.getDate())) /
      86400000,
  );
  return { days, months, years: Math.floor(months / 12) };
}
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
/** Days under 1 month, months under 1 year, years + months from then on ("3 days", "8 months", "7 years 2 months"). */
export function ageLabel(dob: Date, now: Date = DEMO_NOW): string {
  const { days, months, years } = ageParts(dob, now);
  if (months < 1) return plural(days, "day");
  if (months < 12) return plural(months, "month");
  const rest = months % 12;
  return rest === 0
    ? plural(years, "year")
    : `${plural(years, "year")} ${plural(rest, "month")}`;
}

/** The fixed age ranges of the Age Range filter. The first one is 0 to 28 days; each next one starts where the one before ends. */
export const AGE_RANGES: {
  label: string;
  test: (p: ReturnType<typeof ageParts>) => boolean;
}[] = [
  { label: "Neonate / Newborn (0-28 days)", test: (p) => p.days <= 28 },
  {
    label: "Infant (1-12 months)",
    test: (p) => p.days > 28 && p.months < 12,
  },
  { label: "Toddler (1-3 years)", test: (p) => p.years >= 1 && p.years < 3 },
  { label: "Preschool (3-5 years)", test: (p) => p.years >= 3 && p.years < 6 },
  {
    label: "School-age child (6-12 years)",
    test: (p) => p.years >= 6 && p.years < 13,
  },
  { label: "Adolescent (13-17 years)", test: (p) => p.years >= 13 && p.years < 18 },
  { label: "Young adult (18-39 years)", test: (p) => p.years >= 18 && p.years < 40 },
  {
    label: "Middle-aged adult (40-64 years)",
    test: (p) => p.years >= 40 && p.years < 65,
  },
  { label: "Older adult (65+ years)", test: (p) => p.years >= 65 },
];
export const ageRangeOf = (dob: Date) => {
  const p = ageParts(dob);
  return AGE_RANGES.find((r) => r.test(p))?.label ?? "";
};

/** The Missing Evidence column of version 3: two or three words per gap (the hover still lists every accepted record). */
export const MISSING_SHORT: Record<MeasureCode, string> = {
  "BCS-E": "Mammogram",
  "CCS-E": "Cervical cytology",
  "COL-E": "Colorectal screening",
  GSD: "HbA1c result",
  WCV: "Well-care visit",
};

/** "Who is Considered" and "What is Left to Close the Gap" on the Care Gap page, as the sheet words them (typos fixed). GSD is blank in the sheet. */
export const V3_WHO: Record<MeasureCode, string> = {
  "BCS-E":
    "Females aged 52–74 years who were recommended for a breast cancer screening.",
  "CCS-E":
    "Females aged 24–64 years who were recommended for a routine cervical cancer screening.",
  "COL-E": "Members aged 46–75 years.",
  GSD: "",
  WCV: "Members aged 3–21 years that had no more than one gap of up to 45 days during the continuous enrollment period.",
};
export const V3_LEFT: Record<MeasureCode, string[]> = {
  "BCS-E": [
    "Bilateral or unilateral mammogram performed during the measurement period.",
  ],
  "CCS-E": [
    "If aged 24–64, cervical cytology 2 years prior or during the measurement period.",
    "OR if aged 30–64, cervical high-risk human papillomavirus (hrHPV) testing 4 years prior to the measurement period.",
  ],
  "COL-E": [
    "Fecal occult blood test during the measurement period.",
    "OR stool DNA (sDNA) with FIT test 2 years prior to or during the measurement period.",
    "OR flexible sigmoidoscopy 4 years prior to or during the measurement period.",
    "OR CT colonography 4 years prior to or during the measurement period.",
    "OR colonoscopy 9 years prior to or during the measurement period.",
  ],
  GSD: [],
  WCV: [
    "At least one comprehensive well-care visit with a PCP or OB/GYN during the measurement period.",
  ],
};

/* ------------------------------------------------------------------ dashboards: short measure definitions for tooltips (sheet rows HED-001 to HED-005, DC-010) */

type Code = "BCS-E" | "CCS-E" | "COL-E" | "GSD" | "WCV";
export const V3_DEFINITION: Record<Code, string> = {
  "BCS-E": "Women aged 52–74 on Dec 31 who were recommended breast cancer screening.",
  "CCS-E": "Women aged 24–64 on Dec 31 who were recommended routine cervical cancer screening.",
  "COL-E": "Members aged 46–75 on Dec 31 who were recommended colorectal cancer screening.",
  GSD: "Members aged 18–75 with diabetes. The result is the lowest final HbA1c of the measurement period.",
  WCV: "Members aged 3–21 enrolled with at most one 45-day gap.",
};
export const V3_EXCLUSIONS: Record<Code, string> = {
  "BCS-E": "Hospice, death, one-sided or two-sided mastectomy, gender-affirming chest surgery, age 66+ in an I-SNP or long-term institution, age 66+ with frailty and advanced illness.",
  "CCS-E": "Hospice, death, no cervix (hysterectomy, agenesis or acquired absence), palliative care.",
  "COL-E": "Hospice, death, colorectal cancer, total colectomy, palliative care, age 66+ in an I-SNP or long-term institution, age 66+ with frailty and advanced illness.",
  GSD: "Hospice, death.",
  WCV: "Hospice, death.",
};
export const V3_MET: Record<Code, string> = {
  "BCS-E": "At least one mammogram from Oct 1 two years before the period through the end of the period.",
  "CCS-E": "Cervical cytology (age 24–64) in the period or the two years before, or a high-risk HPV test (age 30–64) in the period or the four years before.",
  "COL-E": "Stool test (FIT) this year, sDNA-FIT in the last 3 years, CT colonography or sigmoidoscopy in the last 5, colonoscopy in the last 10.",
  GSD: "Lowest final HbA1c of the period is below 8%.",
  WCV: "A well-care visit with a PCP or OB/GYN (video and phone visits do not count).",
};
