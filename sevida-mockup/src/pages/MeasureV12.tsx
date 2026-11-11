import { useMemo, useState } from "react";
import { Box, Typography } from "@mui/material";
import { AutocompleteField, Button, SelectField, TextField } from "sevida-ui";
import { QS_CLOSED, QsSheet, QsText, QsTile } from "../quicksight/kit";
import { QsRateBars, QsRateColumns, QsRateLines } from "../quicksight/kitV12";
import { qs } from "../quicksight/qsTheme";
import { ALL, optionsOf } from "../sharedFilters";
import { CURRENT_YEAR, fmtDate, resultsFor } from "../data";
import type { MeasureCode, MeasureState } from "../data";
import { bandsFor, emptyFilters, facetOptions, filterMembers, gapsByManager, groupRates, inputsFor, kpisFor, providerOf, runInfo, timeframeOptions, timeframeRows, yearLines } from "../dashboardData";
import type { DashFilters, Dimension, Timeframe } from "../dashboardData";
import { V3_DEFINITION, V3_EXCLUSIONS, V3_MET, gapShort, militaryOptions } from "../v3Data";
import { ordDate } from "./QuickSightDashboardPage";
import { useRun } from "../runs";
import { KpiTile, boxSx, changeOf, controlsBox, n0, pcmOptionsV12, pcmText, pct2, runStamp, share, whiteAll } from "./dashboardV12Bits";
import type { Group } from "./dashboardV12Bits";

/**
 * Version 12 measure page (Balsamiq board, BCS tab). The same layout serves BCS, CCS, COL, GSD and WCV: only the words and numbers change.
 * Top to bottom: header boxes, About This Measure (open), seven filters, six tiles, the trend, the two Top n charts, five "Gaps By" charts.
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

/** The board's rule: only managers with 100 or more members are ranked, so a manager with few members does not skew the rate. */
const MIN_PCM_MEMBERS = 100;

/** The three Trend Timeframe descriptions (the same wording as Version 11; the board's wording is still to be confirmed). */
const TIMEFRAME_TIPS: Record<Timeframe, string> = {
  annual:
    "Annual - Displays the Measure Met Rate on the last run of the current HEDIS version year. Shows the Measure Rate on the last run of the prior five HEDIS measure years, where applicable. Note: HEDIS measure specs can change year to year.",
  quarterly:
    "Quarterly - Displays the Measure Met Rate on the last run of each of the most recently completed nine quarters of the current HEDIS version year. Note: HEDIS measure specs can change year to year.",
  monthly:
    "Monthly - Displays the Measure Met Rate on the last run of each of the most recently completed 25 months of the current HEDIS version year. Note: HEDIS measure specs can change year to year.",
};

