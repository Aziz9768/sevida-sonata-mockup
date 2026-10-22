import { useMemo, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import {
  Button,
  DataTable,
  DetailGrid,
  InfoBanner,
  Modal,
  SelectField,
  StatusChip,
} from "sevida-ui";
import type { Column, StatusTone } from "sevida-ui";
import { fmtDate } from "../data";
import { fmtRunTime, runLabel, useRun } from "../runs";
import { useAudit, useWho } from "../auditLog";
import type { Run, RunFile, RunMeasure, RunProblem, RunStatus } from "../runs";

const statusTone: Record<RunStatus, StatusTone> = {
  Completed: "success",
  "Completed with warnings": "warning",
  "No new files": "neutral",
  Failed: "danger",
};

/** In the header of every page: which data the numbers come from and when they were calculated (FR-510, 705, NFR-08). */
export function RunLine() {
  const { run, latest, isLatest, setRunId } = useRun();
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{ minWidth: 0 }}
    >
      <Typography
        noWrap
        sx={{
          fontSize: ".8125rem",
          color: "text.secondary",
          display: { xs: "none", md: "block" },
        }}
      >
        {`Data as of ${fmtDate(run.dataAsOf)} · Run ${fmtRunTime(run.at)}`}
      </Typography>
      {!isLatest && (
        <>
          <StatusChip
            label="Older run"
            tone="warning"
            tip="You are looking at the results as they were on this run, not the latest ones."
          />
          <Button variant="tertiary" onClick={() => setRunId(latest.id)}>
            Back to latest run
          </Button>
        </>
      )}
      {run.status === "No new files" && (
        <StatusChip
          label="No new files"
          tone="neutral"
          tip="No file arrived before this run, so nothing was recalculated."
        />
      )}
    </Stack>
  );
}

/** The "Results as of run" control. Newest first, because a run list is a timeline, not a word list. */
export function RunSelect() {
  const { choices, latest, run, setRunId } = useRun();
  return (
    <SelectField
      label="Results as of run"
      value={run.id}
      onChange={setRunId}
      options={choices.map((r) => ({
        value: r.id,
        label: runLabel(r, latest),
      }))}
    />
  );
}

/** Tells the reader when the page is not showing the latest results: an older run, or a night with no new file (FR-105, FR-206). */
export function RunNotice() {
  const { run, latest, isLatest, setRunId } = useRun();
  if (isLatest && run.status !== "No new files") return null;
  const back = (
    <Button variant="secondary" onClick={() => setRunId(latest.id)}>
      Show the latest run
    </Button>
  );
  return (
    <Stack spacing={1}>
      {run.status === "No new files" && (
        <InfoBanner
          tone="warning"
          title={`No new files before the ${fmtRunTime(run.at)} run`}
          action={isLatest ? undefined : back}
        >
          Nothing was recalculated. These are the results of the{" "}
          {run.sameAs ? fmtRunTime(run.sameAs) : "run before"} run, built from
          files up to {fmtDate(run.dataAsOf)}. Ask Madigan to check the nightly
          drop if this keeps happening.
        </InfoBanner>
      )}
      {!isLatest && run.status !== "No new files" && (
        <InfoBanner tone="info" title="Older run" action={back}>
          You are looking at the results as they were on the{" "}
          {fmtRunTime(run.at)} run, built from files up to{" "}
          {fmtDate(run.dataAsOf)}. Members, care gaps and measures follow the
          same run.
        </InfoBanner>
      )}
    </Stack>
  );
}

/* ------------------------------------------------------------------ Admin: Runs table (FR-108, FR-209) */

const mins = (r: Run) =>
  Math.max(1, Math.round((r.end.getTime() - r.at.getTime()) / 60000));
const n = (x: number) => x.toLocaleString("en-US");

const fileTone: Record<string, StatusTone> = {
  Accepted: "success",
  "Accepted with warnings": "warning",
  Failed: "danger",
  "Not received": "neutral",
};
const measureTone: Record<RunMeasure["status"], StatusTone> = {
  Completed: "success",
  "Skipped, no new data": "neutral",
  "Not run": "danger",
};

