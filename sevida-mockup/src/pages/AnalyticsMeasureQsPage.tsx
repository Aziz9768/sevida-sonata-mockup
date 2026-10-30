import { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Box, Skeleton, Typography } from "@mui/material";
import { AutocompleteField, Button, PageContainer, SelectField } from "sevida-ui";
import {
  NotesContext,
  QsBarChart,
  QsColumnChart,
  QsControl,
  QsControlsBar,
  QsFrame,
  QsKpi,
  QsSheet,
  QsTable,
  QsText,
  QsTile,
} from "../quicksight/kit";
import type { QsBar, QsCol } from "../quicksight/kit";
import { qs } from "../quicksight/qsTheme";
import { renderCrumbLink } from "../components/RouterLinkAdapter";
import {
  ChangeText,
  QS_TIPS,
  StatusText,
  directionText,
} from "../components/analytics/qsV6";
import { useDocumentTitle, useFakeLoad } from "../components/analytics/AnalyticsBits";
import { NotFound, readFilters, writeFilters } from "./AnalyticsMeasurePage";
import { YEARS, fmtDate, resultsFor, stateLabel } from "../data";
import type { Member } from "../data";
import { ageLabel, genderV3, tricareIdOf } from "../v3Data";
import { useRole } from "../roles";
import {
  AGE_OPTIONS,
  GAP_OPTIONS,
  GENDER_OPTIONS,
  SMALL_N,
  appliedText,
  breakdown,
  dashByCode,
  dashesIn,
  emptyAFilters,
  gapToBenchmark,
  groupById,
  lastUpdated,
  membersFor,
  statsFor,
  statusOf,
  trendFor,
} from "../analyticsRegistry";
import type { AFilters, DashDef, GroupRow } from "../analyticsRegistry";

const r1 = (n: number) => Math.round(n * 10) / 10;
const HELP = "Help";
/** The QuickSight table shows this many rows at full height. The rest are in Export to CSV. */
const MEMBER_ROWS = 25;

export function AnalyticsMeasureQsPage() {
  const { code = "" } = useParams();
  const def = dashByCode(code);
  if (!def) return <NotFound code={code} />;
  // key: opening another dashboard starts on its own first sheet
  return <MeasureQs key={def.code} def={def} />;
}

const groupBars = (rows: GroupRow[]): QsBar[] =>
  rows.map((r) => ({
    label: r.group,
    value: r.rate,
    detail: `n=${r.n.toLocaleString("en-US")}${r.small ? ", small group" : ""}`,
    // Fixed meaning colours: grey = a small group, read with care.
    color: r.small ? qs.meaning.neutral : qs.meaning.main,
  }));

