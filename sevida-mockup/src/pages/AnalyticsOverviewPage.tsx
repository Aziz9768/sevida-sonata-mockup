import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Stack, Typography } from "@mui/material";
import {
  Button,
  Card,
  DataTable,
  InfoBanner,
  PageContainer,
  SelectField,
  StatCard,
} from "sevida-ui";
import type { Column } from "sevida-ui";
import { ExportMenu } from "../components/dashboard/ExportMenu";
import {
  BuildNotesToggle,
  ChangeText,
  DirectionLabel,
  EffortTag,
  HelpModal,
  StatusPill,
  tip,
  useBuildNotes,
  useDocumentTitle,
  useFakeLoad,
} from "../components/analytics/AnalyticsBits";
import { MY, YEARS, fmtDate } from "../data";
import {
  DASHBOARDS,
  GROUPS,
  SMALL_N,
  STATUS_ORDER,
  STATUS_WORDS,
  scorecard,
} from "../analyticsRegistry";
import type { ScoreRow } from "../analyticsRegistry";

const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Version 5 Analytics Overview: a scorecard. One row per dashboard with the latest result, the change since last year,
 * the benchmark status (a word AND an icon) and the date it was updated. Sortable and searchable, with a group level on top.
 * The weakest measure is named in the first card, so "how are we doing?" is answered without opening anything.
 */
