import { useMemo, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { PageContainer, SelectField } from "sevida-ui";
import { RunNotice, RunSelect } from "../components/RunBits";
import { MY, allMembers, fmtDate, measures } from "../data";
import { V3_GAP_LABEL, gapShort } from "../v3Data";
import { kpisFor, openGapCount, periodText, runInfo } from "../dashboardData";
import { exampleInsight } from "../components/dashboard/ResultInsight";
import { useRun } from "../runs";
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
import { qs } from "../quicksight/qsTheme";
import { useVersion } from "../version";
import type { QsBar, QsCol } from "../quicksight/kit";

interface Row {
  code: string;
  label: string;
  rate: number;
  met: number;
  gap: number;
  eligible: number;
  excluded: number;
  review: number;
  notEligible: number;
  initial: number;
}

const NO_NOTES = { fr: false, ask: false };
const TABS = ["All measures"];

/**
 * Analytics option 2: every measure on one sheet, drawn to the QuickSight style guide (same frame, controls bar, tiles,
 * column chart and table as option 1). QuickSight has no clickable cards, so opening a measure is a click action from a
 * data point: click its bar or its row. That is the one kind of click action the guide allows.
 */
export function DashboardCardsPage() {
  const { version } = useVersion();
  const nav = useNavigate();
  const [year, setYear] = useState(MY);
  const v3 = version.id >= 3;
  /** Version 3: keep only members who have a gap in more than one measure (Overview only). */
  const [multi, setMulti] = useState("");
  const pop = useMemo(
    () =>
      !v3 || !multi
        ? allMembers()
        : allMembers().filter(
            (m) => (openGapCount(m, year) > 1) === (multi === "Yes"),
          ),
    [v3, multi, year],
  );
  const v7 = version.id >= 7;
  const v9 = version.id >= 9;
  const run = runInfo();
  const { run: selectedRun } = useRun();
  const dataAsOf = run.sources.reduce(
    (a, x) => (x.receivedOn > a ? x.receivedOn : a),
    run.sources[0]?.receivedOn ?? selectedRun.at,
  );
  const open = (code: string) => nav(`/quicksight?m=${code}&from=cards`);

  /** Version 3 lists the measures in the menu order: BCS, CCS, COL, GSD, WCV. */
  const ordered = v3
    ? [...measures].sort((a, b) => gapShort(a.code).localeCompare(gapShort(b.code)))
    : measures;
  const rows: Row[] = ordered.map((m) => {
    const { initial, t } = kpisFor(m.code, pop, year);
    return {
      code: m.code,
      label: v3 ? V3_GAP_LABEL[m.code] : `${m.code} · ${m.short}`,
      rate: t.rate,
      met: t.met,
      gap: t.gap,
      eligible: t.denominator,
      excluded: t.excluded,
      review: t.review,
      notEligible: t.notEligible,
      initial,
    };
  });
  const bars: QsBar[] = rows.map((r) => ({
    label: v3 ? gapShort(r.code) : r.code,
    value: r.rate,
    detail: `${r.met} met, ${r.gap} not met, ${r.eligible} eligible`,
  }));
  const gapBars: QsBar[] = rows.map((r) => ({
    label: v3 ? gapShort(r.code) : r.code,
    value: r.gap,
    detail: `${r.gap} of ${r.eligible} eligible members have not met it`,
    color: qs.meaning.gap,
  }));
  const withGaps = pop.filter((m) => openGapCount(m, year) > 0).length;
  const lowest = rows.reduce((a, b) => (b.rate < a.rate ? b : a));
  const cols: QsCol<Row>[] = [
    { key: "label", header: "Measure", value: (r) => r.label, nowrap: true },
    {
      key: "rate",
      header: "Met rate",
      value: (r) => r.rate,
      render: (r) => (r.eligible ? `${r.rate.toFixed(1)}%` : "–"),
      align: "right",
    },
    { key: "met", header: "Met", value: (r) => r.met, align: "right" },
    { key: "gap", header: "Not met", value: (r) => r.gap, align: "right" },
    {
      key: "eligible",
      header: "Eligible",
      value: (r) => r.eligible,
      align: "right",
    },
    {
      key: "excluded",
      header: "Excluded",
      value: (r) => r.excluded,
      align: "right",
    },
    {
      key: "review",
      header: "Needs review",
      value: (r) => r.review,
      align: "right",
    },
    {
      key: "notEligible",
      header: "Not eligible",
      value: (r) => r.notEligible,
      align: "right",
    },
    {
      key: "initial",
      header: "Initial population",
      value: (r) => r.initial,
      align: "right",
    },
    // Version 9: a visible way in. Clicking the row works too.
    ...(v9
      ? [
          {
            key: "open",
            header: "Dashboard",
            value: (r: Row) => r.code,
            render: (r: Row) => (
              <RouterLink
                to={`/quicksight?m=${r.code}&from=cards`}
                aria-label={`Open the ${gapShort(r.code)} dashboard`}
                style={{ color: qs.color.accent, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}
              >
                Open →
              </RouterLink>
            ),
            nowrap: true,
          },
        ]
      : []),
  ];

  // Version 9: the table is first, with an Open link on each row. QuickSight cannot click a card, but a table cell can be a link (URL action).
  const colsV9 = [cols[0], ...cols.filter((c) => c.key === "open"), ...cols.slice(1).filter((c) => c.key !== "open")];
  const tableTile = (
    <QsTile
      cols={36}
      title={v9 ? "Measure dashboards" : "All numbers by measure"}
      subtitle={v9 ? "Select Open on a row to go to that measure's dashboard. Eligible is the number of members the rate is out of." : `Click a row to open that measure. ${v3 ? "GSD" : "Diabetes blood sugar (GSD)"} shows its first rate here.`}
    >
      <QsTable
        label="All numbers by measure"
        cols={v9 ? colsV9 : cols}
        rows={rows}
        rowKey={(r) => r.code}
        maxHeight={v9 ? 100000 : 300}
        exportFile={`measures-${year}`}
        onRowSelect={(r) => open(r.code)}
      />
    </QsTile>
  );

  return (
    <PageContainer
      title={version.id >= 3 ? "Overview" : "Analytics option 2"}
      titleVariant="overview"
      subtitle={v9 ? "All measures on one sheet. Select Open on a measure to go to its dashboard." : "All measures on one sheet. Click a bar or a row to open that measure's dashboard."}
    >
      <RunNotice />
      <NotesContext.Provider value={NO_NOTES}>
        <QsFrame
          tabs={TABS}
          active={TABS[0]}
          onTab={() => undefined}
          onReset={() => {
            setYear(MY);
            setMulti("");
          }}
        >
          <QsControlsBar>
            <QsControl showInfo={v9} info={v9 ? `Measurement period: ${periodText(year)}. The numbers are for the whole population.` : undefined}>
              <SelectField
                label="Measurement year"
                value={String(year)}
                onChange={(v) => setYear(Number(v))}
                options={[MY, MY - 1].map((y) => ({
                  value: String(y),
                  label: String(y),
                }))}
              />
            </QsControl>
            <QsControl>
              <RunSelect />
            </QsControl>
            {v3 && (
              <QsControl info="Members who have not met two or more measures.">
                <SelectField
                  label="Gap in more than one measure"
                  value={multi}
                  onChange={(v) => setMulti(v)}
                  options={[
                    { value: "", label: "All" },
                    { value: "Yes", label: "Yes" },
                    { value: "No", label: "No" },
                  ]}
                />
              </QsControl>
            )}
          </QsControlsBar>
          <QsSheet>
            {/* Version 9: no text box here. The measurement period is in the info icon of Measurement Year, and how to open a measure is in the page subtitle. */}
            {!v9 && (
            <QsTile cols={36} bare>
              <QsText>
                <p>
                  <b>All measures, {year}.</b>{" "}
                  {v3 ? (
                    <>
                      Measurement period: {periodText(year)}.{" "}
                      {multi
                        ? `Only members ${multi === "Yes" ? "with" : "without"} a gap in more than one measure.`
                        : "The numbers are for the whole population."}
                    </>
                  ) : (
                    "The numbers are for the whole population, with no filters."
                  )}{" "}
                  {v9 ? "Select Open on a measure below to go to its dashboard." : "Click a bar or a row to open that measure's dashboard."}
                </p>
              </QsText>
            </QsTile>
            )}
            {v9 && tableTile}
            <QsKpi
              cols={9}
              label="Measures"
              value={String(measures.length)}
              tip="Measures calculated for this year."
            />
            <QsKpi
              cols={9}
              label={v9 ? "Member Population" : "Members"}
              value={pop.length.toLocaleString("en-US")}
              tip={v9 ? "All members in the population from the Measurement Start Period." : "Everyone in the files (initial population)."}
            />
            <QsKpi
              cols={9}
              label="Members with an open care gap"
              value={withGaps.toLocaleString("en-US")}
              tip="Not met in at least one measure."
              color={qs.meaning.gapText}
            />
            <QsKpi
              cols={9}
              label="Lowest met rate"
              value={`${lowest.rate.toFixed(1)}%`}
              tip={lowest.label}
            />
            <QsTile
              cols={18}
              title="Met rate by measure"
              subtitle="Click a bar to open that measure"
            >
              <QsColumnChart
                label="Met rate by measure"
                bars={bars}
                onSelect={(b) => open(b.label)}
              />
            </QsTile>
            <QsTile
              cols={18}
              title="Members who have not met the measure"
              subtitle="Where the care gaps are. Click a bar to open that measure"
            >
              <QsColumnChart
                label="Members who have not met the measure, by measure"
                bars={gapBars}
                max={Math.max(
                  10,
                  Math.ceil(Math.max(...rows.map((r) => r.gap)) / 10) * 10,
                )}
                unit=""
                decimals={0}
                onSelect={(b) => open(b.label)}
              />
            </QsTile>
            {v7 && (
              <QsTile
                cols={36}
                title="What each result means"
                subtitle="Example text. Click a row to open that measure"
              >
                <QsTable
                  label="What each result means"
                  rows={rows}
                  rowKey={(r) => r.code}
                  maxHeight={100000}
                  onRowSelect={(r) => open(r.code)}
                  cols={[
                    { key: "label", header: "Measure", value: (r) => r.label },
                    {
                      key: "rate",
                      header: "Met rate",
                      value: (r) => r.rate,
                      render: (r) => `${r.rate.toFixed(1)}%`,
                      align: "right",
                      nowrap: true,
                    },
                    {
                      key: "run",
                      header: "Run date",
                      value: (r) => (r.code ? selectedRun.at.getTime() : 0),
                      render: () => fmtDate(selectedRun.at),
                      nowrap: true,
                    },
                    {
                      key: "asof",
                      header: "Data as of",
                      value: (r) => (r.code ? dataAsOf.getTime() : 0),
                      render: () => fmtDate(dataAsOf),
                      nowrap: true,
                    },
                    {
                      key: "exp",
                      header: "Explanation (Example text)",
                      value: (r) => exampleInsight({ name: r.label, rate: r.rate, gap: r.gap, eligible: r.eligible }).explanation,
                    },
                    {
                      key: "act",
                      header: "Recommended Action (Example text)",
                      value: (r) => exampleInsight({ name: r.label, rate: r.rate, gap: r.gap, eligible: r.eligible }).action,
                    },
                  ]}
                />
              </QsTile>
            )}
            {!v9 && tableTile}
          </QsSheet>
        </QsFrame>
      </NotesContext.Provider>
    </PageContainer>
  );
}

export default DashboardCardsPage;
