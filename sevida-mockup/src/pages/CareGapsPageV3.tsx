import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Stack } from "@mui/material";
import {
  DataTable,
  PageContainer,
  StatusChip,
  Tabs,
  Term,
  applyFilters,
  applySearch,
} from "sevida-ui";
import type { Column, FilterState } from "sevida-ui";
import { RowActions } from "../components/RowActions";
import { renderCrumbLink } from "../components/RouterLinkAdapter";
import { TableLink } from "../components/TableLink";
import { missingEvidenceFor } from "../components/memberColumns";
import { fmtDay, useGaps } from "../careGaps";
import type { GapView } from "../careGaps";
import { CURRENT_YEAR, DEMO_NOW, fmtDate, measures } from "../data";
import type { Member } from "../data";
import { useRole } from "../roles";
import {
  AGE_RANGES,
  GENDER_V3,
  MILITARY_V3,
  MISSING_SHORT,
  V3_GAP_LABEL,
  ageLabel,
  ageParts,
  ageRangeOf,
  ethnicityV3,
  gapShort,
  genderV3,
  memberIdsOf,
  militaryV3,
  raceV3,
  tricareIdOf,
  v3GapOptions,
} from "../v3Data";
import { memberExtras } from "../recordFields";

/** One care gap (open or closed). `n` is how many open gaps the same member has in all. */
interface GapRow {
  id: string;
  m: Member;
  g: GapView;
  n: number;
}
const opt = (xs: string[]) => xs.map((v) => ({ value: v, label: v }));
const sortedSet = (xs: string[]) =>
  [...new Set(xs)].sort((a, b) => a.localeCompare(b));
/** Gaps are due by the end of the measurement year. The sheet says "X Days (MM/DD/YYYY)" and does not say where the date comes from. */
const DUE = new Date(CURRENT_YEAR, 11, 31);
const daysToDue = () =>
  Math.round(
    (DUE.getTime() -
      new Date(
        DEMO_NOW.getFullYear(),
        DEMO_NOW.getMonth(),
        DEMO_NOW.getDate(),
      ).getTime()) /
      86400000,
  );

/**
 * Version 3 of the Care Gaps list (final sheet, Care Gaps Page tab): one row per gap, the tabs All Measures / BCS / CCS / COL / GSD /
 * WCV, default columns Member Name, Tricare ID, Open Gap, Gap Identified Date, Missing Evidence and Due Date, everything else
 * available as a hidden column, and the filters of the Members list plus Gap Name and Gap Status.
 */
