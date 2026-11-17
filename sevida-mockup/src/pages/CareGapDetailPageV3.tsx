import { getVersion, useVersion } from "../version";
import { displayName, pcmPerson } from "../v16Data";
import { useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Box, Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  PageContainer,
  StatusChip,
  Tabs,
} from "sevida-ui";
import type { Column } from "sevida-ui";
import { Field } from "../components/Field";
import { GapStatusChip } from "../components/GapStatusChip";
import { LlmText } from "../components/LlmText";
import { renderCrumbLink } from "../components/RouterLinkAdapter";
import { MemberHeader } from "./MemberDetailPage";
import { TableLink } from "../components/TableLink";
import { missingEvidenceFor } from "../components/memberColumns";
import { DASH, createdOn, dxSystem, providerCell, tabKeyOfRecord, updatedOn } from "../v8Records";
import {
  arrivedOn,
  fmtDay,
  fmtWhen,
  evidenceRoles,
  gapPriority,
  gapStatusTone,
  recordRole,
  impactsOf,
  lastRelevant,
  serviceName,
  supportingEvents,
  unmappedEvents,
  useGaps,
} from "../careGaps";
import type { GapView } from "../careGaps";
import {
  CURRENT_YEAR,
  DEMO_NOW,
  MY,
  fmtDate,
  hashOf,
  measureByCode,
  memberById,
  providerName,
  providers,
} from "../data";
import type { Evt, MeasureCode } from "../data";
import {
  MISSING_SHORT,
  RECOMMENDED_SENTENCE,
  cgLabel,
  V3_LEFT,
  V3_WHO,
  gapShort,
} from "../v3Data";

/** The six record types of the Evidence tab (sheet: Claims, Diagnoses, Labs, Observations, Procedures, Visits). */
const recordType = (e: Evt) =>
  e.kind === "Lab"
    ? "Labs"
    : e.kind === "Observation"
      ? "Observations"
      : e.kind === "EHR visit"
        ? "Visits"
        : e.kind === "EHR procedure"
          ? "Procedures"
          : e.kind === "EHR diagnosis" ||
              (e.kind === "Claim" && e.system === "ICD-10")
            ? "Diagnoses"
            : e.kind === "Claim"
              ? "Claims"
              : "Procedures";

const DUE = new Date(CURRENT_YEAR, 11, 31);
const parseDayLocal = (s: string) => {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
};
const daysToDue = () =>
  Math.round(
    (DUE.getTime() -
      new Date(
        DEMO_NOW.getFullYear(),
        DEMO_NOW.getMonth(),
        DEMO_NOW.getDate(),
      ).getTime()) /
      86400000,
  );

/** What the care gap algorithm reads for each measure (the sheet's "Quality measures: data, artifacts and files"), in the words of the Member tabs. LPP-16227 section 2. */
const V8_DATA_USED: Record<MeasureCode, string> = {
  "BCS-E": "Member (age, gender), Coverage, Visits, Diagnoses, Procedures, Observations, Medications, Claims.",
  "CCS-E": "Member (age, gender), Coverage, Visits, Diagnoses, Procedures, Observations, Claims.",
  "COL-E": "Member (age, gender), Coverage, Visits, Diagnoses, Procedures, Observations, Medications, Claims.",
  GSD: "Member (age, gender), Coverage, Visits, Diagnoses, Procedures, Observations (HbA1c), Medications, Claims.",
  WCV: "Member (age, gender), Coverage, Visits, Diagnoses, Procedures, Providers, Claims.",
};

/** Version 11: the measure texts the sheet leaves blank for GSD. Draft wording, to be confirmed (see the requirements trace, GD-11). */
const V11_WHO_GSD = "Members aged 18–75 years with diabetes (type 1 or type 2).";
const V11_LEFT_GSD = ["A glycemic status assessment (HbA1c) during the measurement period."];

/** "47 Days (12/31/2026)": time left to the due date (LPP-16153 / Mansi). */
const timeLeft = () => `${daysToDue()} Days (${fmtDate(DUE)})`;

function Overview({ g }: { g: GapView }) {

  const v8 = useVersion().version.id >= 8;
  const v11 = useVersion().version.id >= 11;
  const { def, result } = g;
  const code = def.code as MeasureCode;
  const last = lastRelevant(g);
  const service = code === "COL-E" ? "colorectal cancer screening" : serviceName[code];
  const impact =
    last?.origin === "file"
      ? impactsOf(g.m, last.e).find((i) => i.code === code)
      : undefined;
  /** GSD: the result is the lowest final HbA1c of the year, so say what it is rather than "no test found". */
  const lowest = /^Lowest HbA1c ([\d.]+%) \((.*)\)$/.exec(result.reason);
  const sentence = lowest
    ? `The lowest final HbA1c result in the ${MY} measurement period is ${lowest[1]} (${lowest[2]}).`
    : last?.origin === "file" && impact?.outcome === "not counted"
      ? `The latest ${service} record on file did not count: ${impact.text
          .replace(/^Did not count: /, "")
          .replace(/^./, (c) => c.toLowerCase())}`
      : last?.origin === "file"
        ? `The latest ${service} record on file does not meet the measure: ${result.reason}.`
        : `No qualifying ${service} was found in the available records for the ${MY} measurement period.`;
  const sub = (title: string) => (
    <Typography
      sx={{ fontSize: ".8125rem", fontWeight: 700, color: "text.secondary" }}
    >
      {title}
    </Typography>
  );
  const missing = (
    <Typography sx={{ color: "text.secondary" }}>
      {v11 ? "Not available for this measure yet." : "Not written in the requirements sheet yet."}
    </Typography>
  );
  const closedWork = g.work.closed;
  const closedRec = closedWork && g.work.evidence.find((x) => x.id === closedWork.evidenceId);
  const closedSentence =
    v11 && g.status === "Closed" && closedWork
      ? closedRec
        ? `The gap was closed on ${fmtDay(closedWork.on)} by a ${closedRec.kind.toLowerCase()} record dated ${fmtDate(parseDayLocal(closedRec.date))} (${closedRec.source}).`
        : `The gap was closed on ${fmtDay(closedWork.on)}: ${closedWork.reason}`
      : null;
  const who = v11 && code === "GSD" ? V11_WHO_GSD : V3_WHO[code];
  const left = v11 && code === "GSD" ? V11_LEFT_GSD : V3_LEFT[code];
  return (
    <Card title={v11 && g.status === "Closed" ? "Why the Gap Is Closed" : "Why the Gap Is Open"}>
      <Stack spacing={2.5}>
        <Typography>{closedSentence ?? sentence}</Typography>
        <Stack spacing={0.5}>
          {sub(v8 ? "Gap Considerations" : "Who is Considered")}
          {who ? (
            <Typography>
              <b>{gapShort(code)}:</b> {who}
            </Typography>
          ) : (
            missing
          )}
          {v8 && (
            <Typography>
              <b>Data used:</b> {V8_DATA_USED[code]}
            </Typography>
          )}
        </Stack>
        <Stack spacing={0.5}>
          {sub(v8 ? "How To Close The Gap" : "What is Left to Close the Gap")}
          {v11 && g.status === "Closed" ? (
            <Typography>None. The gap is closed.</Typography>
          ) : left.length ? (
            left.map((t, i) => (
              <Typography key={i}>
                {i === 0 && <b>{gapShort(code)}: </b>}
                {t}
              </Typography>
            ))
          ) : (
            missing
          )}
        </Stack>
        <Field label={v11 ? "Time Left with Due Date" : "Due Date"}>
          {g.status === "Closed"
            ? v8
              ? "N/A"
              : "Closed"
            : v8 && !v11
              ? fmtDate(DUE)
              : timeLeft()}
        </Field>
      </Stack>
    </Card>
  );
}


