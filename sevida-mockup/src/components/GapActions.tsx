import { useState } from "react";
import { Menu, MenuItem, Stack, Typography } from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import {
  Button,
  CheckboxField,
  DateField,
  InfoBanner,
  InfoTip,
  Modal,
  RadioGroupField,
  SelectField,
  StatusChip,
  TextField,
} from "sevida-ui";
import {
  checkClosure,
  criteriaTests,
  evidenceKinds,
  fmtDay,
  outreachChannels,
  outreachResults,
  recommendedAction,
  useGaps,
  visitStatuses,
} from "../careGaps";
import type {
  ActionKey,
  EvidenceRec,
  GapView,
  OutreachChannel,
  OutreachResult,
  VisitStatus,
} from "../careGaps";
import { DEMO_NOW, careManagers, providerName } from "../data";

type Dialog =
  | null
  | "assign"
  | "task"
  | "outreach"
  | "visit"
  | "records"
  | "evidence"
  | "reeval"
  | "close"
  | "reopen";

const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const inDays = (n: number) =>
  isoDay(new Date(DEMO_NOW.getTime() + n * 86_400_000));
const opt = (xs: string[]) => xs.map((v) => ({ value: v, label: v }));

const sources = [
  "Claim (claim-line.csv)",
  "EHR visit (visit-e.csv)",
  "EHR procedure (proc.csv)",
  "Lab feed (lab.csv)",
  "Scanned medical record (supplemental)",
];

