import { useEffect, useMemo, useState } from "react";
import { getVersion, useVersion } from "../version";
import type { ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Box, Skeleton, Typography } from "@mui/material";
import {
  AutocompleteField,
  DateField,
  PageContainer,
  SelectField,
  SwitchField,
  TextField,
} from "sevida-ui";
import {
  QsBarChart,
  QsColumnChart,
  QsControl,
  QsControlsBar,
  QsDonut,
  QsGapBars,
  QsGapColumns,
  QsGapTrend,
  QsFmt,
  QsFrame,
  QsKpi,
  QsRangeSlider,
  QsSheet,
  QsTable,
  QsText,
  QsTile,
  NotesContext,
} from "../quicksight/kit";
import type { QsBar, QsCol } from "../quicksight/kit";
import { qs } from "../quicksight/qsTheme";
import {
  a1cBandOf,
  countyOf,
  militaryOf,
  dataFiles,
  ageAtYearEnd,
  ageBandsOf,
  fmtDate,
  measureByCode,
  measureFor,
  MY,
  measures,
  allMembers,
  members,
  resultsFor,
  continuouslyEnrolled,
  stateLabel,
  stateName,
  tally,
  YEARS,
  getAsOfStep,
  setAsOfStep,
} from "../data";
import type { Member, MeasureCode, MeasureState } from "../data";
import {
  ageGroupOf,
  bandsFor,
  compareSeries,
  ethnicityOf,
  openGapCount,
  v3Code,
  providerOf,
  raceOf,
  emptyFilters,
  facetOptions,
  filterMembers,
  fmtRun,
  groupRates,
  gapsByManager,
  bucketLabel,
  granularityOptions,
  inputsFor,
  kpisFor,
  leftOutFor,
  loadSummary,
  periodText,
  reasonRows,
  rejectedRows,
  runInfo,
  secondRate,
  a1cCounts,
  sexOf,
  trendRows,
  fmtRunLong,
  snapshotAt,
  compareDays,
  evaluatedIn,
} from "../dashboardData";
import type {
  DashFilters,
  Dimension,
  Granularity,
  RejectedRow,
  TrendMetric,
} from "../dashboardData";
import {
  TrendChart,
  rangePresets,
  useTrendControls,
} from "../components/dashboard/TrendCard";
import {
  V3_DEFINITION,
  V3_EXCLUSIONS,
  V3_GAP_LABEL,
  V3_MET,
  gapShort,
  ageLabel,
  ageParts,
  militaryV3,
  tricareIdOf,
} from "../v3Data";

const ageMonths = (dob: Date) => ageParts(dob).months;
import { fileTitle } from "../copy";
import { MEASURE_VERSION } from "../careGaps";
import { SMALL_GROUP } from "../insights";
import { useRole } from "../roles";
import { RunDetails, RunNotice, RunSelect } from "../components/RunBits";
import { fmtRunTime, useRun } from "../runs";
import { PCMS, pcmByName, pcmLabel } from "../v7Data";
import { exampleInsight } from "../components/dashboard/ResultInsight";
import { useFakeLoad } from "../components/analytics/AnalyticsBits";
import type { Run } from "../runs";
import {
  ALL,
  LABEL,
  openGapsLabel,
  measureOptionsFor,
  optionsOf,
  resultOptions,
  gapStatusOptions,
  gapStatusText,
} from "../sharedFilters";

/** Example benchmark per measure, only so the dashed line can be drawn. The real value comes from Madigan (Q19). */
const BENCHMARK: Record<MeasureCode, number> = {
  WCV: 55,
  "BCS-E": 70,
  "CCS-E": 65,
  "COL-E": 60,
  GSD: 70,
};
const DAY_MS = 86_400_000;

/** Filter names are sentence case, like every other screen. */
const FL = LABEL;
/** A to Z, by what the viewer reads. */
const az = (xs: string[]) => [...xs].sort((a, b) => a.localeCompare(b));
const azOpt = <T extends { label: string }>(xs: T[]) =>
  [...xs].sort((a, b) => a.label.localeCompare(b.label));
const RUN_LABEL = "Results as of Run";
/** Controls in a bar: A to Z by name. */
const byName = (items: [string, ReactNode][]) =>
  [...items]
    .filter((i) => i[1] !== null)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map((i) => i[1]);
/** Version 8 (Lucid chart): the About box text. Only BCS is on the Lucid chart; the other measures keep the existing wording. */
const aboutFor = (code: MeasureCode): [string, string][] =>
  code === "BCS-E"
    ? [
        [
          "Eligible population:",
          "members 42–74 years of age as of 31 December of the measurement year, recommended for routine breast cancer screening and continuously enrolled from 1 October two years prior to the measurement year through 31 December of the measurement year, without a required exclusion.",
        ],
        [
          "Numerator:",
          "one or more mammograms any time on or between October 1 two years prior to the measurement period and the end of the measurement period.",
        ],
        [
          "Exclusions:",
          "death, hospice, palliative care, I-SNP or long-term institution (Medicare, 66 and older), advanced illness and frailty (66 and older), bilateral mastectomy, or gender-affirming chest surgery with a diagnosis of gender dysphoria.",
        ],
      ]
    : [
        ["Eligible population:", V3_DEFINITION[code]],
        ["Numerator (closed gap):", V3_MET[code]],
        ["Exclusions:", V3_EXCLUSIONS[code]],
      ];
/** Version 8 (Lucid chart): "HEDIS Care Gaps Dashboard - Breast Cancer Screening (BCS)". */
const lucidTitle = (code: MeasureCode) =>
  `HEDIS Care Gaps Dashboard - ${V3_GAP_LABEL[code].replace(/^\w+\s[-·]\s/, "")} (${gapShort(code)})`;
/** Version 7 (Lucid design): "1st Jan 2026". */
const ordDate = (d: Date) => {
  const n = d.getDate();
  const th = n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th";
  return `${n}${th} ${d.toLocaleString("en-US", { month: "short" })} ${d.getFullYear()}`;
};
/** Version 7 (UX order): controls in the order people use them, not A to Z. Anything not listed goes last, A to Z. */
const byOrder = (items: [string, ReactNode][], order: string[]) => {
  const at = (n: string) => {
    const i = order.indexOf(n);
    return i < 0 ? order.length : i;
  };
  return [...items]
    .filter((i) => i[1] !== null)
    .sort((a, b) => at(a[0]) - at(b[0]) || a[0].localeCompare(b[0]))
    .map((i) => i[1]);
};

/** Controls that live on one sheet only. A choice made there still filters the other sheets, so those sheets say so. */
const SHEET_ONLY: {
  sheet: "Overview" | "Details";
  label: string;
  text: (f: DashFilters) => string;
}[] = [
  { sheet: "Overview", get label() {
      return FL.result;
    }, text: (f) => (f.status && getVersion() >= 7 ? gapStatusText(f.status) : f.status) },
  { sheet: "Overview", get label() {
      return FL.member;
    }, text: (f) => f.memberId.trim() },
  {
    sheet: "Overview",
    get label() {
      return FL.age;
    },
    text: (f) =>
      f.ageFrom !== "" || f.ageTo !== ""
        ? `${f.ageFrom || "0"} to ${f.ageTo || "100"}`
        : "",
  },
  { sheet: "Overview", get label() {
      return FL.sex;
    }, text: (f) => f.sex },
  {
    sheet: "Overview",
    get label() {
      return FL.ageGroup;
    },
    text: (f) => f.ageGroup.join(", "),
  },
  { sheet: "Overview", get label() {
      return FL.race;
    }, text: (f) => f.race.join(", ") },
  {
    sheet: "Overview",
    get label() {
      return FL.ethnicity;
    },
    text: (f) => f.ethnicity.join(", "),
  },
  {
    sheet: "Overview",
    get label() {
      return getVersion() >= 7 ? "Primary Care Manager" : FL.provider;
    },
    text: (f) => f.provider.join(", "),
  },
  { sheet: "Overview", get label() {
      return FL.openGaps;
    }, text: (f) => f.openGaps.replace("|", " ") },
  {
    sheet: "Overview",
    label: "Age Min",
    text: (f) => f.ageMin.replace("|", " "),
  },
  {
    sheet: "Overview",
    label: "Age Max",
    text: (f) => f.ageMax.replace("|", " "),
  },
  {
    sheet: "Details",
    get label() {
      return FL.dob;
    },
    text: (f) =>
      f.dobFrom || f.dobTo ? `${f.dobFrom || "…"} to ${f.dobTo || "…"}` : "",
  },
  {
    sheet: "Details",
    get label() {
      return FL.excluded;
    },
    text: (f) => f.excluded.join(", "),
  },
  {
    sheet: "Details",
    get label() {
      return FL.evDate;
    },
    text: (f) =>
      f.evFrom || f.evTo ? `${f.evFrom || "…"} to ${f.evTo || "…"}` : "",
  },
  { sheet: "Details", get label() {
      return FL.a1c;
    }, text: (f) => f.a1c },
  { sheet: "Details", get label() {
      return FL.state;
    }, text: (f) => f.state },
  { sheet: "Details", get label() {
      return FL.county;
    }, text: (f) => f.county },
  { sheet: "Details", get label() {
      return FL.military;
    }, text: (f) => f.military },
];

/** Tells the viewer which choices made on another sheet are still filtering this one (a hidden filter would be a trap). */
function OtherSheetFilters({
  f,
  sheet,
}: {
  f: DashFilters;
  sheet: "Overview" | "Details" | "Data";
}) {
  const active = SHEET_ONLY.filter(
    (x) => (sheet === "Data" || x.sheet !== sheet) && x.text(f),
  );
  if (!active.length) return null;
  const from =
    sheet === "Overview"
      ? "Details"
      : sheet === "Details"
        ? "Overview"
        : "Overview or Details";
  return (
    <QsSheet>
      <QsTile cols={36} bare tone="warning" fr="703" ask={["Q28"]}>
        <QsText>
          <p>
            <b>Also filtering this sheet, chosen on {from}:</b>{" "}
            {active.map((x) => `${x.label}: ${x.text(f)}`).join(" · ")}. Press
            Reset to clear them.
          </p>
        </QsText>
      </QsTile>
    </QsSheet>
  );
}

/** Version 7: the # Open Gaps menu in words. */
const OPEN_GAP_WORDS: Record<string, string> = {
  "=": "Exactly",
  "<": "Fewer than",
  "<=": "At most",
  ">": "More than",
  ">=": "At least",
};
const SHEETS = ["Overview", "Details", "Data", "Admin", "Help"];
/** Version 7: three sheets only (Overview, Members, Admin). The Details sheet is called Members; Data and Help are not shown. */
const tabLabel = (t: string) =>
  getVersion() >= 7 && t === "Details" ? "Members" : t;
const tabsFor = () => (getVersion() >= 7 ? ["Overview", "Details", "Admin"] : SHEETS);

/** Version 7: the populations the Member Details table can list. */
type MemberDetailsFilter = { pop: "all" | "initial" | "eligible" | "excluded" | "met" | "gap"; tricare: string; name: string };
const POPULATIONS: { value: MemberDetailsFilter["pop"]; label: string; states: MeasureState[] | null }[] = [
  { value: "all", label: "All Members Evaluated", states: null },
  { value: "initial", label: "Initial Population", states: ["Met", "Gap", "Excluded", "Review"] },
  { value: "eligible", label: "Eligible Population", states: ["Met", "Gap"] },
  { value: "excluded", label: "Excluded Population", states: ["Excluded"] },
  { value: "met", label: "Met Count", states: ["Met"] },
  { value: "gap", label: "Not Met Count", states: ["Gap"] },
];
const withAll = (xs: string[]) => [{ value: "", label: ALL }, ...optionsOf(xs)];
const p1 = (n: number) => `${n.toFixed(1)}%`;
const n0 = (n: number) => n.toLocaleString("en-US");
const share = (n: number, d: number) => (d ? (n / d) * 100 : 0);

const stateColor: Record<MeasureState, string> = {
  Met: qs.meaning.met,
  Gap: qs.meaning.gapText,
  Excluded: qs.meaning.neutral,
  Review: qs.meaning.neutral,
  "Not eligible": qs.meaning.neutral,
};

/**
 * The dashboard drawn to the QuickSight style guide (leap-context-plane PR #35): only QuickSight components,
 * a 36-column grid, a 12-column controls bar, QuickSight's tab strip and toolbar, one font, square bars, bold or normal text.
 * Where the guide is silent the safe version is drawn and the tile carries an "Ask" tag (see quicksight-audit.xlsx).
 */
