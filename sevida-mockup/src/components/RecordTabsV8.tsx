import { useMemo } from "react";
import type { ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { Box, Chip, Tooltip, Typography } from "@mui/material";
import { DataTable, StatusChip } from "sevida-ui";
import type { Column, StatusTone } from "sevida-ui";
import { fmtDate, hashOf, primaryCareOf, providers } from "../data";
import type { Member } from "../data";
import { V3_GAP_LABEL, gapShort } from "../v3Data";
import {
  CLAIM_TYPE_NAME,
  DASH,
  addDays,
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
import { getVersion } from "../version";

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

/**
 * Version 11 (Mansi: "sub-tabs show default columns only, no column selector"; Application Tables sheet + LPP-16154 to 16163):
 * each tab keeps one fixed set of columns in the order and with the names the ticket gives. Last Updated is a default column.
 * `spec` lists the columns in order: a key keeps a column, [key, name] renames it, and a column object adds a new one.
 */
const v11 = () => getVersion() >= 11;
function pick<T>(all: Column<T>[], spec: Array<string | [string, string] | Column<T>>): Column<T>[] {
  return spec.map((s) => {
    if (typeof s !== "string" && !Array.isArray(s)) return { ...s, group: undefined, defaultHidden: false };
    const [key, name] = typeof s === "string" ? [s, undefined] : s;
    const c = all.find((x) => x.key === key);
    if (!c) throw new Error(`Missing column ${key}`);
    return { ...c, header: name ?? c.header, group: undefined, defaultHidden: false };
  });
}
/**
 * Version 12 (Application Tables sheet): every tab shows the sheet's columns, in the sheet's order and with its names.
 * The sheet's "Optional" fields are in the Columns panel and start off. Fields the demo files do not hold are made up the same way every time.
 */
const v12 = () => getVersion() >= 12;
type Spec<T> = Array<string | [string, string] | Column<T>>;
function pick12<T>(all: Column<T>[], spec: Spec<T>, optional: Spec<T> = []): Column<T>[] {
  const get = (s: string | [string, string] | Column<T>): Column<T> => {
    if (typeof s !== "string" && !Array.isArray(s)) return s;
    const [key, name] = typeof s === "string" ? [s, undefined] : s;
    const c = all.find((x) => x.key === key);
    if (!c) throw new Error(`Missing column ${key}`);
    return { ...c, header: name ?? c.header };
  };
  return [
    ...spec.map((s) => ({ ...get(s), group: undefined, defaultHidden: false })),
    ...optional.map((s) => ({ ...get(s), group: "Optional", defaultHidden: true })),
  ];
}
/** "CPT: 96372" becomes the code and its system. */
const codeOf = (c: string) => (c.includes(": ") ? c.slice(c.indexOf(": ") + 2) : c);
const systemOf = (c: string) => (c.includes(": ") ? c.slice(0, c.indexOf(": ")) : DASH);
const SYSTEM_NAME: Record<string, string> = { L: "LOINC", "L:": "LOINC" };
const systemName = (s: string) => SYSTEM_NAME[s] ?? s;
/** The place-of-service code that goes with a clinic or a hospital name (sample). */
const posOf = (place: string): string =>
  /telehealth/i.test(place) ? "02 - Telehealth" : /medical center|hospital/i.test(place) ? "22 - On Campus Outpatient Hospital" : "11 - Office";
const lotOf = (key: string) => `LOT-${String(10000 + (hashOf(key) % 89999))}`;
const STRENGTH = /(\d[\d.,]*\s?(?:mg|mcg|IU|g|mL|units?)(?:\/\s?[\d.]*\s?(?:mL|actuation|mg|g|dose))?)/i;
const strengthOf = (name: string) => STRENGTH.exec(name)?.[1] ?? DASH;
/** A code with its description beside it: "CPT: 77067 - Screening mammography". */
/** An NDC with hyphens, 5-4-2: 00093733956 becomes 00093-7339-56. */
const ndcFmt = (code: string) => code.replace(/^(NDC: )?(\d{5})-?(\d{4})-?(\d{2})$/, "$1$2-$3-$4");
const withText = (code: string, text: string) => (code === DASH || !text ? code : `${code} - ${text}`);

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
        storageKey={v12() ? `demo-member-${tab}-v12-a` : v11() ? `demo-member-${tab}-v11-a` : `demo-member-${tab}-v8-a`}
        toolbar={v12() ? undefined : v11() ? { columns: false } : undefined}
        columnsPanel={v12() ? { tableOrder: true, search: false } : undefined}
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
  const v = v11();
  const colsOld = v
    ? pick(columns, [
        "id",
        ["from", "Service Date From"],
        col<R>("to", "Service Date To", (r) => r.to, { sortable: true, nowrap: true, render: (r) => day(r.to) }),
        col<R>("type", "Type", (r) => r.type, {
          sortable: true,
          nowrap: true,
          render: (r) => (
            <Tooltip title={CLAIM_TYPE_NAME[r.type]} arrow>
              <span>{r.type}</span>
            </Tooltip>
          ),
        }),
        col<R>("services", "Service", (r) => r.lines.map((l) => l.text), { s: true, width: 300, render: (r) => lines(r.lines.map((l) => l.text)) }),
        col<R>("scode", "Service Code", (r) => r.lines.map((l) => l.code), { s: true, width: 160, render: (r) => lines(r.lines.map((l) => `${l.system}: ${l.code}`)) }),
        ["payment", "Payment Type"],
        "provider",
        col<R>("dx", "ICD-10 Diagnosis Code", (r) => r.diagnoses.map((d) => d.code), {
          width: 240,
          render: (r) => lines(r.diagnoses.map((d) => `${d.code} - ${d.text}`)),
        }),
        "updated",
        ["measure", "Care Gap"],
      ])
    : columns;
  const cols12 = pick12(
    columns,
    [
      col<R>("services", "Procedure / Service", (r) => r.lines.map((l) => l.text), { s: true, width: 300, render: (r) => lines(r.lines.map((l) => l.text)) }),
      ["from", "Service Date"],
      col<R>("code", "Code", (r) => r.lines.map((l) => l.code), { s: true, width: 120, render: (r) => lines(r.lines.map((l) => l.code)) }),
      col<R>("system", "Code System", (r) => r.lines.map((l) => l.system), { width: 120, render: (r) => lines(r.lines.map((l) => l.system)) }),
      col<R>("ctype", "Claim Type", (r) => CLAIM_TYPE_NAME[r.type], { sortable: true, nowrap: true }),
      col<R>("pdx", "Primary Diagnosis", (r) => (r.diagnoses[0] ? r.diagnoses[0].code : ""), {
        width: 240,
        render: (r) => (r.diagnoses[0] ? `${r.diagnoses[0].code} - ${r.diagnoses[0].text}` : DASH),
      }),
      col<R>("pos", "Place of Service", (r) => (r.type === "I" ? "21 - Inpatient Hospital" : "11 - Office"), { nowrap: true }),
      "provider",
      ["status", "Claim Status"],
    ],
    [
      col<R>("id", "Claim ID", (r) => r.id, { s: true, nowrap: true, sortable: true }),
      col<R>("line", "Line #", (r) => r.lines.length, { render: (r) => lines(r.lines.map((_, i) => String(i + 1))), nowrap: true }),
      col<R>("to", "Service Date To", (r) => r.to, { sortable: true, nowrap: true, render: (r) => day(r.to) }),
      col<R>("adx", "Additional Diagnoses", (r) => r.diagnoses.slice(1).map((d) => d.code), {
        width: 220,
        render: (r) => lines(r.diagnoses.slice(1).map((d) => `${d.code} - ${d.text}`)),
      }),
      col<R>("billing", "Billing Provider", (r) => providers.find((x) => x.npi === r.providerNpi)?.org ?? "Madigan Army Medical Center", { width: 200 }),
      col<R>("paidOn", "Paid Date", (r) => addDays(r.from, 14 + (hashOf(r.id) % 12)), {
        sortable: true,
        nowrap: true,
        render: (r) => (r.payment === "Denied" ? DASH : day(addDays(r.from, 14 + (hashOf(r.id) % 12)))),
      }),
      "updated",
      ["payment", "Payment Type"],
      ["measure", "Related Care Gap"],
    ],
  );
  const cols = v12() ? cols12 : colsOld;
  return (
    <RecordTable tab="claims" m={m} rows={rows} columns={cols} getRowId={(r) => r.id + r.from.getTime()} sort={{ key: "from", direction: "desc" }} search="Search by Claim ID, Service or Code…" providerOf={(r) => r.provider} />
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
  const colsOld = v11()
    ? pick(columns, [["name", "Diagnosis Name"], "code", "ctype", ["start", "Start Date"], ["end", "End Date"], "status", "provider", ["measure", "Care Gap"]])
    : columns;
  const cols12 = pick12(
    columns,
    [["name", "Diagnosis"], ["start", "Start Date"], ["code", "Code"], ["ctype", "Code System"], "status", "provider", "source", ["measure", "Related Care Gap"]],
    [["end", "End Date"], col<R>("lastRec", "Last Recorded Date", (r) => r.updated, { sortable: true, nowrap: true, render: (r) => day(r.updated) })],
  );
  const cols = v12() ? cols12 : colsOld;
  return <RecordTable tab="diagnoses" m={m} rows={rows} columns={cols} getRowId={(r) => r.key} sort={{ key: "start", direction: "desc" }} search="Search by Diagnosis or Provider…" providerOf={(r) => r.provider} />;
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
  const colsOld = v11()
    ? pick(columns, [
        "type",
        "date",
        "status",
        col<R>("dx", "Diagnosis Code", (r) => r.diagnoses.map((d) => d.code), { width: 240, render: (r) => lines(r.diagnoses.map((d) => `${d.code}: ${d.text}`)) }),
        "provider",
        "place",
        ["measure", "Care Gap"],
      ])
    : columns;
  const cols12 = pick12(
    columns,
    [
      ["type", "Encounter Type"],
      ["date", "Encounter Date"],
      "status",
      col<R>("dx", "Primary Diagnosis", (r) => r.diagnoses.map((d) => d.code), {
        width: 240,
        render: (r) => (r.diagnoses[0] ? `${r.diagnoses[0].code}: ${r.diagnoses[0].text}` : DASH),
      }),
      col<R>("pos", "Place of Service", (r) => posOf(r.place), { nowrap: true }),
      col<R>("facility", "Clinic/Facility", (r) => r.place, { width: 220 }),
      "provider",
      ["measure", "Related Care Gap"],
    ],
    [
      "source",
      col<R>("adx", "Additional Diagnoses", (r) => r.diagnoses.slice(1).map((d) => d.code), {
        width: 240,
        render: (r) => lines(r.diagnoses.slice(1).map((d) => `${d.code}: ${d.text}`)),
      }),
    ],
  );
  const cols = v12() ? cols12 : colsOld;
  return <RecordTable tab="encounters" m={m} rows={rows} columns={cols} getRowId={(r) => r.key} sort={{ key: "date", direction: "desc" }} search="Search by Visit Type or Provider…" providerOf={(r) => r.provider} />;
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
  // Care Gap is hidden by default on this tab (LPP-16365), and there is no column selector, so it is not shown.
  const colsOld = v11()
    ? pick(columns, [
        ["vaccine", "Vaccination"],
        ["date", "Vaccination Date"],
        col<R>("qty", "Quantity", (r) => r.vaccine, { nowrap: true, render: (r) => (/pediatric|drops/i.test(r.vaccine) ? "0.25 mL" : "0.5 mL") }),
        "status",
        "code",
        "provider",
        col<R>("year", "Year of Immunization", (r) => r.date.getFullYear(), { sortable: true, nowrap: true }),
      ])
    : columns;
  const cols12 = pick12(
    columns,
    [
      ["vaccine", "Vaccine"],
      ["date", "Administered Date"],
      col<R>("dose", "Dose", (r) => r.vaccine, { nowrap: true, render: (r) => (/pediatric|drops/i.test(r.vaccine) ? "0.25 mL" : "0.5 mL") }),
      col<R>("ccode", "Code", (r) => codeOf(r.code), { nowrap: true }),
      col<R>("csys", "Code System", (r) => systemOf(r.code), { nowrap: true }),
      "status",
      "provider",
      ["measure", "Related Care Gap"],
    ],
    ["source", col<R>("lot", "Lot Number", (r) => lotOf(r.key), { nowrap: true }), col<R>("year", "Year of Immunization", (r) => r.date.getFullYear(), { sortable: true, nowrap: true })],
  );
  const cols = v12() ? cols12 : colsOld;
  return <RecordTable tab="immunizations" m={m} rows={rows} columns={cols} getRowId={(r) => r.key} sort={{ key: "date", direction: "desc" }} search={v11() ? "Search by Vaccination…" : "Search by Vaccine…"} providerOf={(r) => r.provider} />;
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
  const colsOld = v11()
    ? pick(columns, [
        "test",
        col<R>("result", "Result", (r) => r.result, { nowrap: true }),
        ["date", "Collection Date"],
        ["resulted", "Resulting Date"],
        col<R>("range", "Reference Range", (r) => r.range, { nowrap: true, render: (r) => r.range.replace(" to ", "–") }),
        col<R>("flag", "Flag", (r) => r.flag, { nowrap: true, sortable: true }),
        "panel",
        col<R>("loinc", "LOINC Code", (r) => r.loinc, {
          s: true,
          width: 220,
          render: (r) => withText(r.loinc, r.test),
        }),
        "provider",
        ["measure", "Care Gap"],
      ])
    : columns;
  const unitOf = (r: R) => (r.e.tag === "hba1c" ? "%" : (r.e.unit ?? ""));
  const valueOf = (r: R) => (unitOf(r) && r.result.endsWith(` ${unitOf(r)}`) ? r.result.slice(0, -unitOf(r).length - 1) : r.result);
  const cols12 = pick12(
    columns,
    [
      "test",
      ["date", "Collection Date"],
      col<R>("res", "Result", (r) => valueOf(r), { nowrap: true }),
      col<R>("unit", "Unit", (r) => unitOf(r), { nowrap: true, render: (r) => unitOf(r) || DASH }),
      col<R>("range", "Reference Range", (r) => r.range, { nowrap: true, render: (r) => r.range.replace(" to ", "–") }),
      col<R>("flag", "Abnormal Flag", (r) => r.flag, { nowrap: true, sortable: true }),
      col<R>("lcode", "Code", (r) => r.loinc, { s: true, nowrap: true }),
      col<R>("lsys", "Code System", () => "LOINC", { nowrap: true }),
      "provider",
      ["measure", "Related Care Gap"],
    ],
    [
      ["resulted", "Resulting Date"],
      col<R>("pstatus", "Panel Status (Final / Preliminary)", (r) => (r.e.status === "preliminary" ? "Preliminary" : "Final"), { nowrap: true }),
      "source",
      "panel",
    ],
  );
  const cols = v12() ? cols12 : colsOld;
  return <RecordTable tab="labs" m={m} rows={rows} columns={cols} getRowId={(r) => r.key} sort={{ key: "date", direction: "desc" }} search="Search by Test, LOINC Code or Provider…" providerOf={(r) => r.provider} />;
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
  const colsOld = v11()
    ? pick(columns, ["name", "status", "date", ["qty", "Quantity"], "days", col<R>("code", "Code", (r) => r.code, { nowrap: true, render: (r) => ndcFmt(r.code) }), "provider", ["measure", "Care Gap"]])
    : columns;
  const cols12 = pick12(
    columns,
    [
      ["name", "Medication"],
      ["date", "Dispensed Date"],
      col<R>("strength", "Strength / Dose", (r) => strengthOf(r.name), { nowrap: true }),
      ["qty", "Quantity"],
      "days",
      col<R>("mcode", "Code", (r) => codeOf(r.code), { nowrap: true, render: (r) => ndcFmt(codeOf(r.code)) }),
      col<R>("msys", "Code System", (r) => systemOf(r.code), { nowrap: true }),
      "status",
      "provider",
      "source",
      ["measure", "Related Care Gap"],
    ],
    ["pharmacy", "refills"],
  );
  const cols = v12() ? cols12 : colsOld;
  return <RecordTable tab="medications" m={m} rows={rows} columns={cols} getRowId={(r) => r.key} sort={{ key: "date", direction: "desc" }} search="Search by Medication…" providerOf={(r) => r.provider} />;
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
  const colsOld = v11()
    ? pick(columns, [
        "service",
        "type",
        "date",
        "value",
        col<R>("code", "Test Code", (r) => r.code, {
          s: true,
          width: 260,
          render: (r) => (r.code.startsWith("L: ") ? `LOINC: ${withText(r.code.slice(3), r.service)}` : withText(r.code, r.service)),
        }),
        "provider",
        ["measure", "Care Gap"],
      ])
    : columns;
  const obsUnit = (r: R) => (r.e.tag === "hba1c" ? "%" : (r.e.unit ?? ""));
  const obsValue = (r: R) => {
    const flag = / \([A-Z]\)$/.exec(r.value)?.[0] ?? "";
    const base = r.value.slice(0, r.value.length - flag.length);
    const u = obsUnit(r);
    return (u && base.endsWith(` ${u}`) ? base.slice(0, -u.length - 1) : base) + flag;
  };
  const cols12 = pick12(
    columns,
    [
      ["service", "Observation"],
      ["date", "Observation Date"],
      col<R>("val", "Value", (r) => obsValue(r), { nowrap: true }),
      col<R>("unit", "Unit", (r) => obsUnit(r), { nowrap: true, render: (r) => obsUnit(r) || DASH }),
      ["type", "Category"],
      col<R>("ocode", "Code", (r) => codeOf(r.code), { s: true, nowrap: true }),
      col<R>("osys", "Code System", (r) => systemName(systemOf(r.code)), { nowrap: true }),
      "provider",
      ["measure", "Related Care Gap"],
    ],
    [col<R>("ostatus", "Status", (r) => r.status, { nowrap: true, sortable: true, render: (r) => chip(r.status) }), "source"],
  );
  const cols = v12() ? cols12 : colsOld;
  return <RecordTable tab="observations" m={m} rows={rows} columns={cols} getRowId={(r) => r.key} sort={{ key: "date", direction: "desc" }} search="Search by Service Type or Service…" providerOf={(r) => r.provider} />;
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
  const colsOld = v11()
    ? pick(columns, [
        "name",
        "value",
        ["status", "Service Status"],
        "date",
        col<R>("code", "Code", (r) => r.code, { width: 260, render: (r) => withText(r.code, r.name) }),
        "provider",
        ["measure", "Care Gap"],
      ])
    : columns;
  const cols12 = pick12(
    columns,
    [
      "name",
      ["date", "Service Date"],
      col<R>("pcode", "Code", (r) => codeOf(r.code), { s: true, nowrap: true }),
      col<R>("psys", "Code System", (r) => systemOf(r.code), { nowrap: true }),
      "status",
      "provider",
      "source",
      ["measure", "Related Care Gap"],
    ],
    [["value", "Result"], col<R>("ppos", "Place of Service", (r) => (r.claim !== DASH ? "11 - Office" : r.encounter ? "11 - Office" : DASH), { nowrap: true })],
  );
  const cols = v12() ? cols12 : colsOld;
  return <RecordTable tab="procedures" m={m} rows={rows} columns={cols} getRowId={(r) => r.key} sort={{ key: "date", direction: "desc" }} search="Search by Procedure…" providerOf={(r) => r.provider} />;
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
  const colsOld = v11()
    ? pick(columns, [
        "name",
        "npi",
        "specialty",
        "last",
        col<R>("related", "Related Records", (r) => r.related.map((x) => `${x.label} (${x.n})`), {
          width: 240,
          help: "The records this provider is on. Select one to open that tab with only this provider's records.",
          render: (r) => (
            <>
              {r.related.map((x, i) => (
                <span key={x.tab}>
                  {i > 0 && ", "}
                  <TableLink to={`/members/${m.id}?tab=${x.tab}&provider=${encodeURIComponent(r.name)}`}>
                    {x.label} ({x.n})
                  </TableLink>
                </span>
              ))}
            </>
          ),
        }),
        "org",
        ["active", "Active?"],
        col<R>("entity", "Entity Type", (r) => r.entity, {
          nowrap: true,
          help: "I = Individual, O = Organization.",
          render: (r) => (
            <Tooltip title={r.entity === "I" ? "Individual" : "Organization"} arrow>
              <span>{r.entity}</span>
            </Tooltip>
          ),
        }),
      ])
    : columns;
  const pcmNpi = primaryCareOf(m)?.p.npi;
  const roleOf = (r: R) => (r.npi === pcmNpi ? "PCM" : "Encounter Provider");
  const cols12 = pick12(
    columns,
    [
      "name",
      ["npi", "NPI"],
      col<R>("role", "Type/Role", (r) => (r.npi === pcmNpi ? 0 : 1), { nowrap: true, sortable: true, render: (r) => roleOf(r) }),
      "specialty",
      ["org", "Organization"],
      "last",
      "related",
    ],
    [["active", "Status"], "entity", col<R>("dirId", "Provider Directory ID", (r) => `PD-${String(100000 + (hashOf(r.npi) % 899999))}`, { nowrap: true })],
  );
  const cols = v12() ? cols12 : colsOld;
  return <RecordTable tab="providers" m={m} rows={rows} columns={cols} getRowId={(r) => r.npi} sort={v12() ? { key: "role", direction: "asc" } : { key: "name", direction: "asc" }} search={v12() ? "Search by Provider, NPI, Specialty or Organization…" : "Search by Provider, Provider ID, Specialty or Organization…"} />;
}
