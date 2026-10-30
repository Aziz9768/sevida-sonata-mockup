// Version 5 Analytics: ONE list that describes every dashboard. The sidebar, the Overview scorecard, the tabs and the
// breadcrumb are all drawn from it, so adding dashboard number 13 (or a new group) is one new row here and nothing else.
// The five real measures read the demo members. The seven "demo" dashboards use made-up, repeatable numbers, only to show
// how the page behaves with 12 dashboards in 3 groups.
import {
  DATA_START,
  defaultRange,
  filterMembers,
  emptyFilters,
  groupRates,
  runInfo,
  trendSeries,
} from "./dashboardData";
import type { Dimension } from "./dashboardData";
import { AGE_RANGES } from "./v3Data";
import { MY, hashOf, tally } from "./data";
import type { MeasureCode, Member } from "./data";

export type GroupId = "screening" | "chronic" | "child";
export interface DashGroup {
  id: GroupId;
  name: string;
  blurb: string;
}
export const GROUPS: DashGroup[] = [
  {
    id: "screening",
    name: "Preventive Screening",
    blurb: "Tests that find a problem early.",
  },
  {
    id: "chronic",
    name: "Chronic Condition Care",
    blurb: "Keeping long-term conditions under control.",
  },
  {
    id: "child",
    name: "Child and Adolescent Health",
    blurb: "Visits and shots for children and teens.",
  },
];
export const groupById = (id: string) => GROUPS.find((g) => g.id === id);

export interface DashDef {
  /** The page address: /analytics/<code>. Always lower case. */
  code: string;
  /** Short name used in tabs and the sidebar, for example BCS. */
  short: string;
  /** Full name, always written "CODE - Name". */
  name: string;
  group: GroupId;
  /** false = a lower rate is the good direction (members with a high HbA1c). */
  higherIsBetter: boolean;
  /** Demo benchmark in %. In real life it comes from the quality program. */
  benchmark: number;
  /** The measure behind the numbers. Missing = a demo dashboard with made-up numbers. */
  real?: MeasureCode;
  /** Who is counted, in the app's words. Used in the one-sentence description. */
  ages: string;
  /** Finishes the sentence "The share of <ages> ...", in plain words. */
  plain: string;
  /** What the result number means (shown on the result tile). */
  resultLabel: string;
}