/** The buttons that move a care gap forward, and the pop-ups behind them. Every change is written to the gap's audit trail. */
export function GapActions({
  g,
  onOpenTab,
  only,
}: {
  g: GapView;
  /** Show just these buttons (used inside a tab). Everything else stays on the summary. */
  only?: ActionKey[];
  /** Open a tab of the care gap page (the Review evidence button goes to the Evidence tab). */
  onOpenTab?: (tab: string) => void;
}) {
  const api = useGaps();
  const [dialog, setDialog] = useState<Dialog>(null);
  const close = () => setDialog(null);
  const first = g.m.first;
  const knownProvider = providerName(
    g.m.events.find((e) => e.provider)?.provider,
  );
  const provider = knownProvider === "–" ? "" : knownProvider;

  /* each form keeps its own values; they reset when the pop-up opens */
  const [who, setWho] = useState(g.careManager);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState(inDays(7));
  const [owner, setOwner] = useState(g.careManager);
  const [channel, setChannel] = useState<OutreachChannel>("Phone");
  const [result, setResult] = useState<OutreachResult>("Left voicemail");
  const [notes, setNotes] = useState("");
  const [contactDay, setContactDay] = useState(inDays(0));
  const [followUp, setFollowUp] = useState("");
  const [contactBy, setContactBy] = useState(g.careManager);
  const [kind] = useState<"Appointment" | "Referral">("Appointment");
  const [withWho, setWithWho] = useState(provider);
  const [service, setService] = useState(g.def.short);
  const [visitDate, setVisitDate] = useState(inDays(14));
  const [visitStatus, setVisitStatus] = useState<VisitStatus>("Scheduled");
  const [from, setFrom] = useState(provider);
  const [what, setWhat] = useState(
    `Record of the ${g.def.short.toLowerCase()}`,
  );
  const kinds = evidenceKinds[g.def.code];
  const [evKind, setEvKind] = useState(kinds[0].label);
  const [evDate, setEvDate] = useState("");
  const [evSource, setEvSource] = useState(sources[0]);
  const [evProvider, setEvProvider] = useState(provider);
  const [evValue, setEvValue] = useState("");
  const [resolution, setResolution] = useState(
    "Service completed and the evidence was validated",
  );
  const [confirmed, setConfirmed] = useState(false);
  const [assignWhy, setAssignWhy] = useState("");
  const [reevalDone, setReevalDone] = useState<null | boolean>(null);
  const [more, setMore] = useState<HTMLElement | null>(null);
  const [notBuilt, setNotBuilt] = useState<string | null>(null);
  const [reopenWhy, setReopenWhy] = useState("");

  const openDialog = (d: Dialog) => {
    setWho(g.careManager);
    setTitle("");
    setDue(inDays(7));
    setOwner(g.careManager);
    setNotes("");
    setContactDay(inDays(0));
    setFollowUp("");
    setContactBy(g.careManager);
    setChannel("Phone");
    setResult("Left voicemail");
    setWithWho(provider);
    setFrom(provider);
    setEvDate("");
    setEvValue("");
    setReopenWhy("");
    setConfirmed(false);
    setAssignWhy("");
    setReevalDone(null);
    setResolution("Service completed and the evidence was validated");
    setDialog(d);
  };

  const closing = checkClosure(g);
  const needsValue =
    kinds.find((k) => k.label === evKind)?.needsValueBelow !== undefined;
  const closed = g.status === "Closed";
  const next = recommendedAction(g);
  const today = inDays(0);
  const labels: Record<ActionKey, string> = {
    assign: "Assign care manager",
    task: "Create task",
    outreach: "Log contact",
    visit: "Schedule appointment",
    records: "Request records",
    evidence: "Record evidence",
    review: "Review evidence",
    reeval: "Re-evaluate measure",
    close: "Close gap",
    reopen: "Reopen gap",
  };
  const run = (k: ActionKey) => {
    if (k === "review") onOpenTab?.("evidence");
    else openDialog(k as Dialog);
  };
  /** The suggested step is filled; the others are outlined. */
  const variantOf = (k: ActionKey) =>
    next.key === k ? "primary" : "secondary";
  const hasManager = !!g.careManager;
  /** Everything in the menu. Evidence steps live on the Evidence and Closing tabs. */
  const menuItems: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    suggested?: boolean;
  }[] = [
    {
      label: "Schedule appointment",
      onClick: () => openDialog("visit"),
      suggested: next.key === "visit",
    },
    { label: "Add referral", onClick: () => setNotBuilt("Add referral") },
    {
      label: hasManager ? "Reassign care manager" : "Assign care manager",
      onClick: () => openDialog("assign"),
    },
    {
      label: "Close gap",
      onClick: () => openDialog("close"),
      disabled: !closing.ok,
      suggested: next.key === "close",
    },
  ];
  /** Where the suggested step is done when it is not in the menu. */
  const where: Partial<Record<ActionKey, string>> = {
    review: "Evidence tab",
    evidence: "Evidence tab, Record evidence",
    records: "Evidence tab, Record evidence",
    reeval: "Closing this gap tab",
  };

  return (
    <>
      {only ? (
        !closed && (
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ flexWrap: "wrap" }}
            role="group"
            aria-label="Actions"
          >
            {only.map((k) => (
              <Button
                key={k}
                variant={variantOf(k)}
                disabled={
                  (k === "reeval" && !closing.canReevaluate) ||
                  (k === "close" && !closing.ok)
                }
                onClick={() => run(k)}
              >
                {labels[k]}
              </Button>
            ))}
          </Stack>
        )
      ) : closed ? (
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
          <Button variant="secondary" onClick={() => openDialog("reopen")}>
            Reopen gap
          </Button>
        </Stack>
      ) : (
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Button
            size="small"
            aria-haspopup="menu"
            aria-expanded={!!more}
            endIcon={<KeyboardArrowDownIcon />}
            onClick={(e) => setMore(e.currentTarget)}
          >
            Actions
          </Button>
          <Menu anchorEl={more} open={!!more} onClose={() => setMore(null)}>
            {menuItems.map((it) => (
              <MenuItem
                key={it.label}
                disabled={it.disabled}
                onClick={() => {
                  setMore(null);
                  it.onClick();
                }}
              >
                {it.label}
                {it.suggested ? " (suggested)" : ""}
              </MenuItem>
            ))}
          </Menu>
          <InfoTip label="Why this step is suggested">
            <strong>Suggested next step: {next.label}.</strong> {next.why}
            {where[next.key] ? ` Do this in the ${where[next.key]}.` : ""}
            {closing.ok ? "" : ` ${closing.why}`}
          </InfoTip>
        </Stack>
      )}

      <Modal
        open={!!notBuilt}
        onClose={() => setNotBuilt(null)}
        title={notBuilt ?? ""}
        size="sm"
        actions={<Button onClick={() => setNotBuilt(null)}>Close</Button>}
      >
        <InfoBanner tone="info">This is to be built.</InfoBanner>
      </Modal>

      <Modal
        open={dialog === "assign"}
        onClose={close}
        title={hasManager ? "Reassign care manager" : "Assign care manager"}
        size="sm"
        actions={
          <>
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                api.assign(g.id, who, assignWhy.trim());
                close();
              }}
              disabled={who === g.careManager}
            >
              Assign
            </Button>
          </>
        }
      >
        <SelectField
          label="Care manager"
          value={who}
          onChange={setWho}
          options={opt(careManagers)}
          helperText={`Now: ${g.careManager}. Demo names: the spec has no care manager field.`}
        />
        <TextField
          label="Reason (optional)"
          value={assignWhy}
          onChange={(e) => setAssignWhy(e.target.value)}
          maxLength={200}
          sx={{ mt: 2 }}
        />
      </Modal>

      <Modal
        open={dialog === "task"}
        onClose={close}
        title="Create follow-up task"
        actions={
          <>
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                api.addTask(g.id, { title: title.trim(), due, owner });
                close();
              }}
              disabled={!title.trim() || !due}
            >
              Create task
            </Button>
          </>
        }
      >
        <Stack spacing={2}>
          <TextField
            label="What needs to be done"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`For example: call ${first} to book the visit`}
            required
          />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <DateField
              label="Due date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              fullWidth
              required
            />
            <SelectField
              label="Owner"
              value={owner}
              onChange={setOwner}
              options={opt(careManagers)}
              fullWidth
            />
          </Stack>
          <InfoBanner tone="info">
            Finishing a task never closes the gap. Only checked evidence does.
          </InfoBanner>
        </Stack>
      </Modal>

      <Modal
        open={dialog === "outreach"}
        onClose={close}
        title="Log contact"
        actions={
          <>
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button
              disabled={
                !contactDay ||
                contactDay > today ||
                (!!followUp && followUp < contactDay)
              }
              onClick={() => {
                api.addOutreach(g.id, {
                  channel,
                  result,
                  notes: notes.trim(),
                  day: contactDay,
                  followUp: followUp || undefined,
                  by: contactBy,
                });
                close();
              }}
            >
              Save contact
            </Button>
          </>
        }
      >
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <DateField
              label="Contact date"
              value={contactDay}
              error={contactDay > today}
              helperText={
                contactDay > today
                  ? "A contact cannot be in the future"
                  : undefined
              }
              onChange={(e) => setContactDay(e.target.value)}
              fullWidth
              required
            />
            <SelectField
              label="Method"
              value={channel}
              onChange={(v) => setChannel(v as OutreachChannel)}
              options={opt(outreachChannels)}
              fullWidth
            />
          </Stack>
          <SelectField
            label="Outcome"
            value={result}
            onChange={(v) => setResult(v as OutreachResult)}
            options={opt(outreachResults)}
            fullWidth
          />
          <TextField
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            minRows={3}
            maxLength={300}
          />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <DateField
              label="Follow-up date (optional)"
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
              error={!!followUp && followUp < contactDay}
              helperText={
                followUp && followUp < contactDay
                  ? "Follow-up cannot be before the contact date"
                  : undefined
              }
              fullWidth
            />
            <SelectField
              label="Care manager"
              value={contactBy}
              onChange={setContactBy}
              options={opt(careManagers)}
              fullWidth
            />
          </Stack>
        </Stack>
      </Modal>

      <Modal
        open={dialog === "visit"}
        onClose={close}
        title="Schedule appointment"
        actions={
          <>
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                api.addVisit(g.id, {
                  kind,
                  with: withWho.trim(),
                  service: service.trim(),
                  date: visitDate,
                  status: visitStatus,
                });
                close();
              }}
              disabled={!withWho.trim() || !service.trim() || !visitDate}
            >
              Save
            </Button>
          </>
        }
      >
        <Stack spacing={2}>
          <TextField
            label={
              kind === "Referral" ? "Referred to" : "With (provider or clinic)"
            }
            value={withWho}
            onChange={(e) => setWithWho(e.target.value)}
            required
          />
          <TextField
            label="Service"
            value={service}
            onChange={(e) => setService(e.target.value)}
            required
          />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <DateField
              label="Date"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              fullWidth
              required
            />
            <SelectField
              label="Status"
              value={visitStatus}
              onChange={(v) => setVisitStatus(v as VisitStatus)}
              options={opt(
                visitStatuses.filter(
                  (s) => s === "Requested" || s === "Scheduled",
                ),
              )}
              fullWidth
            />
          </Stack>
        </Stack>
      </Modal>

      <Modal
        open={dialog === "records"}
        onClose={close}
        title="Request missing documentation"
        actions={
          <>
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                api.requestRecords(g.id, {
                  from: from.trim(),
                  what: what.trim(),
                  due,
                });
                close();
              }}
              disabled={!from.trim() || !what.trim() || !due}
            >
              Send request
            </Button>
          </>
        }
      >
        <Stack spacing={2}>
          <TextField
            label="Request from"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="Provider, lab or clinic"
            required
          />
          <TextField
            label="What is needed"
            value={what}
            onChange={(e) => setWhat(e.target.value)}
            required
          />
          <DateField
            label="Needed by"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            required
          />
          <InfoBanner tone="info">
            The evidence status becomes Requested. The care gap status stays
            separate.
          </InfoBanner>
        </Stack>
      </Modal>

      <Modal
        open={dialog === "evidence"}
        onClose={close}
        title="Record evidence received"
        actions={
          <>
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                api.recordEvidence(g.id, {
                  kind: evKind,
                  date: evDate,
                  source: evSource,
                  provider: evProvider.trim(),
                  value: needsValue && evValue ? Number(evValue) : undefined,
                  note: notes.trim(),
                });
                close();
              }}
              disabled={!evDate || evDate > today}
            >
              Save evidence
            </Button>
          </>
        }
      >
        <Stack spacing={2}>
          <SelectField
            label="What it shows"
            value={evKind}
            onChange={setEvKind}
            options={opt(kinds.map((k) => k.label))}
          />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <DateField
              label="Date of service"
              value={evDate}
              error={!!evDate && evDate > today}
              helperText={
                evDate && evDate > today
                  ? "A service date cannot be in the future"
                  : undefined
              }
              onChange={(e) => setEvDate(e.target.value)}
              fullWidth
              required
            />
            {needsValue && (
              <TextField
                label="HbA1c result (%)"
                type="number"
                value={evValue}
                onChange={(e) => setEvValue(e.target.value)}
                fullWidth
              />
            )}
          </Stack>
          <SelectField
            label="Where it came from"
            value={evSource}
            onChange={setEvSource}
            options={opt(sources)}
          />
          <TextField
            label="Provider"
            value={evProvider}
            onChange={(e) => setEvProvider(e.target.value)}
          />
          <TextField
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            minRows={2}
            maxLength={300}
          />
          <InfoBanner tone="info">
            Saving evidence does not close the gap. A reviewer has to validate
            it, and the measure has to be re-evaluated with it, before Close gap
            is available.
          </InfoBanner>
        </Stack>
      </Modal>

      <Modal
        open={dialog === "reeval"}
        onClose={close}
        title="Re-evaluate the measure"
        actions={
          reevalDone === null ? (
            <>
              <Button variant="secondary" onClick={close}>
                Cancel
              </Button>
              <Button
                onClick={() => setReevalDone(api.reevaluate(g.id))}
                disabled={!closing.canReevaluate}
              >
                Run re-evaluation
              </Button>
            </>
          ) : (
            <Button onClick={close}>Done</Button>
          )
        }
      >
        <Stack spacing={2}>
          <Typography>
            Runs {g.def.code} again for {g.m.name} with the evidence a reviewer
            validated, to see whether the result would be Met. This is a
            simulation: the result in the files changes at the next calculation
            run.
          </Typography>
          {closing.evidence ? (
            <Typography variant="body2">
              Evidence used: <strong>{closing.evidence.kind}</strong>, service
              date {fmtDay(closing.evidence.date)}, {closing.evidence.source}
              {closing.evidence.provider
                ? `, ${closing.evidence.provider}`
                : ""}
              .
            </Typography>
          ) : (
            <InfoBanner tone="warning">
              No validated evidence yet. Validate a record on the Evidence tab
              first.
            </InfoBanner>
          )}
          {reevalDone !== null && (
            <InfoBanner tone={reevalDone ? "success" : "warning"}>
              {reevalDone
                ? "Result with this evidence: Met. Close gap is now available."
                : "Result with this evidence: Not met. See the Closing this gap tab for what is missing."}
            </InfoBanner>
          )}
        </Stack>
      </Modal>

      <Modal
        open={dialog === "close"}
        onClose={close}
        title="Close this care gap"
        actions={
          <>
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            {!closing.ok && onOpenTab && (
              <Button
                variant="secondary"
                onClick={() => {
                  close();
                  onOpenTab("evidence");
                }}
              >
                Go to Evidence tab
              </Button>
            )}
            <Button
              onClick={() => {
                if (api.close(g.id, resolution)) close();
              }}
              disabled={!closing.ok || !confirmed}
            >
              Close gap
            </Button>
          </>
        }
      >
        <Stack spacing={2}>
          <Typography>
            {closing.ok
              ? "Every requirement is met:"
              : "This gap cannot be closed yet:"}
          </Typography>
          <Stack
            component="ul"
            spacing={1}
            sx={{ m: 0, p: 0, listStyle: "none" }}
          >
            {closing.checks.map((c) => (
              <Stack
                component="li"
                key={c.label}
                direction="row"
                spacing={1.5}
                alignItems="flex-start"
              >
                <StatusChip
                  tone={c.ok ? "success" : "warning"}
                  label={c.ok ? "Passed" : "Not yet"}
                />
                <div>
                  <Typography sx={{ fontWeight: 700 }}>{c.label}</Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    {c.detail}
                  </Typography>
                </div>
              </Stack>
            ))}
          </Stack>
          {closing.ok && closing.evidence ? (
            <>
              <SelectField
                label="Closure reason"
                value={resolution}
                onChange={setResolution}
                options={opt([
                  "Service completed and the evidence was validated",
                  "Service done elsewhere; the record was obtained and validated",
                ])}
              />
              <Typography variant="body2">
                Supporting evidence: <strong>{closing.evidence.kind}</strong>,{" "}
                {fmtDay(closing.evidence.date)}, {closing.evidence.source}
                {closing.evidence.provider
                  ? `, ${closing.evidence.provider}`
                  : ""}
                .
              </Typography>
              <CheckboxField
                label="I confirm the validated evidence supports closing this gap"
                checked={confirmed}
                onChange={setConfirmed}
                helperText="The reason, the evidence, your name and the time are recorded in History."
              />
            </>
          ) : (
            <InfoBanner tone="warning">
              The gap stays open until every check passes. Record the evidence
              and have a reviewer validate it (Evidence tab), then re-evaluate
              the measure (Closing this gap tab).
            </InfoBanner>
          )}
        </Stack>
      </Modal>

      <Modal
        open={dialog === "reopen"}
        onClose={close}
        title="Reopen this care gap"
        size="sm"
        actions={
          <>
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                api.reopen(g.id, reopenWhy.trim());
                close();
              }}
              disabled={!reopenWhy.trim()}
            >
              Reopen
            </Button>
          </>
        }
      >
        <TextField
          label="Why is it being reopened?"
          value={reopenWhy}
          onChange={(e) => setReopenWhy(e.target.value)}
          multiline
          minRows={2}
          maxLength={200}
          required
        />
      </Modal>
    </>
  );
}

