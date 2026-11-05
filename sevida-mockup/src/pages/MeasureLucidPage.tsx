import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Box, InputAdornment, Typography } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { AutocompleteField, InfoTip, PageContainer, SelectField, TextField } from "sevida-ui";
import { renderCrumbLink } from "../components/RouterLinkAdapter";
import {
  NotesContext,
  QsComboTrend,
  QsDonut,
  QsFrame,
  QsGapBars,
  QsGapColumns,
  QsSheet,
  QsTable,
  QsText,
  QsTile,
  QsYearBars,
} from "../quicksight/kit";
import type { QsCol } from "../quicksight/kit";
import { qs } from "../quicksight/qsTheme";
import {
  ALL,
  optionsOf,
} from "../sharedFilters";
import {
  CURRENT_YEAR,
  allMembers,
  ageAtYearEnd,
  fmtDate,
  getAsOfStep,
  resultsFor,
  setAsOfStep,
  tally,
} from "../data";
import type { Member, MeasureCode } from "../data";
import {
  bandsFor,
  emptyFilters,
  ethnicityOf,
  facetOptions,
  filterMembers,
  gapsByManager,
  groupRates,
  kpisFor,
  providerOf,
  raceOf,
  runInfo,
  sexOf,
  timeframeOptions,
  timeframeRows,
  yearLines,
} from "../dashboardData";
import type { DashFilters, Dimension, Timeframe } from "../dashboardData";
import { PCMS, pcmByName, pcmLabel } from "../v7Data";
import { gapShort, tricareIdOf, V3_MET } from "../v3Data";
import { fmtRunTime, useRun } from "../runs";
import { useRole } from "../roles";
import { useDocumentTitle } from "../components/analytics/AnalyticsBits";
import {
  MemberInsightPanels,
  POPULATIONS,
  aboutFor,
  excludedPopTip,
  initialPopTip,
  lucidTitle,
  ordDate,
  MEMBER_POP_TIP,
  NOT_MET_TIP,
  eligiblePopTip,
} from "./QuickSightDashboardPage";
import type { MemberDetailsFilter } from "./QuickSightDashboardPage";

/**
 * Version 10: a measure dashboard exactly as the Lucid chart draws it for BCS (HEDIS Care Gaps Dashboard - Breast Cancer Screening (BCS)).
 * The same layout serves every measure (BCS, CCS, COL, GSD, WCV): only the words and numbers change with the measure.
 * Three tabs: Overview, Member Details and Admin. Nothing is on this page that the Lucid chart does not have.
 * Only the latest year is shown, so there is no Measurement Year control. The five Overview controls filter the Overview only.
 * The Member Details tab has its own three controls. The Admin tab holds the Measurement Run History.
 */
const YEAR = CURRENT_YEAR;
const TABS = ["Overview", "Member Details", "Admin"];

const n0 = (n: number) => n.toLocaleString("en-US");
const pct2 = (n: number) => `${n.toFixed(2)}%`;
const share = (n: number, d: number) => (d ? (n / d) * 100 : 0);
const az = (xs: string[]) => [...xs].sort((a, b) => a.localeCompare(b));
const withAll = (xs: string[]) => [{ value: "", label: ALL }, ...optionsOf(xs)];

/** "2nd November, 2026 @ 4:00 AM CST", the way the Lucid chart writes the dates. */
const lucidStamp = (x: Date) => {
  const d = x.getDate();
  const th = d % 10 === 1 && d !== 11 ? "st" : d % 10 === 2 && d !== 12 ? "nd" : d % 10 === 3 && d !== 13 ? "rd" : "th";
  const h = x.getHours();
  return `${d}${th} ${x.toLocaleString("en-US", { month: "long" })}, ${x.getFullYear()} @ ${h % 12 || 12}:${String(x.getMinutes()).padStart(2, "0")} ${h < 12 ? "AM" : "PM"} CST`;
};

