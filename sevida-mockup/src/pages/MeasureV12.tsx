import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import { AutocompleteField, Button, SelectField, TextField } from "sevida-ui";
import { QsSheet, QsText, QsTile } from "../quicksight/kit";
import { QsRateBars, closedColor, QsRateColumns, QsRateLines } from "../quicksight/kitV12";
import { qs } from "../quicksight/qsTheme";
import { ALL, optionsOf } from "../sharedFilters";
import { CURRENT_YEAR, DEMO_NOW, ageBandsOf, measureFor, measures, NO_PCP, a1cBandOf, fmtDate, resultsFor } from "../data";
import type { MeasureCode, MeasureState } from "../data";
import { SEX_V12, bandsFor, emptyFilters, facetOptions, filterMembers, gapsByManager, groupRates, inputsFor, kpisFor, providerOf, runInfo, timeframeOptions, timeframeRows, yearLines } from "../dashboardData";
import type { DashFilters, Dimension, Timeframe } from "../dashboardData";
import { V3_DEFINITION, V3_EXCLUSIONS, V3_MET, ageRangesBetween, gapShort, militaryOptions } from "../v3Data";
import { ordDate } from "./QuickSightDashboardPage";
import { useRun } from "../runs";
import { getVersion } from "../version";
import { FailedRunNotice, Fact, KpiTile, PcmFilter, RunPickerFact, boxSx, changeOf, controlsBox, facts, n0, pcmText, pct2, runStamp, share, useNextUpdate, whiteAll } from "./dashboardV12Bits";
import type { Group } from "./dashboardV12Bits";

/**
 * Version 12 measure page (Balsamiq board, BCS tab). The same layout serves BCS, CCS, COL, GSD and WCV: only the words and numbers change.
 * Top to bottom: header boxes, About This Measure (collapsed until opened), seven filters, six tiles, the trend, the two Top n charts, five "Gaps By" charts.
 * The Population filter chooses which members the charts count. The six tiles always show every population, so they stay comparable.
 */
const YEAR = CURRENT_YEAR;

export type MeasurePop = "initial" | "excluded" | "eligible" | "closed" | "open";
export interface MeasureV12State {
  f: DashFilters;
  pop: MeasurePop;
}
export const emptyMeasure = (): MeasureV12State => ({ f: emptyFilters(), pop: "eligible" });

const POP_OPTIONS: { value: MeasurePop; label: string; states: MeasureState[] }[] = [
  { value: "initial", label: "Initial Population", states: ["Met", "Gap", "Excluded"] },
  { value: "excluded", label: "Excluded Population", states: ["Excluded"] },
  { value: "eligible", label: "Eligible Population", states: ["Met", "Gap"] },
  { value: "closed", label: "Closed Gaps", states: ["Met"] },
  { value: "open", label: "Open Gaps", states: ["Gap"] },
];

/**
 * Version 12: only managers with 100 or more members are ranked by rate, so a manager with few members does not skew it.
 * Version 13 (Sam): the user types the "Minimum Number of Members" (eligible members, default 30) and Top n (1 to 100).
 */
const V12_MIN_MEMBERS = 100;
const DEFAULT_MIN_MEMBERS = 30;
const DEFAULT_TOP_N = 5;
const MAX_TOP_N = 100;

/** The three Trend Timeframe descriptions (the same wording as Version 11; the board's wording is still to be confirmed). */
const TIMEFRAME_TIPS: Record<Timeframe, string> = {
  annual:
    "Annual - Displays the Measure Met Rate on the last run of the current HEDIS version year. Shows the Measure Rate on the last run of the prior five HEDIS measure years, where applicable. Note: HEDIS measure specs can change year to year.",
  quarterly:
    "Quarterly - Displays the Measure Met Rate on the last run of each of the most recently completed nine quarters of the current HEDIS version year. Note: HEDIS measure specs can change year to year.",
  monthly:
    "Monthly - Displays the Measure Met Rate on the last run of each of the most recently completed 25 months of the current HEDIS version year. Note: HEDIS measure specs can change year to year.",
};

