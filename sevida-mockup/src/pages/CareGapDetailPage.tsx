import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Box, Divider, Menu, MenuItem, Stack, Typography } from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import {
  Button,
  Card,
  DataTable,
  DetailGrid,
  EmptyState,
  IconButton,
  InfoBanner,
  PageContainer,
  StatusChip,
  StepTrace,
  Tabs,
} from "sevida-ui";
import type { Column, StatusTone, TraceItem } from "sevida-ui";
import { Field } from "../components/Field";
import { CareGapDetailPageV3 } from "./CareGapDetailPageV3";
import { useVersion } from "../version";
import { EvidenceReviewModal, GapActions } from "../components/GapActions";
import { RecordBox } from "../components/RecordBox";
import { renderCrumbLink } from "../components/RouterLinkAdapter";
import { SourceRecordModal } from "../components/SourceRecordModal";
import {
  MEASURE_VERSION,
  checkClosure,
  conflictsWith,
  criteriaTests,
  evidenceKinds,
  evidenceStatuses,
  evidenceTone,
  fmtDay,
  fmtWhen,
  gapStatusTone,
  impactsOf,
  lastRelevant,
  nextActionOf,
  parseDay,
  recordKey,
  serviceName,
  statusHelp,
  supportingEvents,
  unmappedEvents,
  useGaps,
  validationTone,
} from "../careGaps";
import type {
  Activity,
  EvidenceRec,
  EvidenceStatus,
  GapView,
  Visit,
  VisitStatus,
} from "../careGaps";
import {
  DEMO_NOW,
  careTeamOf,
  dataFiles,
  MY,
  MY_END,
  MY_START,
  fmtDate,
  measureByCode,
  memberById,
  providerName,
  stateLabel,
  stateTone,
} from "../data";
import type { Evt, MeasureCode } from "../data";

const day = (iso: string) => fmtDay(iso);

/* ------------------------------------------------------------------ small tables */

function VisitMenu({ g, v }: { g: GapView; v: Visit }) {
  const { setVisitStatus } = useGaps();
  const [el, setEl] = useState<HTMLElement | null>(null);
  if (
    g.status === "Closed" ||
    v.status === "Completed" ||
    v.status === "Cancelled" ||
    v.status === "No show"
  )
    return null;
  const set = (s: VisitStatus) => {
    setEl(null);
    setVisitStatus(g.id, v.id, s);
  };
  return (
    <>
      <IconButton
        size="small"
        aria-label={`Change status of ${v.service}`}
        aria-haspopup="menu"
        onClick={(e) => setEl(e.currentTarget)}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={el} open={!!el} onClose={() => setEl(null)}>
        <MenuItem onClick={() => set("Completed")}>Mark completed</MenuItem>
        <MenuItem onClick={() => set("Cancelled")}>Mark cancelled</MenuItem>
        <MenuItem onClick={() => set("No show")}>Mark no show</MenuItem>
      </Menu>
    </>
  );
}

function FollowUp({ g }: { g: GapView }) {
  const w = g.work;
  const visitCols: Column<Visit>[] = [
    { key: "kind", header: "Type", accessor: (v) => v.kind, primary: true },
    { key: "with", header: "With", accessor: (v) => v.with },
    { key: "svc", header: "Service", accessor: (v) => v.service },
    {
      key: "date",
      header: "Date",
      accessor: (v) => parseDay(v.date),
      render: (v) => day(v.date),
      sortable: true,
      nowrap: true,
    },
    {
      key: "st",
      header: "Status",
      accessor: (v) => v.status,
      render: (v) => (
        <StatusChip
          tone={
            v.status === "Completed"
              ? "success"
              : v.status === "Scheduled"
                ? "primary"
                : v.status === "Requested"
                  ? "info"
                  : "neutral"
          }
          label={v.status}
        />
      ),
    },
  ];
  return (
    <DataTable
      ariaLabel="Appointments and referrals"
      title="Appointments and referrals"
      columns={visitCols}
      rows={w.visits}
      getRowId={(v) => v.id}
      paginated={false}
      defaultSort={{ key: "date", direction: "asc" }}
      emptyState={
        <EmptyState
          title="No appointments or referrals"
          description="Use Actions, then Schedule appointment, to add one."
        />
      }
      rowActions={(v) => <VisitMenu g={g} v={v} />}
    />
  );
}

