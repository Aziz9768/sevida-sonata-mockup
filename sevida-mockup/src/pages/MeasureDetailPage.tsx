import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useRole } from "../roles";
import { Box, Stack, Typography } from "@mui/material";
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  InfoBanner,
  PageContainer,
  RateBar,
  StatusChip,
  Tabs,
} from "sevida-ui";
import type { Column, FilterState } from "sevida-ui";
import { renderCrumbLink } from "../components/RouterLinkAdapter";
import { RowActions } from "../components/RowActions";
import { TableLink } from "../components/TableLink";
import {
  getMemberRowId,
  memberYearRows,
  useMemberTableColumns,
  yearOf,
} from "../components/memberColumns";
import { fileTitle, tips } from "../copy";
import {
  NOT_MEDICARE,
  dataFiles,
  fileStatusTone,
  groupings,
  CURRENT_YEAR,
  measureByCode,
  measureFor,
  members,
  resultsFor,
  rulesOfYear,
  yearFromParam,
  stateLabel,
  tally,
} from "../data";
import type { MeasureDef, MeasureState } from "../data";
import { specFiles } from "../spec";
import { SMALL_GROUP, dataProblems, membersUrl } from "../insights";

/** The members in this measure: the same table and columns as the Members list, only for members who are in the measure. */
function MembersTab({ def, year }: { def: MeasureDef; year: number }) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const columns = useMemberTableColumns(def.code);

  // A link from a chart or a count (?status=Gap) sets the Measure result filter. The person can change or remove it like any other filter.
  // A link from a group row (?by=&group=) narrows the list with the banner below.
  const status = params.get("status") as MeasureState | null;
  const by = params.get("by");
  const group = params.get("group");
  const grouping = groupings.find((g) => g.key === by);
  const [filters, setFilters] = useState<FilterState>(
    status ? { result: stateLabel[status] } : {},
  );
  useEffect(() => {
    if (status) setFilters((f) => ({ ...f, result: stateLabel[status] }));
  }, [status]);
  const rows = useMemo(
    () =>
      memberYearRows(
        members.filter((m) => {
          const r = resultsFor(m, year)[def.code];
          if (r.state === "Not eligible") return false;
          if (grouping && group && grouping.of(m) !== group) return false;
          return true;
        }),
        [year],
      ),
    [def.code, grouping, group, year],
  );
  const narrowed = grouping && group ? `${grouping.label}: ${group}` : null;

  return (
    <Stack spacing={2}>
      {narrowed && (
        <InfoBanner
          tone="info"
          action={
            <Button
              variant="tertiary"
              size="small"
              onClick={() =>
                setParams(
                  year === CURRENT_YEAR
                    ? { tab: "members" }
                    : { tab: "members", year: String(year) },
                  { replace: true },
                )
              }
            >
              Show all members
            </Button>
          }
        >
          Showing only {narrowed}.
        </InfoBanner>
      )}
      <DataTable
        ariaLabel={`${def.name} members`}
        title="Members in this measure"
        columns={columns}
        rows={rows}
        filters={filters}
        onFiltersChange={setFilters}
        getRowId={getMemberRowId}
        defaultSort={{ key: "id", direction: "asc" }}
        searchPlaceholder="Search by member name, member ID or insurance number…"
        searchPlaceholderCompact="Member name, ID, insurance no."
        storageKey="demo-measure-members-v23"
        savedViews="measure-members"
        exportFile={`${def.code}-members`}
        stickyHeader
        maxHeight="calc(100vh - 342px)"
        onRowClick={(m) =>
          navigate(
            // The care gaps tab is the working view; a past year has no care-gap work, so it opens the measures.
            `/members/${m.id}${yearOf(m) === CURRENT_YEAR ? "?tab=gaps" : `?year=${yearOf(m)}`}`,
          )
        }
        rowActions={(m) => (
          <RowActions id={m.id} name={m.name} year={yearOf(m)} />
        )}
        emptyState={
          <EmptyState
            title="No members"
            description="Nobody is counted or excluded for this measure."
          />
        }
      />
    </Stack>
  );
}

interface GroupRow {
  group: string;
  denominator: number;
  met: number;
  gap: number;
  rate: number;
}

