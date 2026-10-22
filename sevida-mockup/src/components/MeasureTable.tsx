import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DataTable } from "sevida-ui";
import type { Column } from "sevida-ui";
import {
  CURRENT_YEAR,
  YEARS,
  measureFor,
  measures,
  members,
  tally,
  yearOptions,
} from "../data";
import type { MeasureDef, Tally } from "../data";
import { membersUrl } from "../insights";
import { useGaps } from "../careGaps";
import { tips } from "../copy";
import { TableLink } from "./TableLink";

interface Row {
  def: MeasureDef;
  year: number;
  t: Tally;
  /** Care gaps still open. Only the current year has care work, so a past year has none. */
  openGaps: number | null;
  closedSinceRun: number | null;
}
const yearQuery = (year: number) =>
  year === CURRENT_YEAR ? "" : `?year=${year}`;

const opts = (values: string[]) =>
  [...new Set(values)].map((v) => ({ value: v, label: v }));

const columns: Column<Row>[] = [
  {
    key: "measure",
    header: "Measure",
    accessor: (r) => r.def.name,
    sortable: true,
    primary: true,
    render: (r) => (
      <TableLink to={`/measures/${r.def.code}${yearQuery(r.year)}`}>
        {r.def.name}
      </TableLink>
    ),
    help: "Each measure is a yes/no check a health plan reports every year.",
    filter: { type: "multiselect", options: opts(measures.map((d) => d.name)) },
  },
  {
    key: "year",
    header: "Measurement year",
    accessor: (r) => String(r.year),
    sortable: true,
    nowrap: true,
    help: "The year the results are for. The current year is being worked now. A past year shows final results only, from a demo copy of the records moved back one year, with that year's NCQA rules.",
    filter: { type: "select", options: yearOptions, required: true },
  },
  {
    key: "code",
    header: "Code",
    accessor: (r) => r.def.code,
    sortable: true,
    nowrap: true,
    help: "The short name the data spec and reports use for this measure.",
    filter: { type: "multiselect", options: opts(measures.map((d) => d.code)) },
  },
  {
    key: "pop",
    header: "Who is counted",
    accessor: (r) => r.def.population,
    sortable: true,
    hideBelow: "md",
    help: "The group of members this measure is about. The age range can change from one measurement year to the next.",
    filter: {
      type: "multiselect",
      options: opts(
        YEARS.flatMap((y) => measures.map((d) => measureFor(d, y).population)),
      ),
    },
  },
  {
    key: "den",
    header: "Members in measure",
    accessor: (r) => r.t.eligible,
    sortable: true,
    align: "right",
    nowrap: true,
    help: "Everyone who belongs to this measure, including excluded members. This is the same number as the Members tab on the measure page.",
    render: (r) => (
      <TableLink to={membersUrl(r.def.code, { year: r.year })}>
        {r.t.eligible}
      </TableLink>
    ),
  },
  {
    key: "met",
    header: "Met",
    accessor: (r) => r.t.met,
    sortable: true,
    align: "right",
    help: tips.met,
  },
  {
    key: "gap",
    header: "Not met",
    accessor: (r) => r.t.gap,
    sortable: true,
    align: "right",
    nowrap: true,
    help: tips.notMet,
    render: (r) => (
      <TableLink to={membersUrl(r.def.code, { status: "Gap", year: r.year })}>
        {r.t.gap}
      </TableLink>
    ),
  },
  {
    key: "open",
    header: "Open care gaps",
    accessor: (r) => r.openGaps,
    render: (r) => (r.openGaps === null ? "–" : r.openGaps),
    sortable: true,
    align: "right",
    nowrap: true,
    help: "Not met members whose care gap is still Open. Closed gaps are not counted here. A past year has no care-gap work, so it shows a dash.",
  },
  {
    key: "closed",
    header: "Gaps closed by staff since last run",
    accessor: (r) => r.closedSinceRun,
    render: (r) => (r.closedSinceRun === null ? "–" : r.closedSinceRun),
    sortable: true,
    align: "right",
    hideBelow: "lg",
    help: "Care gaps that were closed with validated evidence after the last measure calculation. They still count as Not met until the next run, then become Met. A past year has no care-gap work, so it shows a dash.",
  },
  {
    key: "exc",
    header: "Excluded",
    accessor: (r) => r.t.excluded,
    sortable: true,
    align: "right",
    hideBelow: "lg",
    help: tips.excluded,
  },
];

/** The five measures with their rates. Search, sort and show/hide columns like every table. */
export function MeasureTable() {
  const navigate = useNavigate();
  const { gapsOf } = useGaps();
  const rows = useMemo<Row[]>(
    () =>
      YEARS.flatMap((year) =>
        measures.map((base) => ({
          def: measureFor(base, year),
          year,
          t: tally(members, base.code, year),
          openGaps:
            year !== CURRENT_YEAR
              ? null
              : members.filter((m) =>
                  gapsOf(m).some(
                    (g) => g.def.code === base.code && g.status !== "Closed",
                  ),
                ).length,
          closedSinceRun:
            year !== CURRENT_YEAR
              ? null
              : members.filter((m) =>
                  gapsOf(m).some(
                    (g) => g.def.code === base.code && g.status === "Closed",
                  ),
                ).length,
        })),
      ),
    [gapsOf],
  );
  return (
    <DataTable
      ariaLabel="Quality measures"
      title="Measures"
      columns={columns}
      rows={rows}
      getRowId={(r) => `${r.def.code}-${r.year}`}
      defaultSort={{ key: "measure", direction: "asc" }}
      paginated={false}
      searchPlaceholder="Search measures…"
      storageKey="demo-measures-v4"
      savedViews="measures"
      onRowClick={(r) =>
        navigate(`/measures/${r.def.code}${yearQuery(r.year)}`)
      }
    />
  );
}