/** For administrators: every nightly run with what it received and what it calculated. Click a run for the files, the problems and each measure. */
export function RunsCard() {
  const { runs, run: selected, setRunId, latest, canRerun } = useRun();
  const [open, setOpen] = useState<Run | null>(null);
  const [again, setAgain] = useState<Run | null>(null);
  const columns = useMemo<Column<Run>[]>(
    () => [
      {
        key: "at",
        header: "Run started",
        accessor: (r) => r.at.getTime(),
        render: (r) => fmtRunTime(r.at),
        primary: true,
        sortable: true,
        nowrap: true,
        filter: { type: "dateRange" },
        filterAccessor: (r) => r.at,
      },
      {
        key: "status",
        header: "Status",
        accessor: (r) => r.status,
        render: (r) => <StatusChip label={r.status} tone={statusTone[r.status]} />,
        sortable: true,
        filter: {
          type: "multiselect",
          options: (Object.keys(statusTone) as RunStatus[]).map((v) => ({
            value: v,
            label: v,
          })),
        },
      },
      {
        key: "asof",
        header: "Data as of",
        accessor: (r) => r.dataAsOf.getTime(),
        render: (r) => fmtDate(r.dataAsOf),
        sortable: true,
        help: "Date of the newest file the results are built from.",
      },
      {
        key: "files",
        header: "Files received",
        accessor: (r) => r.files.length,
        render: (r) => `${r.files.length} of ${r.filesTotal}`,
        sortable: true,
        align: "right",
      },
      {
        key: "in",
        header: "Rows in",
        accessor: (r) => r.rowsIn,
        render: (r) => n(r.rowsIn),
        sortable: true,
        align: "right",
      },
      {
        key: "out",
        header: "Rows out",
        accessor: (r) => r.rowsIn - r.rowsRejected,
        render: (r) => n(r.rowsIn - r.rowsRejected),
        sortable: true,
        align: "right",
        help: "Rows that were used in the measures.",
      },
      {
        key: "rej",
        header: "Rows rejected",
        accessor: (r) => r.rowsRejected,
        render: (r) => n(r.rowsRejected),
        sortable: true,
        align: "right",
        help: "A file with a failed check is rejected as a whole, so all its rows count.",
      },
      {
        key: "time",
        header: "Duration",
        accessor: (r) => mins(r),
        render: (r) => `${mins(r)} min`,
        sortable: true,
        align: "right",
      },
      {
        key: "show",
        header: "Results",
        nowrap: true,
        accessor: (r) => (r.selectable ? (r.id === selected.id ? "Showing" : "View") : "Not published"),
        render: (r) =>
          !r.selectable ? (
            <Stack spacing={0.25} alignItems="flex-start">
              <span style={{ whiteSpace: "nowrap" }}>Not published</span>
              {canRerun(r) ? (
                <Button
                  variant="tertiary"
                  sx={{ whiteSpace: "nowrap" }}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    setAgain(r);
                  }}
                >
                  Run again
                </Button>
              ) : (
                <StatusChip label="Started again" tone="neutral" />
              )}
            </Stack>
          ) : r.id === selected.id ? (
            <StatusChip label="Showing" tone="info" />
          ) : (
            <Button variant="tertiary" onClick={() => setRunId(r.id)}>
              View

            </Button>
          ),
      },
    ],
    [selected.id, setRunId, latest.id, canRerun],
  );
  return (
    <>
      <DataTable
        ariaLabel="Run history"
        title="Run history"
        columns={columns}
        rows={runs}
        getRowId={(r) => r.id}
        onRowClick={(r) => setOpen(r)}
        defaultSort={{ key: "at", direction: "desc" }}
        exportFile="nightly-runs"
        storageKey="demo-runs-v1"
      />
      <RunDetails
        run={open}
        onClose={() => setOpen(null)}
        onRunAgain={(r) => {
          setOpen(null);
          setAgain(r);
        }}
      />
      <RunAgainDialog run={again} onClose={() => setAgain(null)} />
    </>
  );
}