/* ------------------------------------------------------------------ Version 12 (Application Tables, Care Gaps Details Page) */

const RECORD_TYPE: Record<string, string> = {
  claims: "Claim",
  diagnoses: "Diagnosis",
  encounters: "Encounter",
  immunizations: "Immunization",
  labs: "Lab",
  medications: "Medication",
  observations: "Observation",
  procedures: "Procedure",
};

/** Overview, Version 12: the reason is specific (window, last record on file), the closing steps say what to document, and the member's other open gaps are one click away. */
function OverviewV12({ g }: { g: GapView }) {
  const { openOf } = useGaps();
  const { def, result } = g;
  const code = def.code as MeasureCode;
  const service = code === "COL-E" ? "colorectal cancer screening" : serviceName[code];
  const last = lastRelevant(g);
  const impact = last?.origin === "file" ? impactsOf(g.m, last.e).find((i) => i.code === code) : undefined;
  const windows = missingEvidenceFor(code, MY).windows;
  const excluded = g.status === "Excluded";
  const closed = g.status === "Closed";
  const evidenceLink = (
    <TableLink to={`/members/${g.m.id}/gaps/${code}?tab=evidence`}>See the records on the Evidence tab</TableLink>
  );
  const lastLine =
    last?.origin === "file"
      ? `The latest ${service} record on file is dated ${fmtDate(last.date)} (${last.e.text}, ${last.e.code} ${last.e.system})${impact?.outcome === "not counted" ? `. It did not count: ${impact.text.replace(/^Did not count: /, "").replace(/^./, (c) => c.toLowerCase())}` : ". It does not meet the measure"}.`
      : last?.origin === "recorded"
        ? `The latest evidence recorded in Sonata is dated ${fmtDate(last.date)}.`
        : `No ${service} record that counts is on file for this member.`;
  const closedRec = g.work.closed && g.work.evidence.find((x) => x.id === g.work.closed!.evidenceId);
  const why = excluded
    ? `${g.m.name} is excluded from this measure for ${MY}: ${g.exclusionReason ?? result.reason}. There is no gap to close.`
    : closed && g.work.closed
      ? closedRec
        ? `The gap was closed on ${fmtDay(g.work.closed.on)} by a ${closedRec.kind.toLowerCase()} record dated ${fmtDate(parseDayLocal(closedRec.date))} (${closedRec.source}).`
        : `The gap was closed on ${fmtDay(g.work.closed.on)}: ${g.work.closed.reason}`
      : getVersion() >= 16
        ? // Version 16 (LPP-16227): specific and data driven, in the ticket's words: what was looked for, between which dates, and the last record on record.
          (() => {
            const long = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
            const START: Partial<Record<MeasureCode, Date>> = { "BCS-E": new Date(MY - 2, 9, 1), "CCS-E": new Date(MY - 2, 0, 1), GSD: new Date(MY, 0, 1), WCV: new Date(MY, 0, 1) };
            const start = START[code];
            const found =
              code === "COL-E"
                ? `No colorectal cancer screening found: no colonoscopy since Jan 1, ${MY - 9}, no CT colonography or flexible sigmoidoscopy since Jan 1, ${MY - 4}, no stool DNA test since Jan 1, ${MY - 2} and no FIT in ${MY}.`
                : `No ${service} found between ${start ? long(start) : `Jan 1, ${MY}`} and ${long(DEMO_NOW)}.`;
            const lastOn =
              last?.origin === "file" || last?.origin === "recorded"
                ? `Last ${service} on record: ${long(last.date)}${last.origin === "file" && last.e.value !== undefined ? ` (${last.e.value}${last.e.unit ? ` ${last.e.unit}` : last.e.tag === "hba1c" ? "%" : ""})` : ""}.`
                : `No ${service} on record.`;
            return `${found} ${lastOn}`;
          })()
        : `No qualifying ${service} was found for the ${MY} measurement period. Records that count: ${windows}. ${lastLine}`;
  const sub = (title: string) => (
    <Typography sx={{ fontSize: ".8125rem", fontWeight: 700, color: "text.secondary" }}>{title}</Typography>
  );
  const others = openOf(g.m).filter((x) => x.def.code !== code);
  const left = code === "GSD" ? V11_LEFT_GSD : V3_LEFT[code];
  const who = code === "GSD" ? V11_WHO_GSD : V3_WHO[code];
  // Version 16 (LPP-16227): a Gap Summary table (Status, Priority, Gap Identified Date, Due Date, Days Remaining) opens the Overview.
  const summary =
    getVersion() >= 16 ? (
      <Card title="Gap Summary">
        <Table size="small" aria-label="Gap Summary">
          <TableHead>
            <TableRow>
              {["Status", "Priority", "Gap Identified Date", "Due Date", "Days Remaining"].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 700 }}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>{excluded ? <StatusChip tone={gapStatusTone.Excluded} label="Excluded" /> : <GapStatusChip closed={closed} />}</TableCell>
              <TableCell>{gapPriority(g) ?? "N/A"}</TableCell>
              <TableCell>{fmtDate(g.identified)}</TableCell>
              <TableCell>{g.status === "Open" ? fmtDate(DUE) : "N/A"}</TableCell>
              <TableCell>{g.status === "Open" ? `${daysToDue()} Days` : "N/A"}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>
    ) : null;
  // Version 16 (LPP-16227): Gap Summary, Other Open Gaps (chips, Gap Name A to Z), Why The Gap Is Open, How To Close The Gap. No "Gap Considerations" section.
  if (getVersion() >= 16) {
    const chips = [...others].sort((a, b) => cgLabel(a.def.code as MeasureCode).localeCompare(cgLabel(b.def.code as MeasureCode)));
    return (
      <Stack spacing={2}>
        {summary}
        <Card title="Other Open Gaps">
          {chips.length ? (
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
              {chips.map((x) => (
                <Chip key={x.id} clickable component="a" href={`#/members/${g.m.id}/gaps/${x.def.code}`} label={cgLabel(x.def.code as MeasureCode)} />
              ))}
            </Stack>
          ) : (
            <Typography sx={{ color: "text.secondary" }}>{g.m.name} has no other open gaps.</Typography>
          )}
        </Card>
        <Card title={excluded ? "Why The Member Is Excluded" : closed ? "Why The Gap Is Closed" : "Why The Gap Is Open"}>
          <Stack spacing={0.5}>
            <Typography>{why}</Typography>
            <Typography>{evidenceLink}.</Typography>
          </Stack>
        </Card>
        <Card title="How To Close The Gap">
          <Stack spacing={0.5}>
            {excluded ? (
              <Typography>None. The member is excluded from this measure, so no action is needed.</Typography>
            ) : closed ? (
              <Typography>None. The gap is closed.</Typography>
            ) : (
              <>
                <Typography>
                  <b>Recommended action: </b>
                  <LlmText text={RECOMMENDED_SENTENCE(code, CURRENT_YEAR)} />
                </Typography>
                {left.map((t, i) => (
                  <Typography key={i}>
                    {i === 0 && <b>{gapShort(code)}: </b>}
                    {t}
                  </Typography>
                ))}
                <Typography>
                  <b>What to document: </b>
                  the service date inside the window above, the code and code system, and the provider who did it. Send it through the claims, EHR or lab feed, or record it as evidence in Sonata. The gap shows as Closed once the evidence is confirmed; doing the activity alone does not close it.
                </Typography>
              </>
            )}
          </Stack>
        </Card>
      </Stack>
    );
  }
  return (
    <Stack spacing={2}>
      {summary}
    <Card title={excluded ? "Why the Member Is Excluded" : closed ? "Why the Gap Is Closed" : "Why the Gap Is Open"}>
      <Stack spacing={2.5}>
        <Stack spacing={0.5}>
          <Typography>{why}</Typography>
          <Typography>{evidenceLink}.</Typography>
        </Stack>
        <Stack spacing={0.5}>
          {sub("Gap Considerations")}
          <Typography>
            <b>{gapShort(code)}:</b> {who}
          </Typography>
          <Typography>
            <b>Data used:</b> {V8_DATA_USED[code]}
          </Typography>
        </Stack>
        <Stack spacing={0.5}>
          {sub("How To Close The Gap")}
          {excluded ? (
            <Typography>None. The member is excluded from this measure, so no action is needed.</Typography>
          ) : closed ? (
            <Typography>None. The gap is closed.</Typography>
          ) : (
            <>
              <Typography>
                <b>Recommended action: </b>
                <LlmText text={RECOMMENDED_SENTENCE(code, CURRENT_YEAR)} />
              </Typography>
              {left.map((t, i) => (
                <Typography key={i}>
                  {i === 0 && <b>{gapShort(code)}: </b>}
                  {t}
                </Typography>
              ))}
              <Typography>
                <b>What to document: </b>
                the service date inside the window above, the code and code system, and the provider who did it. Send it through the claims, EHR or lab feed, or record it as evidence in Sonata. The gap shows as Closed once the evidence is confirmed; doing the activity alone does not close it.
              </Typography>
            </>
          )}
        </Stack>
        <Stack spacing={0.75}>
          {sub("Other Open Gaps")}
          {others.length ? (
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
              {others.map((x) => (
                <TableLink key={x.id} to={`/members/${g.m.id}/gaps/${x.def.code}`}>
                  {cgLabel(x.def.code as MeasureCode)}
                </TableLink>
              ))}
            </Stack>
          ) : (
            <Typography sx={{ color: "text.secondary" }}>{g.m.name} has no other open gaps.</Typography>
          )}
        </Stack>
      </Stack>
    </Card>
    </Stack>
  );
}