/** The three Trend Timeframe descriptions, word for word from the Lucid chart. */
const TIMEFRAME_TIPS: Record<Timeframe, string> = {
  annual:
    "Annual - Displays the Measure Met Rate on the last run of the current HEDIS version year. Shows the Measure Rate on the last run of the prior five HEDIS measure years, where applicable. Note: HEDIS measure specs can change year to year.",
  quarterly:
    "Quarterly - Displays the Measure Met Rate on the last run of each of the most recently completed nine quarters of the current HEDIS version year. Note: HEDIS measure specs can change year to year.",
  monthly:
    "Monthly - Displays the Measure Met Rate on the last run of each of the most recently completed 25 months of the current HEDIS version year. Note: HEDIS measure specs can change year to year.",
};

/** One control with its title above and an optional info icon at the right (the Lucid chart keeps the icon on the Member Details controls). */
function Ctl({ info, children }: { info?: string; children: ReactNode }) {
  return (
    <Box sx={{ minWidth: 0, position: "relative" }}>
      {children}
      {info && (
        <Box sx={{ position: "absolute", top: 0, right: 0, zIndex: 2 }}>
          <InfoTip label={`About ${info.slice(0, 20)}`}>{info}</InfoTip>
        </Box>
      )}
    </Box>
  );
}

const controlsBox = (columns: number) => ({
  display: "grid",
  gap: 2,
  alignItems: "start",
  px: 2,
  py: 2,
  bgcolor: qs.color.secondaryBackground,
  borderBottom: qs.tile.border,
  gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", md: `repeat(${columns}, minmax(0, 1fr))` },
});

const whiteAll = {
  "& input::placeholder": { color: qs.color.primaryForeground, opacity: 1 },
  "& .MuiInputBase-root": { background: qs.color.primaryBackground },
};

/* ------------------------------------------------------------------ one KPI card (Lucid) */

type Tone = "good" | "bad" | "neutral";
type Dir = "up" | "down" | "flat";
/** The colour of a card by what it counts: population (blue), excluded (grey), met (green), not met (orange). */
const GROUP = {
  population: { color: qs.meaning.main, text: qs.meaning.main, name: "Population" },
  excluded: { color: qs.meaning.neutral, text: qs.color.secondaryForeground, name: "Excluded" },
  met: { color: qs.meaning.met, text: qs.meaning.met, name: "Met" },
  notMet: { color: qs.meaning.gap, text: qs.meaning.gapText, name: "Not met" },
} as const;
type Group = keyof typeof GROUP;

function LucidKpi({
  group,
  title,
  about,
  value,
  prior,
  change,
  dir,
  tone,
  footer,
}: {
  group: Group;
  title: string;
  about: string;
  value: string;
  prior: string;
  /** Already formatted, "5.44%". Null when there is nothing to compare with. */
  change: string | null;
  dir: Dir;
  tone: Tone;
  footer: string;
}) {
  const g = GROUP[group];
  const ink = tone === "good" ? qs.meaning.met : tone === "bad" ? qs.tone.danger.text : qs.color.secondaryForeground;
  const word = tone === "good" ? "Better" : tone === "bad" ? "Worse" : "No change";
  const arrow = dir === "up" ? "▲" : dir === "down" ? "▼" : "▬";
  return (
    <QsTile cols={9} bare>
      {/* The strip at the left carries the group colour. The group name is also in the card for people who cannot tell colours apart. */}
      <Box aria-hidden="true" sx={{ position: "absolute", left: 0, top: 12, bottom: 12, width: 5, background: g.color, borderRadius: "0 3px 3px 0" }} />
      <Typography sx={{ fontSize: qs.type.visualTitle.size, fontWeight: 700 }}>{title}</Typography>
      <Typography sx={{ fontSize: qs.type.subtitle.size, color: qs.color.mutedText, lineHeight: 1.3, minHeight: 32 }}>{about}</Typography>
      <Typography sx={{ fontSize: qs.type.kpi.size, fontWeight: qs.type.kpi.weight, lineHeight: 1.25, mt: 0.5, color: g.text }}>{value}</Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.75, flexWrap: "wrap" }}>
        <Typography sx={{ fontSize: qs.type.body.size, color: qs.color.secondaryForeground }}>Prior Month: {prior}</Typography>
        {change !== null && (
          <Typography
            sx={{ fontSize: qs.type.body.size, fontWeight: 700, color: ink, display: "inline-flex", alignItems: "center", gap: 0.5 }}
            title={`${word}: ${change} against the prior month`}
          >
            <span aria-hidden="true" style={{ fontSize: 10 }}>
              {arrow}
            </span>
            {change}
            <Box component="span" sx={{ fontWeight: 400 }}>
              {word}
            </Box>
          </Typography>
        )}
      </Box>
      <Typography sx={{ fontSize: qs.type.small.size, color: qs.color.mutedText, lineHeight: 1.3, mt: 0.75 }}>{footer}</Typography>
    </QsTile>
  );
}

