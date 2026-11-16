import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Box, InputAdornment, Typography } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { Button, SelectField, TextField } from "sevida-ui";
import { QsSheet, QsTable, QsText, QsTile } from "../quicksight/kit";
import type { QsCol } from "../quicksight/kit";
import { QsMeasureBars, closedColor, openColor } from "../quicksight/kitV12";
import { qs } from "../quicksight/qsTheme";
import { ALL, optionsOf } from "../sharedFilters";
import { CURRENT_YEAR, fmtDate, resultsFor, ageAtYearEnd } from "../data";
import { clinicOf, countyOfMember, stateNameOf } from "../v16Data";
import type { Member, MeasureCode } from "../data";
import { emptyFilters, ethnicityOf, filterMembers, providerOf, raceOf, runInfo, sexOf, timeframeRows } from "../dashboardData";
import type { DashFilters } from "../dashboardData";
import { AGE_RANGES, ageParts, ageRangeOf, gapShort, militaryOptions, militaryV3, tricareIdOf } from "../v3Data";
import { ordDate } from "./QuickSightDashboardPage";
import { useGaps } from "../careGaps";
import { useRun } from "../runs";
import { getVersion } from "../version";
import { useRole } from "../roles";
import { FailedRunNotice, Fact, KpiTile, PcmFilter, RunPickerFact, boxSx, changeOf, controlsBox, facts, n0, pcmText, pct2, runStamp, share, useNextUpdate, whiteAll } from "./dashboardV12Bits";
import type { Group } from "./dashboardV12Bits";

/**
 * Version 12 Overview (Balsamiq board, Overview tab): header boxes, three filters, four tiles, two charts by measure and the Members table.
 * The Overview is no longer a list of the measures: the measure tabs are in the tab bar above.
 */
const YEAR = CURRENT_YEAR;

export type OverviewPop = "all" | "closed" | "open";
export interface OverviewState {
  provider: string[];
  military: string;
  pop: OverviewPop;
  q: string;
}
export const emptyOverview = (): OverviewState => ({ provider: [], military: "", pop: "all", q: "" });

const POP_OPTIONS: { value: OverviewPop; label: string }[] = [
  { value: "all", label: "Member Population" },
  { value: "closed", label: "All Gaps Closed" },
  { value: "open", label: "At Least One Open Gap" },
];

/** The order of the tabs and the charts. */
const codes: MeasureCode[] = ["BCS-E", "CCS-E", "COL-E", "GSD", "WCV"];
/** The result of one member for each of the five measures, this year. */
const statesOf = (m: Member) => codes.map((c) => resultsFor(m, YEAR)[c].state);