export function RunDetails({
  run,
  onClose,
  onRunAgain,
}: {
  run: Run | null;
  onClose: () => void;
  onRunAgain?: (r: Run) => void;
}) {
  const { canRerun } = useRun();
  const fileCols: Column<RunFile>[] = [
    { key: "file", header: "File", accessor: (f) => `${f.id}.csv`, primary: true },
    { key: "title", header: "What it holds", accessor: (f) => f.title },
    {
      key: "status",
      header: "Result",
      accessor: (f) => f.status,
      render: (f) => <StatusChip label={f.status} tone={fileTone[f.status]} />,
    },
    {
      key: "rows",
      header: "Rows",
      accessor: (f) => f.rows,
      render: (f) => n(f.rows),
      align: "right",
    },
    { key: "note", header: "Note", accessor: (f) => f.note },
  ];
  const problemCols: Column<RunProblem>[] = [
    { key: "reason", header: "Reason", accessor: (p) => p.reason, primary: true },
    {
      key: "count",
      header: "Rows",
      accessor: (p) => p.count,
      render: (p) => n(p.count),
      align: "right",
    },
    { key: "fix", header: "What to do", accessor: (p) => p.fix },
  ];
  const measureCols: Column<RunMeasure>[] = [
    {
      key: "measure",
      header: "Measure",
      accessor: (m) => `${m.code} · ${m.name}`,
      primary: true,
    },
    {
      key: "members",
      header: "Members counted",
      accessor: (m) => m.members,
      render: (m) => (m.status === "Not run" ? "–" : n(m.members)),
      align: "right",
      help: "Members who are eligible for the measure (met, not met, excluded or needs review).",
    },
    {
      key: "seconds",
      header: "Time",
      accessor: (m) => m.seconds,
      render: (m) => (m.seconds ? `${m.seconds} s` : "–"),
      align: "right",
    },
    {
      key: "status",
      header: "Status",
      accessor: (m) => m.status,
      render: (m) => <StatusChip label={m.status} tone={measureTone[m.status]} />,
    },
  ];
  return (
    <Modal
      open={!!run}
      onClose={onClose}
      title={run ? `Run of ${fmtRunTime(run.at)}` : ""}
      size="lg"
      actions={
        <>
          {run && onRunAgain && canRerun(run) && (
            <Button variant="secondary" onClick={() => onRunAgain(run)}>
              Run again
            </Button>
          )}
          <Button onClick={onClose}>Close</Button>
        </>
      }
    >
      {run && (
        <Stack spacing={2}>
          <InfoBanner tone={run.status === "Failed" ? "danger" : run.status === "Completed" ? "success" : "info"}>
            {run.note}
          </InfoBanner>
          <DetailGrid
            columns={3}
            items={[
              { label: "Status", value: run.status },
              { label: "Started", value: fmtRunTime(run.at) },
              { label: "Finished", value: fmtRunTime(run.end) },
              { label: "Data as of", value: fmtDate(run.dataAsOf) },
              { label: "Files received", value: `${run.files.length} of ${run.filesTotal}` },
              {
                label: "Rows in, out, rejected",
                value: `${n(run.rowsIn)}, ${n(run.rowsIn - run.rowsRejected)}, ${n(run.rowsRejected)}`,
              },
            ]}
          />
          <Box>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>Measures</Typography>
            <DataTable
              ariaLabel="Measures in this run"
              columns={measureCols}
              rows={run.measures}
              getRowId={(m) => m.code}
              paginated={false}
              toolbar={false}
            />
          </Box>
          {run.problems.length > 0 && (
            <Box>
              <Typography sx={{ fontWeight: 700, mb: 1 }}>Problems by reason</Typography>
              <DataTable
                ariaLabel="Problems in this run"
                columns={problemCols}
                rows={run.problems}
                getRowId={(p) => `${p.reason}-${p.count}`}
                paginated={false}
                toolbar={false}
              />
            </Box>
          )}
          <Box>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>Files</Typography>
            {run.files.length ? (
              <DataTable
                ariaLabel="Files in this run"
                columns={fileCols}
                rows={run.files}
                getRowId={(f) => f.id}
                paginated={false}
                toolbar={false}
              />
            ) : (
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                No files arrived before this run.
              </Typography>
            )}
          </Box>
        </Stack>
      )}
    </Modal>
  );
}

/** The table for the Admin tab. Click a run for its files and each measure; View shows the results as they were on that run. */
export function RunsSection() {
  return <RunsCard />;
}

/** Confirms starting a failed night again (FR-111). Only a failed run offers it. */
export function RunAgainDialog({
  run,
  onClose,
}: {
  run: Run | null;
  onClose: () => void;
}) {
  const { rerun } = useRun();
  const { logSignIn } = useAudit();
  const who = useWho();
  return (
    <Modal
      open={!!run}
      onClose={onClose}
      title={run ? `Run the night of ${fmtRunTime(run.at)} again?` : ""}
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!run) return;
              rerun(run);
              logSignIn(
                who,
                "Run started again",
                "Success",
                `Started the failed night of ${fmtRunTime(run.at)} again`,
              );
              onClose();
            }}
          >
            Run again
          </Button>
        </>
      }
    >
      {run && (
        <Stack spacing={2}>
          <Typography>
            The run reads the files that are in the drop now, so send the
            corrected file first. It does not need a full reload of the other
            files.
          </Typography>
          <InfoBanner tone="info">
            A run takes about 30 minutes. The new run is added to the Run
            history and its results become the latest ones. The demo finishes at
            once.
          </InfoBanner>
        </Stack>
      )}
    </Modal>
  );
}
