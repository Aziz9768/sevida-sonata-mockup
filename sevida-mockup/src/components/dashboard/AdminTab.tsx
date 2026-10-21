import { useMemo, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import {
  Card,
  DataTable,
  DetailGrid,
  InfoBanner,
  StatCard,
  SwitchField,
  StatusChip,
} from "sevida-ui";
import type { Column, StatusTone } from "sevida-ui";
import { CURRENT_YEAR, fmtDate, measures } from "../../data";
import { MEASURE_VERSION } from "../../careGaps";
import {
  fmtRun,
  loadSummary,
  periodText,
  reasonRows,
  rejectedRows,
  runInfo,
} from "../../dashboardData";
import type { ReasonRow, RejectedRow } from "../../dashboardData";
import { TableLink } from "../TableLink";
import { cardGrid, pct } from "./KpiBlocks";

const tone: Record<RejectedRow["result"], StatusTone> = {
  Rejected: "danger",
  Warning: "warning",
  "Not received": "neutral",
};
const impactTone: Record<RejectedRow["impact"], StatusTone> = {
  Critical: "danger",
  Warning: "warning",
};
const opts = (xs: string[]) =>
  [...new Set(xs)].sort().map((v) => ({ value: v, label: v }));

/** For administrators: every row (or file) the loading step rejected or warned about, with the file, the row, the member and the reason. */
export function AdminTab() {
  const all = useMemo(() => rejectedRows(), []);
  const [withWarnings, setWithWarnings] = useState(false);
  // Warnings are used rows with a note. They are counted in "Problems by reason" and shown only when asked for.
  const rows = useMemo(
    () => (withWarnings ? all : all.filter((r) => r.result !== "Warning")),
    [all, withWarnings],
  );
  const warningCount =
    all.length - all.filter((r) => r.result !== "Warning").length;
  const critical = useMemo(() => {
    const seen = new Map<string, RejectedRow>();
    for (const r of all)
      if (r.impact === "Critical" && !seen.has(r.fileName))
        seen.set(r.fileName, r);
    return [...seen.values()];
  }, [all]);
  const columns: Column<RejectedRow>[] = [
    {
      key: "file",
      header: "File name",
      accessor: (r) => r.fileName,
      sortable: true,
      primary: true,
      nowrap: true,
      filter: {
        type: "multiselect",
        options: opts(rows.map((r) => r.fileName)),
      },
    },
    {
      key: "type",
      header: "File type",
      accessor: (r) => r.fileType,
      sortable: true,
      help: "What kind of data the file holds.",
      defaultHidden: true,
      filter: {
        type: "multiselect",
        options: opts(rows.map((r) => r.fileType)),
      },
    },
    {
      key: "source",
      header: "Source of file",
      accessor: (r) => r.source,
      sortable: true,
      help: "Who sent the file.",
      defaultHidden: true,
      filter: { type: "multiselect", options: opts(rows.map((r) => r.source)) },
    },
    {
      key: "row",
      header: "Row",
      accessor: (r) => r.rowNumber,
      render: (r) => (r.rowNumber ? r.rowNumber : "–"),
      sortable: true,
      align: "right",
      help: "Line number in the file. The heading line is row 1.",
    },
    {
      key: "member",
      header: "Member",
      accessor: (r) => r.memberId,
      sortable: true,
      render: (r) =>
        r.memberId === "–" ? (
          "–"
        ) : (
          <TableLink to={`/members/${r.memberId}`}>{r.memberId}</TableLink>
        ),
    },
    {
      key: "field",
      header: "Field",
      accessor: (r) => r.field,
      sortable: true,
      help: "The column in the file that has the problem.",
    },
    {
      key: "value",
      header: "Value received",
      accessor: (r) => r.value,
      help: "What the file had in that field.",
    },
    {
      key: "rule",
      header: "Rule broken",
      accessor: (r) => r.rule,
    },
    {
      key: "reason",
      header: "Reason",
      accessor: (r) => r.reason,
      sortable: true,
      filter: {
        type: "multiselect",
        options: opts(rows.map((r) => r.reason)),
      },
    },
    {
      key: "measures",
      header: "Measures affected",
      accessor: (r) => r.measures,
      help: "Measures that read this file. A problem may not change a result if a valid record is already used for that member.",
    },
    {
      key: "loaded",
      header: "Loaded at",
      accessor: (r) => r.loadedOn.getTime(),
      render: (r) => fmtDate(r.loadedOn),
      sortable: true,
      nowrap: true,
    },
    {
      key: "impact",
      header: "Impact",
      accessor: (r) => r.impact,
      sortable: true,
      render: (r) => (
        <StatusChip label={r.impact} tone={impactTone[r.impact]} />
      ),
      help: "Critical: a file that a measure reads was rejected or did not arrive, so results may be incomplete. Warning: everything else.",
      filter: { type: "multiselect", options: opts(["Critical", "Warning"]) },
    },
    {
      key: "result",
      header: "Result",
      accessor: (r) => r.result,
      sortable: true,
      render: (r) => <StatusChip label={r.result} tone={tone[r.result]} />,
      help: "Rejected: the row or file was not used. Warning: it was used, with a problem noted. Not received: the file did not arrive.",
      filter: {
        type: "multiselect",
        options: opts(["Rejected", "Warning", "Not received"]),
      },
    },
    {
      key: "problem",
      header: "Problem",
      accessor: (r) => r.problem,
      help: "What was wrong, in plain words.",
      defaultHidden: true,
    },
  ];
  const sum = useMemo(() => loadSummary(), []);
  const reasons = useMemo(() => reasonRows(all), [all]);
  const run = useMemo(() => runInfo(), []);
  const reasonColumns: Column<ReasonRow>[] = [
    {
      key: "reason",
      header: "Reason",
      accessor: (r) => r.reason,
      primary: true,
    },
    {
      key: "impact",
      header: "Impact",
      accessor: (r) => r.impact,
      render: (r) => (
        <StatusChip label={r.impact} tone={impactTone[r.impact]} />
      ),
    },
    {
      key: "result",
      header: "Result",
      accessor: (r) => r.result,
      render: (r) => <StatusChip label={r.result} tone={tone[r.result]} />,
    },
    {
      key: "count",
      header: "Rows",
      accessor: (r) => r.count,
      align: "right",
    },
    { key: "fix", header: "What to do", accessor: (r) => r.fix },
  ];
  return (
    <Stack spacing={2}>
      <Card
        title="Calculation settings in use"
        tooltip="What the numbers on every dashboard are calculated with."
      >
        <DetailGrid
          columns={3}
          items={[
            { label: "Specification", value: MEASURE_VERSION },
            {
              label: "Measurement period",
              value: periodText(CURRENT_YEAR).replace(" to ", " – "),
            },
            {
              label: "Measures calculated",
              value: `${measures.length} of ${measures.length}`,
            },
            { label: "Runs", value: run.schedule },
            { label: "Last run", value: fmtRun(run.last) },
            { label: "Next run", value: fmtRun(run.next) },
          ]}
        />
      </Card>
      <Card
        title="Latest load"
        tooltip="What arrived in the latest files and how much of it could be used. Rows with a warning are used. A file with a failed check is rejected as a whole."
      >
        <Box sx={cardGrid(5)}>
          <StatCard
            label="Files received"
            value={`${sum.filesReceived} of ${sum.filesTotal}`}
            sub={
              sum.filesTotal > sum.filesReceived
                ? `${sum.filesTotal - sum.filesReceived} not received`
                : undefined
            }
          />
          <StatCard
            label="Rows received"
            value={sum.rowsReceived.toLocaleString("en-US")}
          />
          <StatCard
            label="Rows accepted"
            value={`${sum.rowsAccepted.toLocaleString("en-US")} (${pct((sum.rowsAccepted / sum.rowsReceived) * 100)})`}
            variant="highlight"
            tip="Rows that were used in the measures."
          />
          <StatCard
            label="Rows rejected"
            value={`${sum.rowsRejected.toLocaleString("en-US")} (${pct((sum.rowsRejected / sum.rowsReceived) * 100)})`}
            sub={
              sum.rejectedFiles.length
                ? `Whole file: ${sum.rejectedFiles.join(", ")}`
                : undefined
            }
            tip="Rows that were not used. A file with a failed check is rejected as a whole."
          />
          <StatCard
            label="Rows with a warning"
            value={sum.warnings.toLocaleString("en-US")}
            tip="Used, with a problem noted."
          />
        </Box>
      </Card>
      {critical.length > 0 && (
        <InfoBanner
          tone="danger"
          title={`${critical.length} critical ${critical.length === 1 ? "problem" : "problems"}`}
        >
          <Stack spacing={0.5}>
            {critical.map((r) => (
              <Typography key={r.fileName} variant="body2" component="span">
                <strong>{r.fileName}</strong>:{" "}
                {r.result === "Not received" ? "not received" : "rejected"}.{" "}
                {r.measures} may be incomplete until a new file arrives.
              </Typography>
            ))}
          </Stack>
        </InfoBanner>
      )}
      <InfoBanner tone="info" title="What you can do">
        <Typography variant="body2" component="span">
          These are data problems at the source, not measure exclusions. Fix
          them in the source system and send the file again. Export the list
          below to send back to Madigan. Rows are checked again with every new
          file.
        </Typography>
      </InfoBanner>
      <Card title="Problems by reason" flush>
        <DataTable
          ariaLabel="Problems by reason"
          columns={reasonColumns}
          rows={reasons}
          getRowId={(r) => r.reason}
          paginated={false}
          toolbar={false}
        />
      </Card>
      <SwitchField
        label={`Also show rows used with a warning (${warningCount})`}
        checked={withWarnings}
        onChange={setWithWarnings}
      />
      <DataTable
        ariaLabel="Rejected rows and warnings"
        title={withWarnings ? "Rejected rows and warnings" : "Rejected rows"}
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        defaultSort={{ key: "impact", direction: "asc" }}
        searchPlaceholder="Search files, members, fields…"
        exportFile="rejected-rows"
        storageKey="demo-dashboard-admin-v3"
      />
      <InfoBanner tone="info" title="Not built yet">
        <Typography variant="body2" component="span">
          A link from each row to the source file, and rows that failed document
          extraction (for example a scanned lab result), wait for the pipeline
          to report them. The rows above come from the demo files.
        </Typography>
      </InfoBanner>
    </Stack>
  );
}