/* ------------------------------------------------------------------ evidence */

/** One line of the Evidence table: a record from the files, evidence recorded in Sonata, or a missing item. */
interface EvRow {
  key: string;
  origin: "file" | "recorded" | "missing";
  date: Date | null;
  type: string;
  code: string;
  text: string;
  provider: string;
  source: string;
  status: EvidenceStatus;
  outcome: string;
  outcomeTone: StatusTone;
  outcomeText?: string;
  flag: "Missing" | "Conflicting" | "Unmapped" | null;
  flagText?: string;
  evt?: Evt;
  rec?: EvidenceRec;
}

const flagTone: Record<NonNullable<EvRow["flag"]>, StatusTone> = {
  Missing: "danger",
  Conflicting: "warning",
  Unmapped: "warning",
};

function Evidence({ g }: { g: GapView }) {
  const [open, setOpen] = useState<Evt | null>(null);
  const [review, setReview] = useState<EvidenceRec | null>(null);
  const code = g.def.code;
  const kinds = evidenceKinds[code];
  const acceptedTags = kinds.map((k) => k.tag);
  const closing = checkClosure(g);

  const rows: EvRow[] = [];
  for (const e of supportingEvents(g.m, code)) {
    const imp = impactsOf(g.m, e).find((i) => i.code === code);
    const accepted = acceptedTags.includes(e.tag);
    const conflict = accepted && conflictsWith(e);
    rows.push({
      key: recordKey(e),
      origin: "file",
      date: e.date,
      type: e.kind,
      code: `${e.code} (${e.system})`,
      text: e.text,
      provider: providerName(e.provider),
      source: `${e.file}.csv`,
      status: "Received",
      outcome:
        imp?.outcome === "decided" || imp?.outcome === "counted"
          ? "Counted, not met"
          : imp?.outcome === "not counted"
            ? "Did not count"
            : "Context only",
      outcomeTone:
        imp?.outcome === "decided" || imp?.outcome === "counted"
          ? "warning"
          : imp?.outcome === "not counted"
            ? "warning"
            : "neutral",
      outcomeText: imp?.text,
      flag: conflict ? "Conflicting" : null,
      flagText: conflict
        ? e.tag === "hba1c" && e.value === undefined
          ? "A final lab with no result value. This measure needs the actual HbA1c value."
          : `A service this measure accepts, but its status says it was not done or not final: ${e.status}.`
        : undefined,
      evt: e,
    });
  }
  for (const e of unmappedEvents(g.m, code))
    rows.push({
      key: recordKey(e),
      origin: "file",
      date: e.date,
      type: e.kind,
      code: `${e.code} (${e.system})`,
      text: e.text,
      provider: providerName(e.provider),
      source: `${e.file}.csv`,
      status: "Received",
      outcome: "Not mapped",
      outcomeTone: "warning",
      outcomeText: `This code is not mapped to ${code}, so it was not counted.`,
      flag: "Unmapped",
      flagText: `The code is not mapped to ${code}. Ask the data team whether it should count.`,
      evt: e,
    });
  for (const r of g.work.evidence) {
    const t = criteriaTests(code, r);
    const fails = [
      !t.kind && "not an accepted kind of record",
      !t.window && "service date outside the measurement period",
      !t.source && "source or provider missing",
      !t.value && "result does not meet the criteria",
    ].filter(Boolean) as string[];
    rows.push({
      key: r.id,
      origin: "recorded",
      date: parseDay(r.date),
      type: "Recorded in Sonata",
      code: "–",
      text: `${r.kind}${r.value !== undefined ? `, ${r.value}%` : ""}${r.note ? `. ${r.note}` : ""}`,
      provider: r.provider || "–",
      source: r.source,
      status:
        r.validation === "Validated"
          ? "Validated"
          : r.validation === "Rejected"
            ? "Rejected"
            : "Received",
      outcome:
        r.validation === "Pending review"
          ? "Awaiting review"
          : r.validation === "Validated"
            ? "Validated"
            : "Rejected",
      outcomeTone: validationTone[r.validation],
      outcomeText:
        r.validation === "Pending review"
          ? `Recorded by ${r.recordedBy}, ${fmtWhen(r.recorded)}.`
          : `${r.reviewedBy ?? "Reviewer"}, ${r.reviewedOn ? fmtWhen(r.reviewedOn) : ""}${r.reviewNote ? `. ${r.reviewNote}` : ""}`,
      flag:
        fails.length > 0 && r.validation !== "Rejected" ? "Conflicting" : null,
      flagText:
        fails.length > 0 && r.validation !== "Rejected"
          ? `Does not meet the criteria: ${fails.join(", ")}.`
          : undefined,
      rec: r,
    });
  }
  if (!closing.evidence)
    rows.unshift({
      key: "missing",
      origin: "missing",
      date: null,
      type: "Missing",
      code: "–",
      text: `Needed: ${kinds.map((k) => `${k.label.toLowerCase()} ${k.windowText}`).join(", or ")}`,
      provider: "–",
      source: "–",
      status: g.evidenceStatus,
      outcome: "Not found",
      outcomeTone: "danger",
      outcomeText:
        "No validated record meets the criteria yet. This is missing evidence, not a confirmed unmet measure on its own.",
      flag: "Missing",
    });

  const cols: Column<EvRow>[] = [
    {
      key: "date",
      header: "Service date",
      help: "The day the care happened. Not the day the record arrived.",
      accessor: (r) => r.date ?? new Date(2099, 0, 1),
      render: (r) => (r.date ? fmtDate(r.date) : "–"),
      sortable: true,
      nowrap: true,
      primary: true,
    },
    {
      key: "type",
      header: "Record type",
      accessor: (r) => r.type,
      sortable: true,
      width: 120,
      filter: {
        type: "multiselect",
        options: Array.from(new Set(rows.map((r) => r.type))).map((v) => ({
          value: v,
          label: v,
        })),
      },
    },
    {
      key: "code",
      header: "Code",
      help: "Shown under the description. This column can also be shown on its own.",
      accessor: (r) => r.code,
      nowrap: true,
      defaultHidden: true,
    },
    {
      key: "text",
      header: "Description",
      accessor: (r) => r.text,
      width: 230,
      render: (r) => (
        <>
          {r.text}
          {r.code !== "–" && (
            <Typography
              variant="caption"
              component="div"
              sx={{ color: "text.secondary" }}
            >
              Code {r.code}
            </Typography>
          )}
        </>
      ),
    },
    {
      key: "prov",
      header: "Provider",
      accessor: (r) => r.provider,
      width: 130,
      hideBelow: "lg",
    },
    {
      key: "src",
      header: "Source",
      help: "The file the record came in, or where evidence recorded in Sonata came from.",
      accessor: (r) => r.source,
      width: 140,
      hideBelow: "md",
    },
    {
      key: "status",
      header: "Evidence status",
      help: statusHelp.evidence,
      accessor: (r) => r.status,
      render: (r) => (
        <StatusChip tone={evidenceTone[r.status]} label={r.status} />
      ),
      filter: {
        type: "multiselect",
        ordered: true,
        options: evidenceStatuses.map((v) => ({ value: v, label: v })),
      },
    },
    {
      key: "outcome",
      header: "Validation outcome",
      help: "Records from the files are checked automatically against the measure rules. Evidence recorded in Sonata is checked by a reviewer.",
      accessor: (r) => r.outcome,
      width: 260,
      render: (r) => (
        <Stack spacing={0.5} alignItems="flex-start">
          <Stack
            direction="row"
            spacing={0.5}
            useFlexGap
            sx={{ flexWrap: "wrap" }}
          >
            <StatusChip tone={r.outcomeTone} label={r.outcome} />
            {r.flag && <StatusChip tone={flagTone[r.flag]} label={r.flag} />}
          </Stack>
          {(r.flagText ?? r.outcomeText) && (
            <Typography
              variant="caption"
              sx={{ color: "text.secondary", display: "block" }}
            >
              {[r.outcomeText, r.flagText].filter(Boolean).join(" ")}
            </Typography>
          )}
        </Stack>
      ),
    },
    {
      key: "flag",
      header: "Flag",
      help: "Missing: nothing meets the criteria. Conflicting: the record does not meet the criteria. Unmapped: the code is not mapped to this measure.",
      accessor: (r) => r.flag ?? "None",
      defaultHidden: true,
      filter: {
        type: "multiselect",
        options: ["Missing", "Conflicting", "Unmapped", "None"].map((v) => ({
          value: v,
          label: v,
        })),
      },
    },
  ];
  const waiting = g.work.evidence.filter(
    (r) => r.validation === "Pending review",
  ).length;
  return (
    <>
      <Stack spacing={2}>
        <GapActions g={g} only={["evidence"]} />
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Records from the files are checked automatically against the {code}{" "}
          rules. Evidence recorded in Sonata has to be validated or rejected by
          an authorized reviewer.
          {waiting > 0 &&
            ` ${waiting} record${waiting === 1 ? " is" : "s are"} waiting for review.`}
        </Typography>
        <DataTable
          ariaLabel={`Supporting records for ${code}`}
          title="Supporting records"
          columns={cols}
          rows={rows}
          getRowId={(r) => r.key}
          paginated={false}
          defaultSort={{ key: "date", direction: "desc" }}
          highlightRow={(r) => !!r.flag}
          onRowClick={(r) => r.evt && setOpen(r.evt)}
          rowActions={(r) =>
            r.rec &&
            r.rec.validation === "Pending review" &&
            g.status !== "Closed" ? (
              <Button
                size="small"
                sx={{ whiteSpace: "nowrap" }}
                onClick={() => setReview(r.rec!)}
                aria-label={`Review ${r.rec.kind} dated ${fmtDay(r.rec.date)}`}
              >
                Review
              </Button>
            ) : r.evt ? (
              <Button
                variant="tertiary"
                size="small"
                sx={{ whiteSpace: "nowrap" }}
                onClick={() => setOpen(r.evt!)}
                aria-label={`Inspect ${r.evt.text}`}
              >
                Inspect
              </Button>
            ) : null
          }
          emptyState={
            <EmptyState
              title="No related records"
              description={`No claims or clinical records in the files relate to ${g.def.name}.`}
            />
          }
        />
      </Stack>
      <SourceRecordModal m={g.m} e={open} onClose={() => setOpen(null)} />
      <EvidenceReviewModal g={g} rec={review} onClose={() => setReview(null)} />
    </>
  );
}

