// Numbers for the dashboards (checklist FR-701 to FR-710). Everything is worked out from the demo members, their results and the demo file statuses.
import { getVersion } from "./version";
import {
  AGE_RANGES,
  GENDER_V3,
  MILITARY_V3,
  ageParts,
  tricareIdOf,
  ageRangeOf,
  ethnicityV3,
  genderV3,
  militaryV3,
  NONE,
  raceV3,
} from "./v3Data";
import {
  CURRENT_YEAR,
  DEMO_NOW,
  NOT_MEDICARE,
  YEARS,
  a1cBandOf,
  ageAtYearEnd,
  countyOf,
  dataFiles,
  fmtDate,
  groupings,
  MY,
  measures,
  allMembers,
  members,
  memberCounties,
  memberStates,
  militaryOf,
  resultsFor,
  stateName,
  tally,
} from "./data";
import type {
  DataFile,
  FileId,
  Member,
  MeasureCode,
  MeasureState,
  Tally,
} from "./data";
import { fileTitle } from "./copy";
import { seededGapOpen } from "./careGaps";
import {
  A1C_VALUES,
  AGE_GROUPS,
  OPEN_GAP_VALUES,
  MILITARY_VALUES,
  SEX_VALUES,
  ageGroupFor,
  openGapsLabel,
} from "./sharedFilters";

/* ---------------------------------------------------------------- filters (FR-703) */

export interface DashFilters {
  /** The measurement period is always Jan 1 to Dec 31 of this year. */
  year: number;
  memberId: string;
  /** Keep only members with this result. Empty = All. */
  status: "" | "Met" | "Gap" | "Review" | "Excluded";
  /** Date of birth between these two dates (yyyy-mm-dd). Empty = no limit. */
  dobFrom: string;
  dobTo: string;
  /** Age on Dec 31 of the year. Empty = no limit. */
  ageFrom: string;
  ageTo: string;
  /** "Female", "Male" or "" (All). */
  sex: string;
  /** How many measures the member has not met, as a label ("No open gaps", "2 open gaps"). "" = All. */
  openGaps: string;
  ageGroup: string[];
  race: string[];
  ethnicity: string[];
  provider: string[];
  /** Measure codes the member is excluded from. */
  excluded: string[];
  /** Date of the record that made the measure Met (latest one), between these two dates. */
  evFrom: string;
  evTo: string;
  /** HbA1c band ("Above 9%"...). "" = All. */
  a1c: string;
  /** "" = All. */
  state: string;
  county: string;
  military: string;
  /** Version 3: "5|year" (number and unit, month or year). Empty = no limit. */
  ageMin: string;
  ageMax: string;
}

export const emptyFilters = (year: number = CURRENT_YEAR): DashFilters => ({
  year,
  memberId: "",
  status: "",
  dobFrom: "",
  dobTo: "",
  ageFrom: "",
  ageTo: "",
  sex: "",
  openGaps: "",
  ageGroup: [],
  race: [],
  ethnicity: [],
  provider: [],
  excluded: [],
  evFrom: "",
  evTo: "",
  a1c: "",
  state: "",
  county: "",
  military: "",
  ageMin: "",
  ageMax: "",
});

/** Version 3 reads the same values as the member lists: Gender with Other and Unknown, fixed Age Ranges, Race and Ethnicity with None, nine Military Status values. */
const v3 = () => getVersion() >= 3;
/** Version 3 writes BCS, CCS and COL (the sheet's names), not BCS-E, CCS-E and COL-E. */
export const v3Code = (s: string) => (v3() ? s.replace(/\b(BCS|CCS|COL)-E\b/g, "$1") : s);
export const sexOf = (m: Member) =>
  v3() ? genderV3(m) : m.gender === "female" ? "Female" : "Male";

/** Age groups (the same list as on the Members list). Age is taken on Dec 31 of the measurement year, like the measures do. */
export const ageBands = AGE_GROUPS;
export const ageGroupOf = (m: Member, year: number) =>
  v3() ? ageRangeOf(m.dob) : ageGroupFor(ageAtYearEnd(m.dob, year));