/** One table per split, one split visible at a time. */
function GroupsTab({ def, year }: { def: MeasureDef; year: number }) {
  const navigate = useNavigate();
  const items = groupings
    .map((g) => {
      const keys = Array.from(new Set(members.map(g.of))).filter(
        (k) => k !== NOT_MEDICARE,
      );
      const rows: GroupRow[] = keys
        .map((k) => {
          const t = tally(
            members.filter((m) => g.of(m) === k),
            def.code,
            year,
          );
          return {
            group: k,
            denominator: t.denominator,
            met: t.met,
            gap: t.gap,
            rate: t.rate,
          };
        })
        .filter((r) => r.denominator > 0)
        .sort((a, b) =>
          ["team", "manager", "provider"].includes(g.key)
            ? b.gap - a.gap || b.denominator - a.denominator
            : b.denominator - a.denominator,
        );
      return { g, rows };
    })
    .filter((x) => x.rows.length > 0);

  return (
    <Card
      title="Results by group"
      tooltip="HEDIS asks plans to report each measure separately for groups of members, to show where care differs. Pick a split below."
    >
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5 }}>
        Select a row to see the members in that group. Groups with fewer than{" "}
        {SMALL_GROUP} counted members are flagged because one member can move
        the rate by many points.
      </Typography>
      <Tabs
        ariaLabel="Split results by"
        items={items.map(({ g, rows }) => {
          const columns: Column<GroupRow>[] = [
            {
              key: "group",
              header: g.label,
              accessor: (r) => r.group,
              sortable: true,
              primary: true,
              render: (r) =>
                r.denominator < SMALL_GROUP ? (
                  <>
                    {r.group}{" "}
                    <StatusChip
                      label="Small group"
                      tone="neutral"
                      sx={{ ml: 0.5 }}
                    />
                  </>
                ) : (
                  r.group
                ),
            },
            {
              key: "den",
              header: "Counted members",
              accessor: (r) => r.denominator,
              sortable: true,
              align: "right",
              nowrap: true,
              help: tips.counted,
            },
            {
              key: "met",
              header: "Met",
              accessor: (r) => r.met,
              sortable: true,
              align: "right",
              help: tips.met,
            },
            {
              key: "gap",
              header: "Not met",
              accessor: (r) => r.gap,
              sortable: true,
              align: "right",
              hideBelow: "md",
              nowrap: true,
              help: tips.notMet,
            },
            {
              key: "rate",
              header: "Rate",
              accessor: (r) => r.rate,
              sortable: true,
              width: 220,
              help: tips.rate,
              render: (r) => (
                <RateBar
                  value={r.rate}
                  label={`${r.group} rate`}
                  decimals={0}
                />
              ),
            },
            {
              key: "view",
              header: "Members",
              nowrap: true,
              render: (r) => (
                <TableLink
                  to={membersUrl(def.code, { by: g.key, group: r.group, year })}
                >
                  See members
                </TableLink>
              ),
            },
          ];
          return {
            key: g.key,
            label: g.key === "ses" ? "Medicare income" : g.label,
            content: (
              <DataTable
                ariaLabel={`${def.name} by ${g.label.toLowerCase()}`}
                title={`By ${g.label.toLowerCase()}`}
                columns={columns}
                rows={rows}
                getRowId={(r) => r.group}
                paginated={false}
                searchPlaceholder="Search groups…"
                onRowClick={(r) =>
                  navigate(
                    membersUrl(def.code, { by: g.key, group: r.group, year }),
                  )
                }
                emptyState={
                  <EmptyState
                    title="Nobody counted"
                    description="No counted members in these groups."
                  />
                }
              />
            ),
          };
        })}
      />
    </Card>
  );
}

