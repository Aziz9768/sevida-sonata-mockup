import { useMemo, useState } from "react";
import { Link as RouterLink, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Box, Link, Skeleton, Stack, Typography } from "@mui/material";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import {
  AutocompleteField,
  Button,
  Card,
  DataTable,
  EmptyState,
  InfoBanner,
  LineChart,
  PageContainer,
  RateBar,
  SelectField,
  StatCard,
  StatusChip,
  Tabs,
} from "sevida-ui";
import type { Column } from "sevida-ui";
import { ExportMenu } from "../components/dashboard/ExportMenu";
import { renderCrumbLink } from "../components/RouterLinkAdapter";
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
import { MY, YEARS, fmtDate, resultsFor, stateLabel } from "../data";
import type { Member } from "../data";
import { ageLabel, genderV3, tricareIdOf } from "../v3Data";
import { useRole } from "../roles";
import {
  AGE_OPTIONS,
  DASHBOARDS,
  GAP_OPTIONS,
  GENDER_OPTIONS,
  GROUPS,
  SMALL_N,
  appliedText,
  breakdown,
  dashByCode,
  dashesIn,
  emptyAFilters,
  filtersActive,
  groupById,
  gapToBenchmark,
  lastUpdated,
  membersFor,
  statsFor,
  statusOf,
  trendFor,
} from "../analyticsRegistry";
import type { AFilters, DashDef, GroupRow } from "../analyticsRegistry";

const r1 = (n: number) => Math.round(n * 10) / 10;
/** Most tabs a group may show before the page falls back to the searchable list (the Overview). */
const MAX_TABS = 7;

/* The filters live in the address, so a copied link keeps them. */
export function readFilters(p: URLSearchParams): AFilters {
  const year = Number(p.get("year"));
  const gap = p.get("gap");
  return {
    year: YEARS.includes(year) ? year : MY,
    gender: GENDER_OPTIONS.includes(p.get("gender") ?? "") ? p.get("gender")! : "",
    age: (p.get("age") ?? "").split("|").filter((a) => AGE_OPTIONS.includes(a)),
    gap: gap === "Open" || gap === "Closed" ? gap : "",
  };
}
export function writeFilters(f: AFilters): Record<string, string> {
  const out: Record<string, string> = {};
  if (f.year !== MY) out.year = String(f.year);
  if (f.gender) out.gender = f.gender;
  if (f.age.length) out.age = f.age.join("|");
  if (f.gap) out.gap = f.gap;
  return out;
}

export function NotFound({ code }: { code: string }) {
  useDocumentTitle("Not found, Analytics");
  const nav = useNavigate();
  return (
    <PageContainer title="Dashboard Not Found" breadcrumbs={[{ label: "Analytics", href: "/analytics" }, { label: "Not Found" }]} renderLink={renderCrumbLink}>
      <Card>
        <EmptyState
          title={`There is no dashboard called "${code.toUpperCase()}"`}
          description="The address may have a typo, or the dashboard may have been renamed. Pick one from the list, or go back to the Overview."
          action={
            <Button onClick={() => nav("/analytics")}>Back to Analytics Overview</Button>
          }
        />
        <Stack spacing={1} sx={{ mt: 1 }}>
          {GROUPS.map((g) => (
            <Typography key={g.id} variant="body2">
              <b>{g.name}: </b>
              {dashesIn(g.id).map((d, i) => (
                <span key={d.code}>
                  {i > 0 && ", "}
                  <Link component={RouterLink} to={`/analytics/${d.code}`}>
                    {d.short}
                  </Link>
                </span>
              ))}
            </Typography>
          ))}
        </Stack>
      </Card>
    </PageContainer>
  );
}

/** Group rows with their size. A small group is flagged with a word and an icon. */
function GroupTable({ def, rows, label }: { def: DashDef; rows: GroupRow[]; label: string }) {
  const cols: Column<GroupRow>[] = [
    { key: "group", header: label, accessor: (r) => r.group, primary: true, sortable: true },
    {
      key: "n",
      header: "Members (n)",
      help: tip("eligible"),
      accessor: (r) => r.n,
      sortable: true,
      align: "right",
      render: (r) => r.n.toLocaleString("en-US"),
    },
    {
      key: "rate",
      header: def.resultLabel,
      accessor: (r) => r.rate,
      sortable: true,
      width: "42%",
      render: (r) => (
        <RateBar
          value={r.rate}
          target={def.benchmark}
          tone="primary"
          decimals={1}
          label={`${def.resultLabel} for ${r.group}`}
        />
      ),
    },
    {
      key: "flag",
      header: "Note",
      accessor: (r) => (r.small ? "Small group" : ""),
      render: (r) =>
        r.small ? (
          <StatusChip
            tone="warning"
            icon={<WarningAmberOutlinedIcon />}
            label="Small group"
            tip={tip("small")}
          />
        ) : (
          ""
        ),
    },
  ];
  return (
    <DataTable
      ariaLabel={`${def.short} by ${label}`}
      columns={cols}
      rows={rows}
      getRowId={(r) => r.group}
      toolbar={false}
      paginated={false}
      emptyState={<EmptyState title="No members for these filters" description="Change or reset the filters above." />}
    />
  );
}