/* ------------------------------------------------------------------ closure + audit */

function Closure({ g }: { g: GapView }) {
  const c = checkClosure(g);
  const w = g.work;
  const kinds = evidenceKinds[g.def.code];
  const items: TraceItem[] = c.checks.map((x) => ({
    label: x.label,
    detail: x.detail,
    tone: x.ok ? "success" : "warning",
    statusLabel: x.ok ? "Passed" : "Not yet",
  }));
  const ev = w.closed
    ? w.evidence.find((e) => e.id === w.closed!.evidenceId)
    : undefined;
  const validatedCount = w.evidence.filter(
    (e) => e.validation === "Validated",
  ).length;
  const re = w.reeval;
  const reLabel = c.reevalOk ? "Met" : re && !re.ok ? "Not met" : "Not run";
  return (
    <Stack spacing={2}>
      {w.closed && (
        <Card
          title="Closure record"
          action={<StatusChip tone="success" label="Closed" />}
        >
          <Stack spacing={2}>
            <DetailGrid
              columns={3}
              items={[
                { label: "Closed on", value: fmtWhen(w.closed.on) },
                { label: "Closed by", value: w.closed.by },
                { label: "Closure reason", value: w.closed.reason },
                {
                  label: "Supporting evidence",
                  value: ev
                    ? `${ev.kind}, ${day(ev.date)}, ${ev.source}${ev.provider ? `, ${ev.provider}` : ""}${ev.value !== undefined ? `, ${ev.value}%` : ""}`
                    : "–",
                  full: true,
                },
                {
                  label: "Re-evaluation",
                  value: re
                    ? `${re.text} Run ${fmtWhen(re.on)} by ${re.by}.`
                    : "–",
                  full: true,
                },
              ]}
            />
            <InfoBanner tone="info">
              The measure result in the files still says Not met. It changes to
              Met at the next calculation run, when the evidence reaches the
              files. Until then the gap is shown as Closed and counted
              separately, so totals still add up.
            </InfoBanner>
          </Stack>
        </Card>
      )}
      <Card
        title={w.closed ? "Why closing was allowed" : "Closure requirements"}
        action={
          w.closed ? undefined : (
            <StatusChip
              tone={c.ok ? "success" : "warning"}
              label={c.ok ? "Closing allowed" : "Closing blocked"}
            />
          )
        }
      >
        <Stack spacing={2}>
          <Typography>
            {w.closed
              ? "Every requirement was met when the gap was closed."
              : c.why}
          </Typography>
          <DetailGrid
            columns={4}
            items={[
              {
                label: "Evidence required",
                value: kinds
                  .map((k) => `${k.label} ${k.windowText}`)
                  .join("; "),
                full: true,
              },
              {
                label: "Evidence validated",
                value: (
                  <StatusChip
                    tone={validatedCount > 0 ? "success" : "warning"}
                    label={
                      validatedCount > 0 ? `Yes (${validatedCount})` : "Not yet"
                    }
                  />
                ),
              },
              {
                label: "Measure re-evaluated",
                value: (
                  <StatusChip
                    tone={
                      reLabel === "Met"
                        ? "success"
                        : reLabel === "Not met"
                          ? "danger"
                          : "neutral"
                    }
                    label={reLabel === "Met" ? "Yes: Met" : reLabel}
                  />
                ),
              },
              {
                label: "Closure decision",
                value: w.closed ? "Closed" : c.ok ? "Allowed" : "Blocked",
              },
            ]}
          />
          <StepTrace steps={items} label={`Closure checks for ${g.def.name}`} />
          <GapActions g={g} only={["reeval", "close"]} />
          {!w.closed && (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Completing a task or changing the status by hand never closes a
              gap. Closing asks you to confirm, and records the reason, the
              supporting evidence, your name and the time.
            </Typography>
          )}
        </Stack>
      </Card>
    </Stack>
  );
}

