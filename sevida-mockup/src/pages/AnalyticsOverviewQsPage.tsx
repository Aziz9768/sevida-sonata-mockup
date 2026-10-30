import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Skeleton, Typography } from "@mui/material";
import { Button, PageContainer, SelectField } from "sevida-ui";
import {
  NotesContext,
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
import {
  ChangeText,
  QS_TIPS,
  StatusText,
  directionText,
  statusText,
} from "../components/analytics/qsV6";
import { useDocumentTitle, useFakeLoad } from "../components/analytics/AnalyticsBits";
import { MY, YEARS, fmtDate } from "../data";
import {
  DASHBOARDS,
  GROUPS,
  STATUS_ORDER,
  STATUS_WORDS,
  scorecard,
} from "../analyticsRegistry";
import type { ScoreRow } from "../analyticsRegistry";

const r1 = (n: number) => Math.round(n * 10) / 10;
const SHEETS = ["Scorecard", "Help"];
const ALL = "All";

/**
 * Version 6 Analytics Overview, drawn only with the QuickSight style guide: toolbar, sheet tabs, one controls bar, text box,
 * KPI tiles, one column chart and one table. The scorecard is the table: one row per dashboard, click a header to sort,
 * click a row or a bar to open that dashboard (the one click action the guide allows).
 */
export function AnalyticsOverviewQsPage() {
  useDocumentTitle("Overview, Analytics");
  const nav = useNavigate();
  const [sheet, setSheet] = useState(SHEETS[0]);
  const [year, setYear] = useState(MY);
  const [group, setGroup] = useState("");
  const [status, setStatus] = useState("");
  const [ask, setAsk] = useState(true);
  const loading = useFakeLoad(String(year), 600);

  const all = useMemo(() => scorecard(year), [year]);
  const rows = all.filter(
    (r) => (!group || r.def.group === group) && (!status || r.status === status),
  );
  const count = (s: ScoreRow["status"]) => rows.filter((r) => r.status === s).length;
  const weakest = rows.length ? rows.reduce((a, b) => (b.gap > a.gap ? b : a)) : null;
  const open = (code: string) => nav(`/analytics/${code.toLowerCase()}`);

  const applied = [
    `Measurement Year: ${year}`,
    group ? `Group: ${GROUPS.find((g) => g.id === group)?.name}` : "",
    status ? `Status: ${STATUS_WORDS[status as ScoreRow["status"]]}` : "",
  ].filter(Boolean);

  const bars: QsBar[] = [...rows]
    .sort((a, b) => b.gap - a.gap)
    .map((r) => ({
      label: r.def.short,
      value: Math.max(0, r.gap),
      detail: `${r1(r.rate)}% against a ${r.def.benchmark}% benchmark. ${statusText(r.status)}`,
      color: r.gap > 0 ? qs.meaning.gap : qs.meaning.met,
    }));

  const cols: QsCol<ScoreRow>[] = [
    {
      key: "name",
      header: "Dashboard",
      value: (r) => r.def.name,
      render: (r) => (
        <span>
          <b>{r.def.short}</b>
          {" - "}
          {r.def.name.split(" - ")[1]}
        </span>
      ),
    },
    { key: "group", header: "Group", value: (r) => r.group },
    {
      key: "rate",
      header: "Result",
      value: (r) => r.rate,
      render: (r) => (
        <span>
          <b>{r1(r.rate)}%</b> (n={r.n.toLocaleString("en-US")}
          {r.n < 30 ? ", small group" : ""})
        </span>
      ),
      align: "right",
      nowrap: true,
    },
    {
      key: "dir",
      header: "Better When",
      value: (r) => (r.def.higherIsBetter ? "Higher" : "Lower"),
      render: (r) => directionText(r.def),
      nowrap: true,
    },
    {
      key: "change",
      header: "Change Since Last Year",
      value: (r) => r.change,
      render: (r) => <ChangeText change={r.change} better={r.better} />,
      nowrap: true,
    },
    {
      key: "bm",
      header: "Benchmark",
      value: (r) => r.def.benchmark,
      render: (r) => `${r.def.benchmark}%`,
      align: "right",
    },
    {
      key: "status",
      header: "Status",
      value: (r) => STATUS_ORDER[r.status] * 1000 - r.gap,
      render: (r) => <StatusText status={r.status} />,
      nowrap: true,
    },
    {
      key: "upd",
      header: "Last Updated",
      value: (r) => r.updated.getTime(),
      render: (r) => fmtDate(r.updated),
      nowrap: true,
    },
  ];

  return (
    <PageContainer
      title="Analytics Overview"
      titleVariant="overview"
      subtitle="How we are doing on every quality measure. Click a bar or a row to open that dashboard."
      breadcrumbs={[{ label: "Analytics" }]}
      actions={
        <Button variant="tertiary" aria-pressed={ask} onClick={() => setAsk(!ask)}>
          {ask ? "Hide questions for developers" : "Show questions for developers"}
        </Button>
      }
    >
      {loading ? (
        <Box aria-busy="true" aria-label="Loading the dashboard">
          <Typography sx={{ fontSize: 13, color: qs.color.mutedText, mb: 1 }}>
            Loading the dashboard…
          </Typography>
          <Skeleton variant="rounded" height={460} />
        </Box>
      ) : (
        <NotesContext.Provider value={{ fr: false, ask }}>
          <QsFrame
            tabs={SHEETS}
            active={sheet}
            onTab={setSheet}
            onReset={() => {
              setYear(MY);
              setGroup("");
              setStatus("");
            }}
          >
            {sheet === "Help" ? (
              <QsSheet>
                <QsTile cols={36} title="How to read this dashboard">
                  <QsText>
                    <ul>
                      <li>
                        <b>Result.</b> The latest result for everyone counted. Members counted (n) is in brackets. A group under 30
                        members is marked small group.
                      </li>
                      <li>
                        <b>Better when.</b> Says whether a higher or a lower number is good for that measure.
                      </li>
                      <li>
                        <b>{QS_TIPS.benchmark.term}.</b> {QS_TIPS.benchmark.plain} {QS_TIPS.benchmark.hedis}
                      </li>
                      <li>
                        <b>Status.</b> A symbol and a word: ✔ Meets, ! Near, ✖ Misses. The colour only helps.
                      </li>
                      <li>
                        <b>{QS_TIPS.period.term}.</b> {QS_TIPS.period.plain} {QS_TIPS.period.hedis}
                      </li>
                      <li>
                        <b>Open a dashboard.</b> Click a bar or a row.
                      </li>
                      <li>
                        <b>Reset.</b> The Reset in the toolbar puts the controls back.
                      </li>
                    </ul>
                  </QsText>
                </QsTile>
              </QsSheet>
            ) : (
              <>
                <QsControlsBar ask={["Q32"]}>
                  <QsControl info="Dashboards are grouped by topic. The sidebar and the breadcrumb use the same groups.">
                    <SelectField
                      label="Group"
                      value={group}
                      onChange={setGroup}
                      options={[
                        { value: "", label: ALL },
                        ...GROUPS.map((g) => ({ value: g.id, label: g.name })),
                      ]}
                    />
                  </QsControl>
                  <QsControl info={QS_TIPS.period.plain}>
                    <SelectField
                      label="Measurement Year"
                      value={String(year)}
                      onChange={(v) => setYear(Number(v))}
                      options={YEARS.map((y) => ({ value: String(y), label: String(y) }))}
                    />
                  </QsControl>
                  <QsControl info={QS_TIPS.benchmark.plain}>
                    <SelectField
                      label="Status"
                      value={status}
                      onChange={setStatus}
                      options={[
                        { value: "", label: ALL },
                        ...(["meets", "near", "misses"] as const).map((s) => ({
                          value: s,
                          label: STATUS_WORDS[s],
                        })),
                      ]}
                    />
                  </QsControl>
                </QsControlsBar>
                <QsSheet>
                  <QsTile cols={36} bare>
                    <QsText>
                      <p>
                        <b>Applied filters:</b> {applied.join(" · ")}. {rows.length} of {DASHBOARDS.length} dashboards shown.
                        Last updated {fmtDate(all[0].updated)}. Reset in the toolbar clears the filters.
                      </p>
                    </QsText>
                  </QsTile>
                  <QsKpi
                    cols={9}
                    label="Furthest From Benchmark"
                    value={weakest ? weakest.def.short : "–"}
                    tip={weakest ? `${r1(weakest.gap)} pts away: ${r1(weakest.rate)}% against ${weakest.def.benchmark}%` : "No dashboards for these filters"}
                    highlight
                  />
                  <QsKpi
                    cols={9}
                    label="Meet Benchmark"
                    value={`${count("meets")} of ${rows.length}`}
                    tip="✔ At or better than the goal."
                    color={qs.meaning.met}
                    ask={["Q31"]}
                  />
                  <QsKpi
                    cols={9}
                    label="Near Benchmark"
                    value={`${count("near")} of ${rows.length}`}
                    tip="! Within 5 points of the goal."
                    color={qs.meaning.gapText}
                  />
                  <QsKpi
                    cols={9}
                    label="Miss Benchmark"
                    value={`${count("misses")} of ${rows.length}`}
                    tip="✖ More than 5 points from the goal."
                    color={qs.meaning.gapText}
                  />
                  <QsTile
                    cols={36}
                    title="Points From Benchmark"
                    subtitle="Worst first. A bar of 0 meets the benchmark. Click a bar to open that dashboard"
                  >
                    <QsColumnChart
                      label="Points from benchmark by dashboard"
                      bars={bars}
                      unit=" pts"
                      decimals={1}
                      max={Math.max(10, Math.ceil(Math.max(0, ...bars.map((b) => b.value)) / 10) * 10)}
                      onSelect={(b) => open(b.label)}
                    />
                  </QsTile>
                  <QsTile
                    cols={36}
                    title="Scorecard"
                    subtitle="One row per dashboard. Click a heading to sort. Click a row to open that dashboard"
                    ask={["Q34"]}
                  >
                    <QsTable
                      label="Scorecard, one row per dashboard"
                      cols={cols}
                      rows={rows}
                      rowKey={(r) => r.def.code}
                      maxHeight={100000}
                      defaultSort={{ key: "status", dir: "asc" }}
                      exportFile={`scorecard-${year}`}
                      onRowSelect={(r) => open(r.def.code)}
                    />
                  </QsTile>
                  {all.some((r) => !r.def.real) && (
                    <QsTile cols={36} bare tone="info">
                      <QsText>
                        <p>
                          {all.filter((r) => !r.def.real).length} of {all.length} dashboards are demo dashboards with made-up numbers.
                          They show how the page behaves with many dashboards.
                        </p>
                      </QsText>
                    </QsTile>
                  )}
                </QsSheet>
              </>
            )}
          </QsFrame>
        </NotesContext.Provider>
      )}
    </PageContainer>
  );
}

export default AnalyticsOverviewQsPage;