export function CareGapsPageV3() {
  const navigate = useNavigate();
  const { gapsOf } = useGaps();
  const { visible } = useRole();
  const rows = useMemo<GapRow[]>(
    () =>
      visible.flatMap((m) => {
        const all = gapsOf(m);
        const n = all.filter((g) => g.status !== "Closed").length;
        return all.map((g) => ({ id: g.id, m, g, n }));
      }),
    [gapsOf, visible],
  );

  const columns = useMemo<Column<GapRow>[]>(() => {
    const toMember = (r: GapRow) => `/members/${r.m.id}?tab=gaps`;
    const valuesOf = (f: (m: Member) => string) =>
      sortedSet(visible.map(f));
    const sourceCol = (
      label: string,
      key: string,
      what: string,
    ): Column<GapRow> => ({
      key,
      header: label,
      help: `Where the member's ${what} came from. The member file records one source for race and ethnicity together, so the two columns match for now.`,
      accessor: (r) => r.m.raceSource,
      sortable: true,
      defaultHidden: true,
      group: "Demographics",
      searchable: false,
    });
    return [
      {
        key: "name",
        header: "Member Name",
        accessor: (r) => r.m.name,
        render: (r) => <TableLink to={toMember(r)}>{r.m.name}</TableLink>,
        sortable: true,
        primary: true,
        defaultPinned: true,
        searchable: true,
      },
      {
        key: "tricare",
        header: "Tricare ID",
        help: "The member's Tricare ID. Sample data: the demo members have no such number, so it is made up.",
        accessor: (r) => tricareIdOf(r.m),
        sortable: true,
        nowrap: true,
        group: "IDs",
        searchable: true,
      },
      {
        key: "measure",
        header: "Open Gap",
        filterLabel: "Gap Name",
        filterPinned: true,
        filterOrder: 1,
        help: "The care gap on this row, one gap per row. A member with more than one gap appears more than once. Hover for the measure's full name.",
        group: "Care Gaps",
        accessor: (r) => V3_GAP_LABEL[r.g.def.code],
        sortable: true,
        render: (r) => (
          <StatusChip
            tone="primary"
            label={V3_GAP_LABEL[r.g.def.code]}
            tip={r.g.def.name}
          />
        ),
        filterAccessor: (r) => r.g.def.code,
        filter: { type: "multiselect", options: v3GapOptions },
        searchable: false,
        width: 280,
      },
      {
        key: "openCount",
        header: "# Open Gaps",
        filterLabel: "# Open Gaps",
        filterOrder: 11,
        help: "How many open gaps this member has in all. A plain count.",
        group: "Care Gaps",
        accessor: (r) => r.n,
        sortable: true,
        align: "right",
        nowrap: true,
        searchable: false,
        filter: { type: "numberCompare" },
      },
      {
        key: "found",
        header: "Gap Identified Date",
        help: "The date this gap was found. Demo date: the spec has no such field.",
        group: "Care Gaps",
        accessor: (r) => r.g.identified,
        render: (r) => fmtDate(r.g.identified),
        sortable: true,
        nowrap: true,
        filterOrder: 9,
        filter: { type: "dateRange" },
        searchable: false,
      },
      {
        key: "missing",
        header: "Missing Evidence",
        help: "What is still needed to close this gap, in two or three words. Hover to see every record that counts and its date window.",
        group: "Care Gaps",
        accessor: (r) =>
          r.g.status === "Closed" ? "" : MISSING_SHORT[r.g.def.code],
        render: (r) => {
          if (r.g.status === "Closed") return "–";
          const x = missingEvidenceFor(r.g.def.code, CURRENT_YEAR);
          return <Term tip={x.windows}>{MISSING_SHORT[r.g.def.code]}</Term>;
        },
        searchable: false,
        width: 180,
      },
      {
        key: "due",
        header: "Due Date",
        help: "Gaps are due by the end of the measurement year: the number of days left, then the date.",
        group: "Care Gaps",
        accessor: () => DUE,
        render: () =>
          `${daysToDue()} days (${fmtDate(DUE)})`,
        sortable: true,
        nowrap: true,
        searchable: false,
      },
      // ---- hidden columns the user can switch on
      {
        ...{
          key: "id",
          header: "Member ID",
          accessor: (r: GapRow) => r.m.id,
          sortable: true,
          nowrap: true,
          defaultHidden: true,
          group: "IDs",
          searchable: false,
        },
      },
      {
        key: "subscriber",
        header: "Subscriber ID",
        accessor: (r) => memberExtras(r.m).subscriberId,
        sortable: true,
        nowrap: true,
        defaultHidden: true,
        group: "IDs",
        searchable: false,
      },
      {
        key: "genesisEhr",
        header: "Genesis EHR ID",
        accessor: (r) => memberIdsOf(r.m)[3].value,
        sortable: true,
        nowrap: true,
        defaultHidden: true,
        group: "IDs",
        searchable: false,
      },
      {
        key: "closedDate",
        header: "Gap Closed Date",
        help: "The day this gap was closed. Empty for an open gap.",
        group: "Care Gaps",
        accessor: (r) =>
          r.g.work.closed ? new Date(r.g.work.closed.on) : null,
        render: (r) => (r.g.work.closed ? fmtDay(r.g.work.closed.on) : ""),
        sortable: true,
        nowrap: true,
        defaultHidden: true,
        searchable: false,
      },
      {
        key: "age",
        header: "Age",
        help: "Age today: days under 1 month, months under 1 year, then years and months.",
        accessor: (r) => ageParts(r.m.dob).days,
        render: (r) => ageLabel(r.m.dob),
        sortable: true,
        nowrap: true,
        defaultHidden: true,
        group: "Demographics",
        searchable: false,
      },
      {
        key: "dob",
        header: "Date of Birth",
        accessor: (r) => r.m.dob,
        render: (r) => fmtDate(r.m.dob),
        sortable: true,
        nowrap: true,
        defaultHidden: true,
        group: "Demographics",
        filterOrder: 6,
        filter: { type: "dateRange" },
        searchable: false,
      },
      {
        key: "ethnicity",
        header: "Ethnicity",
        accessor: (r) => ethnicityV3(r.m),
        sortable: true,
        defaultHidden: true,
        group: "Demographics",
        filterOrder: 7,
        filter: {
          type: "multiselect",
          options: opt(valuesOf(ethnicityV3)),
        },
        searchable: false,
      },
      sourceCol("Ethnicity Source", "ethnicitySource", "ethnicity"),
      {
        key: "sex",
        header: "Gender",
        accessor: (r) => genderV3(r.m),
        sortable: true,
        defaultHidden: true,
        group: "Demographics",
        filterOrder: 10,
        filter: { type: "select", ordered: true, options: opt(GENDER_V3) },
        searchable: false,
      },
      {
        key: "military",
        header: "Military Status",
        help: "Proposed new column of the member file. We likely do not have this data yet. The values here are sample data.",
        accessor: (r) => militaryV3(r.m),
        render: (r) => militaryV3(r.m) ?? "–",
        sortable: true,
        nowrap: true,
        defaultHidden: true,
        group: "Demographics",
        filterOrder: 12,
        filter: { type: "select", ordered: true, options: opt(MILITARY_V3) },
        searchable: false,
      },
      {
        key: "race",
        header: "Race",
        accessor: (r) => raceV3(r.m),
        sortable: true,
        defaultHidden: true,
        group: "Demographics",
        filterOrder: 13,
        filter: { type: "multiselect", options: opt(valuesOf(raceV3)) },
        searchable: false,
      },
      sourceCol("Race Source", "raceSource", "race"),
      // ---- filters with no column of their own
      {
        key: "gapStatus",
        header: "Gap Status",
        filterOnly: true,
        searchable: false,
        filterPinned: true,
        filterOrder: 2,
        accessor: (r) => r.g.status,
        filter: {
          type: "multiselect",
          ordered: true,
          options: opt(["Open", "Closed"]),
        },
      },
      {
        key: "ageRange",
        header: "Age Range",
        filterOnly: true,
        searchable: false,
        filterOrder: 3,
        accessor: (r) => ageRangeOf(r.m.dob),
        filter: {
          type: "multiselect",
          ordered: true,
          options: opt(AGE_RANGES.map((x) => x.label)),
        },
      },
      ...(["Min", "Max"] as const).map(
        (b): Column<GapRow> => ({
          key: `age${b}`,
          header: `Age ${b}`,
          filterOnly: true,
          searchable: false,
          filterOrder: b === "Min" ? 4 : 5,
          accessor: (r) => ageParts(r.m.dob).months,
          filter: {
            type: "numberUnit",
            bound: b === "Min" ? "min" : "max",
            units: [
              { value: "year", label: "year", perUnit: 12 },
              { value: "month", label: "month", perUnit: 1 },
            ],
          },
        }),
      ),
    ];
  }, [visible]);

  // The page opens on the open gaps (the Open Gap column); Gap Status adds the closed ones.
  const [filters, setFilters] = useState<FilterState>({ gapStatus: ["Open"] });
  const [search, setSearch] = useState("");
  const [shown, setShown] = useState(
    rows.filter((r) => r.g.status !== "Closed").length,
  );
  const totalAll = rows.filter((r) => r.g.status !== "Closed").length;

  // The tab counts follow the search and every filter except Gap Name itself, so picking one measure still shows the others.
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
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Care Gaps" }]}
      renderLink={renderCrumbLink}
      title={
        shown === totalAll
          ? `Care Gaps List (${totalAll})`
          : `Care Gaps List (${shown} of ${totalAll})`
      }
    >
      <Stack spacing={2}>
        <Tabs
          ariaLabel="Care gaps by measure"
          gap={false}
          value={picked.length === 1 ? picked[0] : "all"}
          onChange={(k) =>
            setFilters((f) => ({ ...f, measure: k === "all" ? [] : [k] }))
          }
          items={[
            { key: "all", label: "All Measures", count: total },
            ...counts.map(({ def, n }) => ({
              key: def.code,
              label: gapShort(def.code),
              count: n,
            })),
          ]}
        />
        <DataTable
          ariaLabel="Care gaps"
          columns={columns}
          rows={rows}
          getRowId={(r) => r.id}
          defaultSort={{ key: "found", direction: "asc" }}
          searchPlaceholder="Search by Member Name or Tricare ID…"
          searchPlaceholderCompact="Member name, Tricare ID"
          search={search}
          onSearchChange={setSearch}
          filters={filters}
          onFiltersChange={setFilters}
          onResultCountChange={setShown}
          storageKey="demo-care-gaps-v3-ver3-a"
          savedViews="care-gaps-v3"
          exportFile="care-gaps"
          stickyHeader
          maxHeight="calc(100vh - 360px)"
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
