import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DataTable, EmptyState, StatusChip } from "sevida-ui";
import type { Column } from "sevida-ui";
import { Typography } from "@mui/material";
import {
  fmtDay,
  fmtWhen,
  gapStatusTone,
  gapStatuses,
  statusHelp,
  useGaps,
} from "../careGaps";
import type { GapStatus } from "../careGaps";
import { MY, YEARS, fmtDate, hashOf, measures, resultsFor } from "../data";
import type { Member, MeasureCode } from "../data";
import { V3_GAP_LABEL, v3GapOptions } from "../v3Data";
import { TableLink } from "./TableLink";

/** One line of the Care Gaps tab: a gap of one measure in one measurement year. */
interface Row {
  id: string;
  year: number;
  code: MeasureCode;
  status: GapStatus;
  identified: Date;
  explanation: string;
  closed: Date | null;
  closure: { title: string; detail: string } | null;
}

const opt = (xs: string[]) => xs.map((v) => ({ value: v, label: v }));

/**
 * Version 3 of the Care Gaps tab (final sheet, Member Details Page tab): the history of every gap, open and closed, with
 * Measure Year, Gap Name, Gap Status, Gap Identified Date, Gap Identification Explanation, Gap Closed Date and Gap Closure Explanation.
 * The current year comes from the care-gap work. An earlier year has final results only: each measure not met when that year ended is listed, with a
 * made-up identified date inside that year (the spec has no such field) and the status of the same measure this year.
 */
export function CareGapsTabV3({ m }: { m: Member }) {
  const navigate = useNavigate();
  const { gapsOf } = useGaps();
  const rows = useMemo<Row[]>(() => {
    const now: Row[] = gapsOf(m).map((g) => {
      const c = g.work.closed;
      const rec = c && g.work.evidence.find((x) => x.id === c.evidenceId);
      return {
        id: g.id,
        year: MY,
        code: g.def.code,
        status: g.status,
        identified: g.identified,
        explanation: g.result.reason,
        closed: c ? new Date(c.on) : null,
        closure: c
          ? rec
            ? {
                title: `${rec.kind}, ${fmtDate(new Date(`${rec.date}T00:00:00`))}`,
                detail: rec.source,
              }
            : { title: c.reason, detail: "" }
          : null,
      };
    });
    // An earlier year has final results only. A measure not met when that year ended is listed with a made-up identified
    // date inside that year. Its status follows the same measure this year, so the tab never disagrees with "# Open Gaps":
    // still a gap this year = not listed again (it is the same open gap); closed this year = Closed; met this year = Closed by that evidence; otherwise not listed.
    const past: Row[] = YEARS.filter((y) => y !== MY).flatMap((y) => {
      const res = resultsFor(m, y);
      const cur = resultsFor(m, MY);
      return measures
        .filter((x) => res[x.code].state === "Gap")
        .flatMap((x): Row[] => {
          const base = {
            id: `${m.id}-${x.code}-${y}`,
            year: y,
            code: x.code,
            identified: new Date(
              y,
              8,
              1 + (hashOf(`${m.id}${x.code}${y}`) % 60),
            ),
            explanation: res[x.code].reason,
          };
          const same = now.find((r) => r.code === x.code);
          if (same?.status === "Open") return [];
          if (same)
            return [
              {
                ...base,
                status: same.status,
                closed: same.closed,
                closure: same.closure,
              },
            ];
          const ev = cur[x.code].state === "Met" ? cur[x.code].evidence : null;
          if (!ev) return [];
          return [
            {
              ...base,
              status: "Closed" as GapStatus,
              closed: ev.date,
              closure: {
                title: `${ev.kind}, ${fmtDate(ev.date)}`,
                detail: ev.file,
              },
            },
          ];
        });
    });
    return [...now, ...past];
  }, [m, gapsOf]);

  const to = (r: Row) => `/members/${m.id}/gaps/${r.code}`;
  const columns: Column<Row>[] = [
    {
      key: "year",
      header: "Measure Year",
      accessor: (r) => String(r.year),
      sortable: true,
      nowrap: true,
      filterOrder: 1,
      filter: { type: "select", ordered: true, options: opt(YEARS.map(String)) },
    },
    {
      key: "name",
      header: "Gap Name",
      help: "The measure the gap belongs to, for example BCS - Breast Cancer Screening.",
      accessor: (r) => V3_GAP_LABEL[r.code],
      sortable: true,
      primary: true,
      width: 240,
      filterOrder: 2,
      filter: { type: "multiselect", options: v3GapOptions },
      filterAccessor: (r) => r.code,
      render: (r) =>
        r.year === MY ? (
          <TableLink to={to(r)}>{V3_GAP_LABEL[r.code]}</TableLink>
        ) : (
          V3_GAP_LABEL[r.code]
        ),
    },
    {
      key: "status",
      header: "Gap Status",
      help: statusHelp.gap,
      accessor: (r) => r.status,
      sortable: true,
      nowrap: true,
      filterOrder: 3,
      filter: { type: "multiselect", options: opt(gapStatuses) },
      render: (r) => (
        <StatusChip tone={gapStatusTone[r.status]} label={r.status} />
      ),
    },
    {
      key: "found",
      header: "Gap Identified Date",
      help: "The day the gap was found when the measures were calculated. Demo date: the spec has no such field.",
      accessor: (r) => r.identified,
      render: (r) => fmtDate(r.identified),
      sortable: true,
      nowrap: true,
      filterOrder: 5,
      filter: { type: "dateRange" },
    },
    {
      key: "reason",
      header: "Gap Identification Explanation",
      help: "What identified the gap: why the result is Not met, from the measure check.",
      accessor: (r) => r.explanation,
      width: 280,
    },
    {
      key: "closedDate",
      header: "Gap Closed Date",
      help: "The day the gap was closed. Empty for an open gap.",
      accessor: (r) => r.closed,
      render: (r) => (r.closed ? fmtDay(r.closed.toISOString()) : ""),
      sortable: true,
      nowrap: true,
      filterOrder: 4,
      filter: { type: "dateRange" },
    },
    {
      key: "closure",
      header: "Gap Closure Explanation",
      help: "What closed the gap: the record that closed it, and where it came from. Empty for an open gap.",
      accessor: (r) => r.closure?.title ?? "",
      width: 260,
      render: (r) =>
        r.closure ? (
          <>
            {r.closure.title}
            {r.closure.detail && (
              <Typography
                variant="caption"
                component="div"
                sx={{ color: "text.secondary" }}
              >
                {r.closure.detail}
                {r.closed ? ` · closed ${fmtWhen(r.closed.toISOString())}` : ""}
              </Typography>
            )}
          </>
        ) : (
          ""
        ),
    },
  ];

  return (
    <DataTable
      ariaLabel="Care gaps"
      title="Care Gaps"
      columns={columns}
      rows={rows}
      getRowId={(r) => r.id}
      paginated={false}
      defaultSort={{ key: "found", direction: "desc" }}
      searchPlaceholder="Search by Gap Name…"
      onRowClick={(r) => r.year === MY && navigate(to(r))}
      emptyState={
        <EmptyState
          title="No care gaps"
          description={`${m.name} has no care gaps, open or closed.`}
        />
      }
    />
  );
}
