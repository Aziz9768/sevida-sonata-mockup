import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer, SelectField } from "sevida-ui";
import { RunNotice, RunSelect } from "../components/RunBits";
import { MY, measures, members } from "../data";
import { kpisFor, openGapCount } from "../dashboardData";
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
  const nav = useNavigate();
  const [year, setYear] = useState(MY);
  const open = (code: string) => nav(`/quicksight?m=${code}&from=cards`);

  const rows: Row[] = measures.map((m) => {
    const { initial, t } = kpisFor(m.code, members, year);
    return {
      code: m.code,
      label: `${m.code} · ${m.short}`,
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
    label: r.code,
    value: r.rate,
    detail: `${r.met} met, ${r.gap} not met, ${r.eligible} eligible`,
  }));
  const gapBars: QsBar[] = rows.map((r) => ({
    label: r.code,
    value: r.gap,
    detail: `${r.gap} of ${r.eligible} eligible members have not met it`,
    color: qs.meaning.gap,
  }));
  const withGaps = members.filter((m) => openGapCount(m, year) > 0).length;
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
  ];

  return (
    <PageContainer
      title="Analytics option 2"
      titleVariant="overview"
      subtitle="All measures on one sheet. Click a bar or a row to open that measure's dashboard."
    >
      <RunNotice />
      <NotesContext.Provider value={NO_NOTES}>
        <QsFrame
          tabs={TABS}
          active={TABS[0]}
          onTab={() => undefined}
          onReset={() => setYear(MY)}
        >
          <QsControlsBar>
            <QsControl>
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
          </QsControlsBar>
          <QsSheet>
            <QsTile cols={36} bare>
              <QsText>
                <p>
                  <b>All measures, {year}.</b> The numbers are for the whole
                  population, with no filters. Click a bar or a row to open that
                  measure's dashboard.
                </p>
              </QsText>
            </QsTile>
            <QsKpi
              cols={9}
              label="Measures"
              value={String(measures.length)}
              tip="Measures calculated for this year."
            />
            <QsKpi
              cols={9}
              label="Members"
              value={members.length.toLocaleString("en-US")}
              tip="Everyone in the files (initial population)."
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
            <QsTile
              cols={36}
              title="All numbers by measure"
              subtitle="Click a row to open that measure. Diabetes blood sugar (GSD) shows its first rate here."
            >
              <QsTable
                label="All numbers by measure"
                cols={cols}
                rows={rows}
                rowKey={(r) => r.code}
                maxHeight={300}
                exportFile={`measures-${year}`}
                onRowSelect={(r) => open(r.code)}
              />
            </QsTile>
          </QsSheet>
        </QsFrame>
      </NotesContext.Provider>
    </PageContainer>
  );
}

export default DashboardCardsPage;