const groupOf = (key: string) => groupings.find((g) => g.key === key)!.of;
export const raceOf = (m: Member) => (v3() ? raceV3(m) : groupOf("race")(m));
export const ethnicityOf = (m: Member) =>
  v3() ? ethnicityV3(m) : groupOf("ethnicity")(m);
export const providerOf = groupOf("provider");

/** The measure states of one member for all five measures. */
/** Not-met measures. In Version 3 this is the "# Open Gaps" of the Members list: a gap that staff already closed no longer counts (the current year only, a past year has no care work). */
export const openGapCount = (m: Member, year: number) =>
  measures.filter(
    (x) =>
      resultsFor(m, year)[x.code].state === "Gap" &&
      (!v3() || year !== MY || seededGapOpen(m, x.code)),
  ).length;

const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const inDays = (d: Date | null | undefined, from: string, to: string) => {
  if (!from && !to) return true;
  if (!d) return false;
  const x = isoDay(d);
  return (!from || x >= from) && (!to || x <= to);
};
/** The records that made a measure Met (one measure on a measure tab, all of them without a code). */
const evidenceOf = (m: Member, year: number, code?: MeasureCode) =>
  measures
    .filter((x) => !code || x.code === code)
    .flatMap((x) => {
      const r = resultsFor(m, year)[x.code];
      return r.state === "Met" && r.evidence ? [r.evidence] : [];
    });

/** Members that pass every filter. Several values inside one filter mean "any of them"; different filters all have to match. */
export function filterMembers(f: DashFilters, code?: MeasureCode): Member[] {
  const id = f.memberId.trim().toLowerCase();
  return allMembers().filter((m) => {
    if (
      id &&
      !(
        m.id.toLowerCase().includes(id) ||
        m.name.toLowerCase().includes(id) ||
        (v3() && tricareIdOf(m).includes(id))
      )
    )
      return false;
    if (f.sex && sexOf(m) !== f.sex) return false;
    if (f.ageFrom !== "" || f.ageTo !== "") {
      const age = ageAtYearEnd(m.dob, f.year);
      if (f.ageFrom !== "" && age < Number(f.ageFrom)) return false;
      if (f.ageTo !== "" && age > Number(f.ageTo)) return false;
    }
    if (!inDays(m.dob, f.dobFrom, f.dobTo)) return false;
    if (f.openGaps) {
      const n = openGapCount(m, f.year);
      if (v3()) {
        const [op, num] = f.openGaps.split("|");
        const t = Number(num);
        if (num !== "" && !isNaN(t)) {
          const ok =
            op === "<" ? n < t : op === "<=" ? n <= t : op === ">" ? n > t : op === ">=" ? n >= t : n === t;
          if (!ok) return false;
        }
      } else if (openGapsLabel(n) !== f.openGaps) return false;
    }
    if (f.ageMin || f.ageMax) {
      const { months } = ageParts(m.dob);
      const per = (u: string) => (u === "year" ? 12 : 1);
      if (f.ageMin) {
        const [num, u] = f.ageMin.split("|");
        if (num !== "" && months < Number(num) * per(u)) return false;
      }
      if (f.ageMax) {
        const [num, u] = f.ageMax.split("|");
        if (num !== "" && months >= (Number(num) + 1) * per(u)) return false;
      }
    }
    if (
      f.excluded.length &&
      !measures.some(
        (x) =>
          f.excluded.includes(x.code) &&
          resultsFor(m, f.year)[x.code].state === "Excluded",
      )
    )
      return false;
    if (f.evFrom || f.evTo) {
      const latest = evidenceOf(m, f.year, code)
        .map((e) => e.date)
        .sort((a, b) => b.getTime() - a.getTime())[0];
      if (!inDays(latest, f.evFrom, f.evTo)) return false;
    }
    if (f.a1c && a1cBandOf(m, f.year) !== f.a1c) return false;
    if (f.state && stateName(m.state) !== f.state) return false;
    if (f.county && countyOf(m) !== f.county) return false;
    if (f.military && (v3() ? militaryV3(m) : militaryOf(m)) !== f.military)
      return false;
    if (f.ageGroup.length && !f.ageGroup.includes(ageGroupOf(m, f.year)))
      return false;
    if (f.race.length && !f.race.includes(raceOf(m))) return false;
    if (f.ethnicity.length && !f.ethnicity.includes(ethnicityOf(m)))
      return false;
    if (f.provider.length && !f.provider.includes(providerOf(m))) return false;
    if (f.status && code && resultsFor(m, f.year)[code].state !== f.status)
      return false;
    return true;
  });
}