interface EvRow12 {
  key: string;
  date: Date;
  type: string;
  tab: string;
  desc: string;
  code: string;
  system: string;
  result: string;
  provider: string;
  source: string;
  created: Date;
  updated: Date;
  recordId: string;
  received: Date | null;
  valueSet: string;
  clinic: string;
  role: string;
  reason: string;
  rank: number;
}

/** Evidence, Version 12: Service Date, Record Type, Description, Code, Code System, Result / Value, Provider, Source. Records that count (or exclude) come first, then newest. */
function EvidenceV12({ g }: { g: GapView }) {
  const navigate = useNavigate();
  const code = g.def.code;
  const rows = useMemo<EvRow12[]>(
    () =>
      [
        ...supportingEvents(g.m, code),
        ...unmappedEvents(g.m, code),
        // An excluded member: the record that caused the exclusion is the evidence, even when it is not one of the measure's usual records.
        ...(g.status === "Excluded" && g.result.evidence && !supportingEvents(g.m, code).includes(g.result.evidence) ? [g.result.evidence] : []),
      ]
        .map((e) => {
          const tab = tabKeyOfRecord(e);
          const imp = impactsOf(g.m, e).find((i) => i.code === code);
          const org = providers.find((x) => x.name === providerName(e.provider))?.org;
          return {
            key: `${e.file}-${e.code}-${e.date.toISOString()}`,
            date: e.date,
            type: RECORD_TYPE[tab] ?? tab,
            tab,
            desc: e.text,
            code: e.code,
            system: getVersion() >= 16 && e.system === "ICD-10" ? dxSystem() : e.system,
            created: createdOn(e),
            updated: updatedOn(e),
            result: e.value !== undefined ? `${e.value}${e.unit ? ` ${e.unit}` : e.tag === "hba1c" ? "%" : ""}` : getVersion() >= 16 ? DASH : "–",
            provider: getVersion() >= 16 ? providerCell(g.m, e) : providerName(e.provider),
            source: getVersion() >= 16 ? "MHS GENESIS" : e.supplemental ? "EHR / lab feed" : "Claims",
            recordId: `REC-${(hashOf(`${e.file}${e.code}${e.date.toISOString()}`) % 900000) + 100000}`,
            received: arrivedOn(e) ?? null,
            valueSet: `${gapShort(code as MeasureCode)} ${e.tag}`,
            clinic: org ?? "–",
            role: recordRole(g, e).role,
            reason: recordRole(g, e).reason,
            rank: e === g.result.evidence || (imp && (imp.outcome === "decided" || imp.outcome === "counted")) ? 0 : 1,
          };
        })
        // Version 16 (LPP-16228): newest Service Date first, then Provider A to Z.
        .sort((a, b) =>
          getVersion() >= 16
            ? b.date.getTime() - a.date.getTime() || a.provider.localeCompare(b.provider)
            : a.rank - b.rank || b.date.getTime() - a.date.getTime(),
        ),
    [g.m, code],
  );
  const optional = { group: "Optional", defaultHidden: true } as const;
  const e16 = getVersion() >= 16;
  const cols: Column<EvRow12>[] = [
    { key: "date", header: "Service Date", help: "The day the care happened. Not the day the record arrived.", accessor: (r) => r.date, render: (r) => fmtDate(r.date), sortable: true, nowrap: true, primary: true },
    { key: "type", header: "Record Type", accessor: (r) => r.type, sortable: true, width: 140, filter: { type: "multiselect", options: Object.values(RECORD_TYPE).map((v) => ({ value: v, label: v })) } },
    {
      key: "desc",
      header: "Description",
      help: e16 ? "What the record says. Select it to open the record on the member's page." : undefined,
      accessor: (r) => r.desc,
      width: 300,
      render: e16 ? (r) => <TableLink to={`/members/${g.m.id}?tab=${r.tab}`}>{r.desc}</TableLink> : undefined,
    },
    { key: "code", header: "Code", accessor: (r) => r.code, sortable: true, nowrap: true },
    { key: "system", header: "Code System", accessor: (r) => r.system, sortable: true, nowrap: true },
    { key: "result", header: "Result / Value", accessor: (r) => r.result, sortable: true, nowrap: true },
    { key: "prov", header: "Provider", accessor: (r) => r.provider, sortable: true, width: 180 },
    { key: "src", header: "Source", help: "Where the record came from: claims, or the EHR / lab feed.", accessor: (r) => r.source, sortable: true, width: 150 },
    { key: "role", header: "Evidence Role", help: "How this record relates to the gap: Closes gap, Exclusion or Doesn't qualify.", accessor: (r) => r.role, sortable: true, nowrap: true, filter: { type: "multiselect", options: evidenceRoles.map((v) => ({ value: v, label: v })) }, ...(e16 ? optional : {}) },
    { key: "reason", header: "Reason", help: "Explains a Doesn't qualify row, for example dated outside the lookback window or code not in the measure's value set.", accessor: (r) => r.reason, render: (r) => r.reason || "–", width: 320, ...(e16 ? optional : {}) },
    { key: "recordId", header: "Record ID / Claim ID", help: "Sample data.", accessor: (r) => r.recordId, nowrap: true, ...optional },
    { key: "received", header: "Received Date", help: "The day the file with this record was received.", accessor: (r) => r.received, render: (r) => (r.received ? fmtDate(r.received) : "–"), sortable: true, nowrap: true, ...optional },
    { key: "valueSet", header: "Value Set", help: "The measure's list of codes this record matched. Sample data.", accessor: (r) => r.valueSet, width: 180, ...optional },
    { key: "clinic", header: "Clinic / Facility", accessor: (r) => r.clinic, width: 200, ...optional },
    ...(e16
      ? ([
          { key: "createdOn", header: "Created On", accessor: (r) => r.created, render: (r) => fmtDate(r.created), sortable: true, nowrap: true, ...optional },
          { key: "createdBy", header: "Created By", accessor: () => "System", sortable: true, ...optional },
          { key: "lastUpdated", header: "Last Updated", accessor: (r) => r.updated, render: (r) => fmtDate(r.updated), sortable: true, nowrap: true, ...optional },
        ] as Column<EvRow12>[])
      : []),
  ];
  return (
    <Stack spacing={2}>
      <Typography>Records from the files are checked automatically against the measure rules. Select a row to open the record on the member's page.</Typography>
      <DataTable
        ariaLabel="Evidence"
        title="Evidence"
        searchPlaceholder="Search by Description, Code or Provider…"
        storageKey={e16 ? "demo-gap-evidence-v16-a" : "demo-gap-evidence-v12-a"}
        defaultSort={e16 ? { key: "date", direction: "desc" } : undefined}
        // Version 16 (LPP-16228): the ticket's eight columns, and Created On, Created By and Last Updated in the Columns panel. Nothing else.
        columns={e16 ? cols.filter((c) => !["role", "reason", "recordId", "received", "valueSet", "clinic"].includes(c.key)) : cols}
        rows={rows}
        getRowId={(r) => r.key}
        paginated={false}
        columnsPanel={{ tableOrder: true, search: false }}
        onRowClick={(r) => navigate(`/members/${g.m.id}?tab=${r.tab}`)}
        emptyState={<EmptyState title="No related records" description="No records in the files relate to this care gap." />}
      />
    </Stack>
  );
}

