import { useMemo } from "react";
import type { ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { Box, Chip, Tooltip, Typography } from "@mui/material";
import { DataTable, StatusChip } from "sevida-ui";
import type { Column, StatusTone } from "sevida-ui";
import { fmtDate } from "../data";
import type { Member } from "../data";
import { V3_GAP_LABEL, gapShort } from "../v3Data";
import {
  CLAIM_TYPE_NAME,
  DASH,
  claimRows,
  dxRows,
  encRows,
  immRows,
  labRows,
  medRows,
  obsRows,
  procRows,
  provRows,
} from "../v8Records";
import type { RecordTabKey } from "../v8Records";
import { TableLink } from "./TableLink";

/**
 * Version 8 member sub-tabs (LPP-16154 to LPP-16163): Claims, Diagnoses, Encounters, Immunizations, Labs, Medications,
 * Observations, Procedures and Providers. Each tab is "List of X (#)", newest first (Providers: A to Z), searches the fields its ticket names,
 * keeps the ticket's locked columns, and offers the ticket's optional columns in the Columns panel.
 */
export type V8TabKey = RecordTabKey | "providers";

const NOUN: Record<V8TabKey, string> = {
  claims: "Claims",
  diagnoses: "Diagnoses",
  encounters: "Encounters",
  immunizations: "Immunizations",
  labs: "Labs",
  medications: "Medications",
  observations: "Observations",
  procedures: "Procedures",
  providers: "Providers",
};

/** How many rows each tab has, for the number on the tab. */
export const v8Counts = (m: Member): Record<V8TabKey, number> => ({
  claims: claimRows(m).length,
  diagnoses: dxRows(m).length,
  encounters: encRows(m).length,
  immunizations: immRows(m).length,
  labs: labRows(m).length,
  medications: medRows(m).length,
  observations: obsRows(m).length,
  procedures: procRows(m).length,
  providers: provRows(m).length,
});

const GREEN = ["Active", "Completed", "Paid", "Final", "Yes"];
const RED = ["Denied", "Canceled", "Cancelled", "Not Done", "Stopped", "Discontinued"];
const tone = (s: string): StatusTone =>
  GREEN.includes(s) ? "success" : RED.includes(s) ? "danger" : s === "Inactive" || s === "Resolved" ? "neutral" : "warning";
const chip = (s: string): ReactNode => (s === DASH ? DASH : <StatusChip tone={tone(s)} label={s} />);

const day = (d: Date | null | undefined) => (d ? fmtDate(d) : DASH);
const orDash = (s: string | undefined | null) => (s ? s : DASH);

/** Several values in one cell: one per line (LPP-16156, LPP-16157). */
const lines = (xs: ReactNode[]): ReactNode =>
  xs.length === 0 ? (
    DASH
  ) : (
    <>
      {xs.map((x, i) => (
        <Box component="span" key={i} sx={{ display: "block" }}>
          {x}
        </Box>
      ))}
    </>
  );

/** A column. Only the fields the ticket lists are searched (`s`). */
function col<T>(
  key: string,
  header: string,
  accessor: Column<T>["accessor"],
  o: Partial<Column<T>> & { s?: boolean } = {},
): Column<T> {
  const { s, ...rest } = o;
  return { key, header, accessor, searchable: !!s, ...rest };
}

const REC = "Record";
const REL = "Relationship to Member";

const measureCol = <T extends { measures: string[] }>(m: Member): Column<T> => ({
  key: "measure",
  header: "Measure",
  group: REL,
  help: "The HEDIS measures this record is evidence for. Select one to open its care gap.",
  accessor: (r) => r.measures.map((c) => gapShort(c)),
  searchable: false,
  render: (r) =>
    r.measures.length === 0
      ? DASH
      : lines(
          r.measures.map((c) => (
            <Tooltip key={c} title={V3_GAP_LABEL[c as keyof typeof V3_GAP_LABEL] ?? c} arrow>
              <span>
                <TableLink to={`/members/${m.id}/gaps/${c}`}>{gapShort(c)}</TableLink>
              </span>
            </Tooltip>
          )),
        ),
});

const created = <T extends { created: Date }>(): Column<T> =>
  col<T>("created", "Created On", (r) => r.created, { group: REC, defaultHidden: true, sortable: true, nowrap: true, render: (r) => day(r.created) });
const updated = <T extends { updated: Date }>(): Column<T> =>
  col<T>("updated", "Last Updated", (r) => r.updated, { group: REC, defaultHidden: true, sortable: true, nowrap: true, render: (r) => day(r.updated) });
const source = <T extends { source: string }>(): Column<T> =>
  col<T>("source", "Source", (r) => r.source, { group: REC, defaultHidden: true });

const NOTE =
  "Sample data: IDs, created and updated dates, amounts and places of service are made up from each record in this demo.";

interface TableProps<T> {
  tab: V8TabKey;
  m: Member;
  rows: T[];
  columns: Column<T>[];
  getRowId: (r: T) => string;
  sort: { key: string; direction: "asc" | "desc" };
  search: string;
  /** Optional: keep only the rows of this provider (a link from the Providers tab). */
  providerOf?: (r: T) => string;
}

function RecordTable<T>({ tab, rows, columns, getRowId, sort, search, providerOf }: TableProps<T>) {
  const [params, setParams] = useSearchParams();
  const provider = params.get("provider");
  const shown = useMemo(
    () => (provider && providerOf ? rows.filter((r) => providerOf(r) === provider) : rows),
    [rows, provider, providerOf],
  );
  return (
    <Box>
      {provider && providerOf && (
        <Box sx={{ mb: 1.5 }}>
          <Chip
            size="small"
            label={`Provider: ${provider}`}
            onDelete={() => {
              const next = new URLSearchParams(params);
              next.delete("provider");
              setParams(next, { replace: true });
            }}
          />
        </Box>
      )}
      <DataTable
        ariaLabel={NOUN[tab]}
        title={`List of ${NOUN[tab]}`}
        columns={columns}
        rows={shown}
        getRowId={getRowId}
        defaultSort={sort}
        pageSize={10}
        searchPlaceholder={search}
        noResultsTitle={`No ${NOUN[tab].toLowerCase()} found`}
        storageKey={`demo-member-${tab}-v8-a`}
      />
      <Typography variant="caption" sx={{ display: "block", mt: 1, color: "text.secondary" }}>
        {NOTE}
      </Typography>
    </Box>
  );
}

export function RecordTabV8({ m, tab }: { m: Member; tab: V8TabKey }) {
  switch (tab) {
    case "claims":
      return <ClaimsV8 m={m} />;
    case "diagnoses":
      return <DiagnosesV8 m={m} />;
    case "encounters":
      return <EncountersV8 m={m} />;
    case "immunizations":
      return <ImmunizationsV8 m={m} />;
    case "labs":
      return <LabsV8 m={m} />;
    case "medications":
      return <MedicationsV8 m={m} />;
    case "observations":
      return <ObservationsV8 m={m} />;
    case "procedures":
      return <ProceduresV8 m={m} />;
    default:
      return <ProvidersV8 m={m} />;
  }
}

/* ------------------------------------------------------------------ claims */
function ClaimsV8({ m }: { m: Member }) {
  type R = ReturnType<typeof claimRows>[number];
  const rows = useMemo(() => claimRows(m).sort((a, b) => b.from.getTime() - a.from.getTime()), [m]);
  const columns: Column<R>[] = [
    col<R>("id", "Claim ID", (r) => r.id, { s: true, group: "Claim", nowrap: true, primary: true, sortable: true }),
    col<R>("from", "Service Dates", (r) => r.from, {
      group: "Claim",
      sortable: true,
      nowrap: true,
      render: (r) => (r.to.getTime() === r.from.getTime() ? day(r.from) : `${day(r.from)} – ${day(r.to)}`),
    }),
    col<R>("type", "Claim Type", (r) => CLAIM_TYPE_NAME[r.type], { group: "Claim", sortable: true, nowrap: true }),
    col<R>("services", "Services", (r) => r.lines.map((l) => `${l.text} ${l.code}`), {
      s: true,
      group: "Claims",
      width: 300,
      render: (r) => lines(r.lines.map((l) => `${l.text} (${l.code})`)),
    }),
    col<R>("dx", "Diagnoses", (r) => r.diagnoses.map((d) => d.code), {
      group: "Claims",
      width: 200,
      render: (r) => lines(r.diagnoses.map((d) => `${d.code} – ${d.text}`)),
    }),
    col<R>("payment", "Payment Status", (r) => r.payment, { group: "Claim", sortable: true, nowrap: true, render: (r) => chip(r.payment) }),
    col<R>("paid", "Amount Paid", (r) => Number(r.paid.replace("$", "")), { group: "Claim", sortable: true, nowrap: true, align: "right", render: (r) => r.paid }),
    col<R>("provider", "Provider", (r) => r.provider, { group: "Provider", sortable: true }),
    measureCol<R>(m),
    col<R>("status", "Claim Status", (r) => r.status, { group: "Claim", defaultHidden: true, nowrap: true }),
    col<R>("admission", "Admission Date", (r) => r.admission, { group: "Claim", defaultHidden: true, nowrap: true, render: (r) => day(r.admission) }),
    col<R>("discharge", "Discharge Date", (r) => r.discharge, { group: "Claim", defaultHidden: true, nowrap: true, render: (r) => day(r.discharge) }),
    col<R>("supp", "Supplemental Data", (r) => r.supplement, { group: "Claim", defaultHidden: true, nowrap: true }),
    col<R>("npi", "Provider NPI", (r) => r.providerNpi, { group: "Provider", defaultHidden: true, nowrap: true }),
    updated<R>(),
    source<R>(),
  ];
  return (
    <RecordTable tab="claims" m={m} rows={rows} columns={columns} getRowId={(r) => r.id + r.from.getTime()} sort={{ key: "from", direction: "desc" }} search="Search by Claim ID, Service or Code…" providerOf={(r) => r.provider} />
  );
}

/* ------------------------------------------------------------------ diagnoses */
function DiagnosesV8({ m }: { m: Member }) {
  type R = ReturnType<typeof dxRows>[number];
  const rows = useMemo(() => dxRows(m).sort((a, b) => b.start.getTime() - a.start.getTime()), [m]);
  const columns: Column<R>[] = [
    col<R>("start", "Diagnosis Start Date", (r) => r.start, { group: "Clinical", sortable: true, nowrap: true, primary: true, render: (r) => day(r.start) }),
    col<R>("name", "Diagnosis", (r) => r.name, { s: true, group: "Clinical", sortable: true, width: 260 }),
    col<R>("code", "Diagnosis Code", (r) => r.codes.map((c) => c.code), { group: "Clinical", nowrap: true, render: (r) => lines(r.codes.map((c) => c.code)) }),
    col<R>("ctype", "Diagnosis Code Type", (r) => r.codes.map((c) => c.system), { group: "Clinical", nowrap: true, render: (r) => lines(r.codes.map((c) => c.system)) }),
    col<R>("status", "Status", (r) => r.status, { group: "Clinical", sortable: true, nowrap: true, render: (r) => chip(r.status) }),
    col<R>("provider", "Provider", (r) => r.provider, { s: true, group: "Provider", sortable: true, render: (r) => orDash(r.provider) }),
    measureCol<R>(m),
    col<R>("end", "Diagnosis End Date", (r) => r.end, { group: "Clinical", defaultHidden: true, sortable: true, nowrap: true, render: (r) => day(r.end) }),
    created<R>(),
    updated<R>(),
    source<R>(),
  ];
  return <RecordTable tab="diagnoses" m={m} rows={rows} columns={columns} getRowId={(r) => r.key} sort={{ key: "start", direction: "desc" }} search="Search by Diagnosis or Provider…" providerOf={(r) => r.provider} />;
}

/* ------------------------------------------------------------------ encounters */
function EncountersV8({ m }: { m: Member }) {
  type R = ReturnType<typeof encRows>[number];
  const rows = useMemo(() => encRows(m).sort((a, b) => b.date.getTime() - a.date.getTime()), [m]);
  const columns: Column<R>[] = [
    col<R>("date", "Service Date", (r) => r.date, { group: "Clinical", sortable: true, nowrap: true, alwaysVisible: true, render: (r) => day(r.date) }),
    col<R>("type", "Visit Type", (r) => r.type, { s: true, group: "Clinical", sortable: true, alwaysVisible: true }),
    col<R>("status", "Status", (r) => r.status, { group: "Clinical", sortable: true, nowrap: true, render: (r) => chip(r.status) }),
    col<R>("dx", "Diagnoses", (r) => r.diagnoses.map((d) => d.code), { group: "Clinical", width: 240, render: (r) => lines(r.diagnoses.map((d) => `${d.code} – ${d.text}`)) }),
    col<R>("provider", "Provider", (r) => r.provider, { s: true, group: "Provider", sortable: true }),
    col<R>("place", "Place of Service", (r) => r.place, { group: "Provider" }),
    measureCol<R>(m),
    col<R>("reason", "Visit Reason", (r) => r.reason, { group: "Clinical", defaultHidden: true, width: 260 }),
    col<R>("encId", "Encounter ID", (r) => r.encId, { group: REC, defaultHidden: true, nowrap: true }),
    created<R>(),
    updated<R>(),
    source<R>(),
  ];
  return <RecordTable tab="encounters" m={m} rows={rows} columns={columns} getRowId={(r) => r.key} sort={{ key: "date", direction: "desc" }} search="Search by Visit Type or Provider…" providerOf={(r) => r.provider} />;
}

/* ------------------------------------------------------------------ immunizations */
function ImmunizationsV8({ m }: { m: Member }) {
  type R = ReturnType<typeof immRows>[number];
  const rows = useMemo(() => immRows(m).sort((a, b) => b.date.getTime() - a.date.getTime()), [m]);
  const columns: Column<R>[] = [
    col<R>("date", "Administered Date", (r) => r.date, { group: "Clinical", sortable: true, nowrap: true, primary: true, render: (r) => day(r.date) }),
    col<R>("vaccine", "Vaccine", (r) => r.vaccine, { s: true, group: "Clinical", sortable: true, width: 260 }),
    col<R>("status", "Status", (r) => r.status, { group: "Clinical", sortable: true, nowrap: true, render: (r) => chip(r.status) }),
    col<R>("code", "Code", (r) => r.code, { group: "Clinical", nowrap: true }),
    col<R>("provider", "Provider", (r) => r.provider, { group: "Provider", sortable: true }),
    measureCol<R>(m),
    created<R>(),
    updated<R>(),
    source<R>(),
  ];
  return <RecordTable tab="immunizations" m={m} rows={rows} columns={columns} getRowId={(r) => r.key} sort={{ key: "date", direction: "desc" }} search="Search by Vaccine…" providerOf={(r) => r.provider} />;
}

/* ------------------------------------------------------------------ labs */
function LabsV8({ m }: { m: Member }) {
  type R = ReturnType<typeof labRows>[number];
  const rows = useMemo(() => labRows(m).sort((a, b) => b.date.getTime() - a.date.getTime()), [m]);
  const columns: Column<R>[] = [
    col<R>("date", "Collection Date", (r) => r.date, { group: "Clinical", sortable: true, nowrap: true, alwaysVisible: true, render: (r) => day(r.date) }),
    col<R>("test", "Test", (r) => r.test, { s: true, group: "Clinical", sortable: true, alwaysVisible: true, width: 240 }),
    col<R>("result", "Result", (r) => r.result, {
      group: "Clinical",
      alwaysVisible: true,
      nowrap: true,
      render: (r) => (
        <>
          {r.result}
          {r.flag !== DASH && (
            <Typography variant="caption" component="div" sx={{ color: "text.secondary" }}>
              {r.flag}
            </Typography>
          )}
        </>
      ),
    }),
    col<R>("range", "Reference Range", (r) => r.range, { group: "Clinical", nowrap: true }),
    col<R>("resulted", "Result Date", (r) => r.resulted, { group: "Clinical", sortable: true, nowrap: true, render: (r) => day(r.resulted) }),
    col<R>("loinc", "LOINC Code", (r) => r.loinc, { s: true, group: "Clinical", nowrap: true }),
    col<R>("provider", "Provider", (r) => r.provider, { s: true, group: "Provider", sortable: true }),
    measureCol<R>(m),
    col<R>("panel", "Panel", (r) => r.panel, { group: "Clinical", defaultHidden: true }),
    col<R>("enc", "Related Encounter", (r) => (r.encounter ? `${r.encounter.label} ${day(r.encounter.date)}` : ""), {
      group: REL,
      defaultHidden: true,
      render: (r) => (r.encounter ? `${r.encounter.label}, ${day(r.encounter.date)}` : DASH),
    }),
    col<R>("cpt", "CPT Code", (r) => r.cpt, { group: "Clinical", defaultHidden: true, nowrap: true }),
    created<R>(),
    updated<R>(),
    source<R>(),
  ];
  return <RecordTable tab="labs" m={m} rows={rows} columns={columns} getRowId={(r) => r.key} sort={{ key: "date", direction: "desc" }} search="Search by Test, LOINC Code or Provider…" providerOf={(r) => r.provider} />;
}

/* ------------------------------------------------------------------ medications */
function MedicationsV8({ m }: { m: Member }) {
  type R = ReturnType<typeof medRows>[number];
  const rows = useMemo(() => medRows(m).sort((a, b) => b.date.getTime() - a.date.getTime()), [m]);
  const columns: Column<R>[] = [
    col<R>("date", "Dispensed Date", (r) => r.date, { group: "Clinical", sortable: true, nowrap: true, alwaysVisible: true, render: (r) => day(r.date) }),
    col<R>("name", "Name", (r) => r.name, { s: true, group: "Clinical", sortable: true, alwaysVisible: true, width: 280 }),
    col<R>("status", "Status", (r) => r.status, { group: "Clinical", sortable: true, nowrap: true, render: (r) => chip(r.status) }),
    col<R>("qty", "Quantity Dispensed", (r) => r.quantity, { group: "Clinical", nowrap: true }),
    col<R>("days", "Days Supply", (r) => r.days, { group: "Clinical", sortable: true, nowrap: true, align: "right" }),
    col<R>("code", "Code", (r) => r.code, { group: "Clinical", nowrap: true }),
    col<R>("provider", "Provider", (r) => r.provider, { group: "Provider", sortable: true }),
    measureCol<R>(m),
    col<R>("pharmacy", "Pharmacy", (r) => r.pharmacy, { group: "Provider", defaultHidden: true }),
    col<R>("pharmacyNpi", "Pharmacy NPI", (r) => r.pharmacyNpi, { group: "Provider", defaultHidden: true, nowrap: true }),
    col<R>("refills", "Refills", (r) => r.refills, { group: "Clinical", defaultHidden: true, nowrap: true }),
    col<R>("claimId", "Claim ID", (r) => r.claimId, { group: "Claim", defaultHidden: true, nowrap: true }),
    col<R>("claimStatus", "Claim Status", (r) => r.claimStatus, { group: "Claim", defaultHidden: true, nowrap: true }),
    col<R>("payment", "Payment Status", (r) => r.payment, { group: "Claim", defaultHidden: true, nowrap: true, render: (r) => chip(r.payment) }),
    col<R>("paid", "Amount Paid", (r) => r.paid, { group: "Claim", defaultHidden: true, nowrap: true, align: "right" }),
    created<R>(),
    updated<R>(),
    source<R>(),
  ];
  return <RecordTable tab="medications" m={m} rows={rows} columns={columns} getRowId={(r) => r.key} sort={{ key: "date", direction: "desc" }} search="Search by Medication…" providerOf={(r) => r.provider} />;
}

/* ------------------------------------------------------------------ observations */
function ObservationsV8({ m }: { m: Member }) {
  type R = ReturnType<typeof obsRows>[number];
  const rows = useMemo(() => obsRows(m).sort((a, b) => b.date.getTime() - a.date.getTime()), [m]);
  const columns: Column<R>[] = [
    col<R>("date", "Observation Date", (r) => r.date, { group: "Clinical", sortable: true, nowrap: true, alwaysVisible: true, render: (r) => day(r.date) }),
    col<R>("type", "Service Type", (r) => r.type, { s: true, group: "Clinical", sortable: true, alwaysVisible: true, nowrap: true }),
    col<R>("service", "Service", (r) => r.service, { s: true, group: "Clinical", sortable: true, alwaysVisible: true, width: 240 }),
    col<R>("value", "Value", (r) => r.value, {
      group: "Clinical",
      render: (r) => (
        <>
          {r.value}
          <Typography variant="caption" component="div" sx={{ color: "text.secondary" }}>
            {r.status}
          </Typography>
        </>
      ),
    }),
    col<R>("code", "Code", (r) => r.code, { group: "Clinical", nowrap: true }),
    col<R>("provider", "Provider", (r) => r.provider, { group: "Provider", sortable: true }),
    measureCol<R>(m),
    col<R>("related", "Related Encounter", (r) => (r.related ? `${r.related.label} ${day(r.related.date)}` : ""), {
      group: REL,
      defaultHidden: true,
      render: (r) => (r.related ? `${r.related.label}, ${day(r.related.date)}` : DASH),
    }),
    col<R>("claimStatus", "Claim Status", (r) => r.claimStatus, { group: "Claim", defaultHidden: true, nowrap: true }),
    col<R>("payment", "Payment Status", (r) => r.payment, { group: "Claim", defaultHidden: true, nowrap: true }),
    col<R>("paid", "Amount Paid", (r) => r.paid, { group: "Claim", defaultHidden: true, nowrap: true, align: "right" }),
    created<R>(),
    updated<R>(),
    source<R>(),
  ];
  return <RecordTable tab="observations" m={m} rows={rows} columns={columns} getRowId={(r) => r.key} sort={{ key: "date", direction: "desc" }} search="Search by Service Type or Service…" providerOf={(r) => r.provider} />;
}

/* ------------------------------------------------------------------ procedures */
function ProceduresV8({ m }: { m: Member }) {
  type R = ReturnType<typeof procRows>[number];
  const rows = useMemo(() => procRows(m).sort((a, b) => b.date.getTime() - a.date.getTime()), [m]);
  const columns: Column<R>[] = [
    col<R>("date", "Service Date", (r) => r.date, { group: "Clinical", sortable: true, nowrap: true, alwaysVisible: true, render: (r) => day(r.date) }),
    col<R>("name", "Procedure", (r) => r.name, { s: true, group: "Clinical", sortable: true, alwaysVisible: true, width: 280 }),
    col<R>("value", "Value", (r) => r.value, { group: "Clinical" }),
    col<R>("status", "Status", (r) => r.status, { group: "Clinical", sortable: true, nowrap: true, render: (r) => chip(r.status) }),
    col<R>("provider", "Provider", (r) => r.provider, { group: "Provider", sortable: true }),
    col<R>("code", "Code", (r) => r.code, { group: "Clinical", nowrap: true }),
    measureCol<R>(m),
    col<R>("enc", "Related Encounter", (r) => (r.encounter ? `${r.encounter.label} ${day(r.encounter.date)}` : ""), {
      group: REL,
      defaultHidden: true,
      render: (r) => (r.encounter ? `${r.encounter.label}, ${day(r.encounter.date)}` : DASH),
    }),
    col<R>("claim", "Claim ID", (r) => r.claim, { group: "Claim", defaultHidden: true, nowrap: true }),
    col<R>("claimStatus", "Claim Status", (r) => r.claimStatus, { group: "Claim", defaultHidden: true, nowrap: true }),
    col<R>("payment", "Payment Status", (r) => r.payment, { group: "Claim", defaultHidden: true, nowrap: true, render: (r) => chip(r.payment) }),
    col<R>("paid", "Amount Paid", (r) => r.paid, { group: "Claim", defaultHidden: true, nowrap: true, align: "right" }),
    created<R>(),
    updated<R>(),
    source<R>(),
  ];
  return <RecordTable tab="procedures" m={m} rows={rows} columns={columns} getRowId={(r) => r.key} sort={{ key: "date", direction: "desc" }} search="Search by Procedure…" providerOf={(r) => r.provider} />;
}

/* ------------------------------------------------------------------ providers */
function ProvidersV8({ m }: { m: Member }) {
  type R = ReturnType<typeof provRows>[number];
  // Name A to Z; providers with the same name: the most recent interaction first (the table sort is stable).
  const rows = useMemo(() => provRows(m).sort((a, b) => b.last.getTime() - a.last.getTime()), [m]);
  const columns: Column<R>[] = [
    col<R>("name", "Provider", (r) => r.name, { s: true, group: "Provider", sortable: true, alwaysVisible: true, width: 240 }),
    col<R>("npi", "Provider ID", (r) => r.npi, { s: true, group: "Provider", nowrap: true, help: "The provider's NPI." }),
    col<R>("active", "Active", (r) => r.active, { group: "Provider", nowrap: true, render: (r) => chip(r.active) }),
    col<R>("entity", "Entity Type", (r) => (r.entity === "I" ? "Individual" : "Organization"), { group: "Provider", nowrap: true }),
    col<R>("specialty", "Specialty", (r) => r.specialty, { s: true, group: "Provider", sortable: true }),
    col<R>("org", "Organization", (r) => r.org, { s: true, group: "Provider", sortable: true }),
    col<R>("last", "Last Interaction", (r) => r.last, { group: REL, sortable: true, nowrap: true, render: (r) => day(r.last) }),
    col<R>("related", "Related Records", (r) => r.related.map((x) => `${x.label} (${x.n})`), {
      group: REL,
      width: 220,
      help: "The records this provider is on. Select one to open that tab with only this provider's records.",
      render: (r) =>
        lines(
          r.related.map((x) => (
            <TableLink key={x.tab} to={`/members/${m.id}?tab=${x.tab}&provider=${encodeURIComponent(r.name)}`}>
              {x.label} ({x.n})
            </TableLink>
          )),
        ),
    }),
    col<R>("first", "First Interaction", (r) => r.first, { group: REL, defaultHidden: true, sortable: true, nowrap: true, render: (r) => day(r.first) }),
    col<R>("prescribing", "Prescribing Provider", (r) => r.prescribing, { group: "Provider", defaultHidden: true, nowrap: true }),
    col<R>("taxonomy", "Taxonomy Code", (r) => r.taxonomy, { group: "Provider", defaultHidden: true, nowrap: true }),
    col<R>("orgNpi", "Organization NPI", (r) => r.orgNpi, { group: "Provider", defaultHidden: true, nowrap: true }),
    col<R>("phone", "Phone", (r) => r.phone, { group: "Provider", defaultHidden: true, nowrap: true }),
    col<R>("address", "Address", (r) => r.address, { group: "Provider", defaultHidden: true, width: 220 }),
    created<R>(),
    updated<R>(),
    source<R>(),
  ];
  return <RecordTable tab="providers" m={m} rows={rows} columns={columns} getRowId={(r) => r.npi} sort={{ key: "name", direction: "asc" }} search="Search by Provider, Provider ID, Specialty or Organization…" />;
}