/* ------------------------------------------------------------------ Overview */

function Overview({ code, f, setF }: { code: MeasureCode; f: DashFilters; setF: (f: DashFilters) => void }) {
  const short = gapShort(code);
  const [tf, setTf] = useState<Timeframe>("annual");
  const [topN, setTopN] = useState(10);
  const { run: selectedRun } = useRun();
  const run = runInfo();
  const options = useMemo(() => facetOptions(), []);
  const list = useMemo(() => filterMembers(f, code), [f]);
  const { initial, t } = kpisFor(code, list, YEAR);
  const about = aboutFor(code);
  const set = <K extends keyof DashFilters>(key: K, value: DashFilters[K]) => setF({ ...f, [key]: value });
  const pcmOptions = [...PCMS]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((p) => ({ value: p.name, label: `${p.name} - NPI: ${p.npi}` }));

  const multi = (key: "ageGroup" | "race" | "ethnicity" | "provider", label: string, values: { value: string; label: string }[]) => (
    <Ctl>
      <Box sx={whiteAll}>
        <AutocompleteField multiple label={label} placeholder={ALL} options={values} value={f[key]} onChange={(v) => set(key, v as never)} />
      </Box>
    </Ctl>
  );

  /* ---- the eight cards: this run against the last run of the prior completed calendar month ---- */
  const months = useMemo(() => timeframeRows(code, list, "monthly"), [list]);
  const prior = months[months.length - 1];
  const cur = {
    members: initial,
    initial: t.eligible,
    eligible: t.denominator,
    excluded: t.excluded,
    met: t.met,
    notMet: t.gap,
    metRate: share(t.met, t.denominator),
    notMetRate: t.denominator ? 100 - share(t.met, t.denominator) : 0,
  };
  const before = {
    members: prior?.evaluated ?? 0,
    initial: prior?.initial ?? 0,
    eligible: prior?.eligible ?? 0,
    excluded: prior?.excluded ?? 0,
    met: prior?.met ?? 0,
    notMet: prior?.gap ?? 0,
    metRate: prior?.rate ?? 0,
    notMetRate: prior?.eligible ? 100 - (prior.rate ?? 0) : 0,
  };
  const change = (c: number, p: number, kind: "count" | "rate", upIsGood: boolean) => {
    if (kind === "count" && !p) return { text: null as string | null, tone: "neutral" as Tone, dir: "flat" as Dir };
    const diff = kind === "count" ? ((c - p) / p) * 100 : c - p;
    const flat = Math.abs(diff) < 0.005;
    const tone: Tone = flat ? "neutral" : (diff > 0) === upIsGood ? "good" : "bad";
    return { text: pct2(Math.abs(diff)), tone, dir: (flat ? "flat" : diff > 0 ? "up" : "down") as Dir };
  };
  const card = (
    group: Group,
    title: string,
    about: string,
    key: keyof typeof cur,
    kind: "count" | "rate",
    upIsGood = true,
  ) => {
    const ch = change(cur[key], before[key], kind, upIsGood);
    const fmt = (v: number) => (kind === "count" ? n0(v) : pct2(v));
    return (
      <LucidKpi
        key={title}
        group={group}
        title={title}
        about={about}
        value={fmt(cur[key])}
        prior={fmt(before[key])}
        change={ch.text}
        dir={ch.dir}
        tone={ch.tone}
        footer={`${title} on the last Run Date of the prior completed calendar month.`}
      />
    );
  };

  /* ---- trend ---- */
  const annual = useMemo(() => (tf === "annual" ? timeframeRows(code, list, "annual") : []), [tf, list]);
  const lines = useMemo(() => (tf === "annual" ? null : yearLines(code, list, tf)), [tf, list]);
  const tfLabel = timeframeOptions.find((o) => o.value === tf)?.label ?? "";

  /* ---- gaps by group ---- */
  const gapRows = (dim: Dimension) => {
    const rows = groupRates(code, list, YEAR, dim).map((r) => ({ label: r.group, open: r.t.gap, closed: r.t.met, note: `${r.t.rate.toFixed(1)}% closed` }));
    // The Lucid chart always lists every age range (40-49 to 70-74), also the ones nobody is in.
    if (dim !== "ageGroup") return rows;
    return bandsFor(code, YEAR).map((b) => rows.find((r) => r.label === b.label) ?? { label: b.label, open: 0, closed: 0, note: "0.0% closed" });
  };
  const sexRows = groupRates(code, list, YEAR, "sex").sort((a, b) => b.t.denominator - a.t.denominator);
  const managers = gapsByManager(code, list, YEAR);
  const mgrLabel = (name: string) => {
    const m = pcmByName(name);
    return m ? `Dr. ${pcmLabel(m)}` : name;
  };
  const topOpen = [...managers].sort((a, b) => b.open - a.open || b.closed - a.closed || a.name.localeCompare(b.name)).slice(0, topN);
  const topClosed = [...managers].sort((a, b) => b.closed - a.closed || b.open - a.open || a.name.localeCompare(b.name)).slice(0, topN);
  const topNSelect = (
    <SelectField
      label="Top n"
      value={String(topN)}
      onChange={(v) => setTopN(Number(v))}
      options={[5, 10, 15].map((n) => ({ value: String(n), label: String(n) }))}
    />
  );
  const boxSx = { border: qs.tile.border, borderRadius: `${qs.tile.radius}px`, bgcolor: qs.color.primaryBackground, p: `${qs.tile.padding}px` };

  return (
    <>
      <Box sx={{ display: "grid", gap: `${qs.gap}px`, p: `${qs.gap}px`, pb: 0, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
        <Box sx={boxSx}>
          <QsText>
            <p>
              <b>HEDIS VERSION:</b> {YEAR}
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
              <b>Last Updated:</b> {lucidStamp(selectedRun.at)}
            </p>
            <p>
              <b>Next Refresh:</b> {lucidStamp(run.next)}
            </p>
          </QsText>
        </Box>
      </Box>

      <Box sx={{ p: `${qs.gap}px`, pb: 0 }}>
        <Box
          component="details"
          sx={{ ...boxSx, "& summary": { cursor: "pointer", fontWeight: 700, fontSize: qs.type.visualTitle.size } }}
        >
          <summary>About this measure (HEDIS {short})</summary>
          <Box sx={{ mt: 1 }}>
            <QsText>
              {about.map(([h, text]) => (
                <p key={h}>
                  <b>{h}</b> {text}
                </p>
              ))}
              <p>Counts are distinct members: the latest run of each measurement year is shown, with every run in the trend.</p>
            </QsText>
          </Box>
        </Box>
      </Box>

      <Box sx={{ ...controlsBox(5), mt: `${qs.gap}px`, borderTop: qs.tile.border }}>
        {multi("provider", "Primary Care Manager", pcmOptions)}
        {multi("ageGroup", "Age Range", optionsOf(bandsFor(code, YEAR).map((b) => b.label)))}
        {multi("race", "Race", optionsOf(az(options.race)))}
        {multi("ethnicity", "Ethnicity", optionsOf(az(options.ethnicity)))}
        <Ctl>
          <SelectField label="Gender" value={f.sex} onChange={(v) => set("sex", v)} options={withAll(az(options.sex))} />
        </Ctl>
      </Box>

      <QsSheet>
        {card("population", "Member Population", "All active members in the population on the most recent Run Date.", "members", "count")}
        {card("population", "Initial Population", initialPopTip(code, true), "initial", "count")}
        {card("population", "Eligible Population", eligiblePopTip(code, true), "eligible", "count")}
        {card("excluded", "Excluded Population", excludedPopTip(code, true), "excluded", "count", false)}
        {card("met", `${short} Met Count`, `All Eligible Population members who do not have the ${short} gap on the most recent Run Date.`, "met", "count")}
        {card("met", `${short} Met Rate`, `Numerator: ${short} Met Count / Denominator: Eligible Population`, "metRate", "rate")}
        {card("notMet", `${short} Not Met Count`, `All Eligible Population members who have the ${short} gap on the most recent Run Date.`, "notMet", "count", false)}
        {card("notMet", `${short} Not Met Rate`, `Numerator: ${short} Not Met Count / Denominator: Eligible Population`, "notMetRate", "rate", false)}

        <QsTile
          cols={36}
          title={`${tfLabel} Trend - ${short} Met Count and Rate`}
          action={
            <Ctl info={TIMEFRAME_TIPS[tf]}>
              <SelectField
                label="Trend Timeframe"
                value={tf}
                onChange={(v) => setTf(v as Timeframe)}
                options={timeframeOptions.map((o) => ({ value: o.value, label: o.label, tip: TIMEFRAME_TIPS[o.value] }))}
              />
            </Ctl>
          }
        >
          {tf === "annual" ? (
            <QsComboTrend
              label={`${short} Met Count and Met Rate by year`}
              countName={`${short} Met Count`}
              rateName={`${short} Met Rate`}
              xTitle="Year"
              rows={annual.map((r) => ({ label: r.label, count: r.met, rate: r.rate, sample: r.sample }))}
            />
          ) : (
            lines && (
              <QsYearBars
                label={`${short} Met Count by ${tf === "quarterly" ? "quarter" : "month"}, one bar for each year, with the ${short} Met Rate of ${lines.series[0].name}`}
                labels={lines.labels}
                series={lines.series.map((s) => ({ name: s.name, counts: s.counts, rates: s.values, sample: s.sample }))}
                xTitle={tf === "quarterly" ? "Quarter" : "Month"}
                countName={`${short} Met Count`}
                rateName={`${short} Met Rate`}
              />
            )
          )}
        </QsTile>

        <QsTile cols={36} bare plain>
          <Box sx={{ maxWidth: 200 }}>{topNSelect}</Box>
        </QsTile>
        <QsTile cols={18} title={`Top ${topN} Open Gaps by Primary Care Manager`}>
          <QsGapBars
            label={`Top ${topN} open gaps by primary care manager`}
            first="open"
            totals
            rows={topOpen.map((r) => ({ label: mgrLabel(r.name), open: r.open, closed: r.closed }))}
            empty="No manager has an eligible member for these controls"
          />
        </QsTile>
        <QsTile cols={18} title={`Top ${topN} Closed Gaps by Primary Care Manager`}>
          <QsGapBars
            label={`Top ${topN} closed gaps by primary care manager`}
            first="closed"
            legendByFirst
            totals
            rows={topClosed.map((r) => ({ label: mgrLabel(r.name), open: r.open, closed: r.closed }))}
            empty="No manager has an eligible member for these controls"
          />
        </QsTile>

        {(
          [
            ["ageGroup", "Age Range"],
            ["race", "Race"],
            ["ethnicity", "Ethnicity"],
          ] as [Dimension, string][]
        ).map(([dim, name]) => (
          <QsTile key={dim} cols={9} title={`${short} Gaps by ${name}`}>
            <QsGapColumns label={`${short} gaps by ${name.toLowerCase()}`} rows={gapRows(dim)} />
          </QsTile>
        ))}
        <QsTile cols={9} title={`${short} Gaps by Gender`}>
          <QsDonut
            qs8
            label={`${short} gaps by gender`}
            slices={sexRows.map((r) => ({ label: r.group, value: r.t.denominator, detail: `Closed ${r.t.met}, Open ${r.t.gap}` }))}
          />
        </QsTile>
      </QsSheet>
    </>
  );
}

/* ------------------------------------------------------------------ Member Details */

function MemberDetails({ code }: { code: MeasureCode }) {
  const { memberLists } = useRole();
  const [md, setMd] = useState<MemberDetailsFilter>({ pop: "all", tricare: "", name: "" });
  const [selectedId, setSelectedId] = useState("");
  const [q, setQ] = useState("");
  const everyone = useMemo(() => filterMembers(emptyFilters(), code), []);
  const shown = useMemo(() => {
    let rows = everyone;
    const states = POPULATIONS.find((p) => p.value === md.pop)?.states;
    if (states) rows = rows.filter((m) => states.includes(resultsFor(m, YEAR)[code].state));
    // The search box: part of the member name (first, last or both, any order) or part of the Tricare ID.
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length)
      rows = rows.filter((m) => {
        const hay = `${m.first} ${m.last} ${tricareIdOf(m)}`.toLowerCase();
        return words.every((w) => hay.includes(w));
      });
    return rows;
  }, [everyone, md, q]);
  const selected = shown.find((m) => m.id === selectedId) ?? null;
  const popTips: Record<string, string> = {
    all: MEMBER_POP_TIP,
    initial: initialPopTip(code, true),
    eligible: eligiblePopTip(code, true),
    excluded: excludedPopTip(code, true),
    met: V3_MET[code],
    gap: NOT_MET_TIP,
  };

  const link = (m: Member, text: string) => (
    <Link to={`/members/${m.id}`} style={{ color: qs.color.accent, fontWeight: 700 }}>
      {text}
    </Link>
  );
  const cols: QsCol<Member>[] = [
    { key: "tricare", header: "Tricare ID", value: (m) => tricareIdOf(m), nowrap: true },
    { key: "first", header: "First Name", value: (m) => m.first, render: (m) => link(m, m.first), nowrap: true },
    { key: "last", header: "Last Name", value: (m) => m.last, render: (m) => link(m, m.last), nowrap: true },
    { key: "dob", header: "Date of Birth", value: (m) => m.dob.getTime(), render: (m) => fmtDate(m.dob), nowrap: true },
    { key: "age", header: "Age (years)", value: (m) => ageAtYearEnd(m.dob, YEAR), align: "right" },
    { key: "sex", header: "Gender", value: sexOf },
    { key: "race", header: "Race", value: raceOf, nowrap: true },
    { key: "eth", header: "Ethnicity", value: ethnicityOf, nowrap: true },
    {
      key: "pcm",
      header: "Primary Care Manager",
      value: providerOf,
      render: (m) => {
        const p = pcmByName(providerOf(m));
        return p ? `Dr. ${pcmLabel(p)}` : providerOf(m);
      },
      nowrap: true,
    },
  ];

  if (!memberLists)
    return (
      <QsSheet>
        <QsTile cols={36} bare tone="info">
          <QsText>
            <p>
              <b>The list of members is not part of your role.</b> You see totals and rates only. Ask your administrator if you need the list.
            </p>
          </QsText>
        </QsTile>
      </QsSheet>
    );
  return (
    <>
      <Box sx={{ ...controlsBox(2), gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) minmax(0, 2fr)" } }}>
        <Ctl info="Which members the table lists. All Members Evaluated is everyone in the files.">
          <SelectField
            label="Population"
            value={md.pop}
            onChange={(v) => setMd({ ...md, pop: v as MemberDetailsFilter["pop"] })}
            options={[...POPULATIONS].sort((a, b) => a.label.localeCompare(b.label)).map((p) => ({ value: p.value, label: p.label, tip: popTips[p.value] }))}
          />
        </Ctl>
        <Ctl info="Type part of a member name (first, last or both) or part of a Tricare ID. The table narrows as you type.">
          <Box sx={whiteAll}>
            <TextField
              label="Search"
              type="search"
              placeholder="Search by member name or Tricare ID"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              slotProps={{
                htmlInput: { "aria-label": "Search by member name or Tricare ID" },
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>
        </Ctl>
      </Box>
      <QsSheet>
        <QsTile cols={36} title="Member Detail Table">
          <QsTable
            label="Member Detail Table"
            exportFile="member-detail-table"
            cols={cols}
            rows={shown}
            rowKey={(m) => m.id}
            maxHeight={560}
            onRowSelect={(m) => setSelectedId(m.id)}
            selectedKey={selected?.id ?? ""}
          />
        </QsTile>
        <MemberInsightPanels member={selected} code={code} year={YEAR} lucid />
      </QsSheet>
    </>
  );
}

/* ------------------------------------------------------------------ Admin: Measurement Run History */

interface RunRow {
  id: string;
  start: string;
  end: string;
  runAt: Date;
  evaluated: number;
  initial: number;
  excluded: number;
  num: number;
  den: number;
  rate: number;
  closedChange: number | null;
}

function Admin({ code }: { code: MeasureCode }) {
  const short = gapShort(code);
  const { choices } = useRun();
  const rows = useMemo<RunRow[]>(() => {
    const keep = getAsOfStep();
    const everyone = allMembers();
    const out = choices.slice(0, 11).map((r) => {
      setAsOfStep(r.step);
      return { r, t: tally(everyone, code, YEAR) };
    });
    setAsOfStep(keep);
    return out.slice(0, 10).map(({ r, t }, i) => {
      const prev = out[i + 1];
      return {
        id: r.id,
        start: fmtDate(new Date(YEAR, 0, 1)),
        end: fmtDate(new Date(YEAR, 11, 31)),
        runAt: r.at,
        evaluated: everyone.length,
        initial: t.eligible,
        excluded: t.excluded,
        num: t.met,
        den: t.denominator,
        rate: t.rate,
        closedChange: prev ? t.met - prev.t.met : null,
      };
    });
  }, [choices]);
  return (
    <QsSheet>
      <QsTile cols={36} title="Measurement Run History">
        <QsTable
          label="Measurement run history"
          exportFile="measurement-run-history"
          rowKey={(r) => r.id}
          maxHeight={100000}
          defaultSort={{ key: "at", dir: "desc" }}
          wrapHeaders
          rows={rows}
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
            { key: "rate", header: `${short} Rate (%)`, value: (r) => r.rate, render: (r) => r.rate.toFixed(1), align: "right" },
            {
              key: "cchg",
              header: "Closed Δ",
              value: (r) => r.closedChange ?? -1e9,
              render: (r) => (r.closedChange === null ? "" : `${r.closedChange > 0 ? "+" : ""}${r.closedChange}`),
              align: "right",
            },
          ]}
        />
      </QsTile>
    </QsSheet>
  );
}

/* ------------------------------------------------------------------ page */

export function MeasureLucidPage({ code }: { code: MeasureCode }) {
  const short = gapShort(code);
  useDocumentTitle(`${short}, Analytics`);
  const { role } = useRole();
  const [sheet, setSheet] = useState("Overview");
  const [f, setF] = useState<DashFilters>(emptyFilters());
  const tabs = TABS.filter((t) => t !== "Admin" || role.dataQuality);
  return (
    <PageContainer
      title={lucidTitle(code)}
      titleVariant="overview"
      breadcrumbs={[{ label: "Analytics" }, { label: "Overview", href: "/dashboards" }, { label: short }]}
      renderLink={renderCrumbLink}
    >
      <NotesContext.Provider value={{ fr: false, ask: false }}>
        <QsFrame tabs={tabs} active={sheet} onTab={setSheet} onReset={() => setF(emptyFilters())} toolbar={false}>
          {sheet === "Overview" ? <Overview code={code} f={f} setF={setF} /> : sheet === "Member Details" ? <MemberDetails code={code} /> : <Admin code={code} />}
          <Typography sx={{ fontSize: qs.type.small.size, color: qs.color.mutedText, textAlign: "right", px: 2, pb: 1 }}>Powered by Amazon Quick</Typography>
        </QsFrame>
      </NotesContext.Provider>
    </PageContainer>
  );
}

export default MeasureLucidPage;