function HowTab({ def }: { def: MeasureDef }) {
  const rows = def.files.map((id) => ({
    id,
    spec: specFiles.find((s) => s.id === id)!,
    df: dataFiles.find((f) => f.id === id)!,
  }));
  const columns: Column<(typeof rows)[number]>[] = [
    {
      key: "what",
      header: "What it holds",
      accessor: (r) => fileTitle(r.id),
      sortable: true,
      primary: true,
    },
    {
      key: "file",
      header: "File",
      accessor: (r) => `${r.id}.csv`,
      nowrap: true,
    },
    {
      key: "status",
      header: "Status",
      accessor: (r) => r.df.status,
      sortable: true,
      filter: {
        type: "select",
        options: [
          "Accepted",
          "Accepted with warnings",
          "Failed",
          "Not received",
        ].map((v) => ({ value: v, label: v })),
      },
      render: (r) => (
        <StatusChip tone={fileStatusTone[r.df.status]} label={r.df.status} />
      ),
    },
  ];
  return (
    <Stack spacing={2}>
      <Card
        title="How a member is counted"
        tooltip="Each rule is marked 'In the spec' when the data spec states it, or 'Standard HEDIS rule' when it comes from NCQA's published definition and the spec does not spell it out. For a past year, 'Confirmed by NCQA' means it comes from NCQA's public documents for that year, and 'Same as 2026, not confirmed' means the 2026 rule is carried over until it is checked."
      >
        <Typography sx={{ mb: 1.5 }}>
          <strong>To meet the measure:</strong> {def.needs}
        </Typography>
        <Box
          component="ol"
          sx={{ m: 0, p: 0, listStyle: "none", display: "grid", gap: 1.25 }}
        >
          {def.rules.map((r) => (
            <Box
              key={r.text}
              component="li"
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 190px" },
                gap: 1,
                alignItems: "start",
              }}
            >
              <Box>
                <Typography>{r.text}</Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {r.from === "spec"
                    ? `Spec: ${r.where}`
                    : r.from === "ncqa"
                      ? `Source: ${r.where}`
                      : r.from === "same"
                        ? "Carried over from 2026. Not confirmed for this year."
                        : "Not written in the spec"}
                </Typography>
              </Box>
              <Box>
                <StatusChip
                  tone={
                    r.from === "spec" || r.from === "ncqa"
                      ? "success"
                      : "warning"
                  }
                  label={
                    r.from === "spec"
                      ? "In the spec"
                      : r.from === "ncqa"
                        ? "Confirmed by NCQA"
                        : r.from === "same"
                          ? "Same as 2026, not confirmed"
                          : "Standard HEDIS rule"
                  }
                />
              </Box>
            </Box>
          ))}
        </Box>
      </Card>
      <DataTable
        ariaLabel="Files this measure reads"
        title="Data files this measure reads"
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        paginated={false}
        searchPlaceholder="Search files…"
      />
    </Stack>
  );
}

export function MeasureDetailPage() {
  const { code } = useParams();
  const { memberLists } = useRole();
  const navigate = useNavigate();
  const baseDef = measureByCode(code);
  const [search, setSearch] = useSearchParams();
  const year = yearFromParam(search.get("year"));
  const def = baseDef ? measureFor(baseDef, year) : undefined;
  const yq: Record<string, string> =
    year === CURRENT_YEAR ? {} : { year: String(year) };

  if (!def) {
    return (
      <PageContainer
        breadcrumbs={[
          { label: "Home", href: "/members" },
          { label: "Quality measures", href: "/measures" },
          { label: "Not found" },
        ]}
        renderLink={renderCrumbLink}
      >
        <EmptyState
          title="Measure not found"
          description="This measure is not part of the demo."
          action={
            <Button variant="secondary" onClick={() => navigate("/measures")}>
              Back to measures
            </Button>
          }
        />
      </PageContainer>
    );
  }
  const t = tally(members, def.code, year);
  const tab = search.get("tab") ?? "members";
  // A new link (different filter) must start the member table afresh.
  const membersKey = `${year}|${search.get("status") ?? ""}|${search.get("by") ?? ""}|${search.get("group") ?? ""}`;

  return (
    <PageContainer
      breadcrumbs={[
        { label: "Home", href: "/members" },
        { label: "Quality measures", href: "/measures" },
        { label: def.name },
      ]}
      renderLink={renderCrumbLink}
      title={def.name}
      subtitle={`${def.code} · ${def.population} · measurement year ${year}`}
    >
      <Stack spacing={2}>
        {year !== CURRENT_YEAR && (
          <InfoBanner
            tone="info"
            title={`Measurement year ${year}: final results`}
            action={
              <Button
                variant="tertiary"
                size="small"
                onClick={() => setSearch({ tab }, { replace: true })}
              >
                Show {CURRENT_YEAR}
              </Button>
            }
          >
            {rulesOfYear(year).note}
          </InfoBanner>
        )}
        {year === CURRENT_YEAR && dataProblems(def).length > 0 && (
          <InfoBanner
            tone="warning"
            title="This result is based on partial data"
          >
            {dataProblems(def)
              .map(
                (f) =>
                  `${fileTitle(f.id)} (${f.id}.csv) is ${f.status === "Failed" ? "rejected" : "not received"}`,
              )
              .join(", ")}
            . The rate may be too low until it is sent.
          </InfoBanner>
        )}
        <Tabs
          ariaLabel="Measure sections"
          value={tab}
          onChange={(k) => setSearch({ tab: k, ...yq }, { replace: true })}
          items={[
            ...(memberLists
              ? [
                  {
                    key: "members",
                    label: "Members",
                    count: t.eligible,
                    content: (
                      <MembersTab key={membersKey} def={def} year={year} />
                    ),
                  },
                ]
              : []),
            {
              key: "groups",
              label: "Results by group",
              content: <GroupsTab def={def} year={year} />,
            },
            {
              key: "how",
              label: "How it is calculated",
              content: <HowTab def={def} />,
            },
          ]}
        />
      </Stack>
    </PageContainer>
  );
}