export function QuickSightDashboardPage() {
  const { version } = useVersion();
  const { role } = useRole();
  const [sheet, setSheet] = useState("Overview");
  const [params] = useSearchParams();
  const fromCards = params.get("from") === "cards";
  const [code, setCode] = useState<MeasureCode>(
    () => (measureByCode(params.get("m") ?? "") ?? measures[0]).code,
  );
  // Version 3: the sidebar picks the measure (Analytics > BCS, CCS, ...), so the page follows the address.
  const mParam = params.get("m");
  useEffect(() => {
    if (version.id >= 3 && mParam && measureByCode(mParam)) {
      setCode(measureByCode(mParam)!.code);
      setView("");
    }
  }, [version.id, mParam]);
  const [f, setF] = useState<DashFilters>(emptyFilters());
  const [view, setView] = useState<"" | "Met" | "Gap">("");
  // Version 7 (Lucid design): the Member Details sheet has its own Population, Tricare ID and Member Name controls.
  const [md, setMd] = useState<MemberDetailsFilter>({ pop: "all", tricare: "", name: "" });
  const [notes, setNotes] = useState({ fr: version.id < 3, ask: false });
  const [withWarnings, setWithWarnings] = useState(false);
  const options = useMemo(() => facetOptions(), []);
  const set = <K extends keyof DashFilters>(key: K, value: DashFilters[K]) =>
    setF((p) => ({ ...p, [key]: value }));
  const reset = () => {
    setF(emptyFilters());
    setView("");
    setMd({ pop: "all", tricare: "", name: "" });
  };

  const year = f.year;
  const list = useMemo(() => filterMembers(f, code), [f, code]);
  const def = measureFor(measureByCode(code)!, year);
  // Version 7: each page has its own browser tab title, and a skeleton shows while the dashboard draws.
  const isV7 = version.id >= 7;
  useEffect(() => {
    if (!isV7) return;
    const before = document.title;
    document.title = `${tabLabel(sheet)}, ${v3Code(code)}, Analytics, Sevida`;
    return () => {
      document.title = before;
    };
  }, [isV7, sheet, code]);
  const drawing = useFakeLoad(`${code}|${year}`, 600) && isV7;

  /* ---- controls (each one is a QuickSight control) ---- */
  const cMeasure = version.id >= 3 ? null : (
    <QsControl key="measure" info="Pick the measure. Every sheet follows it.">
      <SelectField
        label={FL.measure}
        value={code}
        onChange={(v) => {
          setCode(v as MeasureCode);
          setView("");
        }}
        options={azOpt(measureOptionsFor())}
      />
    </QsControl>
  );
  const cRun = (
    <QsControl
      key="run"
      info="Pick the nightly run the numbers come from. Every sheet follows it."
    >
      <RunSelect />
    </QsControl>
  );
  const cYear = (
    <QsControl
      key="year"
      // Version 8: the start and end dates are in the info tooltip, not printed under the control.
      info={version.id >= 8 ? `Measurement Start: ${ordDate(new Date(f.year, 0, 1))}. Measurement End: ${ordDate(new Date(f.year, 11, 31))}.` : undefined}
      showInfo
    >
      <SelectField
        label={FL.year}
        value={String(f.year)}
        onChange={(v) => set("year", Number(v))}
        options={[2026, 2025].map((y) => ({
          value: String(y),
          label: String(y),
        }))}
      />
      {version.id === 7 && (
        // Lucid design: the start and end of the measurement year sit under the year, and change with it.
        <Typography sx={{ fontSize: qs.type.small.size, color: qs.color.mutedText, mt: 0.5 }}>
          Measurement Start: {ordDate(new Date(f.year, 0, 1))}
          <br />
          Measurement End: {ordDate(new Date(f.year, 11, 31))}
        </Typography>
      )}
    </QsControl>
  );
  const dd = (
    key: keyof DashFilters,
    label: string,
    values: string[],
    info?: string,
  ) => (
    <QsControl key={key} info={info}>
      <SelectField
        label={label}
        value={f[key] as string}
        onChange={(v) => set(key, v as never)}
        options={withAll(values)}
      />
    </QsControl>
  );
  const multi = (
    key: keyof DashFilters,
    label: string,
    values: { value: string; label: string }[],
  ) => (
    <QsControl key={key}>
      <Box
        sx={
          version.id >= 7
            ? {
                // Version 7: "All" reads in normal text and the box is white, like the single-choice controls (it looked switched off).
                "& input::placeholder": { color: qs.color.primaryForeground, opacity: 1 },
                "& .MuiInputBase-root": { background: qs.color.primaryBackground },
              }
            : undefined
        }
      >
      <AutocompleteField
        multiple
        label={label}
        placeholder={ALL}
        options={values}
        value={f[key] as string[]}
        onChange={(v) => set(key, v as never)}
      />
      </Box>
    </QsControl>
  );
  const dateRange = (
    label: string,
    from: "dobFrom" | "evFrom",
    to: "dobTo" | "evTo",
  ) => (
    <QsControl key={label} cols={6}>
      <Typography
        sx={{
          fontSize: 14,
          fontWeight: 400,
          color: qs.color.secondaryForeground,
          mb: 0.625,
        }}
      >
        {label}
      </Typography>
      <Box sx={{ display: "flex", gap: 1 }}>
        <DateField
          slotProps={{ htmlInput: { "aria-label": `${label} from` } }}
          value={f[from]}
          onChange={(e) => set(from, e.target.value)}
        />
        <DateField
          slotProps={{ htmlInput: { "aria-label": `${label} to` } }}
          value={f[to]}
          onChange={(e) => set(to, e.target.value)}
        />
      </Box>
    </QsControl>
  );

  /** Version 3: the same two-part controls as the member lists. Age Min and Age Max are a number and a unit; # Open Gaps is an operator and a number. */
  const ageField = (key: "ageMin" | "ageMax", label: string) => {
    const [num = "", unit = "year"] = (f[key] || "").split("|");
    const put = (n: string, u: string) =>
      set(key, n === "" ? "" : `${n}|${u}`);
    if (version.id === 7) {
      // Version 7: one menu of whole years across the ages of the measure, instead of a number and a unit.
      const [lo, hi] = ageBandsOf(f.year)[code];
      const years = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
      const cur = num !== "" && unit === "year" ? num : "";
      const shown = cur !== "" && !years.includes(Number(cur)) ? [...years, Number(cur)].sort((x, y) => x - y) : years;
      return (
        <QsControl key={key}>
          <SelectField
            label={label}
            value={cur}
            onChange={(v) => put(v, "year")}
            options={[{ value: "", label: "Any" }, ...shown.map((y) => ({ value: String(y), label: `${y} years` }))]}
          />
        </QsControl>
      );
    }
    return (
      <QsControl key={key}>
        <Typography
          sx={{
            fontSize: 14,
            fontWeight: 400,
            color: qs.color.secondaryForeground,
            mb: 0.625,
          }}
        >
          {label}
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField
            slotProps={{ htmlInput: { "aria-label": `${label} number`, min: 0, type: "number" } }}
            placeholder={version.id >= 7 ? "e.g. 45" : undefined}
            value={num}
            onChange={(e) =>
              put(e.target.value.replace(/[^0-9]/g, ""), unit)
            }
          />
          <SelectField
            label=""
            value={unit}
            onChange={(v) => put(num, v)}
            options={[
              { value: "month", label: "months" },
              { value: "year", label: "years" },
            ]}
          />
        </Box>
      </QsControl>
    );
  };
  const openGapsField = () => {
    const [op0, num = ""] = (f.openGaps || "").split("|");
    const op = op0 || "=";
    const put = (o: string, n: string) =>
      set("openGaps", n === "" ? "" : `${o}|${n}`);
    if (version.id >= 7) {
      // Version 7: one menu of ready choices. Nobody has to type a number or pick a symbol.
      const choices: { value: string; label: string }[] = [
        { value: "", label: "Any" },
        { value: "=|0", label: "No open gaps" },
        { value: "=|1", label: "1 open gap" },
        { value: "=|2", label: "2 open gaps" },
        { value: "=|3", label: "3 open gaps" },
        { value: "=|4", label: "4 open gaps" },
        { value: ">=|1", label: "1 or more open gaps" },
        { value: ">=|2", label: "2 or more open gaps" },
        { value: ">=|3", label: "3 or more open gaps" },
      ];
      const cur = num === "" ? "" : `${op}|${num}`;
      const all = choices.some((c) => c.value === cur) ? choices : [...choices, { value: cur, label: `${OPEN_GAP_WORDS[op] ?? op} ${num}` }];
      return (
        <QsControl key="openGaps" info="How many measures the member has not met.">
          <SelectField
            label={FL.openGaps}
            value={cur}
            onChange={(v) => {
              const [o, n] = v.split("|");
              put(o ?? "=", n ?? "");
            }}
            options={all}
          />
        </QsControl>
      );
    }
    return (
      <QsControl key="openGaps" info="How many measures the member has not met.">
        <Typography
          sx={{
            fontSize: 14,
            fontWeight: 400,
            color: qs.color.secondaryForeground,
            mb: 0.625,
          }}
        >
          {FL.openGaps}
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <SelectField
            label=""
            value={op}
            onChange={(v) => put(v, num)}
            options={["=", "<", "<=", ">", ">="].map((o) => ({
              value: o,
              label: o,
            }))}
          />
          <TextField
            slotProps={{ htmlInput: { "aria-label": `${FL.openGaps} number`, min: 0, type: "number" } }}
            value={num}
            onChange={(e) => put(op, e.target.value.replace(/[^0-9]/g, ""))}
          />
        </Box>
      </QsControl>
    );
  };

  // Version 7: period and scope first, then who, then gaps.
  const arrange = (items: [string, ReactNode][], order: string[]) =>
    // Version 8 (Lucid chart): only the controls in the list are shown. The others (run, member, gap status, # open gaps, ...) are hidden.
    version.id >= 8 ? byOrder(items.filter((i) => order.includes(i[0])), order) : byName(items);
  const overviewControls = (
    <QsControlsBar fr="703" ask={["Q1", "Q4", "Q12"]}>
      {arrange([
        [FL.measure, cMeasure],
        [RUN_LABEL, cRun],
        [FL.year, cYear],
        [
          FL.result,
          <QsControl key="result">
            <SelectField
              label={FL.result}
              value={f.status}
              onChange={(v) => set("status", v as DashFilters["status"])}
              options={[
                { value: "", label: ALL },
                ...azOpt(version.id >= 7 ? gapStatusOptions : resultOptions),
              ]}
            />
          </QsControl>,
        ],
        [
          FL.member,
          <QsControl key="member">
            <TextField
              label={FL.member}
              placeholder={
                version.id >= 3 ? "Member Name or Tricare ID" : "ID or name"
              }
              value={f.memberId}
              onChange={(e) => set("memberId", e.target.value)}
            />
          </QsControl>,
        ],
        ...(version.id >= 3
          ? ([
              // Version 7 (Lucid design): Age Range is the only age control. Age Min and Age Max would overlap with it.
              [version.id === 7 ? "Age Lo" : "Age Min", version.id >= 8 ? null : ageField("ageMin", "Age Min")],
              ["Age Max", version.id >= 8 ? null : ageField("ageMax", "Age Max")],
            ] as [string, ReactNode][])
          : []),
        [
          FL.age,
          version.id >= 3 ? null : <QsControl key="age">
            <QsRangeSlider
              label={FL.age}
              min={0}
              max={100}
              from={f.ageFrom === "" ? null : Number(f.ageFrom)}
              to={f.ageTo === "" ? null : Number(f.ageTo)}
              onChange={(a, b) => {
                set("ageFrom", a === null ? "" : String(a));
                set("ageTo", b === null ? "" : String(b));
              }}
            />
          </QsControl>,
        ],
        [FL.sex, dd("sex", FL.sex, az(options.sex))],
        // Age groups, open gaps, HbA1c bands and years keep their natural order (a number order, not a word order).
        [
          FL.ageGroup,
          multi(
            "ageGroup",
            FL.ageGroup,
            optionsOf(
              version.id >= 7
                ? // Version 7: only the age ranges that apply to this measure.
                  bandsFor(code, f.year).map((b) => b.label)
                : options.ageGroup,
            ),
          ),
        ],
        [FL.race, multi("race", FL.race, optionsOf(az(options.race)))],
        [
          FL.ethnicity,
          multi("ethnicity", FL.ethnicity, optionsOf(az(options.ethnicity))),
        ],
        [
          version.id >= 7 ? "Primary Care Manager" : FL.provider,
          // Version 7 (Lucid design): the manager shows with the NPI, so a search by name or NPI finds them. A to Z by name.
          version.id >= 7
            ? multi(
                "provider",
                "Primary Care Manager",
                [...PCMS]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((p) => ({ value: p.name, label: `${p.name} - NPI: ${p.npi}` })),
              )
            : multi("provider", FL.provider, optionsOf(az(options.provider))),
        ],
        [
          FL.openGaps,
          version.id >= 3
            ? openGapsField()
            : dd(
                "openGaps",
                FL.openGaps,
                options.openGaps,
                "How many measures the member has not met.",
              ),
        ],
      ], [
        // Lucid: exactly these six, in this order.
        FL.measure,
        FL.year,
        "Primary Care Manager",
        FL.ageGroup,
        FL.race,
        FL.ethnicity,
        FL.sex,
      ])}
    </QsControlsBar>
  );
  const detailControls = (
    <QsControlsBar fr="703" ask={["Q12"]}>
      {arrange([
        [FL.measure, cMeasure],
        [RUN_LABEL, cRun],
        [FL.year, cYear],
        ...(version.id >= 7
          ? ([
              [
                "Population",
                <QsControl key="pop" showInfo info="Which members the table lists. All Members Evaluated is everyone in the files.">
                  <SelectField
                    label="Population"
                    value={md.pop}
                    onChange={(v) => setMd({ ...md, pop: v as MemberDetailsFilter["pop"] })}
                    options={POPULATIONS.map((p) => ({ value: p.value, label: p.label }))}
                  />
                </QsControl>,
              ],
              [
                "Tricare ID",
                version.id >= 8 ? (
                  // Lucid chart: a menu with All, like Population.
                  <QsControl key="tricare" showInfo info="Pick one member by Tricare ID. All lists everyone.">
                    <SelectField
                      label="Tricare ID"
                      value={md.tricare}
                      onChange={(v) => setMd({ ...md, tricare: v })}
                      options={withAll([...new Set(allMembers().map((m) => tricareIdOf(m)))].sort())}
                    />
                  </QsControl>
                ) : (
                  <QsControl key="tricare">
                    <TextField
                      label="Tricare ID"
                      placeholder="Search by Tricare ID"
                      value={md.tricare}
                      onChange={(e) => setMd({ ...md, tricare: e.target.value })}
                    />
                  </QsControl>
                ),
              ],
              [
                "Member Name",
                version.id >= 8 ? (
                  <QsControl key="mname" showInfo info="Pick one member by name. All lists everyone.">
                    <SelectField
                      label="Member Name"
                      value={md.name}
                      onChange={(v) => setMd({ ...md, name: v })}
                      options={withAll([...new Set(allMembers().map((m) => m.name))].sort((a, b) => a.localeCompare(b)))}
                    />
                  </QsControl>
                ) : (
                  <QsControl key="mname">
                    <TextField
                      label="Member Name"
                      placeholder="Search by name"
                      value={md.name}
                      onChange={(e) => setMd({ ...md, name: e.target.value })}
                    />
                  </QsControl>
                ),
              ],
            ] as [string, ReactNode][])
          : []),
        [FL.dob, dateRange(FL.dob, "dobFrom", "dobTo")],
        [FL.excluded, multi("excluded", FL.excluded, azOpt(measureOptionsFor()))],
        [FL.evDate, dateRange(FL.evDate, "evFrom", "evTo")],
        [FL.a1c, dd("a1c", FL.a1c, options.a1c)],
        [FL.state, dd("state", FL.state, az(options.state))],
        [FL.county, dd("county", FL.county, az(options.county))],
        [FL.military, dd("military", FL.military, az(options.military))],
      ], [FL.measure, "Population", "Tricare ID", "Member Name"])}
    </QsControlsBar>
  );
  const smallControls = (
    <QsControlsBar>
      {byName([
        [FL.measure, cMeasure],
        [RUN_LABEL, cRun],
        [FL.year, cYear],
      ])}
    </QsControlsBar>
  );

  /* ---- sheets ---- */
  const body =
    sheet === "Overview" ? (
      <Overview
        code={code}
        list={list}
        year={year}
        def={def}
        onBar={(v) => {
          setView(view === v ? "" : v);
          setSheet("Details");
        }}
      />
    ) : sheet === "Details" ? (
      <Details code={code} list={list} year={year} view={view} md={md} />
    ) : sheet === "Data" ? (
      <DataSheet code={code} list={list} year={year} def={def} />
    ) : sheet === "Admin" ? (
      <AdminSheet withWarnings={withWarnings} onChange={setWithWarnings} code={code} year={year} />
    ) : (
      <HelpSheet />
    );

  return (
    <PageContainer
      title={version.id >= 8 ? lucidTitle(code) : version.id >= 2 ? "Analytics" : "Quality measure analytics"}
      titleVariant="overview"
      subtitle={
        version.id >= 8
          ? undefined
          : version.id >= 3
          ? V3_GAP_LABEL[code]
          : "The dashboard drawn only with what QuickSight can build."
      }
      actions={
        <Box
          sx={{
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {fromCards && version.id < 3 && (
            <Link to="/dashboards" style={{ color: "inherit" }}>
              ← All dashboards
            </Link>
          )}
          {version.id < 3 && (
            <SwitchField
              label="Requirement tags"
              checked={notes.fr}
              onChange={(v) => setNotes({ ...notes, fr: v })}
            />
          )}
        </Box>
      }
    >
      <RunNotice />
      {drawing ? (
        <Box aria-busy="true" aria-label="Loading the dashboard">
          <Typography sx={{ fontSize: 13, color: qs.color.mutedText, mb: 1 }}>
            Loading the dashboard…
          </Typography>
          <Skeleton variant="rounded" height={520} />
        </Box>
      ) : (
      <NotesContext.Provider value={notes}>
        <QsFrame
          tabs={tabsFor().filter((t) => t !== "Admin" || role.dataQuality).map(tabLabel)}
          active={tabLabel(sheet)}
          onTab={(t) => setSheet(t === "Members" && getVersion() >= 7 ? "Details" : t)}
          onReset={reset}
        >
          {sheet === "Overview"
            ? overviewControls
            : sheet === "Details"
              ? detailControls
              : sheet === "Data"
                ? smallControls
                : null}
          {sheet === "Overview" || sheet === "Details" || sheet === "Data" ? (
            <OtherSheetFilters f={f} sheet={sheet} />
          ) : null}
          {body}
        </QsFrame>
      </NotesContext.Provider>
      )}
    </PageContainer>
  );
}

export default QuickSightDashboardPage;

/* ================================================================== Overview */

/** Jira LPP-16238: the latest 10 runs of this measure for the whole population and the measurement year. Not changed by the controls. Change vs Previous is against the run before it. */
interface RunHistoryRow {
  id: string;
  measure: string;
  start: string;
  end: string;
  runAt: Date;
  evaluated: number;
  initial: number;
  excluded: number;
  num: number;
  den: number;
  rate: number;
  change: number | null;
  closedChange: number | null;
}
function RunHistoryTile({ code, year }: { code: MeasureCode; year: number }) {
  const code3 = v3Code(code);
  const { choices } = useRun();
  const rows = useMemo<RunHistoryRow[]>(() => {
    const keep = getAsOfStep();
    const everyone = allMembers();
    const latest10 = choices.slice(0, 11);
    const out = latest10.map((r) => {
      setAsOfStep(r.step);
      const t = tally(everyone, code, year);
      return { r, t };
    });
    setAsOfStep(keep);
    return out.slice(0, 10).map(({ r, t }, i) => {
      const before = out[i + 1];
      return {
        id: r.id,
        measure: v3Code(code),
        start: fmtDate(new Date(year, 0, 1)),
        end: fmtDate(new Date(year, 11, 31)),
        runAt: r.at,
        evaluated: everyone.length,
        initial: t.eligible,
        excluded: t.excluded,
        num: t.met,
        den: t.denominator,
        rate: t.rate,
        change: before ? t.rate - before.t.rate : null,
        closedChange: before ? t.met - before.t.met : null,
      };
    });
  }, [choices, code, year]);
  return (
    <QsTile
      cols={36}
      title="Measure Run History"
      subtitle={`The latest ${rows.length} runs, newest first, for everyone in the files. The controls above do not change this table.`}
      fr="708"
      ask={["Q34"]}
    >
      <QsTable
        label="Measure run history"
        exportFile="measure-run-history"
        rowKey={(r) => r.id}
        maxHeight={100000}
        defaultSort={{ key: "at", dir: "desc" }}
        cols={[
          { key: "run", header: "Run #", value: (r) => r.runAt.getTime(), render: (r) => r.id, nowrap: true },
          { key: "start", header: "Measurement Start", value: (r) => r.start, nowrap: true },
          { key: "end", header: "Measurement End", value: (r) => r.end, nowrap: true },
          { key: "at", header: "Run Date/Time", value: (r) => r.runAt.getTime(), render: (r) => fmtRunTime(r.runAt), nowrap: true },
          { key: "ev", header: "Members Evaluated", value: (r) => r.evaluated, render: (r) => n0(r.evaluated), align: "right" },
          { key: "init", header: "Initial Population", value: (r) => r.initial, render: (r) => n0(r.initial), align: "right" },
          { key: "den", header: "Total Eligible", value: (r) => r.den, render: (r) => n0(r.den), align: "right" },
          { key: "exc", header: "Excluded", value: (r) => r.excluded, render: (r) => n0(r.excluded), align: "right" },
          { key: "num", header: "Numerator (Closed)", value: (r) => r.num, render: (r) => n0(r.num), align: "right" },
          { key: "rate", header: `${code3} Rate (%)`, value: (r) => r.rate, render: (r) => r.rate.toFixed(1), align: "right" },
          {
            key: "chg",
            header: "Change vs Previous",
            value: (r) => r.change ?? -1e9,
            render: (r) => (r.change === null ? "" : `${r.change > 0 ? "+" : ""}${r.change.toFixed(2)} pts`),
            align: "right",
          },
          {
            key: "cchg",
            header: "Closed Δ",
            value: (r) => r.closedChange ?? -1e9,
            render: (r) => (r.closedChange === null ? "" : `${r.closedChange > 0 ? "+" : ""}${r.closedChange}`),
            align: "right",
          },
        ]}
        wrapHeaders
        rows={rows}
      />
    </QsTile>
  );
}

function Overview({
  code,
  list,
  year,
  def,
  onBar,
}: {
  code: MeasureCode;
  list: Member[];
  year: number;
  def: ReturnType<typeof measureFor>;
  onBar: (v: "Met" | "Gap") => void;
}) {
  const { version } = useVersion();
  const v3 = version.id >= 3;
  const v7 = version.id >= 7;
  const v8 = version.id >= 8;
  const about = aboutFor(code);
  const { initial, t } = kpisFor(code, list, year);
  const whole = kpisFor(code, allMembers(), year);
  const run = runInfo();
  const { run: selectedRun } = useRun();
  /** Claims keep arriving for 90 days, so a period that ends inside the last 90 days can still change. */
  const inProgress = (d: Date) =>
    d.getTime() > run.last.getTime() - 90 * DAY_MS;
  const metPct = share(t.met, t.denominator);
  const gsd = code === "GSD" && !v3 ? secondRate(list, year) : null;
  const a1c = code === "GSD" && v3 ? a1cCounts(list, year) : null;
  // Version 7: every row splits at the same place (12 and 24 of 36 columns), like the trend row above, and the order puts the
  // age range next to Met and not met. Row 1: Met and not met 12 + age range 24. Row 2: gender 12 + ethnicity 24. Row 3: race 36.
  const allDims: { dim: Dimension; title: string; cols: number }[] = v7
    ? [
        { dim: "ageGroup", title: `Met % by ${FL.ageGroup.toLowerCase()}`, cols: 24 },
        { dim: "sex", title: `Met % by ${FL.sex.toLowerCase()}`, cols: 12 },
        { dim: "ethnicity", title: "Met % by ethnicity", cols: 24 },
        { dim: "race", title: "Met % by race", cols: 36 },
        { dim: "provider", title: "Met % by primary care provider", cols: 36 },
      ]
    : [
        { dim: "sex", title: `Met % by ${FL.sex.toLowerCase()}`, cols: 12 },
        { dim: "ageGroup", title: `Met % by ${FL.ageGroup.toLowerCase()}`, cols: 12 },
        { dim: "ethnicity", title: "Met % by ethnicity", cols: 18 },
        { dim: "race", title: "Met % by race", cols: 18 },
        { dim: "provider", title: "Met % by primary care provider", cols: 36 },
      ];
  // Version 7: no provider chart or filter for now (needs a member-to-provider file from Madigan).
  const dims = allDims.filter((d) => !(v7 && d.dim === "provider"));
  const c = useTrendControls();
  const [topN, setTopN] = useState(10);
  const trend = useMemo(
    () => (c.comparing ? null : trendRows(code, list, c.g, c.range)),
    [code, list, c.g, c.range, c.comparing],
  );
  const cmp = useMemo(
    () =>
      c.comparing
        ? compareSeries(code, list, c.g as "monthly" | "quarterly", c.which)
        : null,
    [code, list, c.g, c.which, c.comparing],
  );
  const metric = c.which === "met" ? "Met %" : "Not met %";
  const shown = (r: number | null) =>
    r === null ? "–" : p1(c.which === "met" ? r : 100 - r);

  const baselineTile = (
      <QsTile
        cols={v7 ? 12 : 12}
        rows={v7 ? 4 : 3}
        title="Eligible population baseline summary"
        subtitle={`The entire eligible population for ${year}. It does not change with the controls.`}
        fr="702"
        ask={["Q2"]}
      >
        <QsTable
          label="Whole population"
          exportFile="baseline-summary"
          rowKey={(r) => r[0]}
          maxHeight={v7 ? 100000 : 300}
          cols={[
            { key: "k", header: "Item", value: (r) => r[0] },
            {
              key: "v",
              header: "Value",
              value: (r) => r[1],
              align: "right",
            },
          ]}
          rows={[
            ["Measurement period", periodText(year).replace(" to ", " – ")],
            ...(v7
              ? [
                  ["Member Population", n0(whole.initial)],
                  ["Initial Population", n0(whole.t.eligible)],
                  ["Eligible Population", n0(whole.t.denominator)],
                  ["Excluded Population", n0(whole.t.excluded)],
                  [
                    `${v3Code(code)} Met Count`,
                    `${n0(whole.t.met)} (${p1(share(whole.t.met, whole.t.denominator))})`,
                  ],
                  [
                    `${v3Code(code)} Not Met Count`,
                    `${n0(whole.t.gap)} (${p1(share(whole.t.gap, whole.t.denominator))})`,
                  ],
                ]
              : [
                  ["Initial population", n0(whole.initial)],
                  ["Eligible", n0(whole.t.denominator)],
                  ["Excluded", n0(whole.t.excluded)],
                  [
                    "Met",
                    `${n0(whole.t.met)} (${p1(share(whole.t.met, whole.t.denominator))})`,
                  ],
                  [
                    "Not met",
                    `${n0(whole.t.gap)} (${p1(share(whole.t.gap, whole.t.denominator))})`,
                  ],
                ]),
          ]}
        />
      </QsTile>
  );
  return (
    <QsSheet>
      {v7 && !v8 && (
        <QsTile cols={36} bare fr="702.10">
          <Box
            component="details"
            open
            sx={{ "& summary": { cursor: "pointer", fontWeight: 700, fontSize: qs.type.visualTitle.size, mb: 1 } }}
          >
            <summary>About This Measure ({V3_GAP_LABEL[code]})</summary>
            <QsText>
              <p>
                <b>Eligible population:</b> {V3_DEFINITION[code]}
              </p>
              <p>
                <b>Numerator (closed gap):</b> {V3_MET[code]}
              </p>
              <p>
                <b>Exclusions:</b> {V3_EXCLUSIONS[code]}
              </p>
              <p>
                Counts are distinct members. The latest run of each measurement year is shown, and the trend uses every run.
              </p>
            </QsText>
          </Box>
        </QsTile>
      )}
      {v8 && (
        // Lucid: a collapsible "About this measure (HEDIS BCS)" box. (Quick Sight cannot collapse a text box: ask the Quick Sight team.)
        <QsTile cols={36} bare plain fr="702.10">
          <Box
            component="details"
            sx={{ "& summary": { cursor: "pointer", fontWeight: 700, fontSize: qs.type.visualTitle.size, mb: 1 } }}
          >
            <summary>About this measure (HEDIS {gapShort(code)})</summary>
            <QsText>
              {about.map(([h, t]) => (
                <p key={h}>
                  <b>{h}</b> {t}
                </p>
              ))}
              <p>Counts are distinct members: the latest run of each measurement year is shown, with every run in the trend.</p>
            </QsText>
          </Box>
        </QsTile>
      )}
      <QsTile cols={36} bare plain={v8} fr="701" ask={["Q9", "Q21"]}>
        {!v3 && (
        <Typography
          component="h2"
          sx={{
            m: 0,
            fontSize: qs.type.sheetTitle.size,
            fontWeight: qs.type.sheetTitle.weight,
          }}
        >
          {def.code} · {def.name}
        </Typography>
        )}
        <QsText>
          {v8 ? (
            // One line. The source files are on the Admin sheet, in Files Ingested.
            <p>
              <b>Measurement period:</b> {periodText(year)} · <b>Last Updated:</b> {fmtRunLong(selectedRun.at)} ·{" "}
              <b>Next Refresh:</b> {fmtRunLong(run.next)}
            </p>
          ) : (
            <>
              <p>
                {v7 ? "" : `${def.population}. ${def.needs} `}Measurement period: {periodText(year)}
                .
              </p>
              <p>
                <b>{v7 ? "Last Updated:" : "Last updated:"}</b> {v7 ? fmtRunLong(selectedRun.at) : fmtRun(selectedRun.at)} ·{" "}
                <b>{v7 ? "Next Refresh:" : "Next update:"}</b> {v7 ? fmtRunLong(run.next) : fmtRun(run.next)}
              </p>
              <p>
                <b>Source files:</b>{" "}
                {run.sources
                  .map((x) => `${x.title} ${fmtDate(x.receivedOn)}`)
                  .join(" · ")}
              </p>
            </>
          )}
        </QsText>
      </QsTile>

      {!v7 && baselineTile}
      <QsTile cols={v7 ? 36 : 24} bare plain={v8} fr="702">
        <QsText>
          {v8 ? (
            <p>
              <b>Measurement Period Summary</b> · {periodText(year).replace(" to ", " – ")}. Cards follow the controls
              above and count distinct members. The latest run of each year is shown.
            </p>
          ) : v7 ? (
            <p>
              <b>Measurement Period Summary.</b> The key metrics for{" "}
              {periodText(year).replace(" to ", " – ")}. These cards update
              with the controls you pick above.
            </p>
          ) : (
            <p>
              <b>Key performance indicators.</b> These cards update with the
              controls you pick above.
            </p>
          )}
        </QsText>
      </QsTile>
      {v7 && (() => {
        // Lucid design: row 1 compares this year with last year, row 2 compares with the last completed month and the same month a year earlier.
        const prevY = year - 1;
        const hasPrevY = YEARS.includes(prevY);
        const pt = hasPrevY ? tally(list, code, prevY) : null;
        const prevEval = hasPrevY ? evaluatedIn(list, prevY) : 0;
        const pctChange = (cur: number, prev: number) =>
          prev ? `${cur >= prev ? "+" : "-"}${Math.abs(((cur - prev) / prev) * 100).toFixed(1)}%${cur > prev ? " ▲" : cur < prev ? " ▼" : ""}` : "no earlier figure";
        const ptsChange = (cur: number, prev: number) => {
          const d = cur - prev;
          return `${d >= 0 ? "+" : "-"}${Math.abs(d).toFixed(1)} pts${d > 0.05 ? " ▲" : d < -0.05 ? " ▼" : ""}`;
        };
        // Version 8 (Lucid chart): big numbers read 18.4K.
        const kn = (n: number) => (v8 && Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(1)}K` : n0(n));
        const withPct = (n: number, of: number) => `${kn(n)} (${p1(share(n, of))})`;
        const row1 = (
          label: string,
          cur: number,
          prev: number | null,
          tip: string | undefined,
          pct: boolean,
          upIsBad = false,
        ) => (
          <QsKpi
            key={label}
            cols={9}
            fr="702"
            qs8={v8}
            label={label}
            value={kn(cur)}
            tip={tip}
            sub={hasPrevY ? undefined : `No ${prevY} data to compare with.`}
            changes={
              hasPrevY && prev !== null
                ? [{
                      prefix: `vs ${prevY}`,
                      before: kn(prev),
                      // Lucid: up is green, except Excluded where up is red.
                      tone: !v8 || cur === prev ? "neutral" : (cur > prev) !== upIsBad ? "good" : "bad",
                      change: pctChange(cur, prev),
                    }]
                : undefined
            }
            compare={
              hasPrevY && prev !== null
                ? [
                    { label: String(year), value: cur, shown: pct ? withPct(cur, initial) : kn(cur) },
                    { label: String(prevY), value: prev, shown: pct ? withPct(prev, prevEval) : kn(prev) },
                  ]
                : undefined
            }
          />
        );
        const days = compareDays(year);
        const sPm = snapshotAt(code, list, days.prevMonth);
        const sPy = snapshotAt(code, list, days.prevYear);
        const monthName = (d: Date) => d.toLocaleString("en-US", { month: "short", year: "numeric" });
        const cur = { met: t.met, gap: t.gap, den: t.denominator };
        type Snap = { met: number; gap: number; den: number } | null;
        const row2 = (
          label: string,
          kind: "count" | "rate",
          side: "met" | "gap",
          tip?: string,
          extra?: { highlight?: boolean; color?: string },
        ) => {
          const val = (x: NonNullable<Snap>) => (kind === "count" ? x[side] : share(x[side], x.den));
          const show = (x: NonNullable<Snap>) =>
            kind === "count" ? withPct(x[side], x.den) : p1(share(x[side], x.den));
          const tone = (c: number, p: number): "good" | "bad" | "neutral" =>
            c === p ? "neutral" : (c > p) === (side === "met") ? "good" : "bad";
          const lines: { prefix: string; before: string; change: string; tone: "good" | "bad" | "neutral" }[] = [];
          const bars: { label: string; value: number; shown: string; note?: string }[] = [
            { label: "Current", value: val(cur), shown: show(cur) },
          ];
          const add = (snap: Snap, prefix: string, short: string) => {
            if (!snap) return;
            const c = val(cur);
            const p = val(snap);
            const change = kind === "count" ? pctChange(c, p) : ptsChange(c, p);
            lines.push({
              prefix: v8 ? "vs" : prefix,
              before: kind === "count" ? kn(snap[side]) : p1(p),
              change,
              tone: tone(c, p),
            });
            // Version 8: the bar names the period and carries the change, because a KPI holds only one comparison.
            bars.push(
              v8
                ? { label: `${short} ${prefix.replace("vs ", "")}`, value: p, shown: show(snap), note: change }
                : { label: short, value: p, shown: show(snap) },
            );
          };
          add(sPm, `vs ${monthName(days.prevMonth)}`, "Prev. month");
          add(sPy, `vs ${monthName(days.prevYear)}`, "Prev. year");
          return (
            <QsKpi
              cols={9}
              fr="702"
              qs8={v8}
              label={label}
              value={kind === "count" ? kn(cur[side]) : p1(t.denominator ? val(cur) : 0)}
              tip={tip}
              highlight={extra?.highlight}
              color={extra?.color}
              changes={lines}
              compare={bars}
            />
          );
        };
        return (
          <>
            {row1("Member Population", initial, hasPrevY ? prevEval : null, "All members in the population from the Measurement Start Period.", false)}
            {row1("Initial Population", t.eligible, pt ? pt.eligible : null, `All members meeting the measurement criteria to identify gaps in care. For ${v3Code(code)}: ${v8 && code === "BCS-E" ? "members aged 42-74" : (() => { const x = V3_DEFINITION[code].split(/ who were|\. /)[0].replace(/\.$/, ""); return x.charAt(0).toLowerCase() + x.slice(1); })()}.`, true)}
            {row1("Eligible Population", t.denominator, pt ? pt.denominator : null, v8 ? "All members who are not excluded from the measure." : `All members who are not excluded from the measure. ${V3_DEFINITION[code]}`, true)}
            {row1("Excluded Population", t.excluded, pt ? pt.excluded : null, v8 && code === "BCS-E" ? "All members who are excluded from the measure - e.g. have hospice, palliative care, frailty, had a mastectomy." : `All members who are excluded from the measure. For ${v3Code(code)}: ${V3_EXCLUSIONS[code].charAt(0).toLowerCase()}${V3_EXCLUSIONS[code].slice(1)}`, true, true)}
            {row2(`${v3Code(code)} Met Count`, "count", "met", V3_MET[code])}
            {row2(`${v3Code(code)} Met Rate`, "rate", "met", undefined, { highlight: true, color: qs.meaning.met })}
            {row2(`${v3Code(code)} Not Met Count`, "count", "gap")}
            {row2(`${v3Code(code)} Not Met Rate`, "rate", "gap", undefined, { color: qs.meaning.gapText })}
          </>
        );
      })()}
      {v7 && (() => {
        const ins = exampleInsight({ name: V3_GAP_LABEL[code], rate: metPct, gap: t.gap, eligible: t.denominator });
        const dataAsOf = run.sources.reduce((a, x) => (x.receivedOn > a ? x.receivedOn : a), run.sources[0]?.receivedOn ?? selectedRun.at);
        if (v8) {
          // Version 8: both tiles are Quick Sight custom insights (text + fields + calculations), so every number is live.
          const code3 = v3Code(code);
          const days = compareDays(year);
          const sPm = snapshotAt(code, list, days.prevMonth);
          const sPy = snapshotAt(code, list, days.prevYear);
          const mon = (d: Date) => d.toLocaleString("en-US", { month: "short", year: "numeric" });
          const pts = (c: number, p: number) => {
            const d = c - p;
            return `${d >= 0 ? "+" : "-"}${Math.abs(d).toFixed(1)} pts${d > 0.05 ? " ▲" : d < -0.05 ? " ▼" : ""}`;
          };
          const curRate = share(t.met, t.denominator);
          const vs = (snap: typeof sPm, d: Date) =>
            snap ? `${mon(d)}: ${p1(snap.rate)} (${pts(curRate, snap.rate)}, ${n0(snap.met)} met)` : null;
          const dims: [Dimension, string][] = [
            ["ageGroup", FL.ageGroup],
            ["sex", FL.sex],
            ["race", FL.race],
            ["ethnicity", FL.ethnicity],
          ];
          const groups = dims.map(([dim, label]) => ({
            dim,
            label,
            rows: groupRates(code, list, year, dim).filter((r) => r.t.denominator >= SMALL_GROUP),
          }));
          const weakest = groups
            .filter((g) => g.rows.length > 1)
            .map((g) => {
              const r = [...g.rows].sort((a, b) => share(a.t.met, a.t.denominator) - share(b.t.met, b.t.denominator))[0];
              return { label: g.label, group: r.group, rate: share(r.t.met, r.t.denominator), gap: r.t.gap, den: r.t.denominator };
            });
          const bigAge = [...(groups.find((g) => g.dim === "ageGroup")?.rows ?? [])].sort((a, b) => b.t.gap - a.t.gap)[0];
          const managers = gapsByManager(code, list, year);
          const topMgr = [...managers].sort((a, b) => b.open - a.open || a.name.localeCompare(b.name)).filter((m) => m.open > 0).slice(0, 3);
          const mgrName = (name: string) => {
            const m = pcmByName(name);
            return m ? `Dr. ${pcmLabel(m)}` : name;
          };
          const bench = BENCHMARK[code];
          const needed = Math.max(0, Math.ceil((bench / 100) * t.denominator) - t.met);
          const lastMonth = vs(sPm, days.prevMonth);
          const lastYear = vs(sPy, days.prevYear);
          return (
            <>
              {baselineTile}
              <QsTile
                cols={12}
                title="Explanation"
                subtitle={`Custom insight. Run date ${fmtDate(selectedRun.at)}, data as of ${fmtDate(dataAsOf)}`}
              >
                <QsText>
                  <p>
                    <b>{V3_GAP_LABEL[code]}</b> is <b>{p1(curRate)}</b> met for {year}: {n0(t.met)} of {n0(t.denominator)} eligible members
                    have met it and {n0(t.gap)} have not.
                  </p>
                  <p>
                    <b>Population.</b> {n0(initial)} members, {n0(t.eligible)} in the initial population, {n0(t.excluded)} excluded,{" "}
                    {n0(t.denominator)} eligible.
                  </p>
                  <p>
                    <b>Change.</b> {lastMonth ? `Versus ${lastMonth}.` : "No last-month figure for this year."}{" "}
                    {lastYear ? `Versus ${lastYear}.` : "No figure for the same month last year."}
                  </p>
                  <p>
                    <b>Benchmark.</b> {bench}% target.{" "}
                    {needed > 0
                      ? `${p1(curRate)} is ${(bench - curRate).toFixed(1)} pts below it; ${n0(needed)} more ${needed === 1 ? "member needs" : "members need"} to meet it.`
                      : `Reached, ${(curRate - bench).toFixed(1)} pts above it.`}
                  </p>
                  {weakest.length > 0 && (
                    <p>
                      <b>Lowest met rate.</b>{" "}
                      {weakest.map((w) => `${w.label} ${w.group} ${p1(w.rate)} (${n0(w.gap)} not met of ${n0(w.den)})`).join(" · ")}
                    </p>
                  )}
                </QsText>
              </QsTile>
              <QsTile cols={12} title="Recommended Action" subtitle="Custom insight. Follows the controls above.">
                <QsText>
                  {t.gap === 0 ? (
                    <p>
                      <b>No open gaps.</b> Every eligible member has met {code3}. Keep the monthly claims and results coming in so new
                      members are checked.
                    </p>
                  ) : (
                    <>
                      <p>
                        <b>Reach {n0(t.gap)} members.</b> These members have an open {code3} gap. Use the Not met bar to open the member
                        list and book their visit or test.
                      </p>
                      {topMgr.length > 0 && (
                        <p>
                          <b>Start with these managers.</b>{" "}
                          {topMgr.map((m) => `${mgrName(m.name)} ${n0(m.open)} open (${n0(m.closed)} closed)`).join(" · ")}
                        </p>
                      )}
                      {bigAge && (
                        <p>
                          <b>Focus on {FL.ageGroup.toLowerCase()} {bigAge.group}.</b> {n0(bigAge.t.gap)} open gaps, the most of any{" "}
                          {FL.ageGroup.toLowerCase()} ({p1(share(bigAge.t.met, bigAge.t.denominator))} met).
                        </p>
                      )}
                      {weakest.some((w) => w.label !== FL.ageGroup) && (
                        <p>
                          <b>Check outreach.</b>{" "}
                          {weakest
                            .filter((w) => w.label !== FL.ageGroup)
                            .map((w) => `${w.group} (${w.label.toLowerCase()}) is ${p1(w.rate)}`)
                            .join(" · ")}
                          . Review how these members are being reached.
                        </p>
                      )}
                      <p>
                        <b>Goal.</b>{" "}
                        {needed > 0
                          ? `Closing ${n0(needed)} of the ${n0(t.gap)} open gaps reaches the ${bench}% benchmark.`
                          : `The ${bench}% benchmark is met. Keep closing the remaining ${n0(t.gap)}.`}
                      </p>
                    </>
                  )}
                </QsText>
              </QsTile>
            </>
          );
        }
        return (
          <>
            {baselineTile}
            <QsTile
              cols={24}
              title="Explanation"
              subtitle={`Example text. Run date ${fmtDate(selectedRun.at)}, data as of ${fmtDate(dataAsOf)}`}
            >
              <QsText>
                <p>{ins.explanation}</p>
              </QsText>
            </QsTile>
            <QsTile cols={24} title="Recommended Action" subtitle="Example text">
              <QsText>
                <p>{ins.action}</p>
              </QsText>
            </QsTile>
          </>
        );
      })()}
      {!v7 && (<>
      <QsKpi cols={8} fr="702" label="Initial population" value={n0(initial)} />
      <QsKpi
        cols={8}
        fr="702"
        label="Eligible"
        value={n0(t.denominator)}
        tip={
          v3
            ? `${V3_DEFINITION[code]} Eligible = initial population minus exclusions.`
            : "Members counted in the rate."
        }
      />
      <QsKpi
        cols={8}
        fr="702"
        label="Excluded"
        value={n0(t.excluded)}
        tip={v3 ? V3_EXCLUSIONS[code] : undefined}
      />
      <QsKpi
        cols={6}
        fr="702"
        label="Met"
        value={n0(t.met)}
        tip={v3 ? V3_MET[code] : undefined}
      />
      <QsKpi
        cols={6}
        fr="702"
        label="Met %"
        value={p1(metPct)}
        highlight
        color={qs.meaning.met}
      />
      <QsKpi cols={6} fr="702" label="Not met" value={n0(t.gap)} />
      <QsKpi
        cols={6}
        fr="702"
        label="Not met %"
        value={t.denominator ? p1(100 - metPct) : p1(0)}
        color={qs.meaning.gapText}
      />
      </>)}
      {a1c && (
        <>
          <QsKpi
            cols={12}
            fr="702"
            label="HbA1c result: Total"
            value={n0(a1c.total)}
            tip="Denominator: eligible members counted in the rate. Each member's result is their lowest final HbA1c of the period."
          />
          <QsKpi
            cols={6}
            fr="702"
            label="HbA1c > 8%"
            value={n0(a1c.over8)}
            tip="Members whose lowest result is 8% or higher."
            color={qs.meaning.gapText}
          />
          <QsKpi
            cols={6}
            fr="702"
            label="HbA1c > 8%: % of total"
            value={p1(share(a1c.over8, a1c.total))}
            color={qs.meaning.gapText}
          />
          <QsKpi
            cols={6}
            fr="702"
            label="HbA1c > 9%"
            value={n0(a1c.over9)}
            tip="Members whose lowest result is above 9%."
            color={qs.meaning.gapText}
          />
          <QsKpi
            cols={6}
            fr="702"
            label="HbA1c > 9%: % of total"
            value={p1(share(a1c.over9, a1c.total))}
            color={qs.meaning.gapText}
          />
        </>
      )}
      {gsd && (
        <>
          <QsKpi
            cols={9}
            fr="702"
            label="HbA1c ≤ 9%: Met"
            value={n0(gsd.met)}
          />
          <QsKpi
            cols={9}
            fr="702"
            label="HbA1c ≤ 9%: Met %"
            value={p1(gsd.rate)}
            color={qs.meaning.met}
          />
          <QsKpi
            cols={9}
            fr="702"
            label="HbA1c ≤ 9%: Not met"
            value={n0(gsd.notMet)}
          />
          <QsKpi
            cols={9}
            fr="702"
            label="HbA1c ≤ 9%: Not met %"
            value={p1(gsd.den ? 100 - gsd.rate : 0)}
            color={qs.meaning.gapText}
          />
        </>
      )}

      <QsTile cols={36} title="Trend settings" fr="708" ask={["Q8", "Q17"]}>
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
              md: "repeat(5, minmax(0, 1fr))",
            },
          }}
        >
          <SelectField
            label="Show by"
            value={c.g}
            onChange={(v) => c.pickG(v as Granularity)}
            options={granularityOptions}
          />
          <SelectField
            label="Show"
            value={c.which}
            onChange={(v) => c.setWhich(v as TrendMetric)}
            options={[
              { value: "met", label: "Met %" },
              { value: "notmet", label: "Not met %" },
            ]}
          />
          {v3 ? (
            <SelectField
              label="Date range"
              value={c.preset}
              disabled={c.comparing}
              onChange={(v) => c.setPreset(v)}
              options={[
                ...rangePresets[c.g].map((x) => ({
                  value: x.value,
                  label: x.label,
                })),
                ...(v7 ? [{ value: "custom", label: "Custom" }] : []),
              ]}
            />
          ) : (
            <>
              <DateField
                label="From"
                disabled={c.comparing}
                value={isoDay(c.range.from)}
                onChange={(e) =>
                  e.target.value && c.setFrom(fromIso(e.target.value))
                }
              />
              <DateField
                label="To"
                disabled={c.comparing}
                value={isoDay(c.range.to)}
                onChange={(e) =>
                  e.target.value && c.setTo(fromIso(e.target.value))
                }
              />
            </>
          )}
          {v7 && c.preset === "custom" && (
            <>
              <DateField
                label="From"
                disabled={c.comparing}
                value={isoDay(c.range.from)}
                onChange={(e) =>
                  e.target.value && c.setFrom(fromIso(e.target.value))
                }
              />
              <DateField
                label="To"
                disabled={c.comparing}
                value={isoDay(c.range.to)}
                onChange={(e) =>
                  e.target.value && c.setTo(fromIso(e.target.value))
                }
              />
            </>
          )}
          <SelectField
            label="Compare with last year"
            value={c.comparing ? "Yes" : "No"}
            onChange={(v) => c.setCompare(v === "Yes")}
            options={[
              { value: "No", label: "No" },
              { value: "Yes", label: "Yes" },
            ]}
            disabled={!c.canCompare}
          />
        </Box>
      </QsTile>
      <QsTile
        cols={12}
        title="Trend numbers"
        subtitle="* In progress: claims can still arrive for 90 days"
        fr="708"
        ask={["Q22"]}
      >
        {cmp ? (
          <QsTable
            label="Trend comparison"
            exportFile="trend-comparison"
            rowKey={(r) => r.label}
            maxHeight={v7 ? 100000 : 300}
            cols={[
              {
                key: "l",
                header: c.g === "monthly" ? "Month" : "Quarter",
                value: (r) => r.label,
              },
              ...cmp.series.map(
                (s, k): QsCol<{ label: string; v: (number | null)[] }> => ({
                  key: `y${s.year}`,
                  header: `${s.year} ${metric}`,
                  value: (r) => r.v[k] ?? -1,
                  render: (r) => (r.v[k] === null ? "–" : p1(r.v[k]!)),
                  align: "right",
                }),
              ),
            ]}
            rows={cmp.labels.map((l, i) => ({
              label: l,
              v: cmp.series.map((s) => s.values[i]),
            }))}
          />
        ) : (
          <QsTable
            label="Trend numbers"
            exportFile="trend-numbers"
            rowKey={(r) => r.id}
            maxHeight={v7 ? 100000 : 300}
            defaultSort={{ key: "end", dir: "desc" }}
            cols={[
              {
                key: "end",
                header: "Period end",
                value: (r) => r.end.getTime(),
                render: (r) =>
                  `${fmtDate(r.end)}${inProgress(r.end) ? " *" : ""}`,
                nowrap: true,
              },
              {
                key: "met",
                header: "Met",
                value: (r) => r.met,
                align: "right",
              },
              {
                key: "counted",
                header: "Eligible",
                value: (r) => r.counted,
                align: "right",
              },
              {
                key: "rate",
                header: metric,
                value: (r) => r.rate ?? -1,
                render: (r) =>
                  `${shown(r.rate)}${inProgress(r.end) ? " *" : ""}`,
                align: "right",
              },
            ]}
            rows={trend ?? []}
          />
        )}
      </QsTile>
      <QsTile
        cols={24}
        title={v7 ? (trend ? `Open vs Closed Gaps Trend ${granularityOptions.find((o) => o.value === c.g)?.label ?? ""}` : `Trends for ${V3_GAP_LABEL[code]}`) : `${metric} over time`}
        subtitle={
          v7
            ? trend
              ? `Open and closed gaps at the end of each period, with the compliance rate. Starts again each January 1${
                  v8
                    ? trend.some((r, i) => c.g === "monthly" && i === trend.length - 1 && r.end.getDate() !== new Date(r.end.getFullYear(), r.end.getMonth() + 1, 0).getDate())
                      ? ". Each bar is the month end. * Month to date."
                      : ". Each bar is the end of the period."
                    : ""
                }`
              : `${metric}. Starts again each January 1`
            : "Starts again each January 1"
        }
        fr="708"
      >
        {v7 && trend ? (
          <QsGapTrend
            qs8={v8}
            xTitle={{ daily: "Day", weekly: "Week", monthly: "Month", quarterly: "Quarter", annual: "Year" }[c.g as string] ?? "Month"}
            label="Open and closed gaps over time, with the compliance rate"
            height={460}
            rows={trend.map((r, i) => ({
              label:
                v8 && c.g === "monthly"
                  ? `${r.end.toLocaleString("en-US", { month: "short" })} ${r.end.getFullYear()}`
                  : bucketLabel(c.g, r.end, c.range),
              closed: r.met,
              open: Math.max(0, r.counted - r.met),
              rate: r.rate,
              partial:
                c.g === "monthly" &&
                i === trend.length - 1 &&
                r.end.getDate() !== new Date(r.end.getFullYear(), r.end.getMonth() + 1, 0).getDate(),
            }))}
          />
        ) : (
          <TrendChart code={code} list={list} c={c} {...(v7 ? { height: 460 } : {})} />
        )}
      </QsTile>
      {!v7 && (
      <QsTile
        cols={12}
        title="Met and not met"
        subtitle="Click a bar to list those members on Details"
        fr="707.1"
        ask={["Q3"]}
      >
        <QsColumnChart
          label="Number of members met and not met"
          max={Math.max(10, Math.ceil(Math.max(t.met, t.gap) / 10) * 10)}
          unit=""
          decimals={0}
          onSelect={(b) => onBar(b.label === "Met" ? "Met" : "Gap")}
          bars={[
            { label: "Met", value: t.met, color: qs.meaning.met },
            { label: "Not met", value: t.gap, color: qs.meaning.gap },
          ]}
        />
      </QsTile>
      )}
      {!v7 && (
      <>
      {dims.map(({ dim, title, cols }) => {
        const rows = groupRates(code, list, year, dim);
        const small = rows.some((r) => r.t.denominator < SMALL_GROUP);
        const bars: QsBar[] = rows.map((r) => ({
          label: `${r.group}${r.t.denominator < SMALL_GROUP ? " *" : ""}`,
          value: r.t.rate,
          detail: `${r.t.met} of ${r.t.denominator}`,
        }));
        return (
          <QsTile
            key={dim}
            cols={cols}
            title={title}
            subtitle={
              v7
                ? small
                  ? `* Fewer than ${SMALL_GROUP} eligible members.`
                  : undefined
                : small
                  ? `* Fewer than ${SMALL_GROUP} eligible members. Dashed line: benchmark.`
                  : "Dashed line: benchmark"
            }
            fr="703"
            ask={[
              ...(v7 ? [] : ["Q19"]),
              ...(dim === "race" || dim === "provider" ? ["Q11"] : []),
            ]}
          >
            <QsBarChart
              label={`${title}`}
              bars={bars}
              {...(v7
                ? { wrap: true, valueWidth: 118 }
                : {})}
              benchmark={v7 ? undefined : BENCHMARK[code]}
              empty="Nobody is eligible for these filters"
            />
          </QsTile>
        );
      })}
      </>
      )}
      {v7 && (() => {
        const code3 = v3Code(code);
        const gapRows = (dim: Dimension) =>
          groupRates(code, list, year, dim).map((r) => ({
            label: `${r.group}${r.t.denominator < SMALL_GROUP ? " *" : ""}`,
            open: r.t.gap,
            closed: r.t.met,
            note: `${p1(r.t.rate)} closed`,
          }));
        const smallNote = (dim: Dimension) =>
          groupRates(code, list, year, dim).some((r) => r.t.denominator < SMALL_GROUP)
            ? `* Fewer than ${SMALL_GROUP} eligible members.`
            : undefined;
        const sexRows = groupRates(code, list, year, "sex").sort((a, b) => b.t.denominator - a.t.denominator);
        const managers = gapsByManager(code, list, year);
        const topOpen = [...managers].sort((a, b) => b.open - a.open || b.closed - a.closed || a.name.localeCompare(b.name)).slice(0, topN);
        const topClosed = [...managers].sort((a, b) => b.closed - a.closed || b.open - a.open || a.name.localeCompare(b.name)).slice(0, topN);
        const mgrLabel = (name: string) => {
          const m = pcmByName(name);
          return m ? `Dr. ${pcmLabel(m)}` : name;
        };
        return (
          <>
            {v8 && (
              // Lucid chart: four gap charts in one row, clustered columns (Open beside Closed), titled "BCS Gaps by Age Range".
              <>
                {(
                  [
                    ["ageGroup", FL.ageGroup],
                    ["race", "Race"],
                    ["ethnicity", "Ethnicity"],
                  ] as [Dimension, string][]
                ).map(([dim, name]) => (
                  <QsTile key={dim} cols={9} title={`${code3} Gaps by ${name}`} subtitle={smallNote(dim)} fr="703" ask={dim === "race" ? ["Q11"] : undefined}>
                    <QsGapColumns label={`${code3} gaps by ${name.toLowerCase()}`} rows={gapRows(dim)} />
                  </QsTile>
                ))}
                <QsTile cols={9} title={`${code3} Gaps by ${FL.sex}`} subtitle={smallNote("sex")} fr="703">
                  <QsDonut
                    qs8
                    label={`${code3} gaps by ${FL.sex.toLowerCase()}`}
                    slices={sexRows.map((r) => ({
                      label: r.group,
                      value: r.t.denominator,
                      detail: `Closed ${r.t.met}, Open ${r.t.gap}`,
                    }))}
                  />
                </QsTile>
              </>
            )}
            <QsTile cols={36} bare fr="703">
              <Box sx={{ maxWidth: 220 }}>
                <SelectField
                  label="Top n Managers"
                  value={String(topN)}
                  onChange={(v) => setTopN(Number(v))}
                  options={[5, 10, 15].map((n) => ({ value: String(n), label: String(n) }))}
                />
              </Box>
            </QsTile>
            <QsTile
              cols={18}
              title={`Top ${topN} Open Gaps by Primary Care Manager`}
              subtitle="Managers with the most open gaps first, high to low."
              fr="703"
            >
              <QsGapBars
                label={`Top ${topN} open gaps by primary care manager`}
                first="open"
                totals={v8}
                rows={topOpen.map((r) => ({ label: mgrLabel(r.name), open: r.open, closed: r.closed }))}
                empty="No manager has an eligible member for these controls"
              />
            </QsTile>
            <QsTile
              cols={18}
              title={`Top ${topN} Closed Gaps by Primary Care Manager`}
              subtitle="Managers with the most closed gaps first, high to low. Uses the same n as the chart on the left."
              fr="703"
            >
              <QsGapBars
                label={`Top ${topN} closed gaps by primary care manager`}
                first="closed"
                totals={v8}
                rows={topClosed.map((r) => ({ label: mgrLabel(r.name), open: r.open, closed: r.closed }))}
                empty="No manager has an eligible member for these controls"
              />
            </QsTile>
            <QsTile
              cols={12}
              title="Met and not met"
              subtitle="Click a bar to list those members on Details"
              fr="707.1"
              ask={["Q3"]}
            >
              <QsColumnChart
                label="Number of members met and not met"
                max={Math.max(10, Math.ceil(Math.max(t.met, t.gap) / 10) * 10)}
                unit=""
                decimals={0}
                onSelect={(b) => onBar(b.label === "Met" ? "Met" : "Gap")}
                bars={[
                  { label: "Met", value: t.met, color: qs.meaning.met },
                  { label: "Not met", value: t.gap, color: qs.meaning.gap },
                ]}
              />
            </QsTile>
            {!v8 && (
              <>
            <QsTile cols={24} title={`${code3} Gaps by ${FL.ageGroup}`} subtitle={smallNote("ageGroup")} fr="703">
              <QsGapBars label={`${code3} gaps by ${FL.ageGroup.toLowerCase()}`} rows={gapRows("ageGroup")} noteWidth={86} totals={v8} />
            </QsTile>
            <QsTile cols={36} title={`${code3} Gaps by Race`} subtitle={smallNote("race")} fr="703" ask={["Q11"]}>
              <QsGapBars label={`${code3} gaps by race`} rows={gapRows("race")} noteWidth={86} totals={v8} />
            </QsTile>
            <QsTile cols={24} title={`${code3} Gaps by Ethnicity`} subtitle={smallNote("ethnicity")} fr="703">
              <QsGapBars label={`${code3} gaps by ethnicity`} rows={gapRows("ethnicity")} noteWidth={86} totals={v8} />
            </QsTile>
            <QsTile cols={12} title={`${code3} Gaps by ${FL.sex}`} subtitle={smallNote("sex")} fr="703">
              <QsDonut
                qs8={v8}
                label={`${code3} gaps by ${FL.sex.toLowerCase()}`}
                slices={sexRows.map((r) => ({
                  label: r.group,
                  value: r.t.denominator,
                  detail: `Closed ${r.t.met}, Open ${r.t.gap}`,
                }))}
              />
            </QsTile>
              </>
            )}
          </>
        );
      })()}
      <QsTile
        cols={36}
        title="Everything that affects this calculation"
        fr="702.7"
      >
        <CalcList year={year} def={def} />
      </QsTile>
      {!v3 && (
      <QsTile
        cols={36}
        bare
        review
        tone="info"
        fr="703"
        ask={["Q3", "Q16", "Q25", "Q26", "Q27"]}
      >
        <QsText>
          <p>
            <b>Not on this dashboard, and why.</b>
          </p>
          <ul>
            <li>
              <b>Click a KPI card to open its member list:</b> QuickSight only
              starts a click action from a chart. The Met and Not met bars do it
              instead.
            </li>
            <li>
              <b>Access by role:</b> the rule is not known yet. QuickSight
              limits rows by user or group behind the scenes, so no screen is
              drawn.
            </li>
            <li>
              <b>And / or between filters:</b> choices inside one control are
              OR. Different controls are AND. QuickSight has no OR between
              controls.
            </li>
            <li>
              <b>Appointment status:</b> needs appointment data from Madigan.
            </li>
            <li>
              <b>Member-to-PCP file:</b> needs a file from Madigan with from and
              to dates. Today the provider comes from the claims.
            </li>
          </ul>
        </QsText>
      </QsTile>
      )}
    </QsSheet>
  );
}

function CalcList({
  year,
  def,
}: {
  year: number;
  def: ReturnType<typeof measureFor>;
}) {
  return (
    <QsText>
      <ul>
        <li>
          <b>Measurement period:</b> {periodText(year).replace(" to ", " – ")}
        </li>
        <li>
          <b>Eligible population:</b> {def.population}
        </li>
        <li>
          <b>Age rule:</b> {def.ageRule}
        </li>
        <li>
          <b>Met when:</b> {def.needs}
        </li>
        <li>
          <b>Rate:</b> met members divided by eligible members. Excluded members
          and members not in the measure are not counted.
        </li>
        <li>
          <b>Rules applied:</b>
          <ul>
            {def.rules.map((r) => (
              <li key={r.text}>{v3Code(r.text)}</li>
            ))}
          </ul>
        </li>
      </ul>
    </QsText>
  );
}

const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fromIso = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/* ================================================================== Details */

function Details({
  code,
  list,
  year,
  view,
  md,
}: {
  code: MeasureCode;
  list: Member[];
  year: number;
  view: "" | "Met" | "Gap";
  md: MemberDetailsFilter;
}) {
  const { memberLists } = useRole();
  const v3 = useVersion().version.id >= 3;
  const v7 = useVersion().version.id >= 7;
  const v8 = useVersion().version.id >= 8;
  const [selectedId, setSelectedId] = useState("");
  const shown = useMemo(() => {
    let rows = view ? list.filter((m) => resultsFor(m, year)[code].state === view) : list;
    if (v7) {
      const states = POPULATIONS.find((p) => p.value === md.pop)?.states;
      if (states) rows = rows.filter((m) => states.includes(resultsFor(m, year)[code].state));
      const tri = md.tricare.trim();
      if (tri) rows = rows.filter((m) => (v8 ? tricareIdOf(m) === tri : tricareIdOf(m).includes(tri)));
      const nm = md.name.trim().toLowerCase();
      if (nm) rows = rows.filter((m) => (v8 ? m.name.toLowerCase() === nm : m.name.toLowerCase().includes(nm)));
    }
    return rows;
  }, [list, view, year, code, v7, v8, md]);
  const selected = shown.find((m) => m.id === selectedId) ?? null;
  const stateOf = (m: Member) => resultsFor(m, year)[code].state;
  const cols: QsCol<Member>[] = [
    {
      key: "name",
      header: v3 ? "Member Name" : "Member name",
      value: (m) => m.name,
      nowrap: true,
      render: (m) => (
        <Link
          to={`/members/${m.id}`}
          style={{ color: qs.color.accent, fontWeight: 700 }}
        >
          {m.name}
        </Link>
      ),
    },
    { key: "id", header: "Member ID", value: (m) => m.id, nowrap: true },
    ...(v3
      ? [
          {
            key: "tricare",
            header: "Tricare ID",
            value: (m: Member) => tricareIdOf(m),
            nowrap: true,
          } as QsCol<Member>,
        ]
      : []),
    {
      key: "dob",
      header: FL.dob,
      value: (m) => m.dob.getTime(),
      render: (m) => fmtDate(m.dob),
      nowrap: true,
    },
    {
      key: "age",
      header: "Age",
      value: (m) => (v3 ? ageMonths(m.dob) : ageAtYearEnd(m.dob, year)),
      render: (m) => (v3 ? ageLabel(m.dob) : ageAtYearEnd(m.dob, year)),
      align: "right",
    },
    { key: "sex", header: FL.sex, value: sexOf },
    {
      key: "ag",
      header: FL.ageGroup,
      value: (m) => ageGroupOf(m, year, code),
      nowrap: true,
    },
    {
      key: "res",
      header: FL.result,
      value: (m) =>
        getVersion() >= 7 ? gapStatusText(stateOf(m)) : stateLabel[stateOf(m)],
      nowrap: true,
      render: (m) => (
        <QsFmt color={stateColor[stateOf(m)]}>
          {getVersion() >= 7 ? gapStatusText(stateOf(m)) : stateLabel[stateOf(m)]}
        </QsFmt>
      ),
    },
    {
      key: "ev",
      header: FL.evDate,
      value: (m) => resultsFor(m, year)[code].evidence?.date.getTime() ?? 0,
      render: (m) => {
        const e = resultsFor(m, year)[code].evidence;
        return e && stateOf(m) === "Met" ? fmtDate(e.date) : "–";
      },
      nowrap: true,
    },
    { key: "state", header: FL.state, value: (m) => stateName(m.state) },
    { key: "county", header: LABEL.county, value: countyOf, nowrap: true },
    {
      key: "military",
      header: LABEL.military,
      value: (m) => (v3 ? militaryV3(m, year) : militaryOf(m)),
      nowrap: true,
    },
    { key: "race", header: LABEL.race, value: raceOf, nowrap: true },
    {
      key: "eth",
      header: LABEL.ethnicity,
      value: ethnicityOf,
      nowrap: true,
    },
    {
      key: "pcp",
      header: getVersion() >= 7 ? "Primary Care Manager" : LABEL.provider,
      value: providerOf,
      // Lucid chart (version 8): "Dr. Name (NPI: ...)".
      ...(v8
        ? {
            render: (m: Member) => {
              const p = pcmByName(providerOf(m));
              return p ? `Dr. ${pcmLabel(p)}` : providerOf(m);
            },
          }
        : {}),
      nowrap: true,
    },
    {
      key: "open",
      header: FL.openGaps,
      value: (m) => openGapCount(m, year),
      render: (m) =>
        v3 ? openGapCount(m, year) : openGapsLabel(openGapCount(m, year)),
      align: "right",
      nowrap: true,
    },
    {
      key: "excl",
      header: LABEL.excluded,
      value: (m) =>
        measures
          .filter((x) => resultsFor(m, year)[x.code].state === "Excluded")
          .map((x) => (v3 ? gapShort(x.code) : x.code))
          .join(", ") || "–",
      nowrap: true,
    },
    {
      key: "a1c",
      header: LABEL.a1c,
      value: (m) => a1cBandOf(m, year) ?? "–",
      nowrap: true,
    },
  ];
  if (!memberLists)
    return (
      <QsSheet>
        <QsTile cols={36} bare tone="info">
          <QsText>
            <p>
              <b>The list of members is not part of your role.</b> You see
              totals and rates only. Ask your administrator if you need the
              list.
            </p>
          </QsText>
        </QsTile>
      </QsSheet>
    );
  /** Version 7 (Lucid design): the same order as the design: Tricare ID, First Name, Last Name, Date of Birth, Age (years), Gender, Race, Ethnicity, Primary Care Manager. Other columns follow. */
  const v7cols: QsCol<Member>[] = (() => {
    if (!v7) return cols;
    const link = (m: Member, text: string) => (
      <Link to={`/members/${m.id}`} style={{ color: qs.color.accent, fontWeight: 700 }}>
        {text}
      </Link>
    );
    const by = (k: string) => cols.find((c) => c.key === k)!;
    const first: QsCol<Member> = { key: "first", header: "First Name", value: (m) => m.first, render: (m) => link(m, m.first), nowrap: true };
    const last: QsCol<Member> = { key: "last", header: "Last Name", value: (m) => m.last, render: (m) => link(m, m.last), nowrap: true };
    const head = [
      by("tricare"),
      first,
      last,
      { ...by("dob"), header: "Date of Birth" },
      {
        ...by("age"),
        header: "Age (years)",
        value: (m: Member) => ageAtYearEnd(m.dob, year),
        render: (m: Member) => ageAtYearEnd(m.dob, year),
      },
      by("sex"),
      by("race"),
      by("eth"),
      by("pcp"),
    ];
    const used = new Set([...head.map((c) => c.key), "name"]);
    return [...head, ...cols.filter((c) => !used.has(c.key))];
  })();
  return (
    <QsSheet>
      {view && (
        <QsTile cols={36} bare tone="info" fr="707.1" ask={["Q3", "Q30"]}>
          <QsText>
            <p>
              <b>
                Showing only members who are{" "}
                {view === "Gap" ? "Not met" : "Met"} ({n0(shown.length)}).
              </b>{" "}
              Click the same bar on Overview, or press Reset, to see everyone.
            </p>
          </QsText>
        </QsTile>
      )}
      <QsTile
        cols={36}
        title={v7 ? "Member Detail Table" : "List of members in the initial population"}
        subtitle={
          v7
            ? `${n0(shown.length)} members. Click a row to see the explanation and recommendation below. Click a header to sort. A name opens the member page.`
            : `${n0(shown.length)} members. Click a header to sort. Every column is always shown, scroll sideways for more. The name opens the member page.`
        }
        fr="707"
        ask={["Q7", "Q13", "Q14"]}
      >
        <QsTable
          label="Members"
          exportFile="members"
          cols={v7cols}
          rows={shown}
          rowKey={(m) => m.id}
          maxHeight={560}
          {...(v7 ? { onRowSelect: (m: Member) => setSelectedId(m.id), selectedKey: selected?.id ?? "" } : {})}
        />
      </QsTile>
      {v7 && <MemberInsightPanels member={selected} code={code} year={year} />}
    </QsSheet>
  );
}

/* ------------------------------------------------------------------ Version 7: explanation and recommendation for one member */

const stateWord: Record<MeasureState, string> = {
  Met: "Gap closed",
  Gap: "Gap open",
  Excluded: "Excluded",
  Review: "Needs review",
  "Not eligible": "Not in this measure",
};
const stepWord = (o: string) =>
  o === "pass" ? "Yes" : o === "fail" || o === "unmet" ? "No" : o === "excluded" ? "Yes, excluded" : o === "review" ? "Needs review" : "Not checked";

/** Version 8 (Lucid chart): the BCS rows of the Explanation table, each one a Yes or No about this member. */
const lucidBcsRows = (m: Member, year: number): { k: string; v: string; d: string }[] => {
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  const yn = (b: boolean) => (b ? "Yes" : "No");
  const inYear = (d: Date) => d >= start && d <= end;
  const age = ageAtYearEnd(m.dob, year);
  const hospice =
    m.medicare.some((x) => x.hospice && x.start <= end && x.end >= start) || (!!m.dod && m.dod.getFullYear() === year);
  const palliative = m.events.some((e) => e.tag === "palliative" && inYear(e.date));
  const frail = age >= 66 && m.events.some((e) => e.tag === "frailty") && m.events.some((e) => e.tag === "dementia");
  return [
    { k: "Is continuously enrolled", v: yn(continuouslyEnrolled(m, year).ok), d: "" },
    { k: "Hospice during measurement period", v: yn(hospice), d: "" },
    { k: "Palliative care during measurement period", v: yn(palliative), d: "" },
    { k: "Advanced illness and frailty exclusion", v: yn(frail), d: "" },
    { k: "Mastectomy during history", v: yn(m.events.some((e) => e.tag === "mastectomy" && e.date <= end)), d: "" },
    { k: "Gender-affirming chest surgery history", v: yn(m.events.some((e) => e.tag === "chest-surgery" && e.date <= end)), d: "" },
  ];
};

/** The Explanation and Recommendation of one member (Lucid design). The recommendation words are example text until the AI insights test is done. */
function MemberInsightPanels({ member, code, year }: { member: Member | null; code: MeasureCode; year: number }) {
  const v8 = useVersion().version.id >= 8;
  const def = measureFor(measureByCode(code)!, year);
  if (!member)
    return (
      <QsTile cols={36} title="Member Details" subtitle="Click a member in the list above to see their explanation and recommendation here." fr="707.2">
        {null}
      </QsTile>
    );
  const r = resultsFor(member, year)[code];
  const when = r.evidence ? fmtDate(r.evidence.date) : null;
  const priority = r.state === "Gap" ? "High" : r.state === "Review" ? "Medium" : "Low";
  const confidence = r.state === "Review" ? "Medium" : "High";
  const action =
    r.state === "Met"
      ? `No action needed for ${V3_GAP_LABEL[code]} at this time.`
      : r.state === "Gap"
        ? `Reach out to the member to book what is missing: ${def.needs.charAt(0).toLowerCase()}${def.needs.slice(1)}`
        : r.state === "Excluded"
          ? "No action needed. The member is excluded from this measure."
          : r.state === "Review"
            ? "A care manager should review this member's record before the result is final."
            : "No action needed. The member is not in this measure.";
  const why =
    r.state === "Met" && when
      ? `${r.reason} The qualifying record is dated ${when}.`
      : r.reason;
  return (
    <>
      <QsTile cols={18} title="Explanation" subtitle="For the member clicked in the list above." fr="707.2">
        <QsTable
          label="Explanation for the selected member"
          exportFile="member-explanation"
          rowKey={(x) => x.k}
          maxHeight={100000}
          cols={
            v8
              ? [
                  // Lucid chart: two columns, Item and Value.
                  { key: "k", header: "Item", value: (x) => x.k },
                  { key: "v", header: "Value", value: (x) => x.v },
                ]
              : [
                  { key: "k", header: "Check", value: (x) => x.k },
                  { key: "v", header: "Result", value: (x) => x.v },
                  { key: "d", header: "What Was Found", value: (x) => x.d },
                ]
          }
          rows={[
            { k: "Tricare ID", v: tricareIdOf(member), d: "" },
            { k: "Member Name", v: member.name, d: "" },
            { k: "Outcome", v: r.state === "Met" ? "MET" : r.state === "Gap" ? "NOT MET" : r.state.toUpperCase(), d: r.reason },
            { k: v3Code(code), v: r.state === "Not eligible" ? "False" : "True", d: "Whether the member is in this measure" },
            ...(v8 && code === "BCS-E"
              ? lucidBcsRows(member, year)
              : r.steps.map((st) => ({ k: st.label, v: stepWord(st.outcome), d: st.detail }))),
          ]}
        />
      </QsTile>
      <QsTile cols={18} title="Recommendation" subtitle="For the member clicked in the list above. Example text: the words change when the AI insights test is done." fr="707.2">
        <QsText>
          <p>
            <b>Status:</b> {stateWord[r.state]} · <b>Priority:</b> {priority} · <b>Confidence:</b> {confidence}
          </p>
          <p>
            <b>Action:</b> {action}
          </p>
          <p>
            <b>Why:</b> {why}
          </p>
        </QsText>
      </QsTile>
    </>
  );
}

/* ================================================================== Data */

function DataSheet({
  code,
  list,
  year,
  def,
}: {
  code: MeasureCode;
  list: Member[];
  year: number;
  def: ReturnType<typeof measureFor>;
}) {
  const inputs = inputsFor(code);
  const left = leftOutFor(code, list, year);
  const fileColor = (s: string) =>
    s === "Accepted"
      ? qs.meaning.met
      : s === "Accepted with warnings"
        ? qs.meaning.gapText
        : s === "Failed"
          ? qs.tone.danger.border
          : qs.meaning.neutral;
  return (
    <QsSheet>
      <QsTile
        cols={24}
        title="What went into this measure"
        subtitle="The data files this measure reads. A rejected or missing file can make the rate too low."
        fr="704"
      >
        <QsTable
          label="Files used"
          exportFile="files-used"
          rowKey={(r) => r.file.id}
          maxHeight={300}
          cols={[
            {
              key: "f",
              header: "File",
              value: (r) => r.title,
              render: (r) => `${r.title} (${r.file.id}.csv)`,
            },
            {
              key: "s",
              header: "Status",
              value: (r) => r.file.status,
              render: (r) => (
                <QsFmt color={fileColor(r.file.status)}>{r.file.status}</QsFmt>
              ),
              nowrap: true,
            },
            {
              key: "d",
              header: "Latest file date",
              value: (r) => r.file.receivedOn?.getTime() ?? 0,
              render: (r) =>
                r.file.receivedOn ? fmtDate(r.file.receivedOn) : "–",
              nowrap: true,
            },
            {
              key: "u",
              header: "Rows used",
              value: (r) => r.rowsUsed,
              align: "right",
            },
            {
              key: "r",
              header: "Rows rejected",
              value: (r) => r.rejected,
              align: "right",
            },
          ]}
          rows={inputs}
        />
      </QsTile>
      <QsTile
        cols={12}
        title="Members left out and why"
        subtitle="For the controls you picked"
        fr="704"
      >
        <QsTable
          label="Members left out"
          exportFile="members-left-out"
          rowKey={(r) => `${r.kind}|${r.reason}`}
          maxHeight={300}
          cols={[
            { key: "r", header: "Reason", value: (r) => r.reason },
            { key: "k", header: "Type", value: (r) => r.kind, nowrap: true },
            {
              key: "c",
              header: "Members",
              value: (r) => r.count,
              align: "right",
            },
          ]}
          rows={left}
        />
      </QsTile>
      {inputs.some(
        (i) => i.rejected > 0 || i.file.status === "Not received",
      ) && (
        <QsTile cols={36} bare tone="warning" fr="704" ask={["Q18", "Q30"]}>
          <QsText>
            <p>
              <b>A file this measure reads was rejected or has not arrived.</b>{" "}
              The rate may be too low until it is fixed. See the Admin sheet.
            </p>
          </QsText>
        </QsTile>
      )}
      <QsTile
        cols={36}
        title="Everything that affects this calculation"
        fr="704"
      >
        <CalcList year={year} def={def} />
      </QsTile>
    </QsSheet>
  );
}

/* ================================================================== Admin */

/** Example values, only so the sheet can be drawn. Each is a question for Madigan or the engineers (Q19 to Q24). */
const ADMIN_EXAMPLE = {
  valueSets: "HEDIS MY2026 value sets (example)",
  engine: "DCS engine 1.0 (example)",
  threshold: 5,
};

function AdminSheet({
  code,
  year,
  withWarnings,
  onChange,
}: {
  code: MeasureCode;
  year: number;
  withWarnings: boolean;
  onChange: (v: boolean) => void;
}) {
  const { version } = useVersion();
  const v3 = version.id >= 3;
  const v7 = version.id >= 7;
  const all = useMemo(() => rejectedRows(), []);
  const { runs } = useRun();
  const [runOpen, setRunOpen] = useState<Run | null>(null);
  const sum = loadSummary();
  const run = runInfo();
  const reasons = reasonRows(all);
  const rows = withWarnings ? all : all.filter((r) => r.result !== "Warning");
  /** Version 7, FR-710.13: what was missing, by data type. One line per data type and field. */
  const missingFields = useMemo(() => {
    const by = new Map<string, { type: string; field: string; rule: string; count: number; total: number }>();
    for (const r of all) {
      if (r.reason !== "Missing required field") continue;
      const k = `${r.fileName}|${r.field}`;
      const cur = by.get(k);
      if (cur) cur.count++;
      else
        by.set(k, {
          type: r.fileType,
          field: r.field,
          rule: r.rule,
          count: 1,
          total: dataFiles.find((f) => `${f.id}.csv` === r.fileName)?.rows ?? 0,
        });
    }
    return [...by.values()].map((x, i) => ({ ...x, id: String(i) }));
  }, [all]);
  /** Version 7, FR-710.18: for each measure, how many eligible members have a problem row in a file the measure reads. */
  const measureImpact = useMemo(
    () =>
      measures.map((m) => {
        const code = v3Code(m.code);
        const mine = all.filter((r) => r.measures.split(", ").includes(code));
        const ids = new Set(mine.filter((r) => r.memberId !== "–").map((r) => r.memberId));
        const eligible = kpisFor(m.code, allMembers(), MY).t.denominator;
        const why = new Map<string, number>();
        for (const r of mine) why.set(r.reason, (why.get(r.reason) ?? 0) + 1);
        const files = [...new Set(mine.filter((r) => r.result === "Not received" || r.result === "Rejected").map((r) => r.fileName))];
        return {
          code: m.code,
          label: V3_GAP_LABEL[m.code],
          members: ids.size,
          eligible,
          pct: eligible ? (ids.size / eligible) * 100 : 0,
          reasons: mine.length
            ? [...why.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} (${n})`).join(", ") +
              (files.length ? `. Files to fix: ${files.join(", ")}` : "")
            : "No problems found",
        };
      }),
    [all],
  );
  const critical = useMemo(() => {
    const seen = new Map<string, RejectedRow>();
    for (const r of all)
      if (r.impact === "Critical" && !seen.has(r.fileName))
        seen.set(r.fileName, r);
    return [...seen.values()];
  }, [all]);
  /** Version 7 (FR-710.17): the columns follow the three-step trace: artifact, then source table, then what is wrong. */
  const rejectedCols = (cols: QsCol<RejectedRow>[]) => {
    if (!v7) return cols;
    const order = ["i", "f", "m", "l", "ty", "src", "fld", "v", "rule", "rs", "ms", "res"];
    return [...cols].sort((x, y) => order.indexOf(x.key) - order.indexOf(y.key));
  };
  const impactColor = (i: string) =>
    i === "Critical" ? qs.tone.danger.border : qs.meaning.gapText;
  const share100 = (n: number) =>
    sum.rowsReceived ? p1(share(n, sum.rowsReceived)) : "–";
  const rejectedPct = share(sum.rowsRejected, sum.rowsReceived);
  const overThreshold = rejectedPct > ADMIN_EXAMPLE.threshold;
  const fileColor = (st: string) =>
    st === "Accepted" || st.startsWith("Succeeded")
      ? qs.meaning.met
      : st === "Accepted with warnings" || st.startsWith("Scheduled")
        ? qs.meaning.gapText
        : st.startsWith("Failed") || st.startsWith("Rejected")
          ? qs.tone.danger.border
          : qs.meaning.neutral;
  const nextDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 2, 0);
  const daysSince = (d?: Date) =>
    d
      ? Math.max(0, Math.round((run.last.getTime() - d.getTime()) / DAY_MS))
      : null;
  const files = dataFiles.map((f) => ({
    f,
    title: fileTitle(f.id),
    rejected: f.status === "Failed" ? f.rows : 0,
    days: daysSince(f.receivedOn),
  }));
  const loads = dataFiles.flatMap((f) => {
    const status =
      f.status === "Failed"
        ? "Rejected (after three failed attempts)"
        : f.status === "Not received"
          ? "Scheduled retry"
          : "Succeeded";
    const one = {
      key: f.id,
      f,
      title: fileTitle(f.id),
      status,
      attempt: f.status === "Failed" ? 3 : 1,
      reason:
        v7 && f.status === "Failed"
          ? // FR-710.14: this column is for loading failures, not transformation failures. The failed rows are listed in Rejected Row Detail.
            "The file failed to load three times. The rows that failed a check are listed in Rejected Row Detail."
          : f.status === "Failed" || f.status === "Not received"
            ? f.note
            : "–",
      affected: f.status === "Failed" ? f.rows : 0,
      next: f.status === "Not received" ? nextDay(run.last) : null,
    };
    if (!v3) return [one];
    // Version 3 adds the two retry outcomes. Demo history: a file that was not received fails its retry and waits for the third try;
    // a lab file that timed out on the first try loads on the second.
    if (f.status === "Not received")
      return [
        {
          ...one,
          key: `${f.id}:2`,
          status: "Failed on retry",
          attempt: 2,
          next: nextDay(run.last),
        },
        { ...one, key: `${f.id}:3`, attempt: 3 },
      ];
    if (f.id === "lab")
      return [
        {
          ...one,
          key: `${f.id}:2`,
          status: "Succeeded on retry",
          attempt: 2,
          reason: "Transfer timed out on attempt 1 (demo example)",
        },
      ];
    return [one];
  });
  const artifacts = dataFiles
    .filter((f) => f.status !== "Not received")
    .map((f) => ({
      f,
      title: fileTitle(f.id),
      total: f.rows,
      invalid: f.status === "Failed" ? f.rows : 0,
      perMember: f.rows / members.length,
    }));
  const unmatched = all.filter((r) => r.field === "Member ID");
  return (
    <>
      <QsControlsBar ask={["Q4"]}>
        <QsControl>
          <SelectField
            label="Rows shown"
            value={withWarnings ? "warn" : "rej"}
            onChange={(v) => onChange(v === "warn")}
            options={[
              { value: "rej", label: "Rejected only" },
              { value: "warn", label: "Rejected and warnings" },
            ]}
          />
        </QsControl>
      </QsControlsBar>
      <QsSheet>
        {v7 && (
          <QsTile cols={36} bare fr="702.11">
            <QsText>
              <p>
                <b>Measurement period:</b> {periodText(MY).replace(" to ", " – ")}.{" "}
                <b>Last updated:</b> {fmtRun(run.last)} · <b>Next update:</b> {fmtRun(run.next)}
              </p>
            </QsText>
          </QsTile>
        )}
        {critical.length > 0 && (
          <QsTile cols={36} bare tone="danger" fr="710" ask={["Q18", "Q30"]}>
            <QsText>
              <p>
                <b>
                  {critical.length} critical{" "}
                  {critical.length === 1 ? "problem" : "problems"}
                </b>
              </p>
              <ul>
                {critical.map((r) => (
                  <li key={r.fileName}>
                    <b>{r.fileName}</b>:{" "}
                    {r.result === "Not received" ? "not received" : "rejected"}.{" "}
                    {r.measures} may be incomplete until a new file arrives.
                  </li>
                ))}
              </ul>
            </QsText>
          </QsTile>
        )}
        <QsTile cols={36} bare tone="info" fr="710">
          <QsText>
            <p>
              <b>What you can do.</b> These are data problems at the source, not
              measure exclusions. Fix them in the source system and send the
              file again. Rows are checked again with every new file.
            </p>
          </QsText>
        </QsTile>
        <QsTile cols={36} bare review tone="info" fr="710" ask={["Q20"]}>
          <QsText>
            <p>
              <b>What is an artifact?</b> Madigan has not said yet. Until they
              do, the cards and tables below count rows, and the word artifact
              stands for one row.
            </p>
          </QsText>
        </QsTile>
        <QsKpi
          cols={6}
          fr="710.5"
          label="Files received"
          value={`${sum.filesReceived} of ${sum.filesTotal}`}
          tip="Counted when the file lands in the staging tables."
        />
        <QsKpi
          cols={6}
          fr="710.5"
          ask={["Q20", "Q24"]}
          label="Artifacts created"
          value={n0(sum.rowsReceived)}
          tip="Counted in the staging tables after the file is loaded and split into records (one per row for now)."
        />
        <QsKpi
          cols={6}
          fr="710.5"
          label="Artifacts accepted"
          value={n0(sum.rowsAccepted)}
          sub={share100(sum.rowsAccepted)}
          color={qs.meaning.met}
          tip="Artifacts that passed the checks in the transformation step and were used in the measures."
        />
        <QsKpi
          cols={6}
          fr="710.6"
          ask={["Q20", "Q23"]}
          label="Artifacts rejected"
          value={n0(sum.rowsRejected)}
          sub={`${share100(sum.rowsRejected)} · limit ${ADMIN_EXAMPLE.threshold.toFixed(1)}%`}
          color={overThreshold ? qs.tone.danger.border : undefined}
          tip={`Artifacts that failed a check in the transformation step. The card turns red above the rejection limit.`}
        />
        <QsKpi
          cols={6}
          fr="710.5"
          label="With a warning"
          value={n0(sum.warnings)}
          tip="Used in the measures, with a problem noted."
        />
        <QsKpi
          cols={6}
          fr="710.9"
          label="Last nightly run completed"
          value={fmtDate(run.last)}
          sub={`at ${run.last.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`}
          tip="From the execution time of the last run of the calculation engine."
        />
        {v3 && (
          <QsTile
            cols={36}
            title="Nightly Run History Trend"
            subtitle="Rows received in each recent nightly run. A sudden drop means data went missing. Runs are daily here; each file type's delivery schedule is still to be confirmed."
          >
            <QsColumnChart
              label="Rows received per nightly run"
              bars={[...runs]
                .sort((a, b) => a.at.getTime() - b.at.getTime())
                .slice(-14)
                .map((r) => ({
                  label: `${r.at.getMonth() + 1}/${r.at.getDate()}`,
                  value: r.rowsIn,
                  detail: `${r.status}: ${n0(r.rowsIn)} rows in, ${n0(r.rowsRejected)} rejected, ${r.files.length} of ${r.filesTotal} files`,
                  color:
                    r.status === "Failed" ? qs.meaning.gap : undefined,
                }))}
              max={Math.max(
                100,
                Math.ceil(Math.max(...runs.map((r) => r.rowsIn)) / 100) * 100,
              )}
              unit=""
              decimals={0}
            />
          </QsTile>
        )}
        <QsTile
          cols={36}
          title={v7 ? "Nightly Run History" : "Run history"}
          subtitle="Every nightly run. Click a run for its files, problems and measures. Use the Results as of Run control above to see the numbers as they were then."
          fr="108"
        >
          <QsTable<Run>
            label="Run history"
            exportFile="run-history"
            rows={runs}
            rowKey={(r) => r.id}
            maxHeight={v7 ? 100000 : 360}
            defaultSort={{ key: "at", dir: "desc" }}
            onRowSelect={(r) => setRunOpen(r)}
            cols={[
              {
                key: "at",
                header: "Run started",
                value: (r) => r.at.getTime(),
                render: (r) => fmtRunTime(r.at),
                nowrap: true,
              },
              { key: "status", header: "Status", value: (r) => r.status },
              {
                key: "asof",
                header: "Data as of",
                value: (r) => r.dataAsOf.getTime(),
                render: (r) => fmtDate(r.dataAsOf),
                nowrap: true,
              },
              {
                key: "files",
                header: "Files received",
                value: (r) => r.files.length,
                render: (r) => `${r.files.length} of ${r.filesTotal}`,
                align: "right",
              },
              {
                key: "in",
                header: "Rows in",
                value: (r) => r.rowsIn,
                render: (r) => n0(r.rowsIn),
                align: "right",
              },
              {
                key: "out",
                header: "Rows out",
                value: (r) => r.rowsIn - r.rowsRejected,
                render: (r) => n0(r.rowsIn - r.rowsRejected),
                align: "right",
              },
              {
                key: "rej",
                header: "Rows rejected",
                value: (r) => r.rowsRejected,
                render: (r) => n0(r.rowsRejected),
                align: "right",
              },
            ]}
          />
        </QsTile>
        <RunDetails run={runOpen} onClose={() => setRunOpen(null)} />
        {v7 && <RunHistoryTile code={code} year={year} />}
        <QsTile
          cols={36}
          title={v7 ? "Files Ingested" : "Files ingested"}
          subtitle="Days since update = the date of the last run minus the date the last file was received."
          fr="710.11"
          ask={["Q29"]}
        >
          <QsTable
            label="Files ingested"
            exportFile="files-ingested"
            rowKey={(r) => r.f.id}
            maxHeight={v7 ? 100000 : 360}
            cols={[
              {
                key: "f",
                header: "File",
                value: (r) => r.title,
                render: (r) => `${r.title} (${r.f.id}.csv)`,
              },
              {
                key: "rec",
                header: "Last file received",
                value: (r) => r.f.receivedOn?.getTime() ?? 0,
                render: (r) => (r.f.receivedOn ? fmtDate(r.f.receivedOn) : "–"),
                nowrap: true,
              },
              {
                key: "load",
                header: "Last loaded",
                value: (r) => r.f.receivedOn?.getTime() ?? 0,
                render: (r) => (r.f.receivedOn ? fmtDate(r.f.receivedOn) : "–"),
                nowrap: true,
              },
              {
                key: "rows",
                header: "Rows in last file",
                value: (r) => r.f.rows,
                align: "right",
              },
              {
                key: "rej",
                header: "Rows rejected",
                value: (r) => r.rejected,
                align: "right",
              },
              {
                key: "next",
                header: "Next expected",
                value: () => nextDay(run.last).getTime(),
                render: () => fmtDate(nextDay(run.last)),
                nowrap: true,
              },
              {
                key: "days",
                header: "Days since update",
                value: (r) => r.days ?? -1,
                render: (r) => (r.days === null ? "–" : r.days),
                align: "right",
              },
              {
                key: "st",
                header: "Status",
                value: (r) => r.f.status,
                render: (r) => (
                  <QsFmt color={fileColor(r.f.status)}>{r.f.status}</QsFmt>
                ),
                nowrap: true,
              },
            ]}
            rows={files}
          />
        </QsTile>
        <QsTile
          cols={36}
          title={v7 ? "Artifacts by File" : "Artifacts by file"}
          subtitle="A file can turn into one or more artifacts, so files and artifacts are counted apart."
          fr="710.10"
          ask={["Q20"]}
        >
          <QsTable
            label="Artifacts by file"
            exportFile="artifacts-by-file"
            rowKey={(r) => r.f.id}
            maxHeight={v7 ? 100000 : 300}
            cols={[
              {
                key: "f",
                header: "File",
                value: (r) => r.title,
                render: (r) => `${r.title} (${r.f.id}.csv)`,
              },
              {
                key: "t",
                header: "Total artifacts",
                value: (r) => r.total,
                align: "right",
              },
              {
                key: "i",
                header: "Invalid artifacts",
                value: (r) => r.invalid,
                align: "right",
              },
              {
                key: "a",
                header: "Average per member",
                value: (r) => r.perMember,
                render: (r) => r.perMember.toFixed(1),
                align: "right",
              },
            ]}
            rows={artifacts}
          />
        </QsTile>
        <QsTile
          cols={36}
          title={v7 ? "File Loads: Successes and Failures" : "File loads: successes and failures"}
          subtitle="Every file load by data type. Rows affected depends on the data: one bad row can fail a whole file."
          fr="710.14"
        >
          <QsTable
            label="File loads"
            exportFile="file-loads"
            rowKey={(r) => r.key}
            maxHeight={v7 ? 100000 : 360}
            cols={[
              {
                key: "f",
                header: "File name",
                value: (r) => `${r.f.id}.csv`,
                nowrap: true,
              },
              { key: "t", header: "Data type", value: (r) => r.title },
              {
                key: "why",
                header: "Loading failure reason",
                value: (r) => r.reason,
              },
              {
                key: "n",
                header: "Rows affected",
                value: (r) => r.affected,
                align: "right",
              },
              {
                key: "a",
                header: "Attempt",
                value: (r) => r.attempt,
                align: "right",
              },
              {
                key: "next",
                header: "Next retry",
                value: (r) => r.next?.getTime() ?? 0,
                render: (r) => (r.next ? fmtRun(r.next) : "–"),
                nowrap: true,
              },
              {
                key: "st",
                header: "Status",
                value: (r) => r.status,
                render: (r) => (
                  <QsFmt color={fileColor(r.status)}>{r.status}</QsFmt>
                ),
                nowrap: true,
              },
            ]}
            rows={loads}
          />
        </QsTile>
        <QsTile
          cols={36}
          title={v3 ? "Rejected Rows by Reason" : "Problems by reason"}
          fr="710"
        >
          <QsTable
            label={v3 ? "Rejected rows by reason" : "Problems by reason"}
            exportFile={v3 ? "rejected-rows-by-reason" : "problems-by-reason"}
            rowKey={(r) => r.reason}
            maxHeight={v7 ? 100000 : 300}
            cols={[
              { key: "r", header: "Reason", value: (r) => r.reason },
              {
                key: "i",
                header: "Impact",
                value: (r) => r.impact,
                render: (r) => (
                  <QsFmt color={impactColor(r.impact)}>{r.impact}</QsFmt>
                ),
              },
              { key: "res", header: "Result", value: (r) => r.result },
              {
                key: "n",
                header: "Rows",
                value: (r) => r.count,
                align: "right",
              },
              { key: "fix", header: "What to do", value: (r) => r.fix },
            ]}
            rows={reasons}
          />
        </QsTile>
        <QsTile
          cols={36}
          title={
            v7
              ? withWarnings
                ? "Rejected Row Detail (With Warnings)"
                : "Rejected Row Detail"
              : withWarnings
                ? "Rejected rows and warnings"
                : "Rejected rows"
          }
          subtitle={
            v7
              ? "Read left to right in three steps. 1 Artifact: file, row and member. 2 Source table: file type, source and field. 3 What is wrong: value received, rule broken and reason."
              : "File and row, then the field, the value received and the rule it broke."
          }
          fr="710.17"
          ask={["Q7"]}
        >
          <QsTable
            label="Rejected rows"
            exportFile="rejected-rows"
            wrapHeaders={v7}
            rowKey={(r) => r.id}
            maxHeight={v7 ? 100000 : 420}
            defaultSort={{ key: "i", dir: "asc" }}
            cols={rejectedCols([
              {
                key: "i",
                header: "Impact",
                value: (r) => r.impact,
                render: (r) => (
                  <QsFmt color={impactColor(r.impact)}>{r.impact}</QsFmt>
                ),
              },
              {
                key: "f",
                header: "File and row",
                value: (r) => r.fileName,
                render: (r) =>
                  `${r.fileName}${r.rowNumber ? ` · row ${r.rowNumber}` : ""}`,
                nowrap: !v7,
              },
              {
                key: "ty",
                header: "File type",
                value: (r) => r.fileType,
              },
              {
                key: "src",
                header: "File source",
                value: (r) => r.source,
              },
              {
                key: "m",
                header: "Member",
                value: (r) => r.memberId,
                nowrap: true,
              },
              { key: "fld", header: "Field", value: (r) => r.field },
              { key: "v", header: v7 ? "Value Received" : "Value received", value: (r) => r.value },
              { key: "rule", header: "Rule broken", value: (r) => r.rule },
              { key: "rs", header: "Reason", value: (r) => r.reason },
              {
                key: "ms",
                header: v7 ? "Potential Measure(s) Affected" : "Measures affected",
                value: (r) => r.measures,
              },
              {
                key: "l",
                header: "Member loaded date",
                value: (r) => r.loadedOn.getTime(),
                render: (r) => fmtDate(r.loadedOn),
                nowrap: true,
              },
              { key: "res", header: "Result", value: (r) => r.result },
            ])}
            rows={rows}
          />
        </QsTile>
        {v7 && (
          <>
            <QsTile
              cols={36}
              title="Missing Required Fields by Data Type"
              subtitle="For each data type, what was missing from the artifacts that have a problem."
              fr="710.13"
            >
              <QsTable
                label="Missing required fields by data type"
                exportFile="missing-required-fields"
                rowKey={(r) => r.id}
                maxHeight={100000}
                cols={[
                  { key: "t", header: "Data Type", value: (r) => r.type },
                  { key: "f", header: "Field Missing", value: (r) => r.field },
                  { key: "n", header: "Artifacts Affected", value: (r) => r.count, align: "right" },
                  {
                    key: "p",
                    header: "% of This Data Type",
                    value: (r) => (r.total ? r.count / r.total : 0),
                    render: (r) => (r.total ? p1(share(r.count, r.total)) : "–"),
                    align: "right",
                  },
                  { key: "r", header: "Why It Matters", value: (r) => r.rule },
                ]}
                rows={missingFields}
              />
            </QsTile>
            <QsTile
              cols={36}
              title="Measure Impact of Incomplete Data"
              subtitle="For each measure: how many eligible members have a problem row in a file the measure reads."
              fr="710.18"
            >
              <QsTable
                label="Measure impact of incomplete data"
                exportFile="measure-impact"
                rowKey={(r) => r.code}
                maxHeight={100000}
                cols={[
                  { key: "m", header: "Measure", value: (r) => r.label },
                  { key: "n", header: "Members Affected", value: (r) => r.members, align: "right" },
                  { key: "e", header: "Eligible Members", value: (r) => r.eligible, align: "right" },
                  {
                    key: "p",
                    header: "% of Eligible Impacted",
                    value: (r) => r.pct,
                    render: (r) => p1(r.pct),
                    align: "right",
                  },
                  { key: "r", header: "Main Reasons", value: (r) => r.reasons },
                ]}
                rows={measureImpact}
              />
            </QsTile>
          </>
        )}
        <QsTile
          cols={36}
          title={v7 ? "Member Matching" : "Member matching"}
          subtitle="Rows from files that did not attach to any member. Two steps: rows with no member ID, then rows with an ID that matches nobody."
          fr="710.19"
        >
          <QsTable
            label="Rows not matched to a member"
            exportFile="member-matching"
            rowKey={(r) => r.id}
            maxHeight={v7 ? 100000 : 240}
            cols={[
              {
                key: "f",
                header: "File and row",
                value: (r) => r.fileName,
                render: (r) => `${r.fileName} · row ${r.rowNumber}`,
              },
              { key: "v", header: "Member ID received", value: (r) => r.value },
              { key: "rs", header: "Reason", value: (r) => r.reason },
            ]}
            rows={unmatched}
          />
        </QsTile>
        <QsTile
          cols={36}
          title={v7 ? "Calculation Settings in Use" : "Calculation settings in use"}
          subtitle="What the numbers on every dashboard are calculated with"
          fr="710.21"
          ask={["Q19"]}
        >
          <QsText>
            <ul>
              <li>
                <b>HEDIS specification:</b> {MEASURE_VERSION}
              </li>
              <li>
                <b>Value set version:</b> {ADMIN_EXAMPLE.valueSets}
              </li>
              <li>
                <b>DCS engine version:</b> {ADMIN_EXAMPLE.engine}
              </li>
              <li>
                <b>Artifact rejection threshold:</b>{" "}
                {ADMIN_EXAMPLE.threshold.toFixed(1)}%
              </li>
              <li>
                <b>Measurement period:</b>{" "}
                {periodText(2026).replace(" to ", " – ")}
              </li>
              <li>
                <b>Measures calculated:</b> {measures.length} of{" "}
                {measures.length}
              </li>
              <li>
                <b>Runs:</b> {run.schedule} · <b>Last run:</b>{" "}
                {fmtRun(run.last)} · <b>Next run:</b> {fmtRun(run.next)}
              </li>
            </ul>
          </QsText>
        </QsTile>
        {v7 && <HowToTile inAdmin />}
      </QsSheet>
    </>
  );
}

