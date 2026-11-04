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
import { DEMO_NOW, MY, YEARS, fmtDate, hashOf, measures, resultsFor } from "../data";
import type { Member, MeasureCode } from "../data";
import { RECOMMENDED_SENTENCE, V3_GAP_LABEL, v3GapOptions } from "../v3Data";
import { getVersion } from "../version";
import { GapStatusChip } from "./GapStatusChip";
import { LlmText } from "./LlmText";
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

  // ---- Version 8 (LPP-16155)
  if (getVersion() >= 8) {
    const dash = "--";
    const DAY = 86_400_000;
    const dueOf = (r: Row) => new Date(r.year, 11, 31);
    /** High when the due date is within 45 days, Medium within 90, otherwise Low. Closed gaps have no priority. */
    const priorityOf = (r: Row): string => {
      if (r.status === "Closed") return dash;
      const left = Math.round((dueOf(r).getTime() - DEMO_NOW.getTime()) / DAY);
      return left <= 45 ? "High" : left <= 90 ? "Medium" : "Low";
    };
    const rank: Record<string, number> = { High: 0, Medium: 1, Low: 2, [dash]: 3 };
    const v8cols: Column<Row>[] = [
      {
        key: "priority",
        header: "Priority",
        help: "How soon the gap needs attention: High when it is due within 45 days, Medium within 90 days, otherwise Low.",
        accessor: (r) => rank[priorityOf(r)],
        searchable: false,
        sortable: true,
        nowrap: true,
        render: (r) => priorityOf(r),
      },
      {
        key: "name",
        header: "Gap Name",
        accessor: (r) => V3_GAP_LABEL[r.code],
        sortable: true,
        primary: true,
        defaultPinned: true,
        alwaysVisible: true,
        width: 260,
        render: (r) => <TableLink to={to(r)}>{V3_GAP_LABEL[r.code]}</TableLink>,
      },
      {
        key: "status",
        header: "Gap Status",
        accessor: (r) => r.status,
        searchable: false,
        sortable: true,
        nowrap: true,
        filter: { type: "multiselect", options: opt(gapStatuses) },
        render: (r) => <GapStatusChip closed={r.status === "Closed"} />,
      },
      {
        key: "found",
        header: "Gap Identification Date",
        accessor: (r) => r.identified,
        searchable: false,
        render: (r) => fmtDate(r.identified),
        sortable: true,
        nowrap: true,
      },
      {
        key: "closedDate",
        header: "Gap Closed Date",
        accessor: (r) => r.closed,
        searchable: false,
        render: (r) => (r.closed ? fmtDay(r.closed.toISOString()) : dash),
        sortable: true,
        nowrap: true,
      },
      {
        key: "details",
        header: "Gap Details",
        help: "Why the gap was identified, written by the AI.",
        accessor: (r) => r.explanation,
        searchable: false,
        width: 280,
        render: (r) => <LlmText text={r.explanation} />,
      },
      {
        key: "action",
        header: "Recommended Action",
        accessor: (r) => (r.status === "Closed" ? "" : RECOMMENDED_SENTENCE(r.code, r.year)),
        searchable: false,
        width: 260,
        render: (r) => (r.status === "Closed" ? dash : <LlmText text={RECOMMENDED_SENTENCE(r.code, r.year)} />),
      },
      {
        key: "due",
        header: "Due Date",
        accessor: (r) => (r.status === "Closed" ? null : dueOf(r)),
        searchable: false,
        render: (r) => (r.status === "Closed" ? dash : fmtDate(dueOf(r))),
        sortable: true,
        nowrap: true,
      },
      {
        key: "year",
        header: "Measure Year",
        accessor: (r) => String(r.year),
        searchable: false,
        sortable: true,
        nowrap: true,
        filter: { type: "select", ordered: true, options: opt(YEARS.map(String)) },
      },
      {
        key: "related",
        header: "Related Records",
        help: "The records that are evidence for this gap. Select to open them.",
        defaultHidden: true,
        accessor: (r) => (r.year === MY ? "Evidence" : ""),
        searchable: false,
        nowrap: true,
        render: (r) => (r.year === MY ? <TableLink to={`${to(r)}?tab=evidence`}>Evidence</TableLink> : dash),
      },
      {
        key: "updated",
        header: "Last Updated",
        defaultHidden: true,
        accessor: (r) => r.closed ?? r.identified,
        searchable: false,
        render: (r) => fmtDate(r.closed ?? r.identified),
        sortable: true,
        nowrap: true,
      },
    ];
    // Gap Name A to Z; gaps with the same name: newest identification date first (the table sort is stable).
    const sorted = [...rows].sort((a, b) => b.identified.getTime() - a.identified.getTime());
    // Search: the measure's name or its abbreviation. The name column is the only searched one.
    const named = v8cols.map((c) => (c.key === "name" ? { ...c, searchable: true, accessor: (r: Row) => `${V3_GAP_LABEL[r.code]} ${r.code}` } : c));
    return (
      <DataTable
        ariaLabel="Care gaps"
        title="List of Care Gaps"
        columns={named}
        rows={sorted}
        getRowId={(r) => r.id}
        paginated={false}
        defaultSort={{ key: "name", direction: "asc" }}
        searchPlaceholder="Search by Measure or Abbreviation…"
        noResultsTitle="No care gaps found"
        storageKey="demo-member-care-gaps-v8-a"
        onRowClick={(r) => r.year === MY && navigate(to(r))}
        emptyState={<EmptyState title="No care gaps" description={`${m.name} has no care gaps, open or closed.`} />}
      />
    );
  }
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