function MeasureQs({ def }: { def: DashDef }) {
  const group = groupById(def.group)!;
  useDocumentTitle(`${def.name}, Analytics`);
  const nav = useNavigate();
  const { search } = useLocation();
  const [params, setParams] = useSearchParams();
  const { role, canSee, memberLists } = useRole();
  const [sheet, setSheet] = useState(def.short);
  const [ask, setAsk] = useState(true);
  const [copied, setCopied] = useState(false);
  const f = useMemo(() => readFilters(params), [params]);
  const setF = (next: AFilters) => setParams(writeFilters(next), { replace: true });
  const loading = useFakeLoad(`${def.code}|${f.year}`, 700);

  const stats = useMemo(() => statsFor(def, f), [def, f]);
  const prev = useMemo(() => statsFor(def, { ...f, year: f.year - 1 }), [def, f]);
  const change = stats.rate - prev.rate;
  const better = Math.abs(change) < 0.5 ? null : def.higherIsBetter ? change > 0 : change < 0;
  const status = statusOf(def, stats.rate);
  const gap = gapToBenchmark(def, stats.rate);
  const trend = useMemo(() => trendFor(def, f), [def, f]);
  const byGender = useMemo(() => breakdown(def, f, "sex"), [def, f]);
  const byAge = useMemo(() => breakdown(def, f, "ageGroup"), [def, f]);
  const members = useMemo(
    () =>
      membersFor(def, f).filter(
        (m) => canSee(m) && ["Met", "Gap"].includes(resultsFor(m, f.year)[def.real!].state),
      ),
    [def, f, canSee],
  );
  const siblings = dashesIn(def.group);
  const tabs = [...siblings.map((d) => d.short), HELP];
  const applied = appliedText(f);

  const months = trend.labels.slice(-12);
  const monthBars: QsBar[] = months.map((l, i) => ({
    label: l,
    value: trend.values.slice(-12)[i] ?? 0,
  }));

  const memberCols: QsCol<Member>[] = [
    { key: "name", header: "Member Name", value: (m) => m.name },
    { key: "tricare", header: "Tricare ID", value: (m) => tricareIdOf(m), nowrap: true },
    {
      key: "dob",
      header: "Date of Birth",
      value: (m) => m.dob.getTime(),
      render: (m) => fmtDate(m.dob),
      nowrap: true,
    },
    { key: "age", header: "Age", value: (m) => m.dob.getTime() * -1, render: (m) => ageLabel(m.dob), nowrap: true },
    { key: "gender", header: "Gender", value: (m) => genderV3(m) },
    {
      key: "result",
      header: "Result",
      value: (m) => stateLabel[resultsFor(m, f.year)[def.real!].state],
      render: (m) => {
        const s = resultsFor(m, f.year)[def.real!].state;
        return s === "Met" ? "✔ Met" : "! Not met";
      },
      nowrap: true,
    },
  ];

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* the address bar still has the link */
    }
  };
  const onTab = (t: string) => {
    if (t === HELP) setSheet(HELP);
    else if (t !== def.short) nav(`/analytics/${t.toLowerCase()}${search}`);
    else setSheet(t);
  };

  return (
    <PageContainer
      title={def.name}
      titleVariant="overview"
      subtitle={`The share of ${def.ages} ${def.plain}. ${def.higherIsBetter ? "Higher" : "Lower"} is better.`}
      breadcrumbs={[
        { label: "Analytics", href: "/analytics" },
        { label: group.name, href: `/analytics/${siblings[0].code}` },
        { label: def.short },
      ]}
      renderLink={renderCrumbLink}
      breadcrumbsEnd={
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Last updated {fmtDate(lastUpdated(def))}
        </Typography>
      }
      actions={
        <>
          <Button variant="tertiary" aria-pressed={ask} onClick={() => setAsk(!ask)}>
            {ask ? "Hide questions for developers" : "Show questions for developers"}
          </Button>
          <Button variant="secondary" onClick={() => void copyLink()}>
            {copied ? "Link copied" : "Copy link"}
          </Button>
        </>
      }
    >
      {loading ? (
        <Box aria-busy="true" aria-label="Loading the dashboard">
          <Typography sx={{ fontSize: 13, color: qs.color.mutedText, mb: 1 }}>
            Loading the dashboard. This can take a few seconds…
          </Typography>
          <Skeleton variant="rounded" height={520} />
        </Box>
      ) : (
        <NotesContext.Provider value={{ fr: false, ask }}>
          <QsFrame tabs={tabs} active={sheet} onTab={onTab} onReset={() => setF(emptyAFilters())}>
            {sheet === HELP ? (
              <QsSheet>
                <QsTile cols={36} title={`How to read the ${group.name} dashboards`}>
                  <QsText>
                    <ul>
                      <li>
                        <b>{def.short}.</b> The share of {def.ages} {def.plain}.{" "}
                        {def.higherIsBetter ? "A higher number is better." : "A lower number is better."}
                      </li>
                      <li>
                        <b>Filters.</b> One row at the top, the same names as the Members and Care Gaps pages, A to Z. They stay when you
                        open another dashboard in the group. The line under them says which ones are on. Reset in the toolbar puts them
                        back. Copy link keeps them.
                      </li>
                      {(["eligible", "met", "notMet", "excluded", "benchmark", "small", "period", "gap"] as const).map((k) => (
                        <li key={k}>
                          <b>{QS_TIPS[k].term}.</b> {QS_TIPS[k].plain} {QS_TIPS[k].hedis}
                        </li>
                      ))}
                      <li>
                        <b>Status.</b> A symbol and a word: ✔ Meets, ! Near, ✖ Misses. The colour only helps.
                      </li>
                      <li>
                        <b>Export.</b> Export in the toolbar saves the whole dashboard as a PDF. A table saves to CSV from its own menu.
                      </li>
                    </ul>
                  </QsText>
                </QsTile>
              </QsSheet>
            ) : (
              <>
                <QsControlsBar ask={["Q32", "Q33"]}>
                  <QsControl>
                    <AutocompleteField
                      multiple
                      label="Age Range"
                      placeholder="All"
                      options={AGE_OPTIONS.map((a) => ({ value: a, label: a }))}
                      value={f.age}
                      onChange={(v) => setF({ ...f, age: v })}
                    />
                  </QsControl>
                  <QsControl info={QS_TIPS.gap.plain}>
                    <SelectField
                      label="Gap Status"
                      value={f.gap}
                      onChange={(v) => setF({ ...f, gap: v as AFilters["gap"] })}
                      options={[{ value: "", label: "All" }, ...GAP_OPTIONS.map((g) => ({ value: g, label: g }))]}
                    />
                  </QsControl>
                  <QsControl>
                    <SelectField
                      label="Gender"
                      value={f.gender}
                      onChange={(v) => setF({ ...f, gender: v })}
                      options={[{ value: "", label: "All" }, ...GENDER_OPTIONS.map((g) => ({ value: g, label: g }))]}
                    />
                  </QsControl>
                  <QsControl info={QS_TIPS.period.plain}>
                    <SelectField
                      label="Measurement Year"
                      value={String(f.year)}
                      onChange={(v) => setF({ ...f, year: Number(v) })}
                      options={YEARS.map((y) => ({ value: String(y), label: String(y) }))}
                    />
                  </QsControl>
                </QsControlsBar>
                <QsSheet>
                  {!def.real && (
                    <QsTile cols={36} bare tone="info">
                      <QsText>
                        <p>
                          <b>Demo dashboard.</b> The numbers are made up, to show how a dashboard looks next to the real ones. The member
                          list is not built.
                        </p>
                      </QsText>
                    </QsTile>
                  )}
                  <QsTile cols={36} bare>
                    <QsText>
                      <p>
                        <b>Applied filters:</b> {applied.join(" · ")}. Reset in the toolbar clears them.{" "}
                        <b><StatusText status={status} /></b>: {r1(Math.abs(gap))} pts{" "}
                        {gap <= 0 ? "better than" : "from"} the {def.benchmark}% benchmark. {directionText(def)}. Change since {f.year - 1}:{" "}
                        <ChangeText change={change} better={better} />.
                      </p>
                    </QsText>
                  </QsTile>
                  <QsKpi
                    cols={8}
                    highlight
                    label={def.resultLabel}
                    value={stats.n ? `${r1(stats.rate)}%` : "–"}
                    tip={directionText(def)}
                    sub={`Benchmark ${def.benchmark}%`}
                    ask={["Q31"]}
                  />
                  <QsKpi cols={7} label="Eligible Members (n)" value={stats.n.toLocaleString("en-US")} tip={QS_TIPS.eligible.plain} />
                  <QsKpi cols={7} label="Met" value={stats.met.toLocaleString("en-US")} tip={QS_TIPS.met.plain} />
                  <QsKpi
                    cols={7}
                    label="Not Met"
                    value={stats.notMet.toLocaleString("en-US")}
                    tip={QS_TIPS.notMet.plain}
                    color={qs.meaning.gapText}
                  />
                  <QsKpi cols={7} label="Excluded" value={stats.excluded.toLocaleString("en-US")} tip={QS_TIPS.excluded.plain} />
                  {stats.n < SMALL_N && (
                    <QsTile cols={36} bare tone="warning">
                      <QsText>
                        <p>
                          <b>! Small group.</b> Only {stats.n} members are counted for these filters. {QS_TIPS.small.plain}
                        </p>
                      </QsText>
                    </QsTile>
                  )}
                  <QsTile
                    cols={36}
                    title="Trend by Month"
                    subtitle={`${def.resultLabel}, last 12 months. The dashed line is the ${def.benchmark}% benchmark. ${directionText(def)}`}
                  >
                    <QsColumnChart
                      label={`${def.resultLabel} by month for ${def.short}`}
                      bars={monthBars}
                      reference={{ value: def.benchmark, label: "" }}
                    />
                  </QsTile>
                  <QsTile
                    cols={18}
                    title="By Gender"
                    subtitle={`Members (n) next to every percentage. Grey bar: fewer than ${SMALL_N} members`}
                  >
                    <QsBarChart
                      label={`${def.resultLabel} by gender`}
                      bars={groupBars(byGender)}
                      benchmark={def.benchmark}
                      labelWidth={120}
                      valueWidth={170}
                      empty="No members for these filters"
                    />
                  </QsTile>
                  <QsTile
                    cols={18}
                    title="By Age Range"
                    subtitle={`Members (n) next to every percentage. Grey bar: fewer than ${SMALL_N} members`}
                  >
                    <QsBarChart
                      label={`${def.resultLabel} by age range`}
                      bars={groupBars(byAge)}
                      benchmark={def.benchmark}
                      labelWidth={210}
                      valueWidth={170}
                      empty="No members for these filters"
                    />
                  </QsTile>
                  <QsTile
                    cols={36}
                    title={def.real && memberLists ? `Members (${members.length})` : "Members"}
                    subtitle={
                      def.real && memberLists
                        ? members.length > MEMBER_ROWS
                          ? `The first ${MEMBER_ROWS} are shown. Use Export to CSV in the table menu for all ${members.length}. Click a heading to sort, click a row to open the member`
                          : "Click a heading to sort. Click a row to open the member"
                        : undefined
                    }
                    ask={["Q13", "Q34"]}
                  >
                    {!def.real ? (
                      <QsText>
                        <p>No member list for a demo dashboard. The real dashboards (BCS, CCS, COL, GSD and WCV) list their members here.</p>
                      </QsText>
                    ) : !memberLists ? (
                      <QsText>
                        <p>The {role.label} role sees totals and rates only. Member names and dates of birth are not shown.</p>
                      </QsText>
                    ) : (
                      <QsTable
                        label={`Members counted in ${def.short}`}
                        cols={memberCols}
                        rows={members.slice(0, MEMBER_ROWS)}
                        rowKey={(m) => m.id}
                        maxHeight={100000}
                        defaultSort={{ key: "name", dir: "asc" }}
                        exportFile={`${def.code}-members-${f.year}`}
                        onRowSelect={(m) => nav(`/members/${m.id}`)}
                      />
                    )}
                  </QsTile>
                </QsSheet>
              </>
            )}
          </QsFrame>
        </NotesContext.Provider>
      )}
    </PageContainer>
  );
}

export default AnalyticsMeasureQsPage;