/** Version 15 (Sam, second round): the board's wording. Monthly says 27 months (Sam's message); the board still says 25. */
const TIMEFRAME_TIPS_V15: Record<Timeframe, string> = {
  annual:
    "Annual - Displays the Measure Met Rate on the last Run Date of the current Measurement Year. Shows the Measure Rate on the last Run Dates of the prior 4 Measurement Years, where applicable. Note: HEDIS measure specs can change year to year.",
  quarterly:
    "Quarterly - Displays the Measure Met Rate on the last Run Date of each of the most recently completed 9 quarters across Measurement Years. Note: HEDIS measure specs can change year to year.",
  monthly:
    "Monthly - Displays the Measure Met Rate on the last Run Date of each of the most recently completed 27 months across Measurement Years. Note: HEDIS measure specs can change year to year.",
};

/** Version 15: the Initial Population sentence differs by measure (Sam). Only BCS keeps "See About This Measure". */
const INITIAL_V15: Record<string, string> = {
  "BCS-E": "Active members who meet the measure age, sex, and enrollment criteria as of the most recent Run Date. See About This Measure for more information.",
  "CCS-E": "Active members who meet the measure age, sex, and enrollment criteria as of the most recent Run Date.",
  "COL-E": "Active members who meet the measure age and enrollment criteria as of the most recent Run Date.",
  GSD: "Active members with diabetes who meet the measure age and enrollment criteria as of the most recent Run Date.",
  WCV: "Active members who meet the measure age and enrollment criteria as of the most recent Run Date.",
};

/** The About This Measure bullets. BCS is the board's text. The other measures keep their own wording in the same shape. */
function aboutBullets(code: MeasureCode): string[] {
  if (code === "BCS-E")
    return [
      `Who's Included: Women age ${getVersion() >= 15 ? 40 : 42}–74 on Dec 31`,
      "Enrolled all year (one gap of up to 45 days). The spec says BCS also looks at earlier years; this demo checks the measurement year only.",
      "Met when a mammogram (claim, EHR procedure or screening result) falls in the look-back window.",
      "The look-back window is Oct 1 two years before to Dec 31 of the measurement year.",
      "Excluded: hospice or death.",
      "Excluded: mastectomy on one or both breasts, or gender-affirming chest surgery, before or during the year.",
      "Excluded: age 66+ and enrolled in an institutional special needs plan (I-SNP), or living in a long-term institution (LTI flag) during the year.",
      "Excluded: frailty together with advanced illness (including dementia medication fills in the year or the year before).",
      "Excluded: palliative care during the measurement year (diagnosis or encounter). The demo reads it from diag.",
    ];
  // Version 16: the other four measures are written like BCS, one bullet per rule, from the same rules the mockup uses to decide each result.
  if (getVersion() >= 16) {
    const rules = measureFor(measures.find((m) => m.code === code)!, CURRENT_YEAR).rules;
    return [`Who's Included: ${V3_DEFINITION[code]}`, ...rules.slice(1).map((r) => r.text)];
  }
  const excluded = code === "GSD" ? "Hospice, death, palliative care, age 66+ in an I-SNP or long-term institution, age 66+ with frailty and advanced illness." : V3_EXCLUSIONS[code];
  return [`Who's Included: ${V3_DEFINITION[code]}`, `Met when: ${V3_MET[code]}`, `Excluded: ${excluded}`];
}
/** BCS lists every file received in the last run (the board's 14 files, newest first). The other measures list the files they read. */
const sourceFiles = (code: MeasureCode) =>
  (code === "BCS-E"
    ? runInfo().sources.map((s) => ({ title: s.title, on: s.receivedOn }))
    : inputsFor(code)
        .filter((r) => r.file.receivedOn)
        .map((r) => ({ title: r.title, on: r.file.receivedOn! }))
  )
    .map((r) => `${r.title} ${fmtDate(r.on)}`)
    .join(" · ");

