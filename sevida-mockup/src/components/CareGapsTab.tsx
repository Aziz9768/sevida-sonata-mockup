import { useNavigate } from "react-router-dom";
import { Stack, Typography } from "@mui/material";
import {
  Button,
  DataTable,
  EmptyState,
  InfoBanner,
  StatusChip,
} from "sevida-ui";
import type { Column } from "sevida-ui";
import {
  evidenceStatuses,
  evidenceTone,
  fmtWhen,
  gapStatusTone,
  gapStatuses,
  nextActionOf,
  statusHelp,
  useGaps,
} from "../careGaps";
import type { GapView } from "../careGaps";
import { MY, fmtDate, measures, resultsFor, stateLabel } from "../data";
import type { Member } from "../data";
import { TableLink } from "./TableLink";

/** What closed a gap: the evidence record named when it was closed, or the reason when none was named. */
const closedByOf = (g: GapView) => {
  const c = g.work.closed;
  if (!c) return null;
  const rec = g.work.evidence.find((x) => x.id === c.evidenceId);
  return rec
    ? {
        title: `${rec.kind}, ${fmtDate(new Date(`${rec.date}T00:00:00`))}`,
        detail: `${rec.source} · closed ${fmtWhen(c.on)}`,
      }
    : { title: c.reason, detail: `Closed ${fmtWhen(c.on)}` };
};

const opt = (xs: string[]) => xs.map((v) => ({ value: v, label: v }));

/** Every Not Met measure for one member, with the work on it. Needs Review items are listed apart: they are not care gaps. */
export function CareGapsTab({ m, year = MY }: { m: Member; year?: number }) {
  const navigate = useNavigate();
  const { gapsOf } = useGaps();
  const gaps = year === MY ? gapsOf(m) : [];
  const results = resultsFor(m, year);
  const review = measures.filter((x) => results[x.code].state === "Review");
  const to = (g: GapView) => `/members/${m.id}/gaps/${g.def.code}`;

  const columns: Column<GapView>[] = [
    {
      key: "name",
      header: "Measure name",
      accessor: (g) => g.def.name,
      sortable: true,
      primary: true,
      width: 190,
      filter: {
        type: "multiselect",
        options: opt(measures.map((x) => x.name)),
      },
      render: (g) => <TableLink to={to(g)}>{g.def.name}</TableLink>,
    },
    {
      key: "code",
      header: "Measure code",
      accessor: (g) => g.def.code,
      sortable: true,
      nowrap: true,
    },
    {
      key: "status",
      header: "Gap status",
      help: statusHelp.gap,
      accessor: (g) => g.status,
      sortable: true,
      nowrap: true,
      filter: { type: "multiselect", options: opt(gapStatuses) },
      render: (g) => (
        <StatusChip tone={gapStatusTone[g.status]} label={g.status} />
      ),
    },
    {
      key: "found",
      header: "Gap identified",
      help: "The day the gap was found when the measures were calculated. Demo date: the spec has no such field.",
      accessor: (g) => g.identified,
      render: (g) => fmtDate(g.identified),
      sortable: true,
      nowrap: true,
      hideBelow: "md",
      filter: { type: "dateRange" },
    },
    {
      key: "reason",
      header: "Gap reason",
      help: "Why the result is Not Met, from the measure check.",
      accessor: (g) => g.result.reason,
      width: 200,
      hideBelow: "md",
    },
    {
      key: "closedBy",
      header: "Closed by",
      help: "For a closed gap: the record that closed it and the day it was done. Open gaps show a dash.",
      accessor: (g) => closedByOf(g)?.title ?? "–",
      width: 220,
      hideBelow: "md",
      render: (g) => {
        const c = closedByOf(g);
        if (!c) return "–";
        return (
          <>
            {c.title}
            <Typography
              variant="caption"
              component="div"
              sx={{ color: "text.secondary" }}
            >
              {c.detail}
            </Typography>
          </>
        );
      },
    },
    {
      key: "evidence",
      header: "Evidence status",
      help: statusHelp.evidence,
      accessor: (g) => g.evidenceStatus,
      sortable: true,
      nowrap: true,
      filter: { type: "multiselect", options: opt(evidenceStatuses) },
      render: (g) => (
        <StatusChip
          tone={evidenceTone[g.evidenceStatus]}
          label={g.evidenceStatus}
        />
      ),
    },
    {
      key: "cm",
      header: "Assigned care manager",
      help: "Demo name: the spec has no care manager field.",
      accessor: (g) => g.careManager,
      sortable: true,
      width: 130,
      hideBelow: "lg",
    },
    {
      key: "next",
      header: "Next action",
      help: "The open task that is due first, or the evidence step when evidence is what is waiting. Demo tasks: the spec has no task data.",
      width: 200,
      accessor: (g) => nextActionOf(g).label,
      render: (g) => {
        const n = nextActionOf(g);
        return (
          <>
            {n.label}
            {n.due && (
              <Typography
                variant="caption"
                component="div"
                sx={{ color: n.overdue ? "error.main" : "text.secondary" }}
              >
                Due {fmtDate(n.due)}
                {n.overdue ? " (overdue)" : ""}
              </Typography>
            )}
          </>
        );
      },
      hideBelow: "lg",
    },
    {
      key: "updated",
      header: "Last updated",
      accessor: (g) => g.lastUpdated,
      render: (g) => fmtWhen(g.lastUpdated.toISOString()),
      sortable: true,
      nowrap: true,
      hideBelow: "lg",
    },
  ];

  if (year !== MY)
    return (
      <InfoBanner tone="info" title={`Measurement year ${year}`}>
        Care-gap work (care manager, appointments, outreach, evidence) exists
        for {MY} only. For {year} the results are final: see the Measures tab
        for what was met, not met, excluded or needs review.{" "}
        <TableLink to={`/members/${m.id}?tab=measures&year=${year}`}>
          Open the {year} measures
        </TableLink>
      </InfoBanner>
    );
  return (
    <Stack spacing={2}>
      {review.length > 0 && (
        <InfoBanner tone="warning">
          <strong>Needs Review, not a care gap.</strong> The evidence is
          missing, incomplete or conflicting, so{" "}
          {review.map((x) => x.name).join(" and ")}{" "}
          {review.length === 1 ? "is" : "are"} not counted as{" "}
          {review.length === 1 ? "a gap" : "gaps"}:{" "}
          {review.map((x) => results[x.code].reason).join(" ")}{" "}
          <TableLink to={`/members/${m.id}?tab=measures`}>
            See the {stateLabel.Review} check
          </TableLink>
        </InfoBanner>
      )}
      <DataTable
        ariaLabel="Care gaps"
        title="Care gaps"
        columns={columns}
        rows={gaps}
        getRowId={(g) => g.id}
        paginated={false}
        defaultSort={{ key: "found", direction: "desc" }}
        searchPlaceholder="Search care gaps…"
        onRowClick={(g) => navigate(to(g))}
        rowActions={(g) => (
          <Button
            variant="tertiary"
            size="small"
            sx={{ whiteSpace: "nowrap" }}
            onClick={() => navigate(to(g))}
            aria-label={`View details: ${g.def.name}`}
          >
            View details
          </Button>
        )}
        emptyState={
          <EmptyState
            title="No care gaps"
            description={`${m.name} has no Not Met measure results. See the Measures tab for what was checked.`}
          />
        }
      />
    </Stack>
  );
}
