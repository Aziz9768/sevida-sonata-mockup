import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Box, Typography } from "@mui/material";
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
  fmtDate,
  measureByCode,
  measureFor,
  measures,
  members,
  resultsFor,
  stateLabel,
  stateName,
} from "../data";
import type { Member, MeasureCode, MeasureState } from "../data";
import {
  ageGroupOf,
  compareSeries,
  ethnicityOf,
  openGapCount,
  providerOf,
  raceOf,
  emptyFilters,
  facetOptions,
  filterMembers,
  fmtRun,
  groupRates,
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
  sexOf,
  trendRows,
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
  useTrendControls,
} from "../components/dashboard/TrendCard";
import { fileTitle } from "../copy";
import { MEASURE_VERSION } from "../careGaps";
import { SMALL_GROUP } from "../insights";
import {
  ALL,
  LABEL,
  openGapsLabel,
  YES_NO,
  measureOptions,
  optionsOf,
  resultOptions,
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

/** Filter names are Title Case (each word starts with a capital). Table headers and tiles keep their own wording. */
const titleCase = (t: string) =>
  t.replace(/\b([a-z])/g, (c) => c.toUpperCase());
const FL = Object.fromEntries(
  Object.entries(LABEL).map(([k, v]) => [k, titleCase(v)]),
) as Record<keyof typeof LABEL, string>;
/** A to Z, by what the viewer reads. */
const az = (xs: string[]) => [...xs].sort((a, b) => a.localeCompare(b));
const azOpt = <T extends { label: string }>(xs: T[]) =>
  [...xs].sort((a, b) => a.label.localeCompare(b.label));
/** Controls in a bar: A to Z by name. */
const byName = (items: [string, ReactNode][]) =>
  [...items].sort((a, b) => a[0].localeCompare(b[0])).map((i) => i[1]);

/** Controls that live on one sheet only. A choice made there still filters the other sheets, so those sheets say so. */
const SHEET_ONLY: {
  sheet: "Overview" | "Details";
  label: string;
  text: (f: DashFilters) => string;
}[] = [
  { sheet: "Overview", label: FL.result, text: (f) => f.status },
  { sheet: "Overview", label: FL.member, text: (f) => f.memberId.trim() },
  {
    sheet: "Overview",
    label: FL.age,
    text: (f) =>
      f.ageFrom !== "" || f.ageTo !== ""
        ? `${f.ageFrom || "0"} to ${f.ageTo || "100"}`
        : "",
  },
  { sheet: "Overview", label: FL.sex, text: (f) => f.sex },
  {
    sheet: "Overview",
    label: FL.ageGroup,
    text: (f) => f.ageGroup.join(", "),
  },
  { sheet: "Overview", label: FL.race, text: (f) => f.race.join(", ") },
  {
    sheet: "Overview",
    label: FL.ethnicity,
    text: (f) => f.ethnicity.join(", "),
  },
  {
    sheet: "Overview",
    label: FL.provider,
    text: (f) => f.provider.join(", "),
  },
  { sheet: "Overview", label: FL.openGaps, text: (f) => f.openGaps },
  { sheet: "Overview", label: FL.multiGap, text: (f) => f.multiGap },
  {
    sheet: "Details",
    label: FL.dob,
    text: (f) =>
      f.dobFrom || f.dobTo ? `${f.dobFrom || "…"} to ${f.dobTo || "…"}` : "",
  },
  {
    sheet: "Details",
    label: FL.excluded,
    text: (f) => f.excluded.join(", "),
  },
  {
    sheet: "Details",
    label: FL.evDate,
    text: (f) =>
      f.evFrom || f.evTo ? `${f.evFrom || "…"} to ${f.evTo || "…"}` : "",
  },
  {
    sheet: "Details",
    label: FL.evSystem,
    text: (f) => f.evSystem.join(", "),
  },
  { sheet: "Details", label: FL.a1c, text: (f) => f.a1c },
  { sheet: "Details", label: FL.state, text: (f) => f.state },
  { sheet: "Details", label: FL.county, text: (f) => f.county },
  { sheet: "Details", label: FL.military, text: (f) => f.military },
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

const SHEETS = ["Overview", "Details", "Data", "Admin", "Help"];
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
  const [sheet, setSheet] = useState("Overview");
  const [params] = useSearchParams();
  const fromCards = params.get("from") === "cards";
  const [code, setCode] = useState<MeasureCode>(
    () => (measureByCode(params.get("m") ?? "") ?? measures[0]).code,
  );
  const [f, setF] = useState<DashFilters>(emptyFilters());
  const [view, setView] = useState<"" | "Met" | "Gap">("");
  const [notes, setNotes] = useState({ fr: true, ask: false });
  const [withWarnings, setWithWarnings] = useState(false);
  const options = useMemo(() => facetOptions(), []);
  const set = <K extends keyof DashFilters>(key: K, value: DashFilters[K]) =>
    setF((p) => ({ ...p, [key]: value }));
  const reset = () => {
    setF(emptyFilters());
    setView("");
  };

  const year = f.year;
  const list = useMemo(() => filterMembers(f, code), [f, code]);
  const def = measureFor(measureByCode(code)!, year);

  /* ---- controls (each one is a QuickSight control) ---- */
  const cMeasure = (
    <QsControl key="measure" info="Pick the measure. Every sheet follows it.">
      <SelectField
        label={FL.measure}
        value={code}
        onChange={(v) => {
          setCode(v as MeasureCode);
          setView("");
        }}
        options={azOpt(measureOptions)}
      />
    </QsControl>
  );
  const cYear = (
    <QsControl key="year">
      <SelectField
        label={FL.year}
        value={String(f.year)}
        onChange={(v) => set("year", Number(v))}
        options={[2026, 2025].map((y) => ({
          value: String(y),
          label: String(y),
        }))}
      />
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
      <AutocompleteField
        multiple
        label={label}
        placeholder={ALL}
        options={values}
        value={f[key] as string[]}
        onChange={(v) => set(key, v as never)}
      />
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

  const overviewControls = (
    <QsControlsBar fr="703" ask={["Q1", "Q4", "Q12"]}>
      {byName([
        [FL.measure, cMeasure],
        [FL.year, cYear],
        [
          FL.result,
          <QsControl key="result">
            <SelectField
              label={FL.result}
              value={f.status}
              onChange={(v) => set("status", v as DashFilters["status"])}
              options={[{ value: "", label: ALL }, ...azOpt(resultOptions)]}
            />
          </QsControl>,
        ],
        [
          FL.member,
          <QsControl key="member">
            <TextField
              label={FL.member}
              placeholder="ID or name"
              value={f.memberId}
              onChange={(e) => set("memberId", e.target.value)}
            />
          </QsControl>,
        ],
        [
          FL.age,
          <QsControl key="age">
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
          multi("ageGroup", FL.ageGroup, optionsOf(options.ageGroup)),
        ],
        [FL.race, multi("race", FL.race, optionsOf(az(options.race)))],
        [
          FL.ethnicity,
          multi("ethnicity", FL.ethnicity, optionsOf(az(options.ethnicity))),
        ],
        [
          FL.provider,
          multi("provider", FL.provider, optionsOf(az(options.provider))),
        ],
        [
          FL.openGaps,
          dd(
            "openGaps",
            FL.openGaps,
            options.openGaps,
            "How many measures the member has not met.",
          ),
        ],
        [FL.multiGap, dd("multiGap", FL.multiGap, az(YES_NO))],
      ])}
    </QsControlsBar>
  );
  const detailControls = (
    <QsControlsBar fr="703" ask={["Q12"]}>
      {byName([
        [FL.measure, cMeasure],
        [FL.year, cYear],
        [FL.dob, dateRange(FL.dob, "dobFrom", "dobTo")],
        [FL.excluded, multi("excluded", FL.excluded, azOpt(measureOptions))],
        [FL.evDate, dateRange(FL.evDate, "evFrom", "evTo")],
        [
          FL.evSystem,
          multi("evSystem", FL.evSystem, optionsOf(az(options.evSystem))),
        ],
        [FL.a1c, dd("a1c", FL.a1c, options.a1c)],
        [FL.state, dd("state", FL.state, az(options.state))],
        [FL.county, dd("county", FL.county, az(options.county))],
        [FL.military, dd("military", FL.military, az(options.military))],
      ])}
    </QsControlsBar>
  );
  const smallControls = (
    <QsControlsBar>
      {byName([
        [FL.measure, cMeasure],
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
      <Details code={code} list={list} year={year} view={view} />
    ) : sheet === "Data" ? (
      <DataSheet code={code} list={list} year={year} def={def} />
    ) : sheet === "Admin" ? (
      <AdminSheet withWarnings={withWarnings} onChange={setWithWarnings} />
    ) : (
      <HelpSheet />
    );

  return (
    <PageContainer
      title="Dashboard (QuickSight style)"
      titleVariant="overview"
      subtitle="The dashboard drawn only with what QuickSight can build (style guide PR #35)."
      actions={
        <Box
          sx={{
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {fromCards && (
            <Link to="/dashboards" style={{ color: "inherit" }}>
              ← All dashboards
            </Link>
          )}
          <SwitchField
            label="Requirement tags"
            checked={notes.fr}
            onChange={(v) => setNotes({ ...notes, fr: v })}
          />
        </Box>
      }
    >
      <NotesContext.Provider value={notes}>
        <QsFrame tabs={SHEETS} active={sheet} onTab={setSheet} onReset={reset}>
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
    </PageContainer>
  );
}

export default QuickSightDashboardPage;

/* ================================================================== Overview */

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
  const { initial, t } = kpisFor(code, list, year);
  const whole = kpisFor(code, members, year);
  const run = runInfo();
  /** Claims keep arriving for 90 days, so a period that ends inside the last 90 days can still change. */
  const inProgress = (d: Date) =>
    d.getTime() > run.last.getTime() - 90 * DAY_MS;
  const metPct = share(t.met, t.denominator);
  const gsd = code === "GSD" ? secondRate(list, year) : null;
  const dims: { dim: Dimension; title: string; cols: number }[] = [
    { dim: "sex", title: "Met % by sex", cols: 12 },
    { dim: "ageGroup", title: "Met % by age group", cols: 12 },
    { dim: "ethnicity", title: "Met % by ethnicity", cols: 18 },
    { dim: "race", title: "Met % by race", cols: 18 },
    { dim: "provider", title: "Met % by primary care provider", cols: 36 },
  ];
  const c = useTrendControls();
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

  return (
    <QsSheet>
      <QsTile cols={36} bare fr="701" ask={["Q9", "Q21"]}>
        <Typography
          component="h2"
          sx={{
            m: 0,
            fontSize: qs.type.sheetTitle.size,
            fontWeight: qs.type.sheetTitle.weight,
          }}
        >
          {def.code} – {def.name}
        </Typography>
        <QsText>
          <p>
            {def.population}. {def.needs} Measurement period: {periodText(year)}
            .
          </p>
          <p>
            <b>Last updated:</b> {fmtRun(run.last)} · <b>Next update:</b>{" "}
            {fmtRun(run.next)}
          </p>
          <p>
            <b>Source files:</b>{" "}
            {run.sources
              .map((x) => `${x.title} ${fmtDate(x.receivedOn)}`)
              .join(" · ")}
          </p>
        </QsText>
      </QsTile>

      <QsTile
        cols={12}
        rows={3}
        title="Eligible Population Baseline Summary"
        subtitle={`The entire eligible population for ${year}. It does not change with the controls.`}
        fr="702"
        ask={["Q2"]}
      >
        <QsTable
          label="Whole population"
          exportFile="baseline-summary"
          rowKey={(r) => r[0]}
          maxHeight={300}
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
          ]}
        />
      </QsTile>
      <QsTile cols={24} bare fr="702">
        <QsText>
          <p>
            <b>Key performance indicators.</b> These cards update with the
            controls you pick above.
          </p>
        </QsText>
      </QsTile>
      <QsKpi cols={8} fr="702" label="Initial population" value={n0(initial)} />
      <QsKpi
        cols={8}
        fr="702"
        label="Eligible"
        value={n0(t.denominator)}
        tip="Members counted in the rate."
      />
      <QsKpi cols={8} fr="702" label="Excluded" value={n0(t.excluded)} />
      <QsKpi cols={6} fr="702" label="Met" value={n0(t.met)} />
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
            onChange={(e) => e.target.value && c.setTo(fromIso(e.target.value))}
          />
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
            maxHeight={300}
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
            maxHeight={300}
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
        title={`${metric} over time`}
        subtitle="Starts again each January 1"
        fr="708"
      >
        <TrendChart code={code} list={list} c={c} />
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
              small
                ? `* Fewer than ${SMALL_GROUP} eligible members. Dashed line: benchmark.`
                : "Dashed line: benchmark"
            }
            fr="703"
            ask={[
              "Q19",
              ...(dim === "race" || dim === "provider" ? ["Q11"] : []),
            ]}
          >
            <QsBarChart
              label={`${title}`}
              bars={bars}
              benchmark={BENCHMARK[code]}
              empty="Nobody is eligible for these filters"
            />
          </QsTile>
        );
      })}
      <QsTile
        cols={36}
        title="Everything that affects this calculation"
        fr="702.7"
      >
        <CalcList year={year} def={def} />
      </QsTile>
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
              <li key={r.text}>{r.text}</li>
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
}: {
  code: MeasureCode;
  list: Member[];
  year: number;
  view: "" | "Met" | "Gap";
}) {
  const shown = useMemo(
    () =>
      view
        ? list.filter((m) => resultsFor(m, year)[code].state === view)
        : list,
    [list, view, year, code],
  );
  const stateOf = (m: Member) => resultsFor(m, year)[code].state;
  const cols: QsCol<Member>[] = [
    {
      key: "name",
      header: "Member name",
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
    {
      key: "dob",
      header: "Date of birth",
      value: (m) => m.dob.getTime(),
      render: (m) => fmtDate(m.dob),
      nowrap: true,
    },
    {
      key: "age",
      header: "Age",
      value: (m) => ageAtYearEnd(m.dob, year),
      align: "right",
    },
    { key: "sex", header: "Sex", value: sexOf },
    {
      key: "ag",
      header: "Age group",
      value: (m) => ageGroupOf(m, year),
      nowrap: true,
    },
    {
      key: "res",
      header: "Measure result",
      value: (m) => stateLabel[stateOf(m)],
      nowrap: true,
      render: (m) => (
        <QsFmt color={stateColor[stateOf(m)]}>{stateLabel[stateOf(m)]}</QsFmt>
      ),
    },
    {
      key: "ev",
      header: "Evidence date",
      value: (m) => resultsFor(m, year)[code].evidence?.date.getTime() ?? 0,
      render: (m) => {
        const e = resultsFor(m, year)[code].evidence;
        return e && stateOf(m) === "Met" ? fmtDate(e.date) : "–";
      },
      nowrap: true,
    },
    { key: "state", header: "State", value: (m) => stateName(m.state) },
    { key: "county", header: LABEL.county, value: countyOf, nowrap: true },
    {
      key: "military",
      header: LABEL.military,
      value: militaryOf,
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
      header: LABEL.provider,
      value: providerOf,
      nowrap: true,
    },
    {
      key: "open",
      header: "Open care gaps",
      value: (m) => openGapCount(m, year),
      render: (m) => openGapsLabel(openGapCount(m, year)),
      align: "right",
      nowrap: true,
    },
    {
      key: "multi",
      header: LABEL.multiGap,
      value: (m) => (openGapCount(m, year) > 1 ? "Yes" : "No"),
    },
    {
      key: "excl",
      header: LABEL.excluded,
      value: (m) =>
        measures
          .filter((x) => resultsFor(m, year)[x.code].state === "Excluded")
          .map((x) => x.code)
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
        title="List of members in the initial population"
        subtitle={`${n0(shown.length)} members. Click a header to sort. Every column is always shown, scroll sideways for more. The name opens the member page.`}
        fr="707"
        ask={["Q7", "Q13", "Q14"]}
      >
        <QsTable
          label="Members"
          exportFile="members"
          cols={cols}
          rows={shown}
          rowKey={(m) => m.id}
          maxHeight={560}
        />
      </QsTile>
    </QsSheet>
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
  withWarnings,
  onChange,
}: {
  withWarnings: boolean;
  onChange: (v: boolean) => void;
}) {
  const all = useMemo(() => rejectedRows(), []);
  const sum = loadSummary();
  const run = runInfo();
  const reasons = reasonRows(all);
  const rows = withWarnings ? all : all.filter((r) => r.result !== "Warning");
  const critical = useMemo(() => {
    const seen = new Map<string, RejectedRow>();
    for (const r of all)
      if (r.impact === "Critical" && !seen.has(r.fileName))
        seen.set(r.fileName, r);
    return [...seen.values()];
  }, [all]);
  const impactColor = (i: string) =>
    i === "Critical" ? qs.tone.danger.border : qs.meaning.gapText;
  const share100 = (n: number) =>
    sum.rowsReceived ? p1(share(n, sum.rowsReceived)) : "–";
  const rejectedPct = share(sum.rowsRejected, sum.rowsReceived);
  const overThreshold = rejectedPct > ADMIN_EXAMPLE.threshold;
  const fileColor = (st: string) =>
    st === "Accepted" || st === "Succeeded"
      ? qs.meaning.met
      : st === "Accepted with warnings" || st.startsWith("Scheduled")
        ? qs.meaning.gapText
        : st === "Failed" || st.startsWith("Rejected")
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
  const loads = dataFiles.map((f) => {
    const status =
      f.status === "Failed"
        ? "Rejected (after three failed attempts)"
        : f.status === "Not received"
          ? "Scheduled retry"
          : "Succeeded";
    return {
      f,
      title: fileTitle(f.id),
      status,
      attempt: f.status === "Failed" ? 3 : 1,
      reason:
        f.status === "Failed" || f.status === "Not received" ? f.note : "–",
      affected: f.status === "Failed" ? f.rows : 0,
      next: f.status === "Not received" ? nextDay(run.last) : null,
    };
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
        <QsTile
          cols={36}
          title="Files ingested"
          subtitle="Days since update = the date of the last run minus the date the last file was received."
          fr="710.11"
          ask={["Q29"]}
        >
          <QsTable
            label="Files ingested"
            exportFile="files-ingested"
            rowKey={(r) => r.f.id}
            maxHeight={360}
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
          title="Artifacts by file"
          subtitle="A file can turn into one or more artifacts, so files and artifacts are counted apart."
          fr="710.10"
          ask={["Q20"]}
        >
          <QsTable
            label="Artifacts by file"
            exportFile="artifacts-by-file"
            rowKey={(r) => r.f.id}
            maxHeight={300}
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
          title="File loads: successes and failures"
          subtitle="Every file load by data type. Rows affected depends on the data: one bad row can fail a whole file."
          fr="710.14"
        >
          <QsTable
            label="File loads"
            exportFile="file-loads"
            rowKey={(r) => r.f.id}
            maxHeight={360}
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
        <QsTile cols={36} title="Problems by reason" fr="710">
          <QsTable
            label="Problems by reason"
            exportFile="problems-by-reason"
            rowKey={(r) => r.reason}
            maxHeight={300}
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
          title={withWarnings ? "Rejected rows and warnings" : "Rejected rows"}
          subtitle="File and row, then the field, the value received and the rule it broke."
          fr="710.17"
          ask={["Q7"]}
        >
          <QsTable
            label="Rejected rows"
            exportFile="rejected-rows"
            rowKey={(r) => r.id}
            maxHeight={420}
            defaultSort={{ key: "i", dir: "asc" }}
            cols={[
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
                nowrap: true,
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
              { key: "v", header: "Value received", value: (r) => r.value },
              { key: "rule", header: "Rule broken", value: (r) => r.rule },
              { key: "rs", header: "Reason", value: (r) => r.reason },
              {
                key: "ms",
                header: "Measures affected",
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
            ]}
            rows={rows}
          />
        </QsTile>
        <QsTile
          cols={36}
          title="Member matching"
          subtitle="Rows from files that did not attach to any member. Two steps: rows with no member ID, then rows with an ID that matches nobody."
          fr="710.19"
        >
          <QsTable
            label="Rows not matched to a member"
            exportFile="member-matching"
            rowKey={(r) => r.id}
            maxHeight={240}
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
          title="Calculation settings in use"
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
      </QsSheet>
    </>
  );
}

/* ================================================================== Help */

function HelpSheet() {
  return (
    <QsSheet>
      <QsTile cols={36} title="How to use this dashboard" fr="701">
        <QsText>
          <ul>
            <li>
              <b>Measure and year</b> are at the top of every sheet. Pick them
              first. Your other choices follow you from sheet to sheet.
            </li>
            <li>
              <b>Overview</b> shows the results, the charts by group and the
              trend. Hover a bar for the counts.
            </li>
            <li>
              <b>Click the Met or Not met bar</b> to list those members on the
              Details sheet.
            </li>
            <li>
              <b>Details</b> has more controls and the list of members. Click a
              column header to sort. Click a name to open the member.
            </li>
            <li>
              <b>Data</b> shows the files behind the numbers and why members
              were left out.
            </li>
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
              The measurement period is always the whole calendar year, January
              1 to December 31.
            </li>
          </ul>
        </QsText>
      </QsTile>
    </QsSheet>
  );
}