function Audit({ g }: { g: GapView }) {
  const cols: Column<Activity>[] = [
    {
      key: "when",
      header: "When",
      accessor: (a) => a.when,
      render: (a) => fmtWhen(a.when),
      sortable: true,
      nowrap: true,
      primary: true,
    },
    {
      key: "by",
      header: "User",
      accessor: (a) => a.by,
      sortable: true,
      hideBelow: "md",
    },
    {
      key: "kind",
      header: "Type",
      accessor: (a) => a.kind,
      hideBelow: "md",
      filter: {
        type: "multiselect",
        options: [
          "Found",
          "Assigned",
          "Task",
          "Outreach",
          "Visit",
          "Records",
          "Evidence",
          "Review",
          "Measure",
          "Status",
          "Closed",
        ].map((v) => ({ value: v, label: v })),
      },
    },
    { key: "text", header: "What changed", accessor: (a) => a.text },
    {
      key: "reason",
      header: "Reason",
      accessor: (a) => a.reason,
      hideBelow: "lg",
    },
  ];
  return (
    <DataTable
      ariaLabel="History"
      title="History"
      columns={cols}
      rows={g.work.activity}
      getRowId={(a) => a.id}
      defaultSort={{ key: "when", direction: "desc" }}
      pageSize={10}
      searchPlaceholder="Search the trail…"
    />
  );
}