export const DASHBOARDS: DashDef[] = [
  {
    code: "bcs",
    short: "BCS",
    name: "BCS - Breast Cancer Screening",
    group: "screening",
    higherIsBetter: true,
    benchmark: 70,
    real: "BCS-E",
    ages: "women aged 52 to 74",
    plain: "who had a mammogram in the last two years",
    resultLabel: "Screened",
  },
  {
    code: "ccs",
    short: "CCS",
    name: "CCS - Cervical Cancer Screening",
    group: "screening",
    higherIsBetter: true,
    benchmark: 70,
    real: "CCS-E",
    ages: "women aged 24 to 64",
    plain: "who are up to date on cervical cancer screening",
    resultLabel: "Screened",
  },
  {
    code: "chl",
    short: "CHL",
    name: "CHL - Chlamydia Screening in Women",
    group: "screening",
    higherIsBetter: true,
    benchmark: 55,
    ages: "women aged 16 to 24",
    plain: "who were tested for chlamydia this year",
    resultLabel: "Screened",
  },
  {
    code: "col",
    short: "COL",
    name: "COL - Colorectal Cancer Screening",
    group: "screening",
    higherIsBetter: true,
    benchmark: 65,
    real: "COL-E",
    ages: "members aged 46 to 75",
    plain: "who are up to date on colon cancer screening",
    resultLabel: "Screened",
  },
  {
    code: "cbp",
    short: "CBP",
    name: "CBP - Controlling High Blood Pressure",
    group: "chronic",
    higherIsBetter: true,
    benchmark: 60,
    ages: "members aged 18 to 85 with high blood pressure",
    plain: "whose last blood pressure reading was under control",
    resultLabel: "Under control",
  },
  {
    code: "gsd",
    short: "GSD",
    name: "GSD - Glycemic Status Assessment for Patients With Diabetes",
    group: "chronic",
    higherIsBetter: false,
    benchmark: 35,
    real: "GSD",
    ages: "members aged 18 to 75 with diabetes",
    plain: "whose blood sugar (HbA1c) is 8% or higher",
    resultLabel: "HbA1c 8% or higher",
  },
  {
    code: "ked",
    short: "KED",
    name: "KED - Kidney Health Evaluation for Patients With Diabetes",
    group: "chronic",
    higherIsBetter: true,
    benchmark: 45,
    ages: "members aged 18 to 85 with diabetes",
    plain: "who had a kidney health check this year",
    resultLabel: "Evaluated",
  },
  {
    code: "spc",
    short: "SPC",
    name: "SPC - Statin Therapy for Patients With Cardiovascular Disease",
    group: "chronic",
    higherIsBetter: true,
    benchmark: 78,
    ages: "men aged 21 to 75 and women aged 40 to 75 with heart disease",
    plain: "who take a statin",
    resultLabel: "On a statin",
  },
  {
    code: "cis",
    short: "CIS",
    name: "CIS - Childhood Immunization Status",
    group: "child",
    higherIsBetter: true,
    benchmark: 60,
    ages: "children who turned 2 this year",
    plain: "who had all their recommended shots by age 2",
    resultLabel: "Fully vaccinated",
  },
  {
    code: "ima",
    short: "IMA",
    name: "IMA - Immunizations for Adolescents",
    group: "child",
    higherIsBetter: true,
    benchmark: 35,
    ages: "teens who turned 13 this year",
    plain: "who had their recommended shots by age 13",
    resultLabel: "Fully vaccinated",
  },
  {
    code: "lsc",
    short: "LSC",
    name: "LSC - Lead Screening in Children",
    group: "child",
    higherIsBetter: true,
    benchmark: 68,
    ages: "children who turned 2 this year",
    plain: "who had a lead test by age 2",
    resultLabel: "Screened",
  },
  {
    code: "wcv",
    short: "WCV",
    name: "WCV - Child and Adolescent Well-Care Visits",
    group: "child",
    higherIsBetter: true,
    benchmark: 58,
    real: "WCV",
    ages: "members aged 3 to 21",
    plain: "who had a check-up this year",
    resultLabel: "Had a visit",
  },
];

export const dashByCode = (code: string | undefined) =>
  DASHBOARDS.find((d) => d.code === (code ?? "").toLowerCase());
export const dashesIn = (g: GroupId) => DASHBOARDS.filter((d) => d.group === g);

/** Fewer members than this in a group and the percentage is flagged. Demo value: agree the real one with the quality team. */
export const SMALL_N = 30;

/* ---------------------------------------------------------------- filters (same names and lists as the app) */

export interface AFilters {
  year: number;
  /** "" = All */
  gender: string;
  /** Age Range labels, empty = All */
  age: string[];
  /** "" = All, "Open" = not met yet, "Closed" = met */
  gap: "" | "Open" | "Closed";
}
export const emptyAFilters = (): AFilters => ({
  year: MY,
  gender: "",
  age: [],
  gap: "",
});
/** Alphabetical, Title Case: the order of the filter boxes. */
export const GENDER_OPTIONS = ["Female", "Male", "Other", "Unknown"];
export const AGE_OPTIONS = AGE_RANGES.map((r) => r.label);
export const GAP_OPTIONS: AFilters["gap"][] = ["Closed", "Open"];