export const activeFilterCount = (f: DashFilters) =>
  [
    f.memberId.trim(),
    f.dobFrom || f.dobTo,
    f.openGaps,
    f.excluded.length,
    f.evFrom || f.evTo,
    f.a1c,
    f.sex,
    f.ageFrom || f.ageTo,
    f.ageMin,
    f.ageMax,
    f.state,
    f.county,
    f.military,
    f.ageGroup.length,
    f.provider.length,
    f.race.length,
    f.ethnicity.length,
    f.status,
  ].filter(Boolean).length;

export interface FacetOptions {
  sex: string[];
  ageGroup: string[];
  provider: string[];
  race: string[];
  ethnicity: string[];
  state: string[];
  county: string[];
  military: string[];
  openGaps: string[];
  a1c: string[];
}
const sortedSet = (xs: string[]) =>
  [...new Set(xs)].sort((a, b) => a.localeCompare(b));
/** Choices for the filters. Age group, Sex and Military status are fixed lists shared with the Members list; the rest come from the members. */
export function facetOptions(): FacetOptions {
  return {
    sex: v3() ? GENDER_V3 : SEX_VALUES,
    ageGroup: v3() ? AGE_RANGES.map((r) => r.label) : AGE_GROUPS.map((b) => b.label),
    provider: sortedSet(allMembers().map(providerOf)),
    race: sortedSet([...allMembers().map(raceOf), ...(v3() ? [NONE] : [])]),
    ethnicity: sortedSet([...allMembers().map(ethnicityOf), ...(v3() ? [NONE] : [])]),
    state: memberStates,
    county: memberCounties,
    military: v3() ? MILITARY_V3 : MILITARY_VALUES,
    openGaps: OPEN_GAP_VALUES,
    a1c: A1C_VALUES,
  };
}

/* ---------------------------------------------------------------- the cards (FR-702) */

export interface Kpis {
  /** Everyone in the files for these filters. */
  initial: number;
  t: Tally;
}
export const kpisFor = (
  code: MeasureCode,
  list: Member[],
  year: number,
): Kpis => ({ initial: list.length, t: tally(list, code, year) });

/** GSD is reported as two rates. The first is HbA1c under 8%. This is the second: HbA1c at or under 9%. */
export function secondRate(list: Member[], year: number) {
  let met = 0;
  let den = 0;
  for (const m of list) {
    const r = resultsFor(m, year).GSD;
    if (r.state !== "Met" && r.state !== "Gap") continue;
    den++;
    const v = r.evidence?.tag === "hba1c" ? r.evidence.value : undefined;
    if (v !== undefined && v <= 9) met++;
  }
  return { den, met, notMet: den - met, rate: den ? (met / den) * 100 : 0 };
}

/** The measurement period is the whole calendar year. Version 3 shows the current year as year to date: January 1 to the last run date. */
export const periodText = (year: number) =>
  getVersion() >= 3 && year === CURRENT_YEAR
    ? `${fmtDate(new Date(year, 0, 1))} to ${fmtDate(startOfDay(DEMO_NOW))} (year to date)`
    : `${fmtDate(new Date(year, 0, 1))} to ${fmtDate(new Date(year, 11, 31))}`;

/** Version 3, GSD: the lowest final HbA1c of the year is the result. Total = members counted in the rate. Over 8% and over 9% are counted among them. */
export function a1cCounts(list: Member[], year: number) {
  let total = 0;
  let over8 = 0;
  let over9 = 0;
  for (const m of list) {
    const r = resultsFor(m, year).GSD;
    if (r.state !== "Met" && r.state !== "Gap") continue;
    total++;
    const v = r.evidence?.tag === "hba1c" ? r.evidence.value : undefined;
    if (v === undefined) continue;
    if (v >= 8) over8++;
    if (v > 9) over9++;
  }
  return { total, over8, over9 };
}

/* ---------------------------------------------------------------- groups (disparity charts, FR-703) */

