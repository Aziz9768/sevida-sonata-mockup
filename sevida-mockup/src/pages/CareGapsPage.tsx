import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Stack } from "@mui/material";
import {
  DataTable,
  PageContainer,
  Tabs,
  StatusChip,
  Term,
  applyFilters,
  applySearch,
} from "sevida-ui";
import type { Column, FilterState } from "sevida-ui";
import { RowActions } from "../components/RowActions";
import { CareGapsPageV3 } from "./CareGapsPageV3";
import { useVersion } from "../version";
import { ClosedSinceButton } from "../components/ClosedSince";
import { useRole } from "../roles";
import { TableLink } from "../components/TableLink";
import {
  NOT_CONTACTED,
  apptPresets,
  memberColumns,
  memberFacets,
  missingEvidenceFor,
} from "../components/memberColumns";
import { evidenceStatuses, outreachResults, useGaps } from "../careGaps";
import type { GapView } from "../careGaps";
import {
  CURRENT_YEAR,
  careManagers,
  careTeamOf,
  careTeams,
  fmtDate,
  measures,
} from "../data";
import type { Member } from "../data";
import {
  LABEL,
  OPEN_GAP_VALUES,
  measureOptions,
  openGapsLabel,
} from "../sharedFilters";

/** One open care gap. `n` is how many open gaps the same member has in all. */
interface GapRow {
  id: string;
  m: Member;
  g: GapView;
  n: number;
}

const opt = (xs: string[]) => xs.map((v) => ({ value: v, label: v }));
const dateCell = (d: Date | null, none = "–") => (d ? fmtDate(d) : none);
const lastOutreach = (r: GapRow) =>
  [...r.g.work.outreach].sort((a, b) => b.when.localeCompare(a.when))[0];

/**
 * The care gap worklist: every open gap in the population, one row per gap (a member with two open gaps has two rows).
 * Same filters, saved views and export as Members. A row opens that gap's own page.
 */