export function AnalyticsMeasurePage() {
  const { code = "" } = useParams();
  const def = dashByCode(code);
  if (!def) return <NotFound code={code} />;
  return <MeasureBody def={def} />;
}

function MeasureBody({ def }: { def: DashDef }) {
  const group = groupById(def.group)!;
  useDocumentTitle(`${def.name}, Analytics`);
  const nav = useNavigate();
  const { search } = useLocation();
  const [params, setParams] = useSearchParams();
  const { role, canSee, memberLists } = useRole();
  const [help, setHelp] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notes, setNotes] = useBuildNotes();
  const f = useMemo(() => readFilters(params), [params]);
  const setF = (next: AFilters) => setParams(writeFilters(next), { replace: true });
  const loading = useFakeLoad(`${def.code}|${f.year}`, 700);

  const stats = useMemo(() => statsFor(def, f), [def, f]);
  const prev = useMemo(() => statsFor(def, { ...f, year: f.year - 1 }), [def, f]);
  const change = stats.rate - prev.rate;
  const better = Math.abs(change) < 0.5 ? null : def.higherIsBetter ? change > 0 : change < 0;
  const status = statusOf(def, stats.rate);
  const trend = useMemo(() => trendFor(def, f), [def, f]);
  const byGender = useMemo(() => breakdown(def, f, "sex"), [def, f]);
  const byAge = useMemo(() => breakdown(def, f, "ageGroup"), [def, f]);
  const members = useMemo(
    () =>
      membersFor(def, f).filter(
        (m) =>
          canSee(m) &&
          ["Met", "Gap"].includes(resultsFor(m, f.year)[def.real!].state),
      ),
    [def, f, canSee],
  );
  const siblings = dashesIn(def.group);
  const updated = lastUpdated(def);
  const applied = appliedText(f);

  const memberCols: Column<Member>[] = [
    { key: "name", header: "Member Name", accessor: (m) => m.name, sortable: true, primary: true, alwaysVisible: true },
    { key: "tricare", header: "Tricare ID", accessor: (m) => tricareIdOf(m), sortable: true, nowrap: true },
    { key: "dob", header: "Date of Birth", accessor: (m) => m.dob, sortable: true, nowrap: true },
    { key: "age", header: "Age", accessor: (m) => ageLabel(m.dob), sortable: true, nowrap: true },
    { key: "gender", header: "Gender", accessor: (m) => genderV3(m), sortable: true },
    {
      key: "result",
      header: "Result",
      accessor: (m) => stateLabel[resultsFor(m, f.year)[def.real!].state],
      sortable: true,
      render: (m) => {
        const s = resultsFor(m, f.year)[def.real!].state;
        return (
          <StatusChip
            label={stateLabel[s]}
            tone={s === "Met" ? "success" : s === "Gap" ? "warning" : "neutral"}
          />
        );
      },
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

  const exportBuild = () => ({
    title: `${def.name}, Measurement Year ${f.year}`,
    lines: applied,
    sheets: [
      {
        name: "Summary",
        head: ["Number", "Value"],
        body: [
          [def.resultLabel + " (%)", r1(stats.rate)],
          ["Members counted (n)", stats.n],
          ["Met", stats.met],
          ["Not met", stats.notMet],
          ["Excluded", stats.excluded],
          ["Benchmark (%)", def.benchmark],
          [def.higherIsBetter ? "Higher is better" : "Lower is better", ""],
        ],
      },
      {
        name: "By gender",
        head: ["Gender", "Members (n)", `${def.resultLabel} (%)`, "Small group"],
        body: byGender.map((g) => [g.group, g.n, r1(g.rate), g.small ? "Yes" : "No"]),
      },
      {
        name: "By age range",
        head: ["Age Range", "Members (n)", `${def.resultLabel} (%)`, "Small group"],
        body: byAge.map((g) => [g.group, g.n, r1(g.rate), g.small ? "Yes" : "No"]),
      },
    ],
  });

  const skeleton = (h: number) => <Skeleton variant="rounded" height={h} />;

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
          Last updated {fmtDate(updated)}
        </Typography>
      }
      actions={
        <>
          <BuildNotesToggle on={notes} onChange={setNotes} />
          <Button variant="secondary" onClick={() => setHelp(true)}>
            How to read this
          </Button>
          <Button variant="secondary" onClick={() => void copyLink()}>
            {copied ? "Link copied" : "Copy link"}
          </Button>
          <ExportMenu build={exportBuild} fileName={`${def.code}-${f.year}`} />
        </>
      }
    >
      <Stack spacing={2}>
        {/* 1. Dashboards in this group, as tabs. More than 7 and the Overview list takes over. */}
        <Stack direction="row" alignItems="center" spacing={1} sx={{ flexWrap: "wrap" }}>
          <Box sx={{ flex: "1 1 auto", minWidth: 0 }}>
            {siblings.length <= MAX_TABS ? (
              <Tabs
                ariaLabel={`${group.name} dashboards`}
                items={siblings.map((d) => ({ key: d.code, label: d.short }))}
                value={def.code}
                onChange={(k) => nav(`/analytics/${k}${search}`)}
                gap={false}
              />
            ) : (
              <Button variant="secondary" onClick={() => nav("/analytics")}>
                {`See all ${siblings.length} ${group.name} dashboards`}
              </Button>
            )}
          </Box>
          <EffortTag
            on={notes}
            kind="custom"
            note={`The tabs come from the dashboard list (${DASHBOARDS.length} now). A new dashboard shows up in the menu, the Overview, the tabs and the breadcrumb from one new row.`}
          />
        </Stack>

        {!def.real && (
          <InfoBanner tone="info" title="Demo dashboard">
            The numbers on this page are made up, only to show how a dashboard looks next to the real ones. The member list is not built.
          </InfoBanner>
        )}

        {/* 2. Filters: one row, the same names as the app, A to Z. They work at once. */}
        <Card
          title="Filters"
          action={
            <Stack direction="row" spacing={1} alignItems="center">
              <EffortTag
                on={notes}
                kind="custom"
                note="One filter bar in the app, shared by every dashboard. It passes the values to QuickSight as parameters, so QuickSight's own control bar and Filter button are not needed."
              />
              <Button variant="tertiary" disabled={!filtersActive(f) && f.year === MY} onClick={() => setF(emptyAFilters())}>
                Reset
              </Button>
            </Stack>
          }
        >
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" },
            }}
          >
            <AutocompleteField
              multiple
              label="Age Range"
              placeholder="All"
              options={AGE_OPTIONS.map((a) => ({ value: a, label: a }))}
              value={f.age}
              onChange={(v) => setF({ ...f, age: v })}
            />
            <SelectField
              label="Gap Status"
              value={f.gap}
              onChange={(v) => setF({ ...f, gap: v as AFilters["gap"] })}
              options={[{ value: "", label: "All" }, ...GAP_OPTIONS.map((g) => ({ value: g, label: g }))]}
              fullWidth
            />
            <SelectField
              label="Gender"
              value={f.gender}
              onChange={(v) => setF({ ...f, gender: v })}
              options={[{ value: "", label: "All" }, ...GENDER_OPTIONS.map((g) => ({ value: g, label: g }))]}
              fullWidth
            />
            <SelectField
              label="Measurement Year"
              value={String(f.year)}
              onChange={(v) => setF({ ...f, year: Number(v) })}
              options={YEARS.map((y) => ({ value: String(y), label: String(y) }))}
              fullWidth
            />
          </Box>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 1.5 }} aria-live="polite">
            Applied filters: {applied.join(" · ")}
          </Typography>
        </Card>

        {/* 3. Summary tiles */}
        <Stack spacing={1}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flexWrap: "wrap", rowGap: 0.75 }}>
            <StatusPill status={status} />
            <Typography variant="body2">
              {r1(Math.abs(gapToBenchmark(def, stats.rate)))} pts {gapToBenchmark(def, stats.rate) <= 0 ? "better than" : "from"} the {def.benchmark}% benchmark
            </Typography>
            <Typography variant="body2" component="span">
              <ChangeText change={change} better={better} suffix={` since ${f.year - 1}`} />
            </Typography>
            <DirectionLabel def={def} />
            <EffortTag on={notes} kind="embed" note="Tiles are a normal QuickSight KPI visual. The benchmark status can come from a calculated field." />
          </Stack>
          {loading ? (
            <Stack direction="row" sx={{ gap: 1.5, flexWrap: "wrap" }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <Box key={i} sx={{ flex: "1 1 128px", minWidth: 108 }}>
                  {skeleton(78)}
                </Box>
              ))}
            </Stack>
          ) : (
            <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1.5 }}>
              <StatCard
                variant="highlight"
                value={stats.n ? `${r1(stats.rate)}%` : "–"}
                label={def.resultLabel}
                sub={`${def.higherIsBetter ? "↑ Higher" : "↓ Lower"} is better`}
              />
              <StatCard value={stats.n.toLocaleString("en-US")} label="Eligible Members (n)" tip={tip("eligible")} />
              <StatCard value={stats.met.toLocaleString("en-US")} label="Met" tip={tip("met")} />
              <StatCard value={stats.notMet.toLocaleString("en-US")} label="Not Met" tip={tip("notMet")} />
              <StatCard value={stats.excluded.toLocaleString("en-US")} label="Excluded" tip={tip("excluded")} />
            </Stack>
          )}
          {!loading && stats.n < SMALL_N && (
            <InfoBanner tone="warning" title="Small group">
              Only {stats.n} members are counted for these filters. {tip("small")}
            </InfoBanner>
          )}
        </Stack>

        {/* 4. Charts. One page scroll: nothing scrolls inside. */}
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" },
            alignItems: "start",
          }}
        >
          <Card
            title="Trend by Month"
            hint={`${def.resultLabel}, with the ${def.benchmark}% benchmark as a dashed line`}
            action={<EffortTag on={notes} kind="embed" note="A QuickSight line chart with a reference line." />}
          >
            {loading ? (
              skeleton(220)
            ) : (
              <LineChart
                label={`${def.resultLabel} by month for ${def.short}`}
                labels={trend.labels}
                series={[{ name: def.resultLabel, values: trend.values, tone: "primary" }]}
                target={def.benchmark}
                decimals={1}
              />
            )}
          </Card>
          <Stack spacing={2}>
            <Card
              title="By Gender"
              hint="Members (n) next to every percentage"
              action={<EffortTag on={notes} kind="embed" note="A QuickSight table or bar chart. The Small group flag is a calculated field (n under 30)." />}
            >
              {loading ? skeleton(110) : <GroupTable def={def} rows={byGender} label="Gender" />}
            </Card>
            <Card title="By Age Range" hint="Members (n) next to every percentage">
              {loading ? skeleton(150) : <GroupTable def={def} rows={byAge} label="Age Range" />}
            </Card>
          </Stack>
        </Box>

        {/* 5. Member list */}
        <Card
          flush
          title={def.real && memberLists ? `Members (${members.length})` : "Members"}
          action={
            <EffortTag
              on={notes}
              kind="custom"
              note="Names and dates of birth must follow the app's roles, so this is the app's own table. It opens the Sonata member page and keeps the same columns as the Members list."
            />
          }
        >
          {!def.real ? (
            <Box sx={{ p: 2.75 }}>
              <EmptyState title="No member list for a demo dashboard" description="The real dashboards (BCS, CCS, COL, GSD and WCV) list their members here." />
            </Box>
          ) : !memberLists ? (
            <Box sx={{ p: 2.75 }}>
              <InfoBanner tone="info">
                The {role.label} role sees totals and rates only. Member names and dates of birth are not shown.
              </InfoBanner>
            </Box>
          ) : (
            <DataTable
              ariaLabel={`Members counted in ${def.short}`}
              columns={memberCols}
              rows={members}
              getRowId={(m) => m.id}
              defaultSort={{ key: "name", direction: "asc" }}
              searchPlaceholder="Search by Member Name or Tricare ID…"
              searchPlaceholderCompact="Member name, Tricare ID"
              pageSize={10}
              loading={loading}
              exportFile={`${def.code}-members-${f.year}`}
              onRowClick={(m) => nav(`/members/${m.id}`)}
            />
          )}
        </Card>
      </Stack>
      <HelpModal open={help} onClose={() => setHelp(false)} def={def} />
    </PageContainer>
  );
}

export default AnalyticsMeasurePage;