export type Dimension = "race" | "ethnicity" | "ageGroup" | "sex" | "provider";
export const dimensionLabel: Record<Dimension, string> = {
  race: "race",
  ethnicity: "ethnicity",
  get ageGroup() {
    return v3() ? "age range" : "age group";
  },
  get sex() {
    return v3() ? "gender" : "sex";
  },
  provider: "primary care provider",
};
const keyOf = (dim: Dimension, year: number): ((m: Member) => string) =>
  dim === "race"
    ? raceOf
    : dim === "ethnicity"
      ? ethnicityOf
      : dim === "sex"
        ? sexOf
        : dim === "provider"
          ? providerOf
          : (m) => ageGroupOf(m, year);

export interface GroupRate {
  group: string;
  t: Tally;
  /** Set when the group stands for several providers folded together. */
  folded?: boolean;
}

/** Rate per group for the members that pass the filters. Groups nobody is counted in are left out. */
export function groupRates(
  code: MeasureCode,
  list: Member[],
  year: number,
  dim: Dimension,
): GroupRate[] {
  const key = keyOf(dim, year);
  const by = new Map<string, Member[]>();
  for (const m of list) {
    const k = key(m);
    if (k === NOT_MEDICARE) continue;
    by.set(k, [...(by.get(k) ?? []), m]);
  }
  let rows: GroupRate[] = [...by.entries()]
    .map(([group, ms]) => ({ group, t: tally(ms, code, year) }))
    .filter((r) => r.t.denominator > 0);
  if (dim === "ageGroup") {
    const order = ageBands.map((b) => b.label);
    return rows.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group));
  }
  if (dim === "sex") return rows.sort((a, b) => a.group.localeCompare(b.group));
  rows = rows.sort((a, b) => b.t.denominator - a.t.denominator);
  if (dim === "provider" && rows.length > 8) {
    const head = rows.slice(0, 7);
    const tail = rows.slice(7).map((r) => r.group);
    const rest = list.filter((m) => tail.includes(key(m)));
    head.push({
      group: "Other providers",
      t: tally(rest, code, year),
      folded: true,
    });
    return head;
  }
  return rows;
}

/* ---------------------------------------------------------------- trend over runs (FR-708) */

export type Granularity =
  "daily" | "weekly" | "monthly" | "quarterly" | "annual";
export const granularityOptions: { value: Granularity; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
];

/** The first day the demo has data for (the oldest measurement year it can show). */
export const DATA_START = new Date(Math.min(...YEARS), 0, 1);
const DAY = 86_400_000;
const startOfDay = (x: Date) =>
  new Date(x.getFullYear(), x.getMonth(), x.getDate());
const addDays = (x: Date, n: number) =>
  new Date(x.getFullYear(), x.getMonth(), x.getDate() + n);
const endOfMonth = (y: number, m: number) => new Date(y, m + 1, 0);

/** Date range a granularity starts with: weekly about 18 months, daily the last 90 days, the rest everything we have. */
export function defaultRange(g: Granularity): { from: Date; to: Date } {
  const to = startOfDay(DEMO_NOW);
  if (g === "daily") return { from: addDays(to, -89), to };
  if (g === "weekly")
    return {
      from: new Date(to.getFullYear(), to.getMonth() - 18, to.getDate()),
      to,
    };
  return { from: DATA_START, to };
}
/** Longest range the chart allows for a granularity, in days: daily 6 months, weekly 2 years, monthly 3 years. */
export const maxRangeDays: Record<Granularity, number> = {
  daily: 183,
  weekly: 731,
  monthly: 1096,
  quarterly: 3650,
  annual: 3650,
};