interface HistRow12 {
  key: string;
  when: Date;
  event: string;
  status: string;
  priority: string;
  details: string;
  pcm: string;
  due: Date | null;
  closed: Date | null;
  action: string;
  source: string;
}

/**
 * History, Version 12: an event log, newest first. Identified, Priority Changed, PCM Changed, Closed, Reopened and Excluded. Dates are sample data;
 * the Priority Changed event is a made-up example of how a change would read.
 */
function HistoryV12({ g }: { g: GapView }) {
  const code = g.def.code as MeasureCode;
  const rows = useMemo<HistRow12[]>(() => {
    const pcmP = pcmPerson(g.m);
    const pcmNow = pcmP ? `${pcmP.name} - NPI: ${pcmP.npi}` : "Not sent";
    const prioNow = gapPriority(g) ?? "N/A";
    const act = [...g.work.activity].sort((a, b) => a.when.localeCompare(b.when));
    type Ev = { key: string; when: Date; event: string; details: string; pcm: string; closed: Date | null };
    const evs: Ev[] = [];
    for (const a of act) {
      const when = new Date(a.when);
      if (a.kind === "Found")
        evs.push({ key: a.id, when, event: g.status === "Excluded" ? "Excluded" : "Identified", details: a.text, pcm: pcmNow, closed: null });
      else if (a.kind === "Assigned") {
        evs.push({ key: a.id, when, event: "PCM Changed", details: `Primary Care Manager assigned: ${pcmNow}.`, pcm: pcmNow, closed: null });
      } else if (a.kind === "Closed")
        evs.push({ key: a.id, when, event: "Closed", details: a.text, pcm: pcmNow, closed: when });
      else if (a.kind === "Status" && /reopened/i.test(a.text))
        evs.push({ key: a.id, when, event: getVersion() >= 16 ? "Opened" : "Reopened", details: a.text, pcm: pcmNow, closed: null });
    }
    // Version 16 (LPP-16229): about one open gap in nine was closed by a claim that the payer later reversed, so the gap was opened again (the Opened event of the ticket).
    // The Evidence tab shows no record for it, because the claim no longer counts.
    if (getVersion() >= 16 && g.status === "Open" && hashOf(`${g.id}reopen`) % 9 === 0 && g.identified.getTime() + 16 * 86_400_000 < DEMO_NOW.getTime()) {
      const closedOn = new Date(g.identified.getTime() + 8 * 86_400_000);
      evs.push({ key: `${g.id}-c`, when: closedOn, event: "Closed", details: `Gap closed by a claim for ${serviceName[code]}.`, pcm: pcmNow, closed: closedOn });
      evs.push({ key: `${g.id}-o`, when: new Date(g.identified.getTime() + 15 * 86_400_000), event: "Opened", details: "Gap opened again: the payer reversed the claim that closed it.", pcm: pcmNow, closed: null });
    }
    // A made-up example: some open gaps moved to a higher priority a few weeks after they were identified.
    if (g.status === "Open" && hashOf(g.id) % 2 === 0 && prioNow !== "Low") {
      const was = prioNow === "High" ? "Medium" : "Low";
      evs.push({ key: `${g.id}-p`, when: new Date(g.identified.getTime() + 21 * 86_400_000), event: "Priority Changed", details: `Priority changed from ${was} to ${prioNow}.${getVersion() >= 16 ? "" : " Sample event."}`, pcm: pcmNow, closed: null });
    }
    evs.sort((a, b) => a.when.getTime() - b.when.getTime());
    // Status and priority as they were after each event.
    let status = "Open";
    const change = evs.find((x) => x.event === "Priority Changed");
    const wasPrio = prioNow === "High" ? "Medium" : "Low";
    const built: HistRow12[] = evs.map((e) => {
      if (e.event === "Closed") status = "Closed";
      else if (e.event === "Reopened" || e.event === "Opened" || e.event === "Identified") status = "Open";
      else if (e.event === "Excluded") status = "Excluded";
      const priority = status !== "Open" ? "N/A" : change && e.when < change.when ? wasPrio : prioNow;
      return {
        key: e.key,
        when: e.when,
        event: e.event,
        status,
        priority,
        details: e.details,
        pcm: e.pcm,
        due: status === "Open" ? DUE : null,
        closed: e.closed,
        action: status === "Open" ? RECOMMENDED_SENTENCE(code, CURRENT_YEAR) : "N/A",
        source: "Sonata quality run",
      };
    });
    // Version 16: newest first, and events on the same day A to Z.
    if (getVersion() >= 16) return built.sort((a, b) => b.when.getTime() - a.when.getTime() || a.event.localeCompare(b.event));
    return built.sort((a, b) => b.when.getTime() - a.when.getTime());
  }, [g, code]);
  const optional = { group: "Optional", defaultHidden: true } as const;
  const h16 = getVersion() >= 16;
  const cols: Column<HistRow12>[] = [
    { key: "when", header: "Date", accessor: (r) => r.when, render: (r) => fmtDate(r.when), sortable: true, nowrap: true, primary: true },
    { key: "event", header: "Event", help: getVersion() >= 16 ? "Identified, Priority Changed, PCM Changed, Closed, Opened or Excluded." : "Identified, Priority Changed, PCM Changed, Closed, Reopened or Excluded.", accessor: (r) => r.event, sortable: true, nowrap: true, filter: { type: "multiselect", options: ["Identified", "Priority Changed", "PCM Changed", "Closed", getVersion() >= 16 ? "Opened" : "Reopened", "Excluded"].map((v) => ({ value: v, label: v })) } },
    { key: "status", header: "Gap Status", help: "The status of the gap after this event.", accessor: (r) => r.status, sortable: true, nowrap: true, render: (r) => <StatusChip tone={gapStatusTone[r.status as keyof typeof gapStatusTone]} label={r.status} /> },
    { key: "priority", header: "Priority", help: "The priority after this event. Only for an open gap.", accessor: (r) => r.priority, sortable: true, nowrap: true },
    { key: "details", header: "Change Details", accessor: (r) => r.details, width: 360 },
    { key: "pcm", header: "Primary Care Manager", accessor: (r) => r.pcm, sortable: true, width: 220 },
    { key: "my", header: "Measurement Year", accessor: () => String(MY), nowrap: true, ...optional },
    { key: "due", header: "Due Date", accessor: (r) => r.due, render: (r) => (r.due ? fmtDate(r.due) : "N/A"), nowrap: true, ...optional },
    { key: "closed", header: "Gap Closed Date", accessor: (r) => r.closed, render: (r) => (r.closed ? fmtDate(r.closed) : "N/A"), nowrap: true, ...optional },
    { key: "action", header: "Recommended Action", accessor: (r) => r.action, render: (r) => (r.action === "N/A" ? "N/A" : <LlmText text={r.action} />), width: 300, ...optional },
    { key: "source", header: "Source / Run Date", help: "What made the change. Sample data.", accessor: (r) => r.source, render: (r) => `${r.source}, ${fmtDate(r.when)}`, width: 220, ...optional },
    ...(h16
      ? ([
          { key: "createdOn", header: "Created On", accessor: (r) => r.when, render: (r) => fmtDate(r.when), sortable: true, nowrap: true, ...optional },
          { key: "createdBy", header: "Created By", accessor: () => "System", sortable: true, ...optional },
          { key: "lastUpdated", header: "Last Updated", accessor: (r) => r.when, render: (r) => fmtDate(r.when), sortable: true, nowrap: true, ...optional },
        ] as Column<HistRow12>[])
      : []),
  ];
  return (
    <DataTable
      ariaLabel="History"
      title={h16 ? "Gap History" : "History"}
      // Version 16 (LPP-16229): the ticket's six columns, and Created On, Created By and Last Updated in the Columns panel. Nothing else.
      columns={h16 ? cols.filter((c) => !["my", "due", "closed", "action", "source"].includes(c.key)) : cols}
      rows={rows}
      getRowId={(r) => r.key}
      paginated={false}
      defaultSort={{ key: "when", direction: "desc" }}
      storageKey={h16 ? "demo-gap-history-v16-a" : "demo-gap-history-v12-a"}
      columnsPanel={{ tableOrder: true, search: false }}
    />
  );
}