export function MeasureV12({ code, s, setS }: { code: MeasureCode; s: MeasureV12State; setS: (s: MeasureV12State) => void }) {
  const short = gapShort(code);
  const { run: selectedRun } = useRun();
  const run = runInfo();
  const options = useMemo(() => facetOptions(), []);
  const f = s.f;
  const set = <K extends keyof DashFilters>(key: K, value: DashFilters[K]) => setS({ ...s, f: { ...f, [key]: value } });
  // Version 13 = Version 12 plus Sam's feedback (see the notes of Version 13).
  const v13 = getVersion() >= 13;
  // Version 15 = Version 14 plus Sam's second round of feedback (see the notes of Version 15).
  const v15 = getVersion() >= 15;
  // Version 16 (review against the board): run picker in the header, the board's wording for the Top n titles, the specification line in About This Measure.
  const v16 = getVersion() >= 16;
  const nextUpdate = useNextUpdate(run.next);
  const [tf, setTf] = useState<Timeframe>("annual");
  // Top n and Minimum Number of Members are typed. A wrong entry keeps the last good value in use and shows a message under the box.
  const [topText, setTopText] = useState(String(DEFAULT_TOP_N));
  const [minText, setMinText] = useState(String(DEFAULT_MIN_MEMBERS));
  const [viewAll, setViewAll] = useState(false);
  const topRaw = Number(topText);
  const topBad = topText.trim() === "" || !Number.isInteger(topRaw) || topRaw < 1 || topRaw > MAX_TOP_N;
  const topN = topBad ? DEFAULT_TOP_N : topRaw;
  const minRaw = Number(minText);
  const minBad = minText.trim() === "" || !Number.isInteger(minRaw) || minRaw < 1;
  const minMembers = !v13 ? V12_MIN_MEMBERS : minBad ? DEFAULT_MIN_MEMBERS : minRaw;

  /* ---- who is counted ---- */
  const base = useMemo(() => filterMembers(f, code), [f, code]);
  const popStates = POP_OPTIONS.find((p) => p.value === s.pop)!.states;
  const list = useMemo(() => base.filter((m) => popStates.includes(resultsFor(m, YEAR)[code].state)), [base, popStates, code]);

  /* ---- six tiles: this run against the last run of the prior completed calendar month ---- */
  const { t } = kpisFor(code, base, YEAR);
  const months = useMemo(() => timeframeRows(code, base, "monthly"), [base, code]);
  const prior = months[months.length - 1];
  const cur = {
    initial: t.denominator + t.excluded,
    excluded: t.excluded,
    eligible: t.denominator,
    closed: t.met,
    rate: share(t.met, t.denominator),
    open: t.gap,
  };
  const before = {
    initial: prior?.initial ?? 0,
    excluded: prior?.excluded ?? 0,
    eligible: prior?.eligible ?? 0,
    closed: prior?.met ?? 0,
    rate: prior?.rate ?? 0,
    open: prior?.gap ?? 0,
  };
  // Version 15 (Sam, GSD): a GSD gap is one gap, open for one of two reasons. The latest HbA1c decides: 8 to 9, or above 9 (or no test this year).
  const gsdWhy = useMemo(() => {
    if (!v15 || code !== "GSD") return null;
    let mid = 0;
    let high = 0;
    let low = 0;
    for (const m of base) {
      const st = resultsFor(m, YEAR)[code].state;
      if (st === "Met") low++;
      if (st !== "Gap") continue;
      if (a1cBandOf(m, YEAR) === "8% to 9%") mid++;
      else high++;
    }
    return { mid, high, low };
  }, [v15, code, base]);
  const card = (group: Group, title: string, about: string, key: keyof typeof cur, kind: "count" | "rate", upIsGood: boolean, footTitle = title, extra?: ReactNode) => {
    const ch = changeOf(cur[key], before[key], kind, upIsGood);
    const fmt = (v: number) => (kind === "count" ? n0(v) : pct2(v));
    return (
      <KpiTile
        key={title}
        group={group}
        title={title}
        about={about}
        extra={extra}
        aboutMin={v15 ? 88 : v13 ? 80 : 64}
        value={fmt(cur[key])}
        prior={fmt(before[key])}
        change={ch.text}
        dir={ch.dir}
        tone={ch.tone}
        footer={`${footTitle} on the last Run Date of the prior completed calendar month.`}
      />
    );
  };

  /* ---- trend ---- */
  const annual = useMemo(() => (tf === "annual" ? timeframeRows(code, list, "annual") : []), [tf, list, code]);
  const lines = useMemo(() => {
    if (tf === "annual") return null;
    if (v15) {
      // Version 15 (Sam): always the last 9 completed quarters or the last 27 completed months, so three calendar years can show.
      const l3 = yearLines(code, list, tf, 3);
      const per = tf === "quarterly" ? 4 : 12;
      const len = tf === "quarterly" ? 9 : 27;
      const last = DEMO_NOW.getFullYear() * per + Math.floor(DEMO_NOW.getMonth() / (12 / per)) - 1;
      const keep = <T,>(xs: (T | null)[], yr: number) => xs.map((v, i) => (yr * per + i <= last && yr * per + i > last - len ? v : null));
      return { ...l3, series: l3.series.map((x) => ({ ...x, values: keep(x.values, x.year), counts: keep(x.counts, x.year) })) };
    }
    const l = yearLines(code, list, tf, 2);
    if (!v13 || tf !== "quarterly") return l;
    // Sam: the quarter that is still running (Q4 of the current year) is not a result yet, so the quarterly line stops at the last completed quarter.
    const running = Math.floor(DEMO_NOW.getMonth() / 3);
    const stop = <T,>(xs: (T | null)[], yr: number) => xs.map((v, i) => (yr === YEAR && i >= running ? null : v));
    return { ...l, series: l.series.map((x) => ({ ...x, values: stop(x.values, x.year), counts: stop(x.counts, x.year) })) };
  }, [tf, list, code, v13, v15]);
  const tfLabel = timeframeOptions.find((o) => o.value === tf)?.label ?? "";

  /* ---- Top n by Primary Care Manager ---- */
  const managers = gapsByManager(code, list, YEAR, true);
  // Version 12: Unassigned is a manager like the others (ranked), and the minimum counts every member of the manager.
  // Version 13 (Sam): Unassigned is never ranked, it is its own last row under the open gaps chart; the minimum counts eligible members of the measure.
  const assigned = v13 ? managers.filter((r) => r.name !== NO_PCP) : managers;
  const unassigned = v13 ? managers.find((r) => r.name === NO_PCP) : undefined;
  const counted = useMemo(() => {
    const by = new Map<string, number>();
    for (const m of base) {
      if (v13) {
        const st = resultsFor(m, YEAR)[code].state;
        if (st !== "Met" && st !== "Gap") continue;
      }
      by.set(providerOf(m), (by.get(providerOf(m)) ?? 0) + 1);
    }
    return by;
  }, [base, code, v13]);
  const take = <T,>(xs: T[]) => (viewAll ? xs : xs.slice(0, topN));
  const row = (r: { name: string; open: number; closed: number }) => ({ label: pcmText(r.name), open: r.open, closed: r.closed });
  const rankedOpen = take([...assigned].sort((a, b) => b.open - a.open || b.closed - a.closed || a.name.localeCompare(b.name))).map(row);
  const topOpen = unassigned ? [...rankedOpen, row(unassigned)] : rankedOpen;
  const enough = assigned.filter((r) => (counted.get(r.name) ?? 0) >= minMembers);
  const few = assigned.filter((r) => (counted.get(r.name) ?? 0) < minMembers);
  const rankedClosed = take(
    [...enough].sort((a, b) => share(b.closed, b.closed + b.open) - share(a.closed, a.closed + a.open) || b.closed - a.closed || a.name.localeCompare(b.name)),
  ).map(row);
  // Version 13, View All: one last row for the managers under the minimum, their closed and open gaps added together.
  const belowRow =
    v13 && viewAll && few.length
      ? [{ label: `Below ${n0(minMembers)} Members (${few.length} ${few.length === 1 ? "PCM" : "PCMs"})`, closed: few.reduce((a, r) => a + r.closed, 0), open: few.reduce((a, r) => a + r.open, 0) }]
      : [];
  const topClosed = [...rankedClosed, ...belowRow];
  const nLabel = viewAll ? "All" : `Top ${topN}`;
  // Version 15 (Sam): the shorter chart gets blank rows, so both charts are as tall as each other and the two descriptions start on the same line.
  const rowsMax = Math.max(topOpen.length, topClosed.length);

  /* ---- Gaps By ---- */
  const gapRows = (dim: Dimension) => {
    const rows = groupRates(code, list, YEAR, dim).map((r) => ({ label: r.group, closed: r.t.met, open: r.t.gap }));
    // The board lists every ten-year band of the measure's ages (40-49, 50-59 ...), also one nobody is in.
    if (dim === "ageBand") return bandsFor(code, YEAR).map((b) => rows.find((r) => r.label === b.label) ?? { label: b.label, closed: 0, open: 0 });
    // Sam: the Sex chart always has Male, Female and Unknown, also one nobody is in.
    if (v13 && dim === "sex") return SEX_V12.map((x) => rows.find((r) => r.label === x) ?? { label: x, closed: 0, open: 0 });
    return rows;
  };

  const clear = () => setS(emptyMeasure());
  const filtered = JSON.stringify(f) !== JSON.stringify(emptyFilters()) || s.pop !== "eligible";
  const multi = (key: "ageGroup" | "race" | "ethnicity", label: string, values: { value: string; label: string }[]) => (
    <Box sx={whiteAll}>
      <AutocompleteField multiple label={label} placeholder={ALL} options={values} value={f[key]} onChange={(v) => set(key, v as never)} />
    </Box>
  );
  const sources = sourceFiles(code);

  return (
    <>
      <Box sx={{ display: "grid", gap: `${qs.gap}px`, p: `${qs.gap}px`, pb: 0, gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) minmax(0, 1fr)" } }}>
        <Box sx={boxSx}>
          <QsText>
            <Box sx={facts}>
              <Fact label={v16 ? "HEDIS Measure Year" : "MEASUREMENT YEAR"} value={String(YEAR)} />
              <Fact label="Measurement Start" value={ordDate(new Date(YEAR, 0, 1))} />
              <Fact label="Measurement End" value={ordDate(new Date(YEAR, 11, 31))} />
            </Box>
          </QsText>
        </Box>
        <Box sx={boxSx}>
          <QsText>
            <Box sx={facts}>
              {v16 ? <RunPickerFact /> : <Fact label="Data as Of (Run Date)" value={runStamp(selectedRun.at)} />}
              <Fact label="Dashboard Next Update" value={runStamp(v16 ? nextUpdate : run.next)} />
            </Box>
          </QsText>
        </Box>
      </Box>

      {v16 && <FailedRunNotice at={run.next} />}

      <Box sx={{ p: `${qs.gap}px`, pb: 0 }}>
        <Box
          component="details"
          sx={{
            ...boxSx,
            "& > summary": { cursor: "pointer", fontWeight: 700, fontSize: qs.type.visualTitle.size, listStylePosition: "inside", borderRadius: 1 },
            "& > summary:focus-visible": { outline: `2px solid ${qs.meaning.main}`, outlineOffset: 2 },
            "&[open] > summary": { mb: 1 },
          }}
        >
          <summary>About This Measure</summary>
          <QsText>
            <ul>
              {v16 && <li>Specification: NCQA HEDIS MY {YEAR} · Value sets: version {YEAR}-07</li>}
              {aboutBullets(code).map((b) => (
                <li key={b}>{b}</li>
              ))}
              {sources && <li>Source files: {sources}</li>}
            </ul>
          </QsText>
        </Box>
      </Box>

      <Box
        sx={{
          ...controlsBox(4),
          mt: `${qs.gap}px`,
          borderTop: qs.tile.border,
          // All seven filters and Clear All Filters on one row on a wide screen, as the board draws them.
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))", xl: v13 ? "2fr 1fr 1.1fr 2.1fr 0.7fr 1fr 1fr auto" : "1.4fr 1fr 1.1fr 2.3fr 0.8fr 1fr 1fr auto" },
        }}
      >
        <PcmFilter value={f.provider} onChange={(v) => set("provider", v)} />
        <Box sx={whiteAll}>
          <SelectField
            label="Military Status"
            value={f.military}
            onChange={(v) => set("military", v)}
            options={[{ value: "", label: ALL }, ...optionsOf(militaryOptions())]}
          />
        </Box>
        <Box sx={whiteAll}>
          <SelectField label="Population" value={s.pop} onChange={(v) => setS({ ...s, pop: v as MeasurePop })} options={POP_OPTIONS.map((p) => ({ value: p.value, label: p.label }))} />
        </Box>
        {/* The board's note under Age Range: "User can select range or enter min / max". Min and Max sit beside the range list, not under it. */}
        <Box sx={{ display: "flex", gap: 1, alignItems: "start", minWidth: 0 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>{multi("ageGroup", "Age Range", optionsOf(v16 ? ageRangesBetween(...ageBandsOf(YEAR)[code]) : options.ageGroup))}</Box>
          <Box sx={{ width: 68, flex: "none", ...whiteAll }}>
            <TextField
              label="Min"
              type="number"
              value={f.ageFrom}
              onChange={(e) => set("ageFrom", e.target.value)}
              slotProps={{ htmlInput: { min: 0, max: 120, "aria-label": "Minimum age in years" } }}
            />
          </Box>
          <Box sx={{ width: 68, flex: "none", ...whiteAll }}>
            <TextField
              label="Max"
              type="number"
              value={f.ageTo}
              onChange={(e) => set("ageTo", e.target.value)}
              slotProps={{ htmlInput: { min: 0, max: 120, "aria-label": "Maximum age in years" } }}
            />
          </Box>
        </Box>
        <Box sx={whiteAll}>
          <SelectField label="Sex" value={f.sex} onChange={(v) => set("sex", v)} options={[{ value: "", label: ALL }, ...optionsOf(v16 && (code === "BCS-E" || code === "CCS-E") ? options.sex.filter((x) => x === "Female") : options.sex)]} />
        </Box>
        {multi("race", "Race", optionsOf(options.race))}
        {multi("ethnicity", "Ethnicity", optionsOf(options.ethnicity))}
        <Box sx={{ alignSelf: "end" }}>
          <Button variant="secondary" onClick={clear} disabled={!filtered}>
            Clear All Filters
          </Button>
        </Box>
      </Box>

      {t.review > 0 && (
        <Typography sx={{ fontSize: qs.type.small.size, color: qs.color.mutedText, px: 2, pt: 1.5 }}>
          {n0(t.review)} {t.review === 1 ? "member has" : "members have"} a result that needs review (evidence missing or conflicting). {t.review === 1 ? "This member is" : "These members are"} not counted in any tile below until the evidence is decided.
        </Typography>
      )}
      <QsSheet>
        {card("population", "Initial Population", v15 ? INITIAL_V15[code] : v13 ? "Active members who meet the measure age, sex, and enrollment criteria as of the most recent Run Date." : "All active members meeting the measurement criteria to identify gaps in care.", "initial", "count", true)}
        {card(
          "excluded",
          "Excluded Population",
          "All Initial Population members removed by an exclusion per the measure specification. See About This Measure for more information.",
          "excluded",
          "count",
          false,
        )}
        {card(
          "population",
          "Eligible Population",
          v15
            ? "All Initial Population members who are not excluded from the measure. Initial Population minus Excluded Population. See About This Measure for more information."
            : "All Initial Population members who are not excluded from the measure. Initial Population - Excluded Population. See About This Measure for more information.",
          "eligible",
          "count",
          true,
        )}
        {card("met", "Closed Gaps Count", v13 ? "Eligible Population members whose gap is closed as of the most recent Run Date." : "All Eligible Population members who have a closed gap as of the most recent Run Date.", "closed", "count", true, undefined, gsdWhy && (
          <Box sx={{ mt: 0.5, display: "grid", gap: 0.25, fontSize: qs.type.small.size, color: qs.color.secondaryForeground }}>
            <Box>
              HbA1c below 8: <b>{n0(gsdWhy.low)}</b>
            </Box>
          </Box>
        ))}
        {card("met", `${short} Measure Rate`, v13 ? "Percentage of Eligible Population members whose gap is closed. Numerator: Closed Gaps Count. Denominator: Eligible Population." : "Numerator: Closed Gaps Count\nDenominator: Eligible Population", "rate", "rate", true, v16 ? `${short} Measure Rate` : "Closed Gaps Rate")}
        {card("notMet", "Open Gaps Count", v13 ? `Eligible Population members whose ${short} gap is open as of the most recent Run Date.` : "All Eligible Population members who have an open gap as of the most recent Run Date.", "open", "count", false, undefined, gsdWhy && (
          <Box sx={{ mt: 0.5, display: "grid", gap: 0.25, fontSize: qs.type.small.size, color: qs.color.secondaryForeground }}>
            <Box>
              HbA1c 8 to 9: <b>{n0(gsdWhy.mid)}</b>
            </Box>
            <Box>
              HbA1c above 9, or no test this year: <b>{n0(gsdWhy.high)}</b>
            </Box>
          </Box>
        ))}

        <QsTile
          cols={36}
          title={`${tfLabel} Trend - ${short} Closed Gaps Count & %`}
          action={
            <Box sx={{ minWidth: 200 }}>
              <SelectField label="Trend Timeframe" value={tf} onChange={(v) => setTf(v as Timeframe)} options={timeframeOptions.map((o) => ({ value: o.value, label: o.label }))} />
            </Box>
          }
        >
          <Typography sx={{ fontSize: qs.type.small.size, color: qs.color.mutedText, mb: 1 }}>{(v15 ? TIMEFRAME_TIPS_V15 : TIMEFRAME_TIPS)[tf]}</Typography>
          {tf === "annual" ? (
            <QsRateColumns
              label={`${short} closed and open gaps by year`}
              xTitle="Year"
              rows={annual.map((r) => ({ label: r.label, closed: r.met, open: r.gap }))}
            />
          ) : (
            lines && (
              <QsRateLines
                label={`${short} closed gaps by ${tf === "quarterly" ? "quarter" : "month"}, ${v15 ? "the last three calendar years" : "last year and this year to date"}`}
                xTitle={tf === "quarterly" ? "Quarter" : "Month"}
                labels={lines.labels}
                series={[...lines.series].reverse().map((x, i) => ({
                  name: x.name,
                  color: v15 ? (i === 0 ? qs.meaning.neutral : i === 1 ? qs.color.secondaryForeground : closedColor()) : i === 0 ? qs.meaning.neutral : v13 ? closedColor() : qs.meaning.met,
                  dashed: i === 0,
                  counts: x.counts,
                  rates: x.values,
                }))}
              />
            )
          )}
        </QsTile>

        <QsTile cols={36} bare plain>
          {v13 ? (
            <>
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, flexWrap: "wrap" }}>
              <Box sx={{ width: 120, ...whiteAll }}>
                <TextField
                  label="Top n"
                  type="number"
                  value={topText}
                  onChange={(e) => {
                    setTopText(e.target.value);
                    setViewAll(false);
                  }}
                  error={topBad}
                  helperText={topBad ? `Enter 1 to ${MAX_TOP_N}` : undefined}
                  slotProps={{ htmlInput: { min: 1, max: MAX_TOP_N, step: 1, "aria-label": `Top n, 1 to ${MAX_TOP_N}` } }}
                />
              </Box>
              <Box sx={{ width: 240, ...whiteAll }}>
                <TextField
                  label="Minimum Number of Members"
                  type="number"
                  value={minText}
                  onChange={(e) => setMinText(e.target.value)}
                  error={minBad}
                  helperText={minBad ? "Enter 1 or more" : v15 ? undefined : "Eligible members, for the rate chart"}
                  slotProps={{ htmlInput: { min: 1, step: 1, "aria-label": "Minimum number of eligible members a manager needs to be ranked by rate" } }}
                />
              </Box>
              <Box sx={{ pt: "22px" }}>
                <Button variant="secondary" onClick={() => setViewAll(!viewAll)} aria-pressed={viewAll}>
                  {viewAll ? `Show Top ${topN}` : "View All"}
                </Button>
              </Box>
            </Box>
            {v15 && (
              <Box sx={{ mt: 1.5, display: "grid", gap: 0.5, fontSize: qs.type.small.size, color: qs.color.mutedText }}>
                <Box>
                  <b>Top n:</b> Enter number of PCMs you'd like to rank.
                </Box>
                <Box>
                  <b>Minimum Number of Members:</b> Only PCMs with at least the minimum number of Eligible Population members are shown. E.g. If min = 30, PCMs with 29 members in their Eligible Population are not considered.
                </Box>
                <Box>
                  <b>View All:</b> All PCMs with at least the minimum number of Eligible Population members are shown.
                </Box>
              </Box>
            )}
            </>
          ) : (
            <Box sx={{ display: "flex", alignItems: "flex-end", gap: 2, flexWrap: "wrap" }}>
              <Box sx={{ width: 160 }}>
                <SelectField
                  label="Top n"
                  value={String(topN)}
                  onChange={(v) => {
                    setTopText(v);
                    setViewAll(false);
                  }}
                  options={[5, 10, 15].map((n) => ({ value: String(n), label: `n = ${n}` }))}
                />
              </Box>
              <Button variant="secondary" onClick={() => setViewAll(!viewAll)} aria-pressed={viewAll}>
                {viewAll ? `Show Top ${topN}` : "View All"}
              </Button>
            </Box>
          )}
        </QsTile>
        <QsTile cols={18} title={v16 ? `${nLabel} Primary Care Managers With Most Open Gaps` : `${nLabel} Primary Care Managers With Members Having Most Open Gaps`}>
          <Box sx={{ maxHeight: 520, overflow: "auto" }}>
            <QsRateBars label={`${nLabel} primary care managers with the most open gaps`} first="open" rows={topOpen} dividerAt={unassigned ? [rankedOpen.length] : undefined} padRows={rowsMax - topOpen.length} />
          </Box>
          <Typography sx={{ fontSize: qs.type.small.size, color: qs.color.mutedText, mt: 1 }}>
            {v13
              ? "PCMs ranked by the number of open gaps among their eligible members. Bars show each PCM's closed and open gaps, with percentages of their eligible members. Members without an assigned PCM are shown as Unassigned below the ranked list."
              : "Counts and %s are based on the members that the Primary Care Manager is responsible for."}
          </Typography>
        </QsTile>
        <QsTile cols={18} title={`${nLabel} Primary Care Managers with Highest Closed Gap Rate`}>
          <Box sx={{ maxHeight: 520, overflow: "auto" }}>
            <QsRateBars
              label={`${nLabel} primary care managers with the highest closed gap rate`}
              first="closed"
              rows={topClosed}
              dividerAt={belowRow.length ? [rankedClosed.length] : undefined}
              padRows={rowsMax - topClosed.length}
              empty={v13 ? `No manager has ${n0(minMembers)} or more eligible members for these controls` : `No manager has ${minMembers} or more members for these controls`}
            />
          </Box>
          <Typography sx={{ fontSize: qs.type.small.size, color: qs.color.mutedText, mt: 1 }}>
            {v13
              ? `PCMs ranked by the measure rate: closed gaps ÷ eligible members assigned to the PCM. Only PCMs with at least ${n0(minMembers)} eligible members for this measure are ranked, because rates based on few members change sharply with each closed gap. Unassigned members are not ranked.`
              : "Counts and %s are based on the members that the Primary Care Manager is responsible for. Only PCMs with 100+ members are included so that PCMs with few members do not skew metrics."}
          </Typography>
        </QsTile>

        {(
          [
            ["ageBand", "Gaps By Age", "Age"],
            ["race", "Gaps By Race", "Race"],
            ["ethnicity", "Gaps By Ethnicity", "Ethnicity"],
            ["sex", "Gaps By Sex", "Sex"],
            ["military", "Gaps By Military Status", "Military Status"],
          ] as [Dimension, string, string][]
        ).map(([dim, title, x]) => (
          <QsTile key={dim} cols={18} title={title}>
            <QsRateColumns label={title} xTitle={x} rows={gapRows(dim)} />
          </QsTile>
        ))}
      </QsSheet>
    </>
  );
}