/** The About This Measure bullets. BCS is the board's text. The other measures keep their own wording in the same shape. */
function aboutBullets(code: MeasureCode): string[] {
  if (code === "BCS-E")
    return [
      "Who's Included: Women age 42–74 on Dec 31",
      "Enrolled all year (one gap of up to 45 days). The spec says BCS also looks at earlier years; this demo checks the measurement year only.",
      "Met when a mammogram (claim, EHR procedure or screening result) falls in the look-back window.",
      "The look-back window is Oct 1 two years before to Dec 31 of the measurement year.",
      "Excluded: hospice or death.",
      "Excluded: mastectomy on one or both breasts, or gender-affirming chest surgery, before or during the year.",
      "Excluded: age 66+ and enrolled in an institutional special needs plan (I-SNP), or living in a long-term institution (LTI flag) during the year.",
      "Excluded: frailty together with advanced illness (including dementia medication fills in the year or the year before).",
      "Excluded: palliative care during the measurement year (diagnosis or encounter). The demo reads it from diag.",
    ];
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
  const [tf, setTf] = useState<Timeframe>("annual");
  const [topN, setTopN] = useState(5);
  const [viewAll, setViewAll] = useState(false);

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
  const card = (group: Group, title: string, about: string, key: keyof typeof cur, kind: "count" | "rate", upIsGood: boolean, footTitle = title) => {
    const ch = changeOf(cur[key], before[key], kind, upIsGood);
    const fmt = (v: number) => (kind === "count" ? n0(v) : pct2(v));
    return (
      <KpiTile
        key={title}
        group={group}
        title={title}
        about={about}
        aboutMin={64}
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
  const lines = useMemo(() => (tf === "annual" ? null : yearLines(code, list, tf, 2)), [tf, list, code]);
  const tfLabel = timeframeOptions.find((o) => o.value === tf)?.label ?? "";

  /* ---- Top n by Primary Care Manager (Unassigned is a manager here) ---- */
  const managers = gapsByManager(code, list, YEAR, true);
  const members = useMemo(() => {
    const by = new Map<string, number>();
    for (const m of base) by.set(providerOf(m), (by.get(providerOf(m)) ?? 0) + 1);
    return by;
  }, [base]);
  const take = <T,>(xs: T[]) => (viewAll ? xs : xs.slice(0, topN));
  const row = (r: { name: string; open: number; closed: number }) => ({ label: pcmText(r.name), open: r.open, closed: r.closed });
  const topOpen = take([...managers].sort((a, b) => b.open - a.open || b.closed - a.closed || a.name.localeCompare(b.name))).map(row);
  const topClosed = take(
    managers
      .filter((r) => (members.get(r.name) ?? 0) >= MIN_PCM_MEMBERS)
      .sort((a, b) => share(b.closed, b.closed + b.open) - share(a.closed, a.closed + a.open) || b.closed - a.closed || a.name.localeCompare(b.name)),
  ).map(row);
  const nLabel = viewAll ? "All" : `Top ${topN}`;

  /* ---- Gaps By ---- */
  const gapRows = (dim: Dimension) => {
    const rows = groupRates(code, list, YEAR, dim).map((r) => ({ label: r.group, closed: r.t.met, open: r.t.gap }));
    // The board lists every ten-year band of the measure's ages (40-49, 50-59 ...), also one nobody is in.
    return dim === "ageBand" ? bandsFor(code, YEAR).map((b) => rows.find((r) => r.label === b.label) ?? { label: b.label, closed: 0, open: 0 }) : rows;
  };

  const clear = () => setS(emptyMeasure());
  const filtered = JSON.stringify(f) !== JSON.stringify(emptyFilters()) || s.pop !== "eligible";
  const multi = (key: "ageGroup" | "race" | "ethnicity" | "provider", label: string, values: { value: string; label: string }[]) => (
    <Box sx={whiteAll}>
      <AutocompleteField multiple label={label} placeholder={ALL} options={values} value={f[key]} onChange={(v) => set(key, v as never)} />
    </Box>
  );
  const sources = sourceFiles(code);

  return (
    <>
      <Box sx={{ display: "grid", gap: `${qs.gap}px`, p: `${qs.gap}px`, pb: 0, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
        <Box sx={boxSx}>
          <QsText>
            <p>
              <b>MEASUREMENT YEAR:</b> {YEAR}
            </p>
            <p>
              <b>Measurement Start:</b> {ordDate(new Date(YEAR, 0, 1))}
            </p>
            <p>
              <b>Measurement End:</b> {ordDate(new Date(YEAR, 11, 31))}
            </p>
          </QsText>
        </Box>
        <Box sx={boxSx}>
          <QsText>
            <p>
              <b>Data as Of (Run Date):</b> {runStamp(selectedRun.at)}
            </p>
            <p>
              <b>Dashboard Next Update:</b> {runStamp(run.next)}
            </p>
          </QsText>
        </Box>
      </Box>

      <Box sx={{ p: `${qs.gap}px`, pb: 0 }}>
        <Box sx={boxSx}>
          <Typography sx={{ fontWeight: 700, fontSize: qs.type.visualTitle.size, mb: 1 }}>About This Measure</Typography>
          <QsText>
            <ul>
              {aboutBullets(code).map((b) => (
                <li key={b}>{b}</li>
              ))}
              {sources && <li>Source files: {sources}</li>}
            </ul>
          </QsText>
        </Box>
      </Box>

      <Box sx={{ ...controlsBox(4), mt: `${qs.gap}px`, borderTop: qs.tile.border }}>
        {multi("provider", "Primary Care Manager", pcmOptionsV12())}
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
        <Box sx={{ display: "grid", gap: 1 }}>
          {multi("ageGroup", "Age Range", optionsOf(options.ageGroup))}
          <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: "1fr 1fr", ...whiteAll }}>
            <TextField
              label="Min age"
              type="number"
              value={f.ageFrom}
              onChange={(e) => set("ageFrom", e.target.value)}
              slotProps={{ htmlInput: { min: 0, max: 120, "aria-label": "Minimum age in years" } }}
            />
            <TextField
              label="Max age"
              type="number"
              value={f.ageTo}
              onChange={(e) => set("ageTo", e.target.value)}
              slotProps={{ htmlInput: { min: 0, max: 120, "aria-label": "Maximum age in years" } }}
            />
          </Box>
        </Box>
        <Box sx={whiteAll}>
          <SelectField label="Sex" value={f.sex} onChange={(v) => set("sex", v)} options={[{ value: "", label: ALL }, ...optionsOf(options.sex)]} />
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
        {card("population", "Initial Population", "All active members meeting the measurement criteria to identify gaps in care.", "initial", "count", true)}
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
          "All Initial Population members who are not excluded from the measure. Initial Population - Excluded Population. See About This Measure for more information.",
          "eligible",
          "count",
          true,
        )}
        {card("met", "Closed Gaps Count", "All Eligible Population members who have a closed gap as of the most recent Run Date.", "closed", "count", true)}
        {card("met", `${short} Measure Rate`, "Numerator: Closed Gaps Count\nDenominator: Eligible Population", "rate", "rate", true, "Closed Gaps Rate")}
        {card("notMet", "Open Gaps Count", "All Eligible Population members who have an open gap as of the most recent Run Date.", "open", "count", false)}

        <QsTile
          cols={36}
          title={`${tfLabel} Trend - ${short} Closed Gaps Count & %`}
          action={
            <Box sx={{ minWidth: 200 }}>
              <SelectField label="Trend Timeframe" value={tf} onChange={(v) => setTf(v as Timeframe)} options={timeframeOptions.map((o) => ({ value: o.value, label: o.label }))} />
            </Box>
          }
        >
          <Typography sx={{ fontSize: qs.type.small.size, color: qs.color.mutedText, mb: 1 }}>{TIMEFRAME_TIPS[tf]}</Typography>
          {tf === "annual" ? (
            <QsRateColumns
              label={`${short} closed and open gaps by year`}
              xTitle="Year"
              rows={annual.map((r) => ({ label: r.label, closed: r.met, open: r.gap }))}
            />
          ) : (
            lines && (
              <QsRateLines
                label={`${short} closed gaps by ${tf === "quarterly" ? "quarter" : "month"}, last year and this year to date`}
                xTitle={tf === "quarterly" ? "Quarter" : "Month"}
                labels={lines.labels}
                series={[...lines.series].reverse().map((x, i) => ({
                  name: x.name,
                  color: i === 0 ? qs.meaning.neutral : QS_CLOSED,
                  dashed: i === 0,
                  counts: x.counts,
                  rates: x.values,
                }))}
              />
            )
          )}
        </QsTile>

        <QsTile cols={36} bare plain>
          <Box sx={{ display: "flex", alignItems: "flex-end", gap: 2, flexWrap: "wrap" }}>
            <Box sx={{ width: 160 }}>
              <SelectField
                label="Top n"
                value={String(topN)}
                onChange={(v) => {
                  setTopN(Number(v));
                  setViewAll(false);
                }}
                options={[5, 10, 15].map((n) => ({ value: String(n), label: `n = ${n}` }))}
              />
            </Box>
            <Button variant="secondary" onClick={() => setViewAll(!viewAll)} aria-pressed={viewAll}>
              {viewAll ? `Show Top ${topN}` : "View All"}
            </Button>
          </Box>
        </QsTile>
        <QsTile cols={18} title={`${nLabel} Primary Care Managers With Members Having Most Open Gaps`}>
          <Box sx={{ maxHeight: 520, overflow: "auto" }}>
            <QsRateBars label={`${nLabel} primary care managers with the most open gaps`} first="open" rows={topOpen} />
          </Box>
          <Typography sx={{ fontSize: qs.type.small.size, color: qs.color.mutedText, mt: 1 }}>
            Counts and %s are based on the members that the Primary Care Manager is responsible for.
          </Typography>
        </QsTile>
        <QsTile cols={18} title={`${nLabel} Primary Care Managers with Highest Closed Gap Rate`}>
          <Box sx={{ maxHeight: 520, overflow: "auto" }}>
            <QsRateBars
              label={`${nLabel} primary care managers with the highest closed gap rate`}
              first="closed"
              rows={topClosed}
              empty={`No manager has ${MIN_PCM_MEMBERS} or more members for these controls`}
            />
          </Box>
          <Typography sx={{ fontSize: qs.type.small.size, color: qs.color.mutedText, mt: 1 }}>
            Counts and %s are based on the members that the Primary Care Manager is responsible for. Only PCMs with 100+ members are included so that PCMs with few members do not skew metrics.
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