interface EvRow {
  key: string;
  date: Date;
  type: string;
  code: string;
  detail: string;
  provider: string;
  source: string;
}

function Evidence({ g }: { g: GapView }) {

  const v8 = useVersion().version.id >= 8;
  const v11 = useVersion().version.id >= 11;
  const code = g.def.code;
  const rows = useMemo<EvRow[]>(
    () =>
      [...supportingEvents(g.m, code), ...unmappedEvents(g.m, code)].map(
        (e) => ({
          key: `${e.file}-${e.code}-${e.date.toISOString()}`,
          date: e.date,
          type: recordType(e),
          code: `${e.code} (${e.system})`,
          detail: e.text,
          provider: providerName(e.provider),
          source: `${e.file}.csv`,
        }),
      ),
    [g.m, code],
  );
  const gapLabel = cgLabel(code as MeasureCode);
  const cols: Column<EvRow>[] = [
    {
      key: "date",
      header: "Service Date",
      help: "The day the care happened. Not the day the record arrived.",
      accessor: (r) => r.date,
      render: (r) => fmtDate(r.date),
      sortable: true,
      nowrap: true,
      primary: true,
    },
    // Version 11 (LPP-16228 and the Application Tables sheet): Service Date, Gap Name, Evidence. The kind of record, the provider and
    // the feed stay as optional columns.
    ...(v11
      ? [
          {
            key: "gapName",
            header: "Gap Name",
            help: "The care gap this evidence is for.",
            accessor: () => gapLabel,
            sortable: true,
            width: 260,
          } as Column<EvRow>,
        ]
      : []),
    {
      key: "type",
      // LPP-16228: "Source" is the kind of record (Claims, Labs ...). The file it came in on is the optional Feed column.
      header: v11 ? "Record Type" : v8 ? "Source" : "Record Type",
      help: v8 ? "The kind of record this evidence comes from: Claims, Labs, Diagnoses, Procedures, Observations or Visits." : undefined,
      accessor: (r) => r.type,
      sortable: true,
      width: 130,
      defaultHidden: v11,
    },
    {
      key: "detail",
      header: v11 ? "Evidence" : v8 ? "Details" : "Detail",
      accessor: (r) => r.detail,
      width: 320,
      render: (r) => (
        <>
          {r.detail}
          <Typography
            variant="caption"
            component="div"
            sx={{ color: "text.secondary" }}
          >
            Code {r.code}
          </Typography>
        </>
      ),
    },
    {
      key: "prov",
      header: "Provider",
      accessor: (r) => r.provider,
      sortable: true,
      width: 160,
      defaultHidden: v8,
    },
    {
      key: "src",
      header: v8 ? "Feed" : "Source",
      defaultHidden: v8,
      help: "The file the record came in.",
      accessor: (r) => r.source,
      sortable: true,
      width: 160,
    },
  ];
  return (
    <Stack spacing={2}>
      <Typography>
        Records from the files are checked automatically against the measure
        rules.
      </Typography>
      <DataTable
        ariaLabel="Evidence"
        title="Evidence"
        searchPlaceholder={v11 ? "Search by Gap Name or Evidence…" : v8 ? "Search by Source or Details…" : "Search by Record Type or Detail…"}
        storageKey={v11 ? "demo-gap-evidence-v11-a" : v8 ? "demo-gap-evidence-ver8-a" : undefined}
        columns={cols}
        rows={rows}
        getRowId={(r) => r.key}
        paginated={false}
        defaultSort={{ key: "date", direction: "desc" }}
        emptyState={
          <EmptyState
            title="No related records"
            description="No records in the files relate to this care gap."
          />
        }
      />
    </Stack>
  );
}