/** The filters as a short readable line: "Gender: Female · Age Range: Older Adult (65+ years)". */
export function appliedText(f: AFilters): string[] {
  const out = [`Measurement Year: ${f.year}`];
  if (f.age.length) out.push(`Age Range: ${f.age.join(", ")}`);
  if (f.gap) out.push(`Gap Status: ${f.gap}`);
  if (f.gender) out.push(`Gender: ${f.gender}`);
  return out;
}
export const filtersActive = (f: AFilters) =>
  !!(f.gender || f.age.length || f.gap);

/* ---------------------------------------------------------------- numbers */

export interface Stats {
  /** Members counted in the rate (met + not met). */
  n: number;
  met: number;
  notMet: number;
  excluded: number;
  review: number;
  /** The headline rate in %. For a lower-is-better dashboard this is the share NOT meeting the goal. */
  rate: number;
}

const seedOf = (...parts: (string | number)[]) => hashOf(parts.join("|"));

/** The members behind a real dashboard for these filters. */
export function membersFor(def: DashDef, f: AFilters): Member[] {
  if (!def.real) return [];
  return filterMembers(
    {
      ...emptyFilters(f.year),
      sex: f.gender,
      ageGroup: f.age,
      status: f.gap === "Open" ? "Gap" : f.gap === "Closed" ? "Met" : "",
    },
    def.real,
  );
}

/** How much of the demo population a set of filters keeps (made up, repeatable). */
function demoShare(f: AFilters, def: DashDef): number {
  let s = 1;
  if (f.gender) s *= 0.45 + (seedOf(def.code, f.gender) % 10) / 100;
  if (f.age.length) s *= Math.min(1, 0.18 * f.age.length + 0.06);
  if (f.gap) s *= f.gap === "Closed" ? 0.6 : 0.4;
  return s;
}

function demoStats(def: DashDef, f: AFilters): Stats {
  const base = 45 + (seedOf(def.code, "rate") % 40);
  const yearShift = f.year === MY ? 0 : -((seedOf(def.code, "yr") % 7) - 2);
  const wobble = filtersActive(f) ? (seedOf(def.code, JSON.stringify(f)) % 9) - 4 : 0;
  const rate = Math.max(5, Math.min(95, base + yearShift + wobble));
  const full = 90 + (seedOf(def.code, "n") % 260);
  const n = Math.max(0, Math.round(full * demoShare(f, def)));
  const shown = def.higherIsBetter ? rate : Math.min(60, 100 - rate);
  const met = Math.round((n * (def.higherIsBetter ? shown : 100 - shown)) / 100);
  return {
    n,
    met,
    notMet: n - met,
    excluded: Math.round(n * 0.06),
    review: Math.round(n * 0.03),
    rate: n ? shown : 0,
  };
}

export function statsFor(def: DashDef, f: AFilters): Stats {
  if (!def.real) return demoStats(def, f);
  const t = tally(membersFor(def, f), def.real, f.year);
  return {
    n: t.denominator,
    met: t.met,
    notMet: t.gap,
    excluded: t.excluded,
    review: t.review,
    rate: def.higherIsBetter ? t.rate : t.denominator ? 100 - t.rate : 0,
  };
}

export type Status = "meets" | "near" | "misses";
export const NEAR_POINTS = 5;
/** Points from the benchmark in the bad direction. Negative = better than the benchmark. */
export const gapToBenchmark = (def: DashDef, rate: number) =>
  def.higherIsBetter ? def.benchmark - rate : rate - def.benchmark;
export function statusOf(def: DashDef, rate: number): Status {
  const g = gapToBenchmark(def, rate);
  return g <= 0 ? "meets" : g <= NEAR_POINTS ? "near" : "misses";
}
export const STATUS_WORDS: Record<Status, string> = {
  meets: "Meets benchmark",
  near: "Near benchmark",
  misses: "Misses benchmark",
};
export const STATUS_ORDER: Record<Status, number> = {
  misses: 0,
  near: 1,
  meets: 2,
};