/* ================================================================== Help */

function HelpSheet() {
  return (
    <QsSheet>
      <HowToTile />
    </QsSheet>
  );
}

/** The "how to use this dashboard" guide. Shown on the Help sheet and, in version 7, at the bottom of Admin (FR-702.10). */
function HowToTile({ inAdmin = false }: { inAdmin?: boolean }) {
  const v3 = useVersion().version.id >= 3;
  const v7 = useVersion().version.id >= 7;
  return (
      <QsTile
        cols={36}
        title={inAdmin ? "How To Use This Dashboard" : "How to use this dashboard"}
        fr={inAdmin ? "702.10" : "701"}
      >
        <QsText>
          <ul>
            <li>
              {v3 ? (
                <>
                  <b>Measure:</b> pick it from Analytics in the left menu.{" "}
                  <b>Year</b> is at the top of every sheet. Your other choices
                  follow you from sheet to sheet.
                </>
              ) : (
                <>
                  <b>Measure and year</b> are at the top of every sheet. Pick
                  them first. Your other choices follow you from sheet to
                  sheet.
                </>
              )}
            </li>
            <li>
              <b>Overview</b> shows the results, the charts by group and the
              trend. Hover a bar for the counts.
            </li>
            {v7 && (
              <>
                <li>
                  <b>Eligible Population Baseline Summary</b> (left) is the whole
                  population for the year. It does not change with the controls.{" "}
                  <b>Measurement Period Summary</b> (right) are the key metrics.
                  They follow every control.
                </li>
                <li>
                  <b>Gap Status:</b> Closed means met. Open means not met yet.
                  Excluded and Needs review are shown too, because the numbers count
                  them. It uses the same words as the Members and Care Gaps pages.
                </li>
                <li>
                  <b>Trends:</b> pick Daily, Weekly, Monthly, Quarterly or Annual.
                  Pick a date range, or choose Custom and set a From and a To date.
                  The trend runs to the most recent run date. A star means claims can
                  still arrive for 90 days.
                </li>
                <li>
                  <b>Measure Run History</b> (on the Admin sheet) lists the latest runs: the rate each run
                  produced for everyone in the files, and the change from the run
                  before it. The controls do not change it.
                </li>
              </>
            )}
            <li>
              <b>Click the Met or Not met bar</b> to list those members on the
              {v7 ? " Members" : " Details"} sheet.
            </li>
            <li>
              {v7 ? (
                <>
                  <b>Members</b> has more controls (Population, Tricare ID,
                  Member Name) and the list of members. Click a member row to see
                  that member's Explanation and Recommendation under the list. Click
                  a column header to sort.
                </>
              ) : (
                <>
                  <b>Details</b> has more controls and the list of members. Click a
                  column header to sort. Click a name to open the member.
                </>
              )}
            </li>
            {!v7 && (
              <li>
                <b>Data</b> shows the files behind the numbers and why members
                were left out.
              </li>
            )}
            {v7 && (
              <li>
                <b>Admin</b> shows data quality: run history, files received, rejected rows and
                missing fields. Only people with data-quality access see this sheet.
              </li>
            )}
            <li>
              <b>Reset</b> (top right) goes back to the starting choices.
            </li>
            <li>
              <b>Export</b> (top right) saves the whole dashboard as a PDF.
              Under each table, <b>Export to CSV</b> saves that table.
            </li>
            <li>
              <b>Last updated</b> and the <b>source files</b> with their dates
              are at the top of Overview.
            </li>
            <li>
              {v3
                ? "The measurement period is the calendar year, January 1 to December 31. For the current year it runs from January 1 to the last run date (year to date)."
                : "The measurement period is always the whole calendar year, January 1 to December 31."}
            </li>
          </ul>
        </QsText>
      </QsTile>
  );
}