interface HistRow {
  key: string;
  gap: string;
  identified: Date;
  due: Date | null;
  closed: Date | null;
  updated: Date;
  action: string;
  priority: string;
  pcm: string;
}

/**
 * LPP-16229: one row for each state the care gap has been in, newest first: Gap Name, Identified Date, Due Date (open) or Closed
 * Date (closed), Last Updated and Recommended Actions. A closed gap has two rows: the closed one and the open one it came from.
 */
function History({ g }: { g: GapView }) {

  const code = g.def.code as MeasureCode;
  const v11 = useVersion().version.id >= 11;
  const rows = useMemo<HistRow[]>(() => {
    // Version 11 (LPP-16229): Priority only for an open gap, and the Primary Care Manager on every row.
    const left = Math.round((DUE.getTime() - DEMO_NOW.getTime()) / 86400000);
    const openPriority = left <= 45 ? "High" : left <= 90 ? "Medium" : "Low";
    const pcmP = pcmPerson(g.m);
    const pcm = pcmP ? `${pcmP.name} - NPI: ${pcmP.npi}` : "Not sent";
    const open: HistRow = {
      key: "open",
      gap: cgLabel(code),
      identified: g.identified,
      due: DUE,
      closed: null,
      updated: g.identified,
      action: RECOMMENDED_SENTENCE(code, CURRENT_YEAR),
      priority: openPriority,
      pcm,
    };
    if (g.status === "Closed") {
      const on = g.work.closed ? parseDayLocal(g.work.closed.on) : g.lastUpdated;
      return [
        {
          key: "closed",
          gap: cgLabel(code),
          identified: g.identified,
          due: null,
          closed: on,
          updated: on,
          action: "N/A",
          priority: "N/A",
          pcm,
        },
        open,
      ];
    }
    return [{ ...open, updated: g.lastUpdated }];
  }, [g, code]);
  // LPP-16229 order: Gap Name, Identified Date, Due Date (if open), Priority (if open), Recommended Action, Primary Care Manager,
  // Closed Date (if closed), Last Updated.
  const priorityCol: Column<HistRow> = {
    key: "priority",
    header: "Priority",
    help: "Only for a gap that is open.",
    accessor: (r) => r.priority,
    sortable: true,
    nowrap: true,
  };
  const pcmCol: Column<HistRow> = {
    key: "pcm",
    header: "Primary Care Manager",
    accessor: (r) => r.pcm,
    sortable: true,
    width: 220,
  };
  const cols: Column<HistRow>[] = [
    {
      key: "gap",
      header: "Gap Name",
      accessor: (r) => r.gap,
      sortable: true,
      primary: true,
      width: 280,
    },
    {
      key: "identified",
      header: "Identified Date",
      accessor: (r) => r.identified,
      render: (r) => fmtDate(r.identified),
      sortable: true,
      nowrap: true,
    },
    {
      key: "due",
      header: "Due Date",
      help: "Only for a gap that is open.",
      accessor: (r) => r.due,
      render: (r) => (r.due ? fmtDate(r.due) : "N/A"),
      sortable: true,
      nowrap: true,
    },
    {
      key: "closed",
      header: "Closed Date",
      help: "Only for a gap that is closed.",
      accessor: (r) => r.closed,
      render: (r) => (r.closed ? fmtDate(r.closed) : "N/A"),
      sortable: true,
      nowrap: true,
    },
    {
      key: "updated",
      header: "Last Updated",
      accessor: (r) => r.updated,
      render: (r) => fmtDate(r.updated),
      sortable: true,
      nowrap: true,
    },
    {
      key: "action",
      header: v11 ? "Recommended Action" : "Recommended Actions",
      accessor: (r) => r.action,
      render: (r) => (r.action === "N/A" ? "N/A" : <LlmText text={r.action} />),
      width: 300,
    },
  ];
  const by = new Map(cols.map((c) => [c.key, c]));
  const colsV11: Column<HistRow>[] = [
    by.get("gap")!,
    by.get("identified")!,
    by.get("due")!,
    priorityCol,
    by.get("action")!,
    pcmCol,
    by.get("closed")!,
    by.get("updated")!,
  ];
  return (
    <DataTable
      ariaLabel="History"
      title="History"
      columns={v11 ? colsV11 : cols}
      rows={rows}
      getRowId={(r) => r.key}
      paginated={false}
      defaultSort={{ key: "updated", direction: "desc" }}
      storageKey={v11 ? "demo-gap-history-v11-a" : "demo-gap-history-ver8-a"}
    />
  );
}