function CareGapsPageOld() {
  const navigate = useNavigate();
  const { openOf } = useGaps();
  const { visible } = useRole();
  const rows = useMemo<GapRow[]>(
    () =>
      visible.flatMap((m) => {
        const open = openOf(m);
        return open.map((g) => ({ id: g.id, m, g, n: open.length }));
      }),
    [openOf, visible],
  );

  const columns = useMemo<Column<GapRow>[]>(() => {
    const base = memberColumns<GapRow>(
      (r) => r.m,
      () => CURRENT_YEAR,
    );
    const facets = memberFacets<GapRow>(
      (r) => r.m,
      () => CURRENT_YEAR,
    );
    // The name and the Member ID open the member with the Care gaps tab in focus (FR-607). The gap's own page is one click further, from that tab or the row menu.
    const toMember = (r: GapRow) => `/members/${r.m.id}?tab=gaps`;
    const lead: Column<GapRow>[] = [
      {
        ...base[0],
        render: (r) => <TableLink to={toMember(r)}>{r.m.name}</TableLink>,
      },
      {
        ...base[1],
        render: (r) => <TableLink to={toMember(r)}>{r.m.id}</TableLink>,
      },
    ];
    // Date of birth, age and sex stay available in the Columns and Filters panels, but start hidden to keep the worklist narrow.
    const demo = base.slice(2).map((c) => ({ ...c, defaultHidden: true }));
    const list: Column<GapRow>[] = [
      ...lead,
      {
        key: "measure",
        header: "Measure",
        filterLabel: "Measure",
        help: "The measure this gap is in, by its short form. Hover it to read the full name.",
        accessor: (r) => r.g.def.code,
        sortable: true,
        nowrap: true,
        render: (r) => (
          <StatusChip tone="primary" label={r.g.def.code} tip={r.g.def.name} />
        ),
        filter: { type: "multiselect", options: measureOptions },
      },
      {
        key: "why",
        header: "Why",
        help: "Why the member is not compliant for this measure. The member page has the step-by-step check.",
        accessor: (r) => r.g.result.reason,
        width: 300,
        searchable: false,
      },
      {
        key: "missing",
        header: "Missing evidence",
        help: "What is still needed to close this gap: any one of the listed records. Hover the text to see the date window for each one.",
        accessor: (r) => missingEvidenceFor(r.g.def.code, CURRENT_YEAR).labels,
        render: (r) => {
          const x = missingEvidenceFor(r.g.def.code, CURRENT_YEAR);
          return <Term tip={x.windows}>{x.labels}</Term>;
        },
        width: 240,
        searchable: false,
        hideBelow: "lg",
      },
      {
        key: "found",
        header: "Gap identified",
        help: "The date this gap was found. Demo date: the spec has no such field.",
        accessor: (r) => r.g.identified,
        render: (r) => dateCell(r.g.identified),
        sortable: true,
        nowrap: true,
        searchable: false,
        filter: { type: "dateRange" },
      },
      {
        key: "evStatus",
        header: "Evidence status",
        help: "Where the proof for this gap stands: not requested, requested, received (waiting for review), validated or rejected.",
        accessor: (r) => r.g.evidenceStatus,
        sortable: true,
        nowrap: true,
        searchable: false,
        hideBelow: "lg",
        filter: {
          type: "multiselect",
          ordered: true,
          options: opt(evidenceStatuses),
        },
      },
      {
        key: "openCount",
        header: "Open gaps",
        help: "How many open gaps this member has in all. A member with several is a good call to make: one visit may close more than one. Sort or filter on this column to find them.",
        accessor: (r) => r.n,
        sortable: true,
        align: "right",
        nowrap: true,
        searchable: false,
        filterLabel: LABEL.openGaps,
        filterAccessor: (r) => openGapsLabel(r.n),
        filter: {
          type: "select",
          ordered: true,
          options: opt(OPEN_GAP_VALUES.filter((v) => v !== openGapsLabel(0))),
        },
      },
      {
        key: "appt",
        header: "Next appointment",
        help: "The soonest scheduled visit for this gap. Demo data: the spec has no appointment file.",
        accessor: (r) => r.g.nextAppointment,
        render: (r) => dateCell(r.g.nextAppointment, "None"),
        sortable: true,
        nowrap: true,
        searchable: false,
        filter: { type: "dateRange", presets: apptPresets },
      },
      {
        key: "lastContact",
        header: "Last contact",
        help: "The most recent outreach logged on this gap. Demo data: the contact log is made up.",
        accessor: (r) => {
          const o = lastOutreach(r);
          return o ? new Date(o.when) : null;
        },
        render: (r) => {
          const o = lastOutreach(r);
          return o ? fmtDate(new Date(o.when)) : NOT_CONTACTED;
        },
        sortable: true,
        nowrap: true,
        defaultHidden: true,
        searchable: false,
        filter: { type: "dateRange" },
      },
      {
        key: "contactResult",
        header: "Contact result",
        help: "What happened at the most recent contact. Not contacted yet means no outreach is logged on this gap.",
        accessor: (r) => lastOutreach(r)?.result ?? NOT_CONTACTED,
        sortable: true,
        searchable: false,
        hideBelow: "lg",
        filter: {
          type: "multiselect",
          options: opt([NOT_CONTACTED, ...outreachResults]),
        },
      },
      {
        key: "team",
        header: "Care team",
        help: "The team that looks after this member. Demo data: the spec has no care team field.",
        accessor: (r) => careTeamOf(r.m).team,
        sortable: true,
        defaultHidden: true,
        searchable: false,
        filter: { type: "multiselect", options: opt(careTeams) },
      },
      {
        key: "cm",
        header: "Care manager",
        help: "The care manager working this gap. Demo name: the spec has no care manager field.",
        accessor: (r) => r.g.careManager,
        sortable: true,
        searchable: false,
        hideBelow: "lg",
        filter: { type: "multiselect", options: opt(careManagers) },
      },
      ...demo,
      facets.ageGroup,
      facets.race,
      facets.ethnicity,
      facets.pcp,
      facets.state,
      facets.county,
      facets.military,
    ];
    return list.map((c) => ({
      ...c,
      defaultHidden:
        c.defaultHidden ||
        c.key === "state" ||
        c.key === "county" ||
        c.key === "military",
      // The search box looks at the member's name and Member ID only.
      searchable: c.key === "name" || c.key === "id",
    }));
  }, []);

  const [filters, setFilters] = useState<FilterState>({});
  const [search, setSearch] = useState("");
  const [shown, setShown] = useState(rows.length);

  // The tab counts follow the search and every filter except Measure itself, so picking one measure still shows the others.
  const counts = useMemo(() => {
    const rest = applyFilters(applySearch(rows, columns, search), columns, {
      ...filters,
      measure: [],
    });
    return [...measures]
      .sort((a, b) => a.code.localeCompare(b.code))
      .map((d) => ({
        def: d,
        n: rest.filter((r) => r.g.def.code === d.code).length,
      }));
  }, [rows, columns, search, filters]);
  const picked = (filters.measure as string[] | undefined) ?? [];
  const total = counts.reduce((a, c) => a + c.n, 0);

  return (
    <PageContainer
      title={
        shown === rows.length
          ? `Care Gaps List (${rows.length})`
          : `Care Gaps List (${shown} of ${rows.length})`
      }
      actions={<ClosedSinceButton />}
    >
      <Stack spacing={2}>
        <Tabs
          ariaLabel="Open care gaps by measure"
          gap={false}
          value={picked.length === 1 ? picked[0] : "all"}
          onChange={(k) =>
            setFilters((f) => ({ ...f, measure: k === "all" ? [] : [k] }))
          }
          items={[
            { key: "all", label: "All measures", count: total },
            ...counts.map(({ def, n }) => ({
              key: def.code,
              label: def.code,
              count: n,
            })),
          ]}
        />
        <DataTable
          ariaLabel="Open care gaps"
          columns={columns}
          rows={rows}
          getRowId={(r) => r.id}
          defaultSort={{ key: "found", direction: "asc" }}
          searchPlaceholder="Search by member name, member ID or insurance number…"
          searchPlaceholderCompact="Member name, ID, insurance no."
          search={search}
          onSearchChange={setSearch}
          filters={filters}
          onFiltersChange={setFilters}
          onResultCountChange={setShown}
          storageKey="demo-care-gaps-v3"
          savedViews="care-gaps"
          exportFile="care-gaps"
          stickyHeader
          maxHeight="calc(100vh - 318px)"
          onRowClick={(r) => navigate(`/members/${r.m.id}?tab=gaps`)}
          rowActions={(r) => (
            <RowActions
              id={r.m.id}
              name={r.m.name}
              year={CURRENT_YEAR}
              gapCode={r.g.def.code}
            />
          )}
        />
      </Stack>
    </PageContainer>
  );
}

/** Version 3 has its own page (see CareGapsPageV3.tsx); versions 1 and 2 keep the page above exactly as it was. */
export function CareGapsPage() {
  const { version } = useVersion();
  return version.id >= 3 ? <CareGapsPageV3 /> : <CareGapsPageOld />;
}