/* ------------------------------------------------------------------ overview */

function Overview({ g }: { g: GapView }) {
  const { def, m, result } = g;
  const kinds = evidenceKinds[def.code];
  const last = lastRelevant(g);
  const service = serviceName[def.code];
  const excluded = result.steps.find((s) => s.outcome === "excluded");
  const impact =
    last?.origin === "file"
      ? impactsOf(m, last.e).find((i) => i.code === def.code)
      : undefined;
  const closed = g.status === "Closed";
  const recs = g.work.evidence;
  const steps = [
    { label: "Evidence recorded", done: closed || recs.length > 0 },
    {
      label: "Reviewer validated it",
      done: closed || recs.some((r) => r.validation === "Validated"),
    },
    { label: "Re-evaluated as Met", done: closed || checkClosure(g).reevalOk },
  ];
  const nextStep = steps.findIndex((s) => !s.done);
  const daysLeft = Math.ceil((MY_END.getTime() - DEMO_NOW.getTime()) / 864e5);
  const notArrived = dataFiles.filter(
    (f) =>
      def.files.includes(f.id) &&
      (f.status === "Not received" || f.status === "Failed"),
  );
  const lastService = last
    ? last.origin === "file"
      ? `${fmtDate(last.e.date)}: ${last.e.kind}`
      : `${day(last.rec.date)}: recorded in Sonata`
    : "None found";
  return (
    <Stack spacing={2}>
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            md: "minmax(0, 2fr) minmax(0, 1fr)",
          },
        }}
      >
        <Card title="Why the gap is open">
          <Stack spacing={2}>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ flexWrap: "wrap", rowGap: 1 }}
            >
              <StatusChip
                tone="warning"
                label="Confirmed gap"
                tip="The member is in the measure and the files were complete enough to decide. This is a missing service, not missing data. Evidence received later can still change the outcome once it is validated."
              />
              {g.evidenceStatus === "Received" && (
                <StatusChip
                  tone="primary"
                  label="Evidence waiting for review"
                  tip="Evidence has been recorded and has not been validated yet. It may change the outcome."
                />
              )}
            </Stack>
            <Typography>
              {last?.origin === "file" && impact?.outcome === "not counted"
                ? `The latest ${service} record on file did not count: ${impact.text
                    .replace(/^Did not count: /, "")
                    .replace(/^./, (c) => c.toLowerCase())}`
                : last?.origin === "file"
                  ? `The latest ${service} record on file does not meet the measure: ${result.reason}.`
                  : `No qualifying ${service} was found in the available records for the ${MY} measurement period.`}
            </Typography>
            <Field
              label="What counts"
              help="The records that would meet this measure. Evidence recorded on the Evidence tab is checked against the same rule."
            >
              {kinds.map((k) => `${k.label} ${k.windowText}`).join("; ")}
            </Field>
            {notArrived.length > 0 && (
              <Field
                label="Data not received"
                help="Files this measure reads that have not arrived or were rejected. Care given outside the plan often shows up only in these feeds."
              >
                {notArrived
                  .map((f) => `${f.id}.csv (${f.status.toLowerCase()})`)
                  .join(", ")}
              </Field>
            )}
            <Divider />
            <Box
              role="group"
              aria-label="What is left to close this gap"
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: {
                  xs: "repeat(2, minmax(0, 1fr))",
                  md: "repeat(4, minmax(0, 1fr))",
                },
              }}
            >
              {steps.map((s, i) => (
                <Field key={s.label} label={`Step ${i + 1}`}>
                  <Stack spacing={0.5} alignItems="flex-start">
                    <Typography variant="body2">{s.label}</Typography>
                    <StatusChip
                      tone={
                        s.done
                          ? "success"
                          : i === nextStep
                            ? "primary"
                            : "neutral"
                      }
                      label={
                        s.done ? "Done" : i === nextStep ? "Next" : "Waiting"
                      }
                    />
                  </Stack>
                </Field>
              ))}
              <Field
                label="Time left"
                help="Days until the measurement year ends. A gap still open after that date counts against the rate."
              >
                {closed
                  ? "Closed"
                  : daysLeft > 0
                    ? `${daysLeft} days (ends ${fmtDate(MY_END)})`
                    : "Measurement year ended"}
              </Field>
            </Box>
          </Stack>
        </Card>
        <Card title="Member snapshot">
          <DetailGrid
            columns={1}
            items={[
              { label: "Eligibility", value: result.steps[0]?.detail ?? "–" },
              { label: "Enrollment", value: result.steps[2]?.detail ?? "–" },
              {
                label: "Exclusions",
                value: excluded ? `Excluded: ${excluded.detail}` : "None found",
              },
              { label: `Last ${service}`, value: lastService },
            ]}
          />
        </Card>
      </Box>
      <RecordBox m={m} code={def.code} />
    </Stack>
  );
}