export interface ScoreRow {
  def: DashDef;
  group: string;
  rate: number;
  n: number;
  prev: number;
  /** Change in points since last year (+ = the rate went up). */
  change: number;
  /** true = the change is in the good direction. null = no real change. */
  better: boolean | null;
  status: Status;
  gap: number;
  updated: Date;
}

export const lastUpdated = (def: DashDef): Date => {
  const last = runInfo().last;
  if (def.real) return last;
  return new Date(
    last.getFullYear(),
    last.getMonth(),
    last.getDate() - (seedOf(def.code, "upd") % 3),
  );
};

export function scorecard(year: number): ScoreRow[] {
  const f = { ...emptyAFilters(), year };
  const g = { ...emptyAFilters(), year: year - 1 };
  return DASHBOARDS.map((def) => {
    const s = statsFor(def, f);
    const p = statsFor(def, g);
    const change = s.rate - p.rate;
    return {
      def,
      group: groupById(def.group)!.name,
      rate: s.rate,
      n: s.n,
      prev: p.rate,
      change,
      better:
        Math.abs(change) < 0.5 ? null : def.higherIsBetter ? change > 0 : change < 0,
      status: statusOf(def, s.rate),
      gap: gapToBenchmark(def, s.rate),
      updated: lastUpdated(def),
    };
  });
}

/* ---------------------------------------------------------------- groups and trend */

export interface GroupRow {
  group: string;
  n: number;
  rate: number;
  small: boolean;
}

const DEMO_AGE_SETS = [
  [5, 6, 7],
  [6, 7, 8],
  [4, 5, 6, 7],
];
export function breakdown(
  def: DashDef,
  f: AFilters,
  dim: Extract<Dimension, "sex" | "ageGroup">,
): GroupRow[] {
  if (def.real) {
    const list = membersFor(def, f);
    const out = groupRates(def.real, list, f.year, dim).map((r) => ({
      group: r.group,
      n: r.t.denominator,
      rate: def.higherIsBetter
        ? r.t.rate
        : r.t.denominator
          ? 100 - r.t.rate
          : 0,
      small: r.t.denominator < SMALL_N,
    }));
    return dim === "ageGroup"
      ? out.sort((a, b) => AGE_OPTIONS.indexOf(a.group) - AGE_OPTIONS.indexOf(b.group))
      : out;
  }
  const total = demoStats(def, f);
  const names =
    dim === "sex"
      ? ["Female", "Male"]
      : DEMO_AGE_SETS[seedOf(def.code, "age") % 3].map((i) => AGE_RANGES[i].label);
  return names.map((group, i) => {
    const h = seedOf(def.code, group, f.year);
    const n = Math.round((total.n / names.length) * (0.4 + (h % 120) / 100));
    const rate = Math.max(3, Math.min(97, total.rate + ((h % 21) - 10)));
    // One group per demo dashboard is on purpose tiny, so the small-group flag shows up.
    const nn = i === names.length - 1 && dim === "ageGroup" ? Math.min(n, 11 + (h % 14)) : n;
    return { group, n: nn, rate, small: nn < SMALL_N };
  });
}

export function trendFor(def: DashDef, f: AFilters) {
  const range = defaultRange("monthly");
  if (def.real) {
    const t = trendSeries(
      def.real,
      membersFor(def, f),
      "monthly",
      range,
      def.higherIsBetter ? "met" : "notmet",
    );
    return { labels: t.labels, values: t.values };
  }
  const labels = trendSeries("WCV", [], "monthly", range, "met").labels;
  const end = demoStats(def, f).rate;
  const values = labels.map((_, i) => {
    const left = labels.length - 1 - i;
    const h = seedOf(def.code, "t", i);
    return Math.max(2, Math.min(98, end - left * (def.higherIsBetter ? 0.7 : -0.5) + ((h % 7) - 3)));
  });
  return { labels, values: values as (number | null)[] };
}

/** First month of data, for the trend caption. */
export const TREND_FROM = DATA_START;