/** The last day of each bucket (day, week ending Sunday, month, quarter, year) that falls in the range. The last bucket stops at the range end ("so far"). */
export function bucketEnds(g: Granularity, from: Date, to: Date): Date[] {
  const out: Date[] = [];
  const f = startOfDay(from);
  const t = startOfDay(to);
  if (g === "daily") {
    for (let d = f; d <= t; d = addDays(d, 1)) out.push(d);
    return out;
  }
  if (g === "weekly") {
    let d = addDays(f, (7 - f.getDay()) % 7);
    for (; d <= t; d = addDays(d, 7)) out.push(d);
    if (!out.length || out[out.length - 1] < t) out.push(t);
    return out;
  }
  const span = g === "monthly" ? 1 : g === "quarterly" ? 3 : 12;
  let y = f.getFullYear();
  let mo =
    g === "annual"
      ? 11
      : g === "quarterly"
        ? Math.floor(f.getMonth() / 3) * 3 + 2
        : f.getMonth();
  for (;;) {
    const end = endOfMonth(y, mo);
    if (end >= f) out.push(end > t ? t : end);
    if (end >= t) break;
    mo += span;
    while (mo > 11) {
      mo -= 12;
      y++;
    }
  }
  return out.filter((d, i) => i === 0 || d.getTime() !== out[i - 1].getTime());
}

const monthShort = (d: Date) => d.toLocaleString("en-US", { month: "short" });
export function bucketLabel(
  g: Granularity,
  d: Date,
  range: { from: Date; to: Date },
): string {
  const yy = String(d.getFullYear()).slice(2);
  const pad = (n: number) => String(n).padStart(2, "0");
  if (g === "daily" || g === "weekly")
    return range.from.getFullYear() === range.to.getFullYear()
      ? `${pad(d.getMonth() + 1)}/${pad(d.getDate())}`
      : `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${yy}`;
  if (g === "monthly") return `${monthShort(d)} ’${yy}`;
  if (g === "quarterly")
    return `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`;
  return String(d.getFullYear());
}

/** For one year: how many members are counted, and the day each Met member's evidence was dated. The rate on any day is the share with evidence on or before it. */
function yearStats(list: Member[], code: MeasureCode, year: number) {
  let den = 0;
  const met: number[] = [];
  for (const m of list) {
    const r = resultsFor(m, year)[code];
    const s: MeasureState = r.state;
    if (s !== "Met" && s !== "Gap") continue;
    den++;
    if (s === "Met")
      met.push((r.evidence?.date ?? new Date(year, 0, 1)).getTime());
  }
  met.sort((a, b) => a - b);
  return { den, met };
}
const countUpTo = (sorted: number[], t: number) => {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] <= t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
};

export type TrendMetric = "met" | "notmet";
const metric = (rate: number, which: TrendMetric) =>
  which === "met" ? rate : 100 - rate;

/** The rate as it stood at the end of each bucket. A run's measurement year is the year of its date. */
export function trendSeries(
  code: MeasureCode,
  list: Member[],
  g: Granularity,
  range: { from: Date; to: Date },
  which: TrendMetric,
) {
  const stats = new Map<number, ReturnType<typeof yearStats>>();
  const at = (d: Date) => {
    const y = d.getFullYear();
    if (!YEARS.includes(y)) return null;
    let s = stats.get(y);
    if (!s) {
      s = yearStats(list, code, y);
      stats.set(y, s);
    }
    if (!s.den) return null;
    return metric(
      (countUpTo(s.met, d.getTime() + DAY - 1) / s.den) * 100,
      which,
    );
  };
  const ends = bucketEnds(g, range.from, range.to);
  return {
    labels: ends.map((d) => bucketLabel(g, d, range)),
    values: ends.map(at),
    dates: ends,
  };
}

export interface TrendRow {
  id: string;
  start: Date;
  end: Date;
  /** Counted members who had met by the end of the period. */
  met: number;
  /** Counted members that year. */
  counted: number;
  /** Met % at the end of the period, or null when nobody is counted. */
  rate: number | null;
}

/** The numbers behind the trend chart: one row per period, with the period's start and end, met, counted and the rate. */
export function trendRows(
  code: MeasureCode,
  list: Member[],
  g: Granularity,
  range: { from: Date; to: Date },
): TrendRow[] {
  const stats = new Map<number, ReturnType<typeof yearStats>>();
  const statsOf = (y: number) => {
    let s = stats.get(y);
    if (!s) {
      s = yearStats(list, code, y);
      stats.set(y, s);
    }
    return s;
  };
  const ends = bucketEnds(g, range.from, range.to);
  return ends.map((end, i) => {
    const y = end.getFullYear();
    const yearStart = new Date(y, 0, 1);
    const prev = i ? addDays(ends[i - 1], 1) : startOfDay(range.from);
    const start = prev < yearStart ? yearStart : prev;
    const s = YEARS.includes(y) ? statsOf(y) : { den: 0, met: [] as number[] };
    const met = countUpTo(s.met, end.getTime() + DAY - 1);
    return {
      id: String(end.getTime()),
      start: start > end ? end : start,
      end,
      met,
      counted: s.den,
      rate: s.den ? (met / s.den) * 100 : null,
    };
  });
}