export function OverviewV12({ s, setS, onOpenMeasure }: { s: OverviewState; setS: (s: OverviewState) => void; onOpenMeasure?: (tab: string) => void }) {
  const { run: selectedRun } = useRun();
  const run = runInfo();
  const { memberLists } = useRole();
  const { gapsOf, openOf } = useGaps();
  // Version 13 (Sam's feedback): chart named Measure Rate, descriptions under the chart titles, a click on a bar opens the measure tab.
  const v13 = getVersion() >= 13;
  // Version 15 (Sam, second round): new tile descriptions, and "Total Gaps Closed" is renamed "Total Closed Gaps".
  const v15 = getVersion() >= 15;
  // Version 16 (review of the Overview against the board): the table follows the measure run, Age is the age today, Age Group sorts by age, one header label.
  const v16 = getVersion() >= 16;
  const nextUpdate = useNextUpdate(run.next);
  const set = <K extends keyof OverviewState>(key: K, value: OverviewState[K]) => setS({ ...s, [key]: value });

  /* ---- who is counted: the Primary Care Manager and Military Status filters, then the Population filter ---- */
  const base = useMemo(() => {
    const f: DashFilters = { ...emptyFilters(), provider: s.provider, military: s.military };
    return filterMembers(f);
  }, [s.provider, s.military]);
  const list = useMemo(() => {
    if (s.pop === "all") return base;
    return base.filter((m) => {
      const st = statesOf(m);
      const open = st.includes("Gap");
      return s.pop === "open" ? open : !open && st.includes("Met");
    });
  }, [base, s.pop]);

  /* ---- the four tiles: this run against the last run of the prior completed calendar month ---- */
  const priorRows = useMemo(() => codes.map((c) => timeframeRows(c, list, "monthly").slice(-1)[0]), [list]);
  const cur = useMemo(() => {
    let open = 0;
    let closed = 0;
    let withOpen = 0;
    for (const m of list) {
      const st = statesOf(m);
      const g = st.filter((x) => x === "Gap").length;
      open += g;
      closed += st.filter((x) => x === "Met").length;
      if (g) withOpen++;
    }
    return { members: list.length, withOpen, open, closed };
  }, [list]);
  const before = {
    members: priorRows[0]?.evaluated ?? 0,
    open: priorRows.reduce((a, r) => a + (r?.gap ?? 0), 0),
    closed: priorRows.reduce((a, r) => a + (r?.met ?? 0), 0),
    // The files give a count of gaps for the prior month, not of members. The members with an open gap then are scaled by the same share.
    withOpen: 0,
  };
  before.withOpen = cur.open ? Math.round((cur.withOpen * before.open) / cur.open) : 0;

  const tile = (group: Group, title: string, about: string, key: keyof typeof cur, upIsGood: boolean, footTitle = title) => {
    const ch = changeOf(cur[key], before[key], "count", upIsGood);
    return (
      <KpiTile
        key={title}
        cols={9}
        group={group}
        title={title}
        about={about}
        aboutMin={96}
        value={n0(cur[key])}
        prior={n0(before[key])}
        change={ch.text}
        dir={ch.dir}
        tone={ch.tone}
        footer={`${footTitle} on the last Run Date of the prior completed calendar month.`}
      />
    );
  };

  /* ---- the two charts: one column for each measure ---- */
  const perMeasure = useMemo(
    () =>
      codes.map((c) => {
        let met = 0;
        let gap = 0;
        for (const m of list) {
          const st = resultsFor(m, YEAR)[c].state;
          if (st === "Met") met++;
          else if (st === "Gap") gap++;
        }
        return { code: c as MeasureCode, met, gap, den: met + gap };
      }),
    [list],
  );
  const openMax = Math.max(1, ...perMeasure.map((r) => r.gap));
  const openTop = Math.ceil(openMax / 200) * 200 || 200;
  const openTicks = Array.from({ length: 6 }, (_, i) => Math.round((openTop / 5) * i));

  /* ---- Members table ---- */
  const shown = useMemo(() => {
    const words = s.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return list;
    return list.filter((m) => {
      const hay = `${m.name} ${m.first} ${m.last} ${tricareIdOf(m)}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [list, s.q]);
  const link = (m: Member, text: string) => (
    <Link to={`/members/${m.id}`} style={{ color: qs.color.accent, fontWeight: 700 }}>
      {text}
    </Link>
  );
  // The three gap columns follow the Members list: an open gap is one that care staff have not closed yet, and a closed gap is a measure
  // that is met or a gap that staff closed. (The tiles above count what the measure run found, as their descriptions say.)
  // Version 16: the table counts the same way as the tiles above it (what the measure run found), so its columns add up to the tiles.
  const gapNames = (m: Member) => (v16 ? codes.filter((_, i) => statesOf(m)[i] === "Gap").map((c) => gapShort(c)) : openOf(m).map((g) => gapShort(g.def.code)));
  const closedCount = (m: Member) => (v16 ? statesOf(m).filter((x) => x === "Met").length : statesOf(m).filter((x) => x === "Met").length + gapsOf(m).filter((g) => g.status === "Closed").length);
  const cols: QsCol<Member>[] = [
    { key: "name", header: "Member Name", value: (m) => m.name, render: (m) => link(m, m.name), nowrap: true },
    { key: "tricare", header: "Tricare ID", value: (m) => tricareIdOf(m), render: (m) => link(m, tricareIdOf(m)), nowrap: true },
    { key: "dob", header: "Date of Birth", value: (m) => m.dob.getTime(), render: (m) => fmtDate(m.dob), nowrap: true },
    { key: "age", header: "Age", value: (m) => (v16 ? ageParts(m.dob).years : ageAtYearEnd(m.dob, YEAR)), align: "right" },
    { key: "sex", header: "Sex", value: sexOf },
    { key: "mil", header: "Military Status", value: (m) => militaryV3(m), nowrap: true },
    { key: "pcm", header: "Primary Care Manager", value: (m) => pcmText(providerOf(m)), nowrap: true },
    { key: "open", header: "# Open Gaps", value: (m) => gapNames(m).length, align: "right" },
    { key: "closed", header: "# Closed Gaps (Measure Year)", value: closedCount, align: "right" },
    { key: "gaps", header: "Gaps", value: (m) => gapNames(m).join(", "), render: (m) => gapNames(m).join(", ") || "–", nowrap: true },
    { key: "race", header: "Race", value: raceOf, nowrap: true },
    { key: "eth", header: "Ethnicity", value: ethnicityOf, nowrap: true },
    v16
      ? { key: "ageGroup", header: "Age Group", value: (m) => AGE_RANGES.findIndex((r) => r.label === ageRangeOf(m.dob)), render: (m) => ageRangeOf(m.dob), nowrap: true }
      : { key: "ageGroup", header: "Age Group", value: (m) => ageRangeOf(m.dob), nowrap: true },
    { key: "state", header: "State", value: stateNameOf, nowrap: true },
    { key: "county", header: "County", value: countyOfMember, nowrap: true },
    { key: "clinic", header: "Clinic", value: clinicOf, nowrap: true },
  ];

  const clear = () => setS(emptyOverview());
  const filtered = s.provider.length > 0 || s.military !== "" || s.pop !== "all";

  return (
    <>
      <Box sx={{ display: "grid", gap: `${qs.gap}px`, p: `${qs.gap}px`, pb: 0, gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) minmax(0, 1fr)" } }}>
        <Box sx={boxSx}>
          <QsText>
            <Box sx={facts}>
              <Fact label={v16 ? "HEDIS Measure Year" : "HEDIS MEASURE YEAR"} value={String(YEAR)} />
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

      <Box sx={{ ...controlsBox(4), mt: `${qs.gap}px`, borderTop: qs.tile.border, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", md: "2fr 1fr 1fr auto" } }}>
        <PcmFilter value={s.provider} onChange={(v) => set("provider", v)} />
        <Box sx={whiteAll}>
          <SelectField
            label="Military Status"
            value={s.military}
            onChange={(v) => set("military", v)}
            options={[{ value: "", label: ALL }, ...optionsOf(militaryOptions())]}
          />
        </Box>
        <Box sx={whiteAll}>
          <SelectField label="Population" value={s.pop} onChange={(v) => set("pop", v as OverviewPop)} options={POP_OPTIONS} />
        </Box>
        <Box sx={{ alignSelf: "end" }}>
          <Button variant="secondary" onClick={clear} disabled={!filtered}>
            Clear All Filters
          </Button>
        </Box>
      </Box>
      <Box sx={{ px: 2, pt: 1, fontSize: qs.type.small.size, color: qs.color.mutedText }}>Based on filter</Box>

      <QsSheet>
        {tile("population", "Member Population", v15 ? "All active members matching the selected filters as of the most recent Run Date." : "All members in the population selected as of the most recent Run Date.", "members", true)}
        {tile(
          "notMet",
          "Members With Open Gaps",
          v15
            ? "Members with at least one open gap across all measures as of the most recent Run Date. Each member is counted once, even with multiple open gaps."
            : "All Eligible Population members who have an open gap as of the most recent Run Date. Since a member can have multiple gaps, this counts unique members and not each gap.",
          "withOpen",
          false,
        )}
        {tile(
          "notMet",
          "Total Open Gaps",
          v15
            ? "All open gaps across all measures as of the most recent Run Date. A member with multiple open gaps is counted once per gap."
            : "All Open Gaps among Eligible Population members as of the most recent Run Date. Since a member can have multiple gaps, this counts gaps and not unique members.",
          "open",
          false,
        )}
        {tile(
          "met",
          v15 ? "Total Closed Gaps" : "Total Gaps Closed",
          v15
            ? "All closed gaps across all measures as of the most recent Run Date. A member with multiple closed gaps is counted once per gap."
            : "All Closed Gaps among Eligible Population members as of the most recent Run Date in the current measurement year. Since a member can have multiple gaps, this counts gaps and not unique members.",
          "closed",
          true,
          "Total Closed Gaps",
        )}

        <QsTile cols={18} title={v13 ? "Measure Rate" : "Closed Gap Rate"}>
          {v13 && (
            <Typography sx={{ fontSize: qs.type.small.size, color: qs.color.mutedText, mb: 1 }}>
              Percentage of each measure's Eligible Population whose gap is closed. Numerator: Closed Gaps Count. Denominator: Eligible Population. Click a bar to open the measure tab.
            </Typography>
          )}
          <QsMeasureBars
            label={v13 ? "Measure rate for each measure" : "Closed gap rate for each measure"}
            yTitle="%"
            max={100}
            ticks={[0, 20, 40, 60, 80, 100]}
            color={closedColor()}
            onSelect={v13 ? onOpenMeasure : undefined}
            rows={perMeasure.map((r) => ({
              label: gapShort(r.code),
              value: share(r.met, r.den),
              text: `${n0(r.met)} of ${n0(r.den)}, ${pct2(share(r.met, r.den))}`,
            }))}
          />
        </QsTile>
        <QsTile cols={18} title="Open Gaps By Measure">
          {v13 && (
            <Typography sx={{ fontSize: qs.type.small.size, color: qs.color.mutedText, mb: 1 }}>
              Number of open gaps for each measure. A member can have open gaps in more than one measure, so the bars add up to Total Open Gaps, not to Members With Open Gaps. Click a bar to open the measure tab.
            </Typography>
          )}
          <QsMeasureBars
            label="Open gaps for each measure"
            yTitle="Open Gap Count"
            max={openTop}
            ticks={openTicks}
            color={openColor()}
            onSelect={v13 ? onOpenMeasure : undefined}
            rows={perMeasure.map((r) => ({
              label: gapShort(r.code),
              value: r.gap,
              text: `${n0(r.gap)} of ${n0(r.den)}, ${pct2(share(r.gap, r.den))}`,
            }))}
          />
        </QsTile>

        {memberLists ? (
          <QsTile
            cols={36}
            title={`Members (${n0(list.length)})`}
          >
            <Box sx={{ maxWidth: 360, mb: 1.5, ...whiteAll }}>
              <Box>
                <TextField
                  label="Search"
                  type="search"
                  placeholder="Search By Member Name or Tricare ID"
                  value={s.q}
                  onChange={(e) => set("q", e.target.value)}
                  slotProps={{
                    htmlInput: { "aria-label": "Search By Member Name or Tricare ID" },
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
            </Box>
            <QsTable label="Members" exportFile="members" cols={cols} rows={shown} rowKey={(m) => m.id} maxHeight={560} />
          </QsTile>
        ) : (
          <QsTile cols={36} bare tone="info">
            <QsText>
              <p>
                <b>The list of members is not part of your role.</b> You see totals and rates only. Ask your administrator if you need the list.
              </p>
            </QsText>
          </QsTile>
        )}
      </QsSheet>
    </>
  );
}