export function AnalyticsOverviewPage() {
  useDocumentTitle("Overview, Analytics");
  const nav = useNavigate();
  const [year, setYear] = useState(MY);
  const [group, setGroup] = useState<string>("");
  const [help, setHelp] = useState(false);
  const [notes, setNotes] = useBuildNotes();
  const loading = useFakeLoad(String(year), 600);
  const all = useMemo(() => scorecard(year), [year]);
  const rows = group ? all.filter((r) => r.def.group === group) : all;

  const count = (s: ScoreRow["status"]) => all.filter((r) => r.status === s).length;
  const weakest = all.reduce((a, b) => (b.gap > a.gap ? b : a));

  const cols: Column<ScoreRow>[] = [
    {
      key: "name",
      header: "Dashboard",
      accessor: (r) => r.def.name,
      sortable: true,
      width: 300,
      primary: true,
      alwaysVisible: true,
      render: (r) => (
        <Box>
          <Typography component="span" sx={{ fontWeight: 700 }}>
            {r.def.short}
          </Typography>
          <Typography component="span">
            {" - "}
            {r.def.name.split(" - ")[1]}
          </Typography>
        </Box>
      ),
    },
    {
      key: "group",
      header: "Group",
      accessor: (r) => r.group,
      sortable: true,
      hideBelow: "lg",
      filter: {
        type: "multiselect",
        options: GROUPS.map((g) => ({ value: g.name, label: g.name })),
      },
    },
    {
      key: "result",
      header: "Result",
      help: "The latest result for the whole population. Members counted (n) is in brackets. A group under 30 members is marked Small group.",
      accessor: (r) => r.rate,
      sortable: true,
      align: "right",
      nowrap: true,
      render: (r) => (
        <span>
          <b>{r1(r.rate)}%</b>{" "}
          <Typography component="span" variant="body2" sx={{ color: "text.secondary" }}>
            (n={r.n.toLocaleString("en-US")}
            {r.n < SMALL_N ? ", small group" : ""})
          </Typography>
        </span>
      ),
    },
    {
      key: "direction",
      header: "Better When",
      accessor: (r) => (r.def.higherIsBetter ? "Higher" : "Lower"),
      sortable: true,
      nowrap: true,
      hideBelow: "lg",
      render: (r) => <DirectionLabel def={r.def} />,
    },
    {
      key: "change",
      header: "Change Since Last Year",
      help: `The result for Measurement Year ${year} compared with ${year - 1}, in percentage points. The word says whether the change is better or worse for this measure.`,
      accessor: (r) => r.change,
      sortable: true,
      nowrap: true,
      render: (r) => <ChangeText change={r.change} better={r.better} />,
    },
    {
      key: "benchmark",
      header: "Benchmark",
      help: tip("benchmark"),
      accessor: (r) => r.def.benchmark,
      sortable: true,
      align: "right",
      hideBelow: "lg",
      render: (r) => `${r.def.benchmark}%`,
    },
    {
      key: "status",
      header: "Status",
      accessor: (r) => STATUS_ORDER[r.status] * 1000 - r.gap,
      sortable: true,
      nowrap: true,
      render: (r) => <StatusPill status={r.status} />,
      filterLabel: "Status",
      filter: {
        type: "select",
        options: (["meets", "near", "misses"] as const).map((s) => ({
          value: STATUS_WORDS[s],
          label: STATUS_WORDS[s],
        })),
      },
      filterAccessor: (r) => STATUS_WORDS[r.status],
    },
    {
      key: "updated",
      header: "Last Updated",
      accessor: (r) => r.updated,
      sortable: true,
      hideBelow: "lg",
    },
  ];

  const exportBuild = () => ({
    title: `Analytics Overview, Measurement Year ${year}`,
    lines: [`Measurement Year: ${year}`, group ? `Group: ${GROUPS.find((g) => g.id === group)?.name}` : "All groups"],
    sheets: [
      {
        name: "Scorecard",
        head: ["Dashboard", "Group", "Result %", "Members counted", "Better when", "Last year %", "Change (points)", "Benchmark %", "Status", "Last updated"],
        body: rows.map((r) => [
          r.def.name,
          r.group,
          r1(r.rate),
          r.n,
          r.def.higherIsBetter ? "Higher" : "Lower",
          r1(r.prev),
          r1(r.change),
          r.def.benchmark,
          STATUS_WORDS[r.status],
          fmtDate(r.updated),
        ]),
      },
    ],
  });

  return (
    <PageContainer
      title="Analytics Overview"
      titleVariant="overview"
      subtitle={`How we are doing on every quality measure. Measurement Year ${year}${year === MY ? ", year to date" : ""}. Pick a row to open its dashboard.`}
      breadcrumbsEnd={
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Last updated {fmtDate(all[0].updated)}
        </Typography>
      }
      breadcrumbs={[{ label: "Analytics" }]}
      actions={
        <>
          <BuildNotesToggle on={notes} onChange={setNotes} />
          <Button variant="secondary" onClick={() => setHelp(true)}>
            How to read this
          </Button>
          <ExportMenu build={exportBuild} fileName={`analytics-overview-${year}`} />
        </>
      }
    >
      <Stack spacing={2}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems={{ sm: "flex-end" }}
          sx={{ flexWrap: "wrap" }}
        >
          <Box sx={{ minWidth: 200 }}>
            <SelectField
              label="Measurement Year"
              value={String(year)}
              onChange={(v) => setYear(Number(v))}
              options={YEARS.map((y) => ({ value: String(y), label: String(y) }))}
              fullWidth
            />
          </Box>
          <Typography variant="body2" sx={{ color: "text.secondary", pb: 1 }}>
            Applied filters: Measurement Year: {year}
            {group ? `, Group: ${GROUPS.find((g) => g.id === group)?.name}` : ""}
          </Typography>
          {group && (
            <Button variant="tertiary" onClick={() => setGroup("")}>
              Reset
            </Button>
          )}
          <EffortTag
            on={notes}
            kind="custom"
            note="The Overview is an app page: QuickSight has no way to show one row per dashboard."
          />
        </Stack>

        <Card
          title="Where We Stand"
          hint={`${DASHBOARDS.length} dashboards in ${GROUPS.length} groups`}
          action={
            <EffortTag
              on={notes}
              kind="custom"
              note="Needs one small endpoint that returns the latest result per dashboard."
            />
          }
        >
          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1.5 }}>
            <StatCard
              variant="highlight"
              value={weakest.def.short}
              label="Furthest From Benchmark"
              sub={`${r1(weakest.gap)} pts away: ${r1(weakest.rate)}% vs ${weakest.def.benchmark}%`}
              onClick={() => nav(`/analytics/${weakest.def.code}`)}
            />
            <StatCard value={`${count("meets")} of ${all.length}`} label="Meet Benchmark" />
            <StatCard value={`${count("near")} of ${all.length}`} label="Near Benchmark" tip={tip("benchmark")} />
            <StatCard value={`${count("misses")} of ${all.length}`} label="Miss Benchmark" />
          </Stack>
        </Card>

        <Card
          title="By Group"
          hint="Pick a group to show only its dashboards"
          action={
            <EffortTag
              on={notes}
              kind="custom"
              note="Groups come from the dashboard list in the app, not from QuickSight."
            />
          }
        >
          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1.5 }}>
            {GROUPS.map((g) => {
              const inGroup = all.filter((r) => r.def.group === g.id);
              const ok = inGroup.filter((r) => r.status === "meets").length;
              return (
                <StatCard
                  key={g.id}
                  label={g.name}
                  value={`${ok} of ${inGroup.length}`}
                  sub="meet benchmark"
                  active={group === g.id}
                  onClick={() => setGroup(group === g.id ? "" : g.id)}
                />
              );
            })}
          </Stack>
        </Card>

        <Card
          flush
          title="Scorecard"
          hint="Sorted with the biggest gap first. Click a heading to sort."
          action={
            <EffortTag
              on={notes}
              kind="custom"
              note="A normal app table. Each row opens the matching embedded dashboard."
            />
          }
        >
          <Box id="scorecard">
            <DataTable
              ariaLabel="Scorecard: one row per dashboard"
              columns={cols}
              rows={rows}
              getRowId={(r) => r.def.code}
              defaultSort={{ key: "status", direction: "asc" }}
              searchPlaceholder="Search dashboards…"
              searchPlaceholderCompact="Search dashboards"
              paginated={false}
              loading={loading}
              exportFile={`scorecard-${year}`}
              onRowClick={(r) => nav(`/analytics/${r.def.code}`)}
            />
          </Box>
        </Card>

        {all.some((r) => !r.def.real) && (
          <InfoBanner tone="info">
            {all.filter((r) => !r.def.real).length} of the {all.length} dashboards are demo dashboards with made-up
            numbers (their member lists are not built). They show how the page behaves with many dashboards.
          </InfoBanner>
        )}
      </Stack>
      <HelpModal open={help} onClose={() => setHelp(false)} />
    </PageContainer>
  );
}

export default AnalyticsOverviewPage;
