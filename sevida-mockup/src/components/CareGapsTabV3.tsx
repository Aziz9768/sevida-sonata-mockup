import { useMemo } from "react";
import { displayName, pcmPerson } from "../v16Data";
import { useNavigate } from "react-router-dom";
import { DataTable, EmptyState, StatusChip } from "sevida-ui";
import type { Column } from "sevida-ui";
import { Typography } from "@mui/material";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import {
  fmtDay,
  fmtWhen,
  gapStatusTone,
  evidenceRoles,
  gapPriority,
  gapRole,
  gapStatuses,
  gapStatusesV12,
  priorityRank,
  statusHelp,
  useGaps,
} from "../careGaps";
import type { GapStatus } from "../careGaps";
import { DEMO_NOW, MY, YEARS, fmtDate, hashOf, measures, resultsFor } from "../data";
import type { Member, MeasureCode } from "../data";
import { RECOMMENDED_SENTENCE, cgGapOptions, cgLabel } from "../v3Data";
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
  /** Version 12: why the member is excluded (status Excluded). */
  exclusion?: string;
  /** Version 12: Evidence Role and Reason. */
  role?: string;
  roleReason?: string;
  /** Version 16: GSD's below-8 and above-9 rates. */
  rate?: "<8" | ">9";
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
  const { gapsOf, excludedOf } = useGaps();
  const rows = useMemo<Row[]>(() => {
    const now: Row[] = gapsOf(m).map((g) => {
      const c = g.work.closed;
      const rec = c && g.work.evidence.find((x) => x.id === c.evidenceId);
      return {
        id: g.id,
        year: MY,
        code: g.def.code,
        status: g.status,
        rate: g.rate,
        identified: g.identified,
        explanation: g.result.reason,
        role: gapRole(g).role,
        roleReason: gapRole(g).reason,
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
    // Version 12: the measures the member is excluded from are listed too, with status Excluded and the reason.
    const excluded: Row[] = excludedOf(m).map((g) => ({
      id: g.id,
      year: MY,
      code: g.def.code,
      status: g.status,
      identified: g.identified,
      explanation: g.result.reason,
      closed: null,
      closure: null,
      exclusion: g.exclusionReason,
      role: gapRole(g).role,
      roleReason: gapRole(g).reason,
    }));
    // Version 16 (LPP-16155): the tab lists the member's Open and Closed gaps of the current measurement year only.
    if (getVersion() >= 16) return now.filter((r) => r.status === "Open" || r.status === "Closed");
    return [...now, ...excluded, ...past];
  }, [m, gapsOf, excludedOf]);

  const to = (r: Row) => `/members/${m.id}/gaps/${r.code}`;

  // ---- Version 12 (Application Tables, Care Gaps tab): Gap Name, Gap Status, Priority, Gap Identified Date, Due Date, Recommended Action,
  // Evidence, Gap Closed Date. Optional in the Columns panel: Measure Code, Closure Source, Exclusion Reason, Primary Care Manager.
  // Open gaps first by Priority, then Closed, then Excluded. Priority is the same sample value as on the Care Gaps list and the details page.
  if (getVersion() >= 12) {
    const dash = "--";
    const dueOf = (r: Row) => new Date(r.year, 11, 31);
    const prio = (r: Row) => gapPriority({ id: r.id, status: r.status, due: dueOf(r) });
    const pcm = (() => {
      const p = pcmPerson(m);
      return p ? `${p.name} - NPI: ${p.npi}` : "Not sent";
    })();
    const nameOf = (r: Row) => `${cgLabel(r.code)} (${r.year})${getVersion() >= 16 && r.rate ? ` (HbA1c ${r.rate === "<8" ? "below 8%" : "above 9%"} rate)` : ""}`;
    // Version 16 (LPP-16155): the Evidence column says why the gap is open or closed (up to 2 lines, "…see more") and links to the Evidence tab.
    const evidenceText = (r: Row) =>
      r.rate === ">9"
        ? r.explanation.replace(/ \(8% or higher\)$/, "") + " (not above 9%)"
        : r.status === "Closed" && r.closure ? `${r.closure.title}${r.closure.detail ? `. ${r.closure.detail}` : ""}` : r.explanation;
    const optional = { group: "Optional", defaultHidden: true, searchable: false } as const;
    const cols: Column<Row>[] = [
      {
        key: "name",
        header: "Gap Name",
        help: "The HEDIS care gap and the measurement year.",
        accessor: (r) => `${nameOf(r)} ${r.code}`,
        sortable: true,
        primary: true,
        defaultPinned: true,
        searchable: true,
        width: 300,
        filter: { type: "multiselect", options: cgGapOptions },
        filterAccessor: (r) => r.code,
        render: (r) => <TableLink to={to(r)}>{nameOf(r)}</TableLink>,
      },
      {
        key: "status",
        header: "Gap Status",
        accessor: (r) => r.status,
        searchable: false,
        sortable: true,
        nowrap: true,
        filter: { type: "multiselect", options: opt(gapStatusesV12) },
        render: (r) =>
          r.status === "Excluded" ? (
            <StatusChip tone={gapStatusTone.Excluded} label="Excluded" />
          ) : (
            <GapStatusChip closed={r.status === "Closed"} />
          ),
      },
      {
        key: "priority",
        header: "Priority",
        help: getVersion() >= 16 ? "How urgent an open gap is, based on the days left until the due date. High: 45 days or fewer. Medium: 46 to 90 days. Low: more than 90 days. The same value as on the Care Gaps list." : "How urgent an open gap is: High, Medium or Low. The same value as on the Care Gaps list. Tier definitions to be confirmed. Sample data.",
        accessor: (r) => priorityRank(prio(r)),
        filterAccessor: (r) => prio(r) ?? "N/A",
        filter: { type: "multiselect", options: opt(["High", "Medium", "Low"]) },
        searchable: false,
        sortable: true,
        nowrap: true,
        render: (r) => prio(r) ?? dash,
      },
      {
        key: "found",
        header: "Gap Identified Date",
        accessor: (r) => r.identified,
        searchable: false,
        sortable: true,
        nowrap: true,
        filter: { type: "dateRange" },
        render: (r) => fmtDate(r.identified),
      },
      {
        key: "due",
        header: "Due Date",
        // Version 16: closed gaps keep their due date too ("the date by which action should be taken to close the gap or keep it closed").
        accessor: (r) => (r.status === "Open" || (getVersion() >= 16 && r.status === "Closed") ? dueOf(r) : null),
        searchable: false,
        sortable: true,
        nowrap: true,
        filter: { type: "dateRange" },
        render: (r) => (r.status === "Open" || (getVersion() >= 16 && r.status === "Closed") ? fmtDate(dueOf(r)) : dash),
      },
      {
        key: "action",
        header: "Recommended Action",
        accessor: (r) => (r.status === "Open" ? RECOMMENDED_SENTENCE(r.code, r.year) : ""),
        searchable: false,
        width: 260,
        render: (r) => (r.status === "Open" ? <LlmText text={RECOMMENDED_SENTENCE(r.code, r.year)} /> : dash),
      },
      {
        key: "evidence",
        header: "Evidence",
        help: getVersion() >= 16 ? "Why the gap is open or closed." : "Opens the Evidence tab of the care gap: the records that count for the gap, or that closed it.",
        accessor: (r) => (getVersion() >= 16 ? evidenceText(r) : r.year === MY ? "Evidence" : ""),
        searchable: false,
        nowrap: getVersion() >= 16 ? undefined : true,
        width: getVersion() >= 16 ? 280 : undefined,
        render: (r) =>
          getVersion() >= 16 ? (
            <>
              <LlmText text={evidenceText(r)} />
              {r.year === MY && <TableLink to={`${to(r)}?tab=evidence`}>Evidence tab</TableLink>}
            </>
          ) : r.year === MY ? (
            <TableLink to={`${to(r)}?tab=evidence`}>Evidence</TableLink>
          ) : (
            dash
          ),
      },
      {
        key: "closedDate",
        header: "Gap Closed Date",
        accessor: (r) => r.closed,
        searchable: false,
        sortable: true,
        nowrap: true,
        filter: { type: "dateRange" },
        render: (r) => (r.closed ? fmtDay(r.closed.toISOString()) : dash),
      },
      {
        key: "role",
        header: "Evidence Role",
        help: "How the evidence relates to the gap: Closes gap, Exclusion or Doesn't qualify.",
        accessor: (r) => r.role ?? "",
        render: (r) => r.role ?? dash,
        filter: { type: "multiselect", options: opt(evidenceRoles) },
        searchable: false,
        sortable: true,
        nowrap: true,
      },
      {
        key: "roleReason",
        header: "Reason",
        help: "Explains a Doesn't qualify row, for example dated outside the lookback window or code not in the measure's value set.",
        accessor: (r) => r.roleReason ?? "",
        render: (r) => r.roleReason || dash,
        searchable: false,
        width: 300,
      },
      { key: "code", header: "Measure Code", help: "The measure's abbreviation, for example BCS-E.", accessor: (r) => r.code, sortable: true, nowrap: true, ...optional },
      {
        key: "closureSource",
        header: "Closure Source",
        help: "Where the record that closed the gap came from. Blank unless the gap is closed.",
        accessor: (r) => (r.status === "Closed" ? r.closure?.detail ?? "" : ""),
        render: (r) => (r.status === "Closed" && r.closure?.detail ? r.closure.detail : dash),
        sortable: true,
        width: 220,
        ...optional,
      },
      {
        key: "exclusionReason",
        header: "Exclusion Reason",
        help: "Why the member is excluded from the measure. Shown for Excluded gaps. Sample data.",
        accessor: (r) => r.exclusion ?? "",
        render: (r) => r.exclusion ?? dash,
        sortable: true,
        width: 260,
        ...optional,
      },
      { key: "pcm", header: "Primary Care Manager", help: "The member's primary care manager. Sample data: the demo members have none, so it is made up.", accessor: () => pcm, render: () => pcm, nowrap: true, ...optional },
    ];
    const order = { Open: 0, Closed: 1, Excluded: 2 } as const;
    const sorted = [...rows].sort(
      (a, b) =>
        order[a.status] - order[b.status] ||
        priorityRank(prio(a)) - priorityRank(prio(b)) ||
        b.identified.getTime() - a.identified.getTime(),
    );
    // Version 16 (LPP-16155): the table is the ticket's eight columns. Evidence Role and Reason are not in the ticket, so they move to the Columns panel (off).
    // Created On, Created By, Last Updated and Related Records are added there, and every column has an info (i) text.
    const v16 = getVersion() >= 16;
    // The i-button texts are the ticket's, word for word.
    const HELP16: Record<string, string> = {
      name: "The HEDIS Care Gap and Measurement Year",
      status: "Indicates whether the care gap is open or closed. Open gaps require actions.",
      priority: "How urgent the gap is, based on how close it is to its due date: High, Medium or Low.",
      found: "Date on which the gap was identified. Based on information used to identify the gap - e.g. claims service date if known, otherwise shows the run date when the Gaps in Care engine was last run.",
      due: "Date by which the gap needs to be closed in order to manage member's care. Also impacts the Gap Met % rates.",
      action: "Actions to take to close the gap. A gap will show as Closed once evidence such as claims confirms the closure. Conducting the activity does not automatically close the gap.",
      evidence: "Why the gap is open or closed.",
      closedDate: "Date on which the gap was closed. Based on information used to close the gap - e.g. claims service date if known, otherwise shows the run date when the Gaps in Care engine was last run.",
    };
    // Not in the ticket: Measure Code, Closure Source, Exclusion Reason, Primary Care Manager, Evidence Role and Reason.
    const NOT_IN_TICKET = ["code", "closureSource", "exclusionReason", "pcm", "role", "roleReason"];
    const runDate = new Date(DEMO_NOW.getTime() - 86_400_000);
    const hiddenOnly = { group: "Optional", defaultHidden: true, searchable: false, nowrap: true } as const;
    const cols16: Column<Row>[] = [
      ...cols
        .filter((c) => !NOT_IN_TICKET.includes(c.key))
        .map((c) => {
          const withHelp = HELP16[c.key] ? { ...c, help: HELP16[c.key] } : c;
          if (c.key === "status") return { ...withHelp, filter: { type: "multiselect" as const, options: opt(gapStatuses) } };
          if (c.key === "action") return { ...withHelp, render: (r: Row) => (r.status === "Open" ? <LlmText inlineMore text={RECOMMENDED_SENTENCE(r.code, r.year)} /> : dash) };
          if (c.key === "evidence") return { ...withHelp, render: (r: Row) => <LlmText inlineMore moreTo={`${to(r)}?tab=evidence`} text={evidenceText(r)} /> };
          return withHelp;
        }),
      { key: "createdOn", header: "Created On", help: "Date the gap record was created.", accessor: (r) => r.identified, render: (r) => fmtDate(r.identified), sortable: true, ...hiddenOnly },
      { key: "createdBy", header: "Created By", help: "Who or what created the gap record.", accessor: () => "System", sortable: true, ...hiddenOnly },
      // An open gap is refreshed by every run of the Gaps in Care engine, a closed one stops changing when it closes.
      { key: "lastUpdated", header: "Last Updated", help: "Date the gap record last changed.", accessor: (r) => r.closed ?? runDate, render: (r) => fmtDate(r.closed ?? runDate), sortable: true, ...hiddenOnly },
      { key: "related", header: "Related Records", help: "The records on the Evidence tab of this gap.", accessor: () => "Evidence", render: (r) => <TableLink to={`${to(r)}?tab=evidence`}>Evidence</TableLink>, ...hiddenOnly },
    ];
    return (
      <DataTable
        ariaLabel="Care gaps"
        title={v16 ? `Member's Open and Closed Care Gaps in the current Measurement Year, ${MY}` : "List of Care Gaps"}
        // Version 16 (LPP-16155): the title keeps the ticket's wording, with a lowercase "current".
        titleAsWritten={v16}
        columns={v16 ? cols16 : cols}
        rows={sorted}
        getRowId={(r) => r.id}
        paginated={false}
        defaultSort={v16 ? { key: "priority", direction: "asc" } : undefined}
        searchPlaceholder="Search by Measure or Abbreviation"
        // Version 16 (LPP-16155 description): "No Search". Filters stay.
        toolbar={v16 ? { search: false } : undefined}
        titleIcon={v16 ? <PersonOutlineOutlinedIcon /> : undefined}
        noResultsTitle="No care gaps found"
        storageKey={v16 ? "demo-member-care-gaps-v16-a" : "demo-member-care-gaps-v12-a"}
        columnsPanel={{ tableOrder: true, search: false }}
        onRowClick={(r) => r.year === MY && navigate(to(r))}
        emptyState={<EmptyState title="No care gaps" description={`${v16 ? displayName(m) : m.name} has no care gaps, open or closed.`} />}
      />
    );
  }

  // ---- Version 11 (LPP-16155 + Application Tables): Gap Name (Measurement Year), Gap Status, Gap Identified Date, Priority,
  // Due Date, Recommended Action, PCM, Gap Closed Date, Gap Evidence. Default columns only, so no Columns button.
  if (getVersion() >= 11) {
    const dash = "--";
    const DAY = 86_400_000;
    const dueOf = (r: Row) => new Date(r.year, 11, 31);
    const priorityOf = (r: Row): string => {
      if (r.status === "Closed") return dash;
      const left = Math.round((dueOf(r).getTime() - DEMO_NOW.getTime()) / DAY);
      return left <= 45 ? "High" : left <= 90 ? "Medium" : "Low";
    };
    const rank: Record<string, number> = { High: 0, Medium: 1, Low: 2, [dash]: 3 };
    const pcm = (() => {
      const p = pcmPerson(m);
      return p ? `${p.name} - NPI: ${p.npi}` : "Not sent";
    })();
    const nameOf = (r: Row) => `${cgLabel(r.code)} (${r.year})${getVersion() >= 16 && r.rate ? ` (HbA1c ${r.rate === "<8" ? "below 8%" : "above 9%"} rate)` : ""}`;
    const evidenceOf = (r: Row) =>
      r.status === "Closed" && r.closure
        ? `${r.closure.title}${r.closure.detail ? `. ${r.closure.detail}` : ""}`
        : r.explanation;
    const cols: Column<Row>[] = [
      {
        key: "name",
        header: "Gap Name (Measurement Year)",
        accessor: (r) => `${nameOf(r)} ${r.code}`,
        sortable: true,
        primary: true,
        defaultPinned: true,
        searchable: true,
        width: 300,
        filter: { type: "multiselect", options: cgGapOptions },
        filterAccessor: (r) => r.code,
        render: (r) => <TableLink to={to(r)}>{nameOf(r)}</TableLink>,
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
        header: "Gap Identified Date",
        accessor: (r) => r.identified,
        searchable: false,
        sortable: true,
        nowrap: true,
        filter: { type: "dateRange" },
        render: (r) => fmtDate(r.identified),
      },
      {
        key: "priority",
        header: "Priority",
        help: "How soon the gap needs attention: High when it is due within 45 days, Medium within 90 days, otherwise Low.",
        accessor: (r) => rank[priorityOf(r)],
        filterAccessor: (r) => priorityOf(r),
        filter: { type: "multiselect", options: opt(["High", "Medium", "Low"]) },
        searchable: false,
        sortable: true,
        nowrap: true,
        render: (r) => priorityOf(r),
      },
      {
        key: "due",
        header: "Due Date",
        accessor: (r) => (r.status === "Closed" ? null : dueOf(r)),
        searchable: false,
        sortable: true,
        nowrap: true,
        filter: { type: "dateRange" },
        render: (r) => (r.status === "Closed" ? dash : fmtDate(dueOf(r))),
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
        key: "pcm",
        header: getVersion() >= 11 ? "Primary Care Manager" : "PCM",
        help: "The member's primary care manager. Sample data: the demo members have none, so it is made up.",
        accessor: () => pcm,
        searchable: false,
        nowrap: true,
        render: () => pcm,
      },
      {
        key: "closedDate",
        header: "Gap Closed Date",
        accessor: (r) => r.closed,
        searchable: false,
        sortable: true,
        nowrap: true,
        filter: { type: "dateRange" },
        render: (r) => (r.closed ? fmtDay(r.closed.toISOString()) : dash),
      },
      {
        key: "evidence",
        header: "Gap Evidence",
        help: "Why the gap is open, or what closed it, written by the AI.",
        accessor: (r) => evidenceOf(r),
        searchable: false,
        width: 300,
        render: (r) => <LlmText text={evidenceOf(r)} />,
      },
    ];
    // Gap Name A to Z; gaps with the same name: newest identification date first (the table sort is stable).
    const sorted = [...rows].sort((a, b) => b.identified.getTime() - a.identified.getTime());
    return (
      <DataTable
        ariaLabel="Care gaps"
        title="List of Care Gaps"
        columns={cols}
        rows={sorted}
        getRowId={(r) => r.id}
        paginated={false}
        defaultSort={{ key: "name", direction: "asc" }}
        searchPlaceholder="Search by Measure or Abbreviation"
        noResultsTitle="No care gaps found"
        storageKey="demo-member-care-gaps-v11-a"
        toolbar={{ columns: false }}
        onRowClick={(r) => r.year === MY && navigate(to(r))}
        emptyState={<EmptyState title="No care gaps" description={`${m.name} has no care gaps, open or closed.`} />}
      />
    );
  }

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
        accessor: (r) => cgLabel(r.code),
        sortable: true,
        primary: true,
        defaultPinned: true,
        alwaysVisible: true,
        width: 260,
        render: (r) => <TableLink to={to(r)}>{cgLabel(r.code)}</TableLink>,
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
    const named = v8cols.map((c) => (c.key === "name" ? { ...c, searchable: true, accessor: (r: Row) => `${cgLabel(r.code)} ${r.code}` } : c));
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
      accessor: (r) => cgLabel(r.code),
      sortable: true,
      primary: true,
      width: 240,
      filterOrder: 2,
      filter: { type: "multiselect", options: cgGapOptions },
      filterAccessor: (r) => r.code,
      render: (r) =>
        r.year === MY ? (
          <TableLink to={to(r)}>{cgLabel(r.code)}</TableLink>
        ) : (
          cgLabel(r.code)
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