/* ------------------------------------------------------------------ page */

function CareGapDetailPageOld() {
  const { memberId, code } = useParams();
  const navigate = useNavigate();
  const m = memberById(memberId);
  const def = measureByCode(code);
  const { get } = useGaps();
  const [search, setSearch] = useSearchParams();
  const tab = search.get("tab") ?? "overview";
  const g = m && def ? get(m, def.code as MeasureCode) : null;

  const crumbs = [
    { label: "Home", href: "/members" },
    { label: "Members", href: "/members" },
    ...(m ? [{ label: m.name, href: `/members/${m.id}?tab=gaps` }] : []),
    { label: def ? `Care gap: ${def.short}` : "Not found" },
  ];
  if (!m || !def || !g) {
    return (
      <PageContainer breadcrumbs={crumbs} renderLink={renderCrumbLink}>
        <EmptyState
          title="No care gap here"
          description={
            m && def
              ? `${m.name} has no care gap for ${def.name}. The result is not "Not met", or the member is not in this measure.`
              : "This care gap does not exist."
          }
          action={
            <Button
              variant="secondary"
              onClick={() =>
                navigate(m ? `/members/${m.id}?tab=gaps` : "/members")
              }
            >
              Back
            </Button>
          }
        />
      </PageContainer>
    );
  }
  const next = nextActionOf(g);
  return (
    <PageContainer
      title={def.name}
      subtitle={`${def.code} · care gap for ${m.name} (${m.id})`}
      breadcrumbs={crumbs}
      renderLink={renderCrumbLink}
    >
      <Stack spacing={2}>
        <Card>
          <Stack spacing={2}>
            <Stack
              direction="row"
              alignItems="flex-start"
              justifyContent="space-between"
              useFlexGap
              spacing={2}
              sx={{ flexWrap: "wrap" }}
            >
              <Box
                role="group"
                aria-label="Three separate statuses"
                sx={{
                  display: "grid",
                  gap: 3,
                  gridAutoFlow: "column",
                  gridAutoColumns: "max-content",
                }}
              >
                <Field label="Measure result" help={statusHelp.result}>
                  <StatusChip
                    tone={stateTone[g.result.state]}
                    label={stateLabel[g.result.state]}
                  />
                </Field>
                <Field label="Care gap status" help={statusHelp.gap}>
                  <StatusChip tone={gapStatusTone[g.status]} label={g.status} />
                </Field>
                <Field label="Evidence status" help={statusHelp.evidence}>
                  <StatusChip
                    tone={evidenceTone[g.evidenceStatus]}
                    label={g.evidenceStatus}
                  />
                </Field>
              </Box>
              <GapActions
                g={g}
                onOpenTab={(k) => setSearch({ tab: k }, { replace: true })}
              />
            </Stack>
            <Divider />
            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: {
                  xs: "repeat(2, minmax(0, 1fr))",
                  md: "repeat(3, minmax(0, 1fr))",
                  lg: "repeat(4, minmax(0, 1fr))",
                },
              }}
            >
              <Field label="Measurement year">
                {`${MY} (${fmtDate(MY_START)} to ${fmtDate(MY_END)})`}
              </Field>
              <Field label="Measure version">{MEASURE_VERSION}</Field>
              <Field label="Gap identified">{fmtDate(g.identified)}</Field>
              <Field label="Last updated">
                {fmtWhen(g.lastUpdated.toISOString())}
              </Field>
              <Field label="Care team">{careTeamOf(m).team}</Field>
              <Field label="Assigned care manager">{g.careManager}</Field>
              <Field label="Next action">{next.label}</Field>
              <Field label="Due">
                {next.due
                  ? `${fmtDate(next.due)}${next.overdue ? " (overdue)" : ""}`
                  : "–"}
              </Field>
            </Box>
          </Stack>
        </Card>
        <Tabs
          ariaLabel="Care gap sections"
          value={tab}
          onChange={(k) => setSearch({ tab: k }, { replace: true })}
          items={[
            {
              key: "overview",
              label: "Overview",
              content: <Overview g={g} />,
            },
            {
              key: "evidence",
              label: "Evidence",
              // Same rows as the table: records from the files, unmapped codes, evidence recorded in Sonata, and the "Missing" row.
              count:
                supportingEvents(m, def.code).length +
                unmappedEvents(m, def.code).length +
                g.work.evidence.length +
                (checkClosure(g).evidence ? 0 : 1),
              content: <Evidence g={g} />,
            },
            {
              key: "followup",
              label: "Follow-up",
              count: g.work.visits.length,
              content: <FollowUp g={g} />,
            },
            {
              key: "audit",
              label: "History",
              count: g.work.activity.length,
              content: <Audit g={g} />,
            },
            {
              key: "closure",
              label: g.status === "Closed" ? "Closure" : "Closing this gap",
              content: <Closure g={g} />,
            },
          ]}
        />
      </Stack>
    </PageContainer>
  );
}

/** Version 3 has its own page (see CareGapDetailPageV3.tsx); versions 1 and 2 keep the page above exactly as it was. */
export function CareGapDetailPage() {
  const { version } = useVersion();
  return version.id === 3 ? <CareGapDetailPageV3 /> : <CareGapDetailPageOld />;
}