/** Same period of each year side by side (FR-708.7): months Jan to Dec, or quarters Q1 to Q4, one line per year. */
export function compareSeries(
  code: MeasureCode,
  list: Member[],
  g: "monthly" | "quarterly",
  which: TrendMetric,
) {
  const labels =
    g === "monthly"
      ? Array.from({ length: 12 }, (_, i) => monthShort(new Date(2000, i, 1)))
      : ["Q1", "Q2", "Q3", "Q4"];
  const years = [...YEARS].sort((a, b) => b - a);
  const today = startOfDay(DEMO_NOW);
  const series = years.map((y) => {
    const s = yearStats(list, code, y);
    return {
      year: y,
      values: labels.map((_, i): number | null => {
        const startMonth = g === "monthly" ? i : i * 3;
        const end = endOfMonth(y, g === "monthly" ? i : i * 3 + 2);
        if (new Date(y, startMonth, 1) > today || !s.den) return null;
        const d = end > today ? today : end;
        return metric(
          (countUpTo(s.met, d.getTime() + DAY - 1) / s.den) * 100,
          which,
        );
      }),
    };
  });
  return { labels, series };
}

/* ---------------------------------------------------------------- run info (FR-705) */

export interface SourceDate {
  id: FileId;
  title: string;
  receivedOn: Date;
}
/** Last and next update, and the files behind them. The schedule is a demo value: the real one comes from the pipeline's run times (DCS). */
export function runInfo() {
  const received = dataFiles.filter(
    (f) => f.receivedOn && f.status !== "Failed" && f.status !== "Not received",
  );
  const sources: SourceDate[] = received
    .map((f) => ({
      id: f.id,
      title: fileTitle(f.id),
      receivedOn: f.receivedOn!,
    }))
    .sort(
      (a, b) =>
        b.receivedOn.getTime() - a.receivedOn.getTime() ||
        a.id.localeCompare(b.id),
    );
  const last = new Date(
    DEMO_NOW.getFullYear(),
    DEMO_NOW.getMonth(),
    DEMO_NOW.getDate(),
    2,
    0,
  );
  const next = new Date(
    last.getFullYear(),
    last.getMonth(),
    last.getDate() + 1,
    2,
    0,
  );
  return { last, next, sources, schedule: "Every day at 2:00 AM" };
}
export const fmtRun = (x: Date) =>
  `${fmtDate(x)}, ${x.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;

/* ---------------------------------------------------------------- inputs (FR-704) */

export interface InputRow {
  file: DataFile;
  title: string;
  rowsUsed: number;
  rejected: number;
}
/** What went into a measure: each file it reads, how many rows came in, how many were rejected, and the newest file date. */
export function inputsFor(code: MeasureCode): InputRow[] {
  const def = measures.find((x) => x.code === code)!;
  return def.files.map((id) => {
    const file = dataFiles.find((f) => f.id === id)!;
    const rejected = file.status === "Failed" ? file.rows : 0;
    return {
      file,
      title: fileTitle(id),
      rowsUsed:
        file.status === "Failed" || file.status === "Not received"
          ? 0
          : file.rows,
      rejected,
    };
  });
}

export interface LeftOut {
  reason: string;
  kind: "Excluded" | "Not in the measure";
  count: number;
}
/** Plain reason with the member-specific bits (dates, day counts) removed, so members with the same reason are counted together. */
const plain = (r: string) =>
  r
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\s+on \d{2}\/\d{2}\/\d{4}/g, "")
    .replace(/\s+since \d{2}\/\d{2}\/\d{4}/g, "")
    .replace(/Age is outside .*/, "Age is outside the measure’s age range")
    .replace(/^Died$/, "Died during the year")
    .trim();

/** Why members are not in the rate: excluded by a rule, or not in the measure at all (age, sex, no diabetes, not enrolled all year). */
export function leftOutFor(
  code: MeasureCode,
  list: Member[],
  year: number,
): LeftOut[] {
  const by = new Map<string, LeftOut>();
  for (const m of list) {
    const r = resultsFor(m, year)[code];
    if (r.state !== "Excluded" && r.state !== "Not eligible") continue;
    const reason = plain(r.reason);
    const kind = r.state === "Excluded" ? "Excluded" : "Not in the measure";
    const k = `${kind}|${reason}`;
    by.set(k, { reason, kind, count: (by.get(k)?.count ?? 0) + 1 });
  }
  return [...by.values()].sort((a, b) =>
    a.kind === b.kind ? b.count - a.count : a.kind === "Excluded" ? -1 : 1,
  );
}

/* ---------------------------------------------------------------- admin: rejected rows (FR-710) */

export interface RejectedRow {
  id: string;
  fileName: string;
  fileType: string;
  source: string;
  rowNumber: number;
  memberId: string;
  loadedOn: Date;
  result: "Rejected" | "Warning" | "Not received";
  problem: string;
  /** Short reason, used to group the problems. */
  reason: string;
  /** The column in the file that has the problem, the value that was received, and the rule it broke. */
  field: string;
  value: string;
  rule: string;
  /** Measures that read this file, so they may be affected. */
  measures: string;
  /** Critical: the file was rejected or did not arrive and a measure reads it, so results may be incomplete. Warning: everything else. */
  impact: "Critical" | "Warning";
}

/** What an administrator can do about each kind of problem. The list is the same for every row with that reason. */
export const reasonFix: Record<string, string> = {
  "Unknown value":
    "Send the real race and ethnicity if Madigan has them. Until then these members show as Unknown.",
  "Planned, not done":
    "Nothing to fix. The procedure counts once it is done and sent with a completed status.",
  "Missing required field":
    "Fill in the empty field on these lines and send the file again.",
  "Code not recognized":
    "Correct the codes and send the whole file again. One bad row rejects the file.",
  "File not received": "Ask Madigan to send the file.",
};

export interface LoadSummary {
  filesReceived: number;
  filesTotal: number;
  rowsReceived: number;
  rowsAccepted: number;
  rowsRejected: number;
  /** Rows that were used but have a problem noted. */
  warnings: number;
  rejectedFiles: string[];
}

/** Totals for the latest load. A file with a failed check is rejected as a whole, so all its rows count as rejected. */
export function loadSummary(): LoadSummary {
  const got = dataFiles.filter((f) => f.status !== "Not received");
  const failed = got.filter((f) => f.status === "Failed");
  const rowsReceived = got.reduce((n, f) => n + f.rows, 0);
  const rowsRejected = failed.reduce((n, f) => n + f.rows, 0);
  return {
    filesReceived: got.length,
    filesTotal: dataFiles.length,
    rowsReceived,
    rowsAccepted: rowsReceived - rowsRejected,
    rowsRejected,
    warnings: got
      .filter((f) => f.status !== "Failed")
      .reduce((n, f) => n + f.warnings, 0),
    rejectedFiles: failed.map((f) => `${f.id}.csv`),
  };
}

export interface ReasonRow {
  reason: string;
  result: RejectedRow["result"];
  impact: RejectedRow["impact"];
  count: number;
  fix: string;
}

/** The problems grouped by reason, most common first. */
export function reasonRows(rows: RejectedRow[]): ReasonRow[] {
  const by = new Map<string, ReasonRow>();
  for (const r of rows) {
    const cur = by.get(r.reason);
    if (cur) {
      cur.count++;
      if (r.impact === "Critical") cur.impact = "Critical";
    } else
      by.set(r.reason, {
        reason: r.reason,
        result: r.result,
        impact: r.impact,
        count: 1,
        fix: reasonFix[r.reason] ?? "",
      });
  }
  return [...by.values()].sort((a, b) => b.count - a.count);
}

const fileSource = "Madigan";

/** One row per problem found in a file. Where the demo members carry the problem (unknown race, a procedure not yet done) the real member is named; a rejected or malformed row is picked the same way every time. */
export function rejectedRows(): RejectedRow[] {
  const out: RejectedRow[] = [];
  const file = (id: FileId) => dataFiles.find((f) => f.id === id)!;
  const push = (
    r: Omit<RejectedRow, "id" | "source" | "fileType" | "measures" | "impact">,
    fileId: FileId,
  ) =>
    out.push({
      ...r,
      id: `${fileId}-${out.length}`,
      source: fileSource,
      fileType: fileTitle(fileId),
      measures: v3Code(file(fileId).usedBy.join(", ")) || "None",
      impact:
        r.result !== "Warning" && file(fileId).usedBy.length
          ? "Critical"
          : "Warning",
    });
  const loaded = (id: FileId) => file(id).receivedOn ?? DEMO_NOW;

  // member-RES: unknown race and ethnicity
  members.forEach((m, i) => {
    if (m.raceCodes[0] === "UNK")
      push(
        {
          fileName: "member-RES.csv",
          rowNumber: i + 2,
          memberId: m.id,
          loadedOn: loaded("member-RES"),
          result: "Warning",
          reason: "Unknown value",
          field: "race, ethnicity",
          value: "UNK",
          rule: "Race and ethnicity should be a known code",
          problem:
            "Race and ethnicity are both UNK (unknown). Members with unknown race are grouped as Unknown in the race chart.",
        },
        "member-RES",
      );
  });

  // proc: procedures still in "preparation"
  let procRow = 1;
  for (const m of members)
    for (const e of m.events) {
      if (e.file !== "proc") continue;
      procRow++;
      if (e.status === "preparation")
        push(
          {
            fileName: "proc.csv",
            rowNumber: procRow,
            memberId: m.id,
            loadedOn: loaded("proc"),
            result: "Warning",
            reason: "Planned, not done",
            field: "status",
            value: "preparation",
            rule: "Only a completed procedure counts",
            problem: `Status is "preparation" (${e.text}). A planned procedure does not count toward a measure.`,
          },
          "proc",
        );
    }

  // claim-line: lines with no place of service (3 in the demo run), picked evenly
  const claimMembers = members.filter((m) =>
    m.events.some((e) => e.file === "claim-line"),
  );
  const claimLines = file("claim-line").warnings;
  for (let k = 0; k < claimLines && claimMembers.length; k++) {
    const m =
      claimMembers[
        Math.floor(((k + 1) * claimMembers.length) / (claimLines + 1))
      ];
    push(
      {
        fileName: "claim-line.csv",
        rowNumber: 40 + k * 97,
        memberId: m.id,
        loadedOn: loaded("claim-line"),
        result: "Warning",
        reason: "Missing required field",
        field: "place_of_service",
        value: "(blank)",
        rule: "Needed to recognise a visit",
        problem:
          "Place of service is empty. The line is kept, but a visit that needs a place of service may not be recognized.",
      },
      "claim-line",
    );
  }

  // pharm-c: vaccine codes that are not CVX. One bad row rejects the whole file.
  const vacMembers = members.filter((m) =>
    m.events.some((e) => e.file === "pharm-c"),
  );
  const bad = file("pharm-c").errors;
  for (let k = 0; k < bad && vacMembers.length; k++) {
    const m = vacMembers[Math.floor(((k + 1) * vacMembers.length) / (bad + 1))];
    push(
      {
        fileName: "pharm-c.csv",
        rowNumber: 12 + k * 31,
        memberId: m.id,
        loadedOn: loaded("pharm-c"),
        result: "Rejected",
        reason: "Code not recognized",
        field: "vaccine_code",
        value: "XX-99",
        rule: "Must be a CVX code",
        problem:
          'Vaccine code "XX-99" is not a CVX code. The whole file was rejected, so none of its rows reached the measures.',
      },
      "pharm-c",
    );
  }

  // files that did not arrive
  for (const f of dataFiles)
    if (f.status === "Not received")
      push(
        {
          fileName: `${f.id}.csv`,
          rowNumber: 0,
          memberId: "–",
          loadedOn: DEMO_NOW,
          result: "Not received",
          reason: "File not received",
          field: "–",
          value: "–",
          rule: "The file is expected with each release",
          problem: f.note,
        },
        f.id,
      );

  return out;
}
