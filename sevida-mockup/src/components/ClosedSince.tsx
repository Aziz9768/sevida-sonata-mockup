import { useMemo, useState } from "react";
import { Stack, Typography } from "@mui/material";
import { Button, DataTable, InfoBanner, Modal, SelectField } from "sevida-ui";
import type { Column } from "sevida-ui";
import { CURRENT_YEAR, closedStepOf, measures } from "../data";
import type { Member, MeasureCode } from "../data";
import { fmtRunTime, runLabel, useRun } from "../runs";
import type { Run } from "../runs";
import { useRole } from "../roles";
import { TableLink } from "./TableLink";

interface ClosedRow {
  id: string;
  m: Member;
  code: MeasureCode;
  measure: string;
  closedIn: Run;
}

/**
 * Care gaps that were open on an earlier run and are Met on the run being shown (FR-611). The results of every run are kept,
 * so the list is the difference between two runs. It follows the run chosen in the header.
 * (A gap that staff closed by hand with evidence is a different thing: it stays Not met until the next run.)
 */
export function ClosedSinceButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Gaps closed since an earlier run
      </Button>
      <ClosedSinceModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function ClosedSinceModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { runs, choices, run: shown, latest } = useRun();
  const { visible } = useRole();
  // The runs to compare with: older results than the ones shown. A night with no new files repeats the run before it, so it is a fair start too.
  const olderRuns = choices.filter((r) => r.step > shown.step);
  const [sinceId, setSinceId] = useState<string>("");
  const since =
    olderRuns.find((r) => r.id === sinceId) ?? olderRuns[0] ?? null;

  /** The first run that carried a given version of the results. */
  const runOfStep = (step: number) =>
    runs
      .filter((r) => r.selectable && r.step === step && !r.rerunOf)
      .sort((a, b) => a.at.getTime() - b.at.getTime())[0];

  const rows = useMemo<ClosedRow[]>(() => {
    if (!since) return [];
    return visible.flatMap((m) =>
      measures.flatMap((d) => {
        const k = closedStepOf(m, d.code, CURRENT_YEAR);
        // A gap on the earlier run (k below its step) that is met on the shown run (k at or above its step).
        if (k === null || k >= since.step || k < shown.step) return [];
        const closedIn = runOfStep(k);
        return closedIn
          ? [{ id: `${m.id}-${d.code}`, m, code: d.code, measure: d.name, closedIn }]
          : [];
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [since, shown.step, visible, runs]);

  const columns: Column<ClosedRow>[] = [
    {
      key: "name",
      header: "Member name",
      accessor: (r) => r.m.name,
      sortable: true,
      primary: true,
      render: (r) => (
        <TableLink to={`/members/${r.m.id}?tab=measures`}>{r.m.name}</TableLink>
      ),
    },
    {
      key: "id",
      header: "Member ID",
      accessor: (r) => r.m.id,
      sortable: true,
      nowrap: true,
    },
    {
      key: "measure",
      header: "Measure",
      accessor: (r) => r.code,
      sortable: true,
      nowrap: true,
      help: "The measure whose gap closed.",
      render: (r) => `${r.code} · ${r.measure}`,
      filter: {
        type: "multiselect",
        options: measures.map((d) => ({ value: d.code, label: d.code })),
      },
    },
    {
      key: "closedIn",
      header: "Closed in run",
      accessor: (r) => r.closedIn.at.getTime(),
      render: (r) => fmtRunTime(r.closedIn.at),
      sortable: true,
      nowrap: true,
      help: "The first run whose files showed the member as Met.",
    },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Gaps closed since an earlier run"
      size="lg"
      actions={<Button onClick={onClose}>Close</Button>}
    >
      <Stack spacing={2}>
        {since ? (
          <>
            <SelectField
              label="Since run"
              value={since.id}
              onChange={setSinceId}
              options={olderRuns.map((r) => ({
                value: r.id,
                label: runLabel(r, latest),
              }))}
            />
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {rows.length === 0
                ? `No gap closed between the ${fmtRunTime(since.at)} run and the ${fmtRunTime(shown.at)} run.`
                : `${rows.length} ${rows.length === 1 ? "gap was" : "gaps were"} open on the ${fmtRunTime(since.at)} run and are met on the ${fmtRunTime(shown.at)} run.`}
            </Typography>
            <DataTable
              ariaLabel="Gaps closed since an earlier run"
              columns={columns}
              rows={rows}
              getRowId={(r) => r.id}
              defaultSort={{ key: "closedIn", direction: "desc" }}
              pageSize={10}
              exportFile="gaps-closed-since-run"
            />
          </>
        ) : (
          <InfoBanner tone="info">
            There is no earlier run to compare with. Choose a newer run in the
            header, or start from the latest run.
          </InfoBanner>
        )}
      </Stack>
    </Modal>
  );
}