/** A reviewer validates or rejects one piece of evidence. A reason is kept in History for both. */
export function EvidenceReviewModal({
  g,
  rec,
  onClose,
}: {
  g: GapView;
  rec: EvidenceRec | null;
  onClose: () => void;
}) {
  const api = useGaps();
  const [decision, setDecision] = useState<"Validated" | "Rejected">(
    "Validated",
  );
  const [why, setWhy] = useState("");
  const [seen, setSeen] = useState<string | null>(null);
  if (rec && rec.id !== seen) {
    setSeen(rec.id);
    setDecision("Validated");
    setWhy("");
  }
  const t = rec ? criteriaTests(g.def.code, rec) : null;
  const rows: [string, boolean][] = t
    ? [
        ["Right kind of record", t.kind],
        ["Service date inside the measurement period", t.window],
        ["Source and provider recorded", t.source],
        ["Result meets the criteria", t.value],
      ]
    : [];
  return (
    <Modal
      open={!!rec}
      onClose={onClose}
      title="Review evidence"
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!rec) return;
              api.reviewEvidence(g.id, rec.id, decision, why.trim());
              onClose();
            }}
            disabled={decision === "Rejected" && !why.trim()}
          >
            {decision === "Validated" ? "Validate evidence" : "Reject evidence"}
          </Button>
        </>
      }
    >
      {rec && (
        <Stack spacing={2}>
          <Typography>
            <strong>{rec.kind}</strong>, service date {fmtDay(rec.date)}.{" "}
            {rec.source}
            {rec.provider ? `, ${rec.provider}` : ""}
            {rec.value !== undefined ? `, result ${rec.value}%` : ""}.
          </Typography>
          <Stack
            component="ul"
            spacing={0.5}
            sx={{ m: 0, p: 0, listStyle: "none" }}
          >
            {rows.map(([label, ok]) => (
              <Stack
                component="li"
                key={label}
                direction="row"
                spacing={1}
                alignItems="center"
              >
                <StatusChip
                  tone={ok ? "success" : "warning"}
                  label={ok ? "Meets" : "Does not meet"}
                />
                <Typography variant="body2">{label}</Typography>
              </Stack>
            ))}
          </Stack>
          <RadioGroupField
            label="Decision"
            row
            value={decision}
            onChange={(v) => setDecision(v as "Validated" | "Rejected")}
            options={[
              { value: "Validated", label: "Validate" },
              { value: "Rejected", label: "Reject" },
            ]}
          />
          <TextField
            label={
              decision === "Rejected"
                ? "Reason for rejecting"
                : "Note (optional)"
            }
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            required={decision === "Rejected"}
            maxLength={200}
          />
          <InfoBanner tone="info">
            Validating confirms the record is genuine and complete. Whether it
            counts for {g.def.code} is shown above and is checked again when the
            measure is re-evaluated. Only authorized reviewers can do this; in
            this demo the signed-in Admin is a reviewer.
          </InfoBanner>
        </Stack>
      )}
    </Modal>
  );
}