/**
 * Version 3 of the Care Gap page (final sheet, Care Gaps Details Page tab): breadcrumb Care Gaps > Member Name > Gap Name, the title
 * "Member Name: Gap Name", the Member Header, a Care Gap Summary, and two tabs, Overview and Evidence. No status pills, no Actions button,
 * no Follow-up, History or Closing tabs: the sheet does not list them.
 */
export function CareGapDetailPageV3() {
  const { memberId, code } = useParams();
  const navigate = useNavigate();
  const m = memberById(memberId);
  const def = measureByCode(code);
  const { get, excludedOf } = useGaps();
  const { version } = useVersion();
  const [search, setSearch] = useSearchParams();
  const v8 = version.id >= 8;
  const v11 = version.id >= 11;
  const v12 = version.id >= 12;
  const tab =
    search.get("tab") === "evidence"
      ? "evidence"
      : v8 && search.get("tab") === "history"
        ? "history"
        : "overview";
  const g = m && def
    ? get(m, def.code as MeasureCode) ??
      (version.id >= 12 ? excludedOf(m).find((x) => x.def.code === def.code) ?? null : null)
    : null;
  const label = def ? cgLabel(def.code as MeasureCode) : "Not found";

  // Version 8 (LPP-16153): Care Gaps > BCS > Member Name. Earlier versions: Care Gaps > Member Name > Gap Name.
  // Version 16 (LPP-16227 to 16229): Care Gaps > Gap Name > Member Name > Overview / Evidence / History.
  const v16 = version.id >= 16;
  const crumbs = v16
    ? [
        { label: "Care Gaps", href: "/care-gaps" },
        { label: def ? label : "Not found", href: "/care-gaps" },
        ...(m ? [{ label: displayName(m), href: `/members/${m.id}` }] : []),
        { label: tab === "evidence" ? "Evidence" : tab === "history" ? "History" : "Overview" },
      ]
    : v8
    ? [
        { label: v11 ? "Care Gaps List" : "Care Gaps", href: "/care-gaps" },
        { label: def ? gapShort(def.code) : "Not found", href: "/care-gaps" },
        ...(m ? [{ label: m.name }] : []),
      ]
    : [
        { label: "Care Gaps", href: "/care-gaps" },
        ...(m ? [{ label: m.name, href: `/members/${m.id}?tab=gaps` }] : []),
        { label },
      ];
  if (!m || !def || !g) {
    return (
      <PageContainer breadcrumbs={crumbs} renderLink={renderCrumbLink}>
        <EmptyState
          title="No care gap here"
          description={
            m && def
              ? `${m.name} has no care gap for ${def.name}.`
              : "This care gap does not exist."
          }
          action={
            <Button
              variant="secondary"
              onClick={() => navigate(m ? `/members/${m.id}?tab=gaps` : "/care-gaps")}
            >
              Back
            </Button>
          }
        />
      </PageContainer>
    );
  }
  const missingText =
    g.status === "Closed" ? "None" : MISSING_SHORT[def.code as MeasureCode];
  const closed = g.status === "Closed";
  const excluded = g.status === "Excluded";
  // Version 11 summary (LPP-16153 and the Application Tables sheet): Priority, Primary Care Manager and Gap Evidence are new.
  const left = Math.round((DUE.getTime() - DEMO_NOW.getTime()) / 86400000);
  const priority = v12 ? gapPriority(g) ?? "--" : closed ? "--" : left <= 45 ? "High" : left <= 90 ? "Medium" : "Low";
  const pcmP = pcmPerson(m);
  const pcm = pcmP ? `${pcmP.name} - NPI: ${pcmP.npi}` : "Not sent";
  const closeRec = g.work.closed && g.work.evidence.find((x) => x.id === g.work.closed!.evidenceId);
  const evidence =
    closed && closeRec
      ? `${closeRec.kind}, ${fmtDate(parseDayLocal(closeRec.date))}. ${closeRec.source}`
      : g.result.reason;
  return (
    <PageContainer
      title={v8 ? undefined : `${m.name}: ${label}`}
      breadcrumbs={crumbs}
      breadcrumbMaxItems={v16 ? 5 : undefined}
      renderLink={renderCrumbLink}
    >
      <Stack spacing={2}>
        {v8 && (
          // LPP-16153: "Care Gap Name: Member Name" and the Open / Closed label (same green and red everywhere).
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", flexWrap: "wrap" }}>
            <Typography variant="h4" component="h1" sx={{ overflowWrap: "anywhere" }}>
              {label}: {displayName(m)}
            </Typography>
            {excluded ? <StatusChip tone={gapStatusTone.Excluded} label="Excluded" /> : <GapStatusChip closed={closed} />}
          </Stack>
        )}
        <MemberHeader m={m} year={MY} nameTo={`/members/${m.id}`} />
        {!v16 && (
        <Card title="Care Gap Summary">
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: {
                xs: "repeat(2, minmax(0, 1fr))",
                md: "repeat(4, minmax(0, 1fr))",
              },
            }}
          >
            <Field label={v8 ? "Gap Name" : "Measure"}>{label}</Field>
            {v12 && (
              <Field label="Gap Status">
                {excluded ? <StatusChip tone={gapStatusTone.Excluded} label="Excluded" /> : <GapStatusChip closed={closed} />}
              </Field>
            )}
            {v12 && <Field label="Priority">{priority}</Field>}
            {!v8 && <Field label="For">{m.name}</Field>}
            <Field label={v11 ? "Gap Identified Date" : "Identified Date"}>{fmtDate(g.identified)}</Field>
            {v11 && !v12 && <Field label="Priority">{priority}</Field>}
            {v12 && (
              <Field label="Due Date">{g.status === "Open" ? fmtDate(DUE) : "N/A"}</Field>
            )}
            {v12 && (
              <Field label="Days Remaining">{g.status === "Open" ? `${daysToDue()} Days` : "N/A"}</Field>
            )}
            {v12 && closed && (
              <Field label="Gap Closed Date">
                {g.work.closed ? fmtDay(g.work.closed.on) : fmtDate(g.lastUpdated)}
              </Field>
            )}
            {v12 && excluded && <Field label="Exclusion Reason">{g.exclusionReason}</Field>}
            {v8 && !v12 &&
              (closed ? (
                <Field label="Closed Date">
                  {g.work.closed ? fmtDay(g.work.closed.on) : fmtDate(g.lastUpdated)}
                </Field>
              ) : (
                <Field label="Due Date">{fmtDate(DUE)}</Field>
              ))}
            <Field label={v11 ? "Recommended Action" : version.id >= 4 ? "Recommended Actions" : "Missing Evidence"}>
              {v8 ? (
                closed || excluded ? (
                  "N/A"
                ) : (
                  <LlmText text={RECOMMENDED_SENTENCE(def.code as MeasureCode, CURRENT_YEAR)} />
                )
              ) : (
                missingText
              )}
            </Field>
            {v11 && <Field label="Primary Care Manager">{pcm}</Field>}
            {v11 && (
              <Field label="Gap Evidence">
                <LlmText text={evidence} />
              </Field>
            )}
            <Field label="Last Updated">
              {fmtWhen(g.lastUpdated.toISOString())}
            </Field>
          </Box>
        </Card>
        )}
        <Tabs
          ariaLabel="Care gap sections"
          value={tab}
          onChange={(k) => setSearch({ tab: k }, { replace: true })}
          items={[
            { key: "overview", label: "Overview", content: v12 ? <OverviewV12 g={g} /> : <Overview g={g} /> },
            { key: "evidence", label: "Evidence", content: v12 ? <EvidenceV12 g={g} /> : <Evidence g={g} /> },
            ...(v8
              ? [{ key: "history", label: "History", content: v12 ? <HistoryV12 g={g} /> : <History g={g} /> }]
              : []),
          ]}
        />
      </Stack>
    </PageContainer>
  );
}
