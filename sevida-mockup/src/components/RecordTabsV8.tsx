import { useMemo } from "react";
import type { ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { Box, Chip, Tooltip, Typography } from "@mui/material";
import { DataTable, StatusChip } from "sevida-ui";
import type { Column, StatusTone } from "sevida-ui";
import { DEMO_NOW, fmtDate, hashOf, providers } from "../data";
import type { Member } from "../data";
import { V3_GAP_LABEL, gapShort } from "../v3Data";
import {
  CLAIM_TYPE_NAME,
  DASH,
  addDays,
  claimRows,
  dxSystem,
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
import { clinicOf, pcmPerson } from "../v16Data";

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
const RED = ["Denied", "Entered in Error", "Canceled", "Cancelled", "Not Done", "Stopped", "Discontinued"];
const tone = (s: string): StatusTone =>
  GREEN.includes(s) ? "success" : RED.includes(s) ? "danger" : s === "Inactive" || s === "Resolved" || s === "Remission" ? "neutral" : "warning";
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
const SYSTEM_NAME: Record<string, string> = { L: "LOINC", "L:": "LOINC", SCT: "SNOMED CT" };
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

/**
 * Version 16 (LPP-16156 to 16163, 16360): the default table is exactly the ticket's columns. "Related Care Gap" is not in any ticket, so it moves to the
 * Columns panel (off). Every tab also offers Created On, Created By and Last Updated there, and every column has an info (i) text.
 */
const v16 = () => getVersion() >= 16;
/** Version 16: change one column of the default table by its key. */
const mapKey = <T,>(c: Column<T>[], key: string, f: (x: Column<T>) => Column<T>): Column<T>[] => c.map((x) => (x.key === key ? f(x) : x));
const HELP16: Record<string, string> = {
  Provider: "The provider on this record, written Last, First credentials. A dash means the source did not send one.",
  Source: "The system the record came from.",
  Status: "The status of the record as the source sent it.",
  Code: "The code from the standard code system named in the Code System column.",
  "Code System": "The standard code system the code belongs to (ICD-10-CM, CPT, LOINC, NDC, CVX...).",
};
function ticket16<T>(
  cols12: Column<T>[],
  tweak: { main?: (c: Column<T>[]) => Column<T>[]; hidden?: (c: Column<T>[]) => Column<T>[] } = {},
): Column<T>[] {
  let main = cols12.filter((c) => c.group !== "Optional" && c.key !== "measure");
  let hidden = cols12.filter((c) => c.group === "Optional" || c.key === "measure");
  if (tweak.main) main = tweak.main(main);
  if (tweak.hidden) hidden = tweak.hidden(hidden);
  const has = (k: string) => [...main, ...hidden].some((c) => c.key === k);
  // A claim has no created date of its own in the sample data, so its Last Updated date stands in.
  const dateOf = (r: T, k: "created" | "updated") => ((r as Record<string, unknown>)[k] ?? (r as Record<string, unknown>).updated) as Date;
  if (!has("created"))
    hidden.push(col<T>("created", "Created On", (r) => dateOf(r, "created"), { sortable: true, nowrap: true, render: (r) => day(dateOf(r, "created")) }));
  if (!has("createdBy")) hidden.push(col<T>("createdBy", "Created By", () => "System", { sortable: true }));
  if (!has("updated"))
    hidden.push(col<T>("updated", "Last Updated", (r) => dateOf(r, "updated"), { sortable: true, nowrap: true, render: (r) => day(dateOf(r, "updated")) }));
  return [...main, ...hidden.map((c) => ({ ...c, group: "Optional", defaultHidden: true }))].map((c) => ({
    ...c,
    help: c.help ?? HELP16[c.header] ?? `${c.header} of this record.`,
  }));
}

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
  /** Version 16: a note under the table in place of the generic "Sample data" note. */
  note?: string;
}

function RecordTable<T>({ tab, rows, columns, getRowId, sort, search, providerOf, note }: TableProps<T>) {
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
        title={v16() ? NOUN[tab] : `List of ${NOUN[tab]}`}
        columns={columns}
        rows={shown}
        getRowId={getRowId}
        defaultSort={sort}
        pageSize={10}
        searchPlaceholder={search}
        noResultsTitle={`No ${NOUN[tab].toLowerCase()} found`}
        storageKey={v16() ? `demo-member-${tab}-v16-a` : v12() ? `demo-member-${tab}-v12-a` : v11() ? `demo-member-${tab}-v11-a` : `demo-member-${tab}-v8-a`}
        toolbar={v12() ? undefined : v11() ? { columns: false } : undefined}
        columnsPanel={v12() ? { tableOrder: true, search: false } : undefined}
      />
      <Typography variant="caption" sx={{ display: "block", mt: 1, color: "text.secondary" }}>
        {note ?? NOTE}
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
/** Version 16 (LPP-16156): the info (i) text of each Claims column. A column that is not in the list has no (i). */
const CLAIM_HELP16: Record<string, string> = {
  services: "What was done for the member: the name of each service on the claim, one per line.",
  from: "The first day services on this claim were provided.",
  to: "The last day services on this claim were provided. A dash means the source did not send one.",
  code: "The ICD-10 diagnosis code or codes on the claim, one per line. A claim with no diagnosis, such as a dental claim, shows its service codes.",
  ctype: "P is Professional, I is Institutional and D is Dental. Hover over the letter to see the full name.",
  provider: "The billing provider who submitted the claim.",
  id: "The number the payer gave this claim.",
  line: "The position of each service line on the claim, starting at 1.",
  status: "The status of the claim: Active, Cancelled, Draft or Entered-in-Error.",
  updated: "The date this claim was last changed.",
};
function ClaimsV8({ m }: { m: Member }) {
  type R = ReturnType<typeof claimRows>[number];
  // Version 16 (LPP-16156): newest Service End Date first, then newest Service Start Date.
  const rows = useMemo(
    () => claimRows(m).sort((a, b) => (v16() ? b.to.getTime() - a.to.getTime() || b.from.getTime() - a.from.getTime() : b.from.getTime() - a.from.getTime())),
    [m],
  );
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
      col<R>("pos", "Place of Service", (r) => r.pos ?? (r.type === "I" ? "21 - Inpatient Hospital" : "11 - Office"), { nowrap: true }),
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
  // Version 16 (LPP-16156): Service Start Date and Service End Date, Claim Type as P / I / D (the full name on hover), Claim Status hidden.
  const by = (k: string) => cols12.find((c) => c.key === k)!;
  const cols16 = ticket16<R>(
    [
          {
            ...by("services"),
            header: "Procedure/Service",
            // LPP-16156: one line per service line, each at most 2 lines, then "…" with the full text in a tooltip.
            render: (r: R) => (
              <>
                {r.lines.map((l, i) => (
                  <Tooltip key={i} title={l.text} arrow>
                    <Box component="span" sx={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {l.text}
                    </Box>
                  </Tooltip>
                ))}
              </>
            ),
          },
          { ...by("from"), header: "Service Start Date" },
          col<R>("to", "Service End Date", (r) => (r.endMissing ? null : r.to), { sortable: true, nowrap: true, render: (r) => (r.endMissing ? DASH : day(r.to)) }),
          // LPP-16156: the Code is the ICD-10-CM diagnosis code or codes, one per line with the description; with no diagnosis it is the service code.
          col<R>("code", "Code", (r) => (r.diagnoses.length ? r.diagnoses.map((d) => d.code) : r.lines.map((l) => l.code)), {
            s: true,
            width: 260,
            render: (r) => lines(r.diagnoses.length ? r.diagnoses.map((d) => `${d.code} - ${d.text}`) : r.lines.map((l) => `${l.code} - ${l.text}`)),
          }),
          col<R>("system", "Code System", (r) => (r.diagnoses.length ? dxSystem() : r.lines.map((l) => l.system)), {
            width: 120,
            render: (r) => (r.diagnoses.length ? dxSystem() : lines(r.lines.map((l) => l.system))),
          }),
          col<R>("ctype", "Claim Type", (r) => r.type, {
            sortable: true,
            nowrap: true,
            render: (r) => (
              <Tooltip title={CLAIM_TYPE_NAME[r.type]} arrow>
                <span>{r.type}</span>
              </Tooltip>
            ),
          }),
          by("pos"),
          by("provider"),
        ],
    {
      hidden: () => [
        by("id"),
        { ...by("line"), header: "Line Number" },
        by("status"),
        // LPP-16156 lists "End Date" among the hidden columns: the last day of the claim, the same date as Service End Date.
        col<R>("endDate", "End Date", (r) => (r.endMissing ? null : r.to), { sortable: true, nowrap: true, render: (r) => (r.endMissing ? DASH : day(r.to)) }),
        by("pdx"),
        by("updated"),
      ],
    },
  ).map((c) => ({ ...c, help: CLAIM_HELP16[c.key] ?? "" }));
  const cols = v16() ? cols16 : v12() ? cols12 : colsOld;
  return (
    <RecordTable tab="claims" m={m} rows={rows} columns={cols} getRowId={(r) => r.id + r.from.getTime()} sort={v16() ? { key: "to", direction: "desc" } : { key: "from", direction: "desc" }} search={v16() ? "Search by Procedure/Service or Code…" : "Search by Claim ID, Service or Code…"} providerOf={(r) => r.provider} />
  );
}

/* ------------------------------------------------------------------ diagnoses */
function DiagnosesV8({ m }: { m: Member }) {
  type R = ReturnType<typeof dxRows>[number];
  // Version 16 (LPP-16157): Start Date, most recent first; the same date: Diagnosis A to Z.
  const rows = useMemo(() => dxRows(m).sort((a, b) => b.start.getTime() - a.start.getTime() || (v16() ? a.name.localeCompare(b.name) : 0)), [m]);
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
  // Version 16 (LPP-16157): the seven ticket columns; End Date, Created On, Created By and Last Updated are hidden; the info texts are the ticket's.
  const D16: Record<string, string> = {
    name: "The description of the diagnosis.",
    start: "The date the condition started or was first diagnosed.",
    code: "The code(s) for this diagnosis.",
    status: "Whether the condition is currently active, in remission, or resolved, as reported by the source.",
    provider: "The provider who made or recorded the diagnosis.",
    source: "The system or data feed this diagnosis was received from.",
    end: 'The date the condition ended or was resolved. "--" means it is ongoing.',
    created: "The date this record was first received.",
    updated: "The date this record was last changed.",
  };
  const cols16 = v16()
    ? ticket16<R>(cols12)
        .filter((c) => c.key !== "measure" && c.key !== "lastRec")
        .map((c) =>
          c.key === "name"
            ? {
                ...c,
                help: D16.name,
                // Description, at most 2 lines, then "…" with the full text in a tooltip.
                render: (r: R) => (
                  <Tooltip title={r.name} arrow>
                    <Box component="span" sx={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {r.name}
                    </Box>
                  </Tooltip>
                ),
              }
            : c.key === "code"
              ? { ...c, help: D16.code, searchable: true }
              : c.key === "provider"
                ? { ...c, help: D16.provider, searchable: false }
                : // The ticket gives Code System and Created By no info text, so they have no (i).
                  c.key === "ctype" || c.key === "createdBy" || c.key === "system"
                  ? { ...c, help: "" }
                  : D16[c.key]
                    ? { ...c, help: D16[c.key] }
                    : c,
        )
    : null;
  const cols = cols16 ?? (v12() ? cols12 : colsOld);
  return <RecordTable tab="diagnoses" m={m} rows={rows} columns={cols} getRowId={(r) => r.key} sort={{ key: "start", direction: "desc" }} search={v16() ? "Search by Diagnosis or Code…" : "Search by Diagnosis or Provider…"} providerOf={(r) => r.provider} note={v16() ? "Sample data: created and updated dates are made up from each record in this demo." : undefined} />;
}

/* ------------------------------------------------------------------ encounters */
function EncountersV8({ m }: { m: Member }) {
  type R = ReturnType<typeof encRows>[number];
  // Version 16 (LPP-16158): Encounter Date, most recent first; the same date: Encounter Type A to Z.
  const rows = useMemo(() => encRows(m).sort((a, b) => b.date.getTime() - a.date.getTime() || (v16() ? a.type.localeCompare(b.type) : 0)), [m]);
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
        render: (r) => (r.diagnoses[0] ? `${r.diagnoses[0].code}${v16() ? " - " : ": "}${r.diagnoses[0].text}` : DASH),
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
  // Version 16 (LPP-16158): the seven ticket columns. Place of Service is the location name; the Clinic / Facility is the member's own clinic (the one in the member header).
  // Hidden: End Date, Source, Created On, Created By, Last Updated (no Related Care Gap, no Additional Diagnoses). The info texts are the ticket's.
  const E16: Record<string, string> = {
    type: "The kind of visit, such as an office visit, wellness visit or telehealth visit.",
    date: "The date the encounter took place.",
    status: "Where the encounter is in its lifecycle, as reported by the source: Planned, Arrived, Triaged, In Progress, On Leave, Completed, Canceled or Entered in Error.",
    pos: "Where the encounter took place.",
    facility: "The clinic or facility where the member was seen.",
    provider: "The provider who saw the member at this encounter.",
    end: "The date the encounter ended.",
    source: "The system or data feed this encounter was received from.",
    created: "The date this record was first received.",
    updated: "The date this record was last changed.",
  };
  const cols16 = v16()
    ? ticket16<R>(cols12, {
        main: (c) =>
          mapKey(mapKey(c, "facility", (x) => ({ ...x, header: "Clinic / Facility", accessor: () => "Madigan Army Medical Center" })), "pos", (x) => ({
            ...x,
            accessor: (r: R) => r.place,
          })),
        hidden: (h) => [
          col<R>("end", "End Date", (r) => r.end, { sortable: true, nowrap: true, render: (r) => day(r.end) }),
          ...h.filter((c) => c.key === "source"),
        ],
      })
        // The ticket gives Primary Diagnosis, Clinic / Facility and Created By no info text, so they have no (i). The hidden columns follow the ticket's order.
        .map((c) => (c.key === "dx" || c.key === "facility" || c.key === "createdBy" || c.key === "created" || c.key === "updated" ? { ...c, help: "" } : E16[c.key] ? { ...c, help: E16[c.key] } : c))
        .sort((a, b) => {
          const ORDER = ["created", "createdBy", "updated", "end", "source"];
          const ia = ORDER.indexOf(a.key);
          const ib = ORDER.indexOf(b.key);
          return ia < 0 && ib < 0 ? 0 : ia < 0 ? -1 : ib < 0 ? 1 : ia - ib;
        })
    : null;
  const cols = cols16 ?? (v12() ? cols12 : colsOld);
  return <RecordTable tab="encounters" m={m} rows={rows} columns={cols} getRowId={(r) => r.key} sort={{ key: "date", direction: "desc" }} search={v16() ? "Search by Encounter Type or Provider…" : "Search by Visit Type or Provider…"} providerOf={(r) => r.provider} note={v16() ? "Sample data: places of service and created and updated dates are made up from each record in this demo." : undefined} />;
}

/* ------------------------------------------------------------------ immunizations */
function ImmunizationsV8({ m }: { m: Member }) {
  type R = ReturnType<typeof immRows>[number];
  // Version 16 (LPP-16360): Administered Date, most recent first; the same date: Vaccine A to Z.
  const rows = useMemo(() => immRows(m).sort((a, b) => b.date.getTime() - a.date.getTime() || (v16() ? a.vaccine.localeCompare(b.vaccine) : 0)), [m]);
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
      col<R>("dose", "Dose", (r) => r.dose ?? r.vaccine, { nowrap: true, render: (r) => r.dose ?? (/pediatric|drops/i.test(r.vaccine) ? "0.25 mL" : "0.5 mL") }),
      col<R>("ccode", "Code", (r) => codeOf(r.code), { nowrap: true }),
      col<R>("csys", "Code System", (r) => systemOf(r.code), { nowrap: true }),
      "status",
      "provider",
      ["measure", "Related Care Gap"],
    ],
    ["source", col<R>("lot", "Lot Number", (r) => lotOf(r.key), { nowrap: true }), col<R>("year", "Year of Immunization", (r) => r.date.getFullYear(), { sortable: true, nowrap: true })],
  );
  // Version 16 (LPP-16360): the Code is written as the ticket's "C: ####" (the first letter of the code system, then the code), and the Code System has its own column.
  // Hidden: Created On, Created By, Last Updated, Source (the ticket's order), then Year of Immunization, which the Administered Date text points to.
  // The info texts are the ticket's words; Code System, Created On, Created By and Last Updated have no text in the ticket, so they have no (i).
  const I16: Record<string, string> = {
    vaccine: "The name of the vaccination.",
    date: "Date the vaccine was given. If date is unknown, refer to Year of Immunization.",
    dose: "The dose quantity given.",
    ccode: "CVX code of the vaccine.",
    status: "Status of the vaccination record.",
    provider: "The provider who prescribed the medication.",
    source: "The system or data feed this medication record was received from.",
    year: "The year the vaccine was given. Use it when the exact administered date is unknown.",
  };
  const NO_HELP = ["csys", "created", "createdBy", "updated"];
  const cols16 = v16()
    ? ticket16<R>(cols12, {
        main: (c) => mapKey(mapKey(c, "ccode", (x) => ({ ...x, searchable: true, render: (r: R) => `${systemOf(r.code).charAt(0)}: ${codeOf(r.code)}` })), "vaccine", (x) => ({ ...x, searchable: true })),
        hidden: (h) => h.filter((c) => c.key === "source" || c.key === "year"),
      })
        .map((c) => (NO_HELP.includes(c.key) ? { ...c, help: "" } : I16[c.key] ? { ...c, help: I16[c.key] } : c))
        .sort((a, b) => {
          const ORDER = ["created", "createdBy", "updated", "source", "year"];
          const ia = ORDER.indexOf(a.key);
          const ib = ORDER.indexOf(b.key);
          return ia < 0 && ib < 0 ? 0 : ia < 0 ? -1 : ib < 0 ? 1 : ia - ib;
        })
    : null;
  const cols = cols16 ?? (v12() ? cols12 : colsOld);
  return <RecordTable tab="immunizations" m={m} rows={rows} columns={cols} getRowId={(r) => r.key} sort={{ key: "date", direction: "desc" }} search={v16() ? "Search by Vaccine or Code…" : v11() ? "Search by Vaccination…" : "Search by Vaccine…"} providerOf={(r) => r.provider} note={v16() ? "Sample data: doses and created and updated dates are made up from each record in this demo." : undefined} />;
}

/* ------------------------------------------------------------------ labs */
function LabsV8({ m }: { m: Member }) {
  type R = ReturnType<typeof labRows>[number];
  // Version 16 (LPP-16159): Collection Date, most recent first; the same date: Test A to Z.
  const rows = useMemo(() => labRows(m).sort((a, b) => b.date.getTime() - a.date.getTime() || (v16() ? a.test.localeCompare(b.test) : 0)), [m]);
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
      col<R>("res", "Result", (r) => valueOf(r), { nowrap: true, alwaysVisible: true }),
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
  // Version 16 (LPP-16159): the reference range is only filled when the result is out of range (the Abnormal Flag says so).
  // Hidden: Resulting Date, Panel Status, Source, Created On, Created By, Last Updated (no Related Care Gap, no Panel). The info texts are the ticket's.
  const L16: Record<string, string> = {
    test: "The name of the lab test.",
    date: "The date the sample was collected from the member.",
    res: "The result value and its unit.",
    range: "The normal range for this test, as reported by the lab.",
    flag: "Shows if the result is outside the reference range: High, Low or Abnormal. Blank means the result is within range.",
    lcode: "The standard LOINC code that identifies the lab test.",
    provider: "The provider who ordered the lab.",
    resulted: "The date the lab result was reported.",
    source: "The system or data feed this lab result was received from.",
  };
  // The ticket gives Unit, Code System, Panel Status, Created On, Created By and Last Updated no info text, so they have no (i).
  const NO_HELP16 = ["unit", "lsys", "pstatus", "created", "createdBy", "updated"];
  const cols16 = v16()
    ? ticket16<R>(cols12, {
        main: (c) =>
          mapKey(
            mapKey(
              mapKey(
                mapKey(c, "range", (x) => ({ ...x, render: (r: R) => (r.flag !== DASH ? r.range.replace(" to ", "–") : DASH) })),
                "res",
                // "7.2 %": the value with its unit (the Unit column stays too).
                (x) => ({ ...x, render: (r: R) => (unitOf(r) ? `${valueOf(r)} ${unitOf(r)}` : valueOf(r)) }),
              ),
              "lcode",
              (x) => ({ ...x, width: 300, nowrap: false, render: (r: R) => withText(r.loinc, r.loincText ?? r.test) }),
            ),
            "test",
            // Name of the test, at most 2 lines, then "…" with the full text in a tooltip.
            (x) => ({
              ...x,
              render: (r: R) => (
                <Tooltip title={r.test} arrow>
                  <Box component="span" sx={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {r.test}
                  </Box>
                </Tooltip>
              ),
            }),
          ),
        hidden: (h) => ["resulted", "pstatus", "source"].flatMap((k) => h.filter((c) => c.key === k).map((c) => (k === "pstatus" ? { ...c, header: "Panel Status" } : c))),
      })
        .map((c) => (NO_HELP16.includes(c.key) ? { ...c, help: "" } : L16[c.key] ? { ...c, help: L16[c.key] } : c))
        // The hidden columns follow the ticket's order.
        .sort((a, b) => {
          const ORDER = ["created", "createdBy", "updated", "pstatus", "resulted", "source"];
          const ia = ORDER.indexOf(a.key);
          const ib = ORDER.indexOf(b.key);
          return ia < 0 && ib < 0 ? 0 : ia < 0 ? -1 : ib < 0 ? 1 : ia - ib;
        })
    : null;
  const cols = cols16 ?? (v12() ? cols12 : colsOld);
  return <RecordTable tab="labs" m={m} rows={rows} columns={cols} getRowId={(r) => r.key} sort={{ key: "date", direction: "desc" }} search={v16() ? "Search by Test, Code or Provider…" : "Search by Test, LOINC Code or Provider…"} providerOf={(r) => r.provider} note={v16() ? "Sample data: reference ranges, resulting dates and created and updated dates are made up from each record in this demo." : undefined} />;
}

/* ------------------------------------------------------------------ medications */
function MedicationsV8({ m }: { m: Member }) {
  type R = ReturnType<typeof medRows>[number];
  // Version 16 (LPP-16160): Dispensed Date, most recent first; the same date: Medication A to Z.
  const rows = useMemo(() => medRows(m).sort((a, b) => b.date.getTime() - a.date.getTime() || (v16() ? a.name.localeCompare(b.name) : 0)), [m]);
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
  const M16: Record<string, string> = {
    name: "The name of the medication dispensed.",
    date: "The date the pharmacy dispensed the medication to the member.",
    qty: "The amount of medication dispensed in this fill.",
    days: "The number of days this fill is expected to last.",
    mcode: "The drug code for this medication, and the coding system it comes from (RxNorm or NDC).",
    status: "Whether the member is currently on this medication, as reported by the source: Active (currently taking), Discontinued (stopped by a provider) or Inactive (no longer taking).",
    provider: "The provider who prescribed the medication.",
    source: "The system or data feed this medication record was received from.",
    pharmacy: "The pharmacy that dispensed the medication.",
    pharmacyNpi: "The NPI of the pharmacy.",
    prescriberNpi: "The NPI of the pharmacy.",
    refills: "The number of refills left on this prescription, out of the total refills prescribed.",
  };
  // The ticket gives Strength, Dose, Code System, Prescriber Name, Created On, Created By and Last Updated no info text, so they have no (i).
  const NO_HELP16 = ["strength", "dose", "msys", "prescriberName", "created", "createdBy", "updated"];
  // Version 16 (LPP-16160): Strength and Dose are two columns; the pharmacy, prescriber and refill columns are in the Columns panel (no Related Care Gap).
  const doseOf = (r: R) =>
    /inhal|puff|actuation/i.test(r.name)
      ? "2 puffs"
      : /suspension/i.test(r.name)
        ? "5 mL"
        : /drops/i.test(r.name)
          ? "1 mL"
          : /capsule/i.test(r.name)
            ? "1 capsule"
            : /inject|syringe|insulin/i.test(r.name)
              ? "1 injection"
              : "1 tablet";
  const cols16 = v16()
    ? ticket16<R>(cols12, {
        main: (c) =>
          mapKey(
            mapKey(c, "mcode", (x) => ({ ...x, searchable: true, render: (r: R) => `${systemOf(r.code) === DASH ? "NDC" : systemOf(r.code)}: ${ndcFmt(codeOf(r.code))}` })),
            "name",
            // Name, strength and form, at most 2 lines, then "…" with the full text in a tooltip.
            (x) => ({
              ...x,
              render: (r: R) => (
                <Tooltip title={r.name} arrow>
                  <Box component="span" sx={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {r.name}
                  </Box>
                </Tooltip>
              ),
            }),
          ).flatMap((x) =>
            x.key === "strength"
              ? [
                  col<R>("strength", "Strength", (r) => strengthOf(r.name), { nowrap: true }),
                  col<R>("dose", "Dose", (r) => doseOf(r), { nowrap: true }),
                ]
              : [x],
          ),
        hidden: () => [
          { ...columns.find((x) => x.key === "pharmacy")!, header: "Pharmacy Name" },
          columns.find((x) => x.key === "pharmacyNpi")!,
          col<R>("prescriberNpi", "Prescriber Provider NPI", (r) => r.prescriberNpi, { nowrap: true }),
          col<R>("prescriberName", "Prescriber Name", (r) => r.provider, { sortable: true }),
          { ...columns.find((x) => x.key === "refills")!, header: "Refills Remaining" },
        ],
      })
        .map((c) => (NO_HELP16.includes(c.key) ? { ...c, help: "" } : M16[c.key] ? { ...c, help: M16[c.key] } : c))
        // The hidden columns follow the ticket's order.
        .sort((a, b) => {
          const ORDER = ["created", "createdBy", "updated", "pharmacy", "pharmacyNpi", "prescriberNpi", "prescriberName", "refills"];
          const ia = ORDER.indexOf(a.key);
          const ib = ORDER.indexOf(b.key);
          return ia < 0 && ib < 0 ? 0 : ia < 0 ? -1 : ib < 0 ? 1 : ia - ib;
        })
    : null;
  const cols = cols16 ?? (v12() ? cols12 : colsOld);
  return <RecordTable tab="medications" m={m} rows={rows} columns={cols} getRowId={(r) => r.key} sort={{ key: "date", direction: "desc" }} search={v16() ? "Search by Medication or Code…" : "Search by Medication…"} providerOf={(r) => r.provider} note={v16() ? "Sample data: pharmacies, refills and created and updated dates are made up from each record in this demo." : undefined} />;
}

/* ------------------------------------------------------------------ observations */
function ObservationsV8({ m }: { m: Member }) {
  type R = ReturnType<typeof obsRows>[number];
  // Version 16 (LPP-16161): Observation Date, most recent first; the same date: Observation A to Z.
  const rows = useMemo(() => obsRows(m).sort((a, b) => b.date.getTime() - a.date.getTime() || (v16() ? a.service.localeCompare(b.service) : 0)), [m]);
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
  // Version 16 (LPP-16161): the value is "7.2 % (H)" with its status in small type on a second line; the code carries its system (LOINC / SNOMED CT);
  // Status is the status of the associated claim. Hidden: Created On, Created By, Last Updated, Observation Type, Status, Source (no Related Care Gap).
  const O16: Record<string, string> = {
    service: "The name of what was observed or measured.",
    date: "The date the observation was made or recorded.",
    val: "The result of the observation, any flag showing it is outside the normal range (High, Low or Abnormal), and the status of the result (Registered, Preliminary, Final, Amended, Corrected, Cancelled or Entered in Error).",
    ocode: "The standard code that identifies the observation, and the coding system it comes from (e.g. LOINC or SNOMED CT).",
    provider: "The provider who ordered the service.",
    otype: "The category of observation: Vital Signs, Laboratory, Survey, Exam, Social History, Imaging, Procedure, Therapy or Activity.",
    ostatus: "The status of the associated claim record, as reported by the source: Active, Cancelled, Draft or Entered in Error.",
    source: "The system or data feed this observation was received from.",
  };
  // The ticket gives Unit, Category, Code System, Created On, Created By and Last Updated no info text, so they have no (i).
  const NO_HELP16 = ["unit", "type", "osys", "created", "createdBy", "updated"];
  const cols16 = ticket16<R>(cols12, {
    main: (c) =>
      c.map((x) =>
        x.key === "service"
          ? {
              ...x,
              render: (r: R) => (
                <Tooltip title={r.service} arrow>
                  <Box component="span" sx={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {r.service}
                  </Box>
                </Tooltip>
              ),
            }
          : x.key === "ocode"
            ? { ...x, width: 320, nowrap: false, render: (r: R) => withText(`${systemName(systemOf(r.code))}: ${codeOf(r.code)}`, r.codeText ?? r.service) }
            : x.key === "val"
              ? {
                  ...x,
                  alwaysVisible: true,
                  accessor: (r: R) => r.value,
                  render: (r: R) =>
                    r.value === DASH && r.status === "Final" ? (
                      DASH
                    ) : (
                      <>
                        {r.value}
                        <Typography variant="caption" component="div" sx={{ color: "text.secondary" }}>
                          {r.status}
                        </Typography>
                      </>
                    ),
                }
              : x.key === "unit"
                ? { ...x, accessor: (r: R) => r.unit, render: (r: R) => r.unit || DASH }
                : x.key === "type"
                  ? { ...x, alwaysVisible: false }
                  : x,
      ),
    hidden: () => [
      col<R>("created", "Created On", (r) => r.created, { sortable: true, nowrap: true, render: (r) => day(r.created) }),
      col<R>("createdBy", "Created By", () => "System", { sortable: true }),
      col<R>("updated", "Last Updated", (r) => r.updated, { sortable: true, nowrap: true, render: (r) => day(r.updated) }),
      col<R>("otype", "Observation Type", (r) => r.type, { sortable: true, nowrap: true }),
      col<R>("ostatus", "Status", (r) => r.claimStatus, { nowrap: true, sortable: true, render: (r) => chip(r.claimStatus) }),
      col<R>("source", "Source", (r) => r.source, { sortable: true }),
    ],
  }).map((c) => (NO_HELP16.includes(c.key) ? { ...c, help: "" } : O16[c.key] ? { ...c, help: O16[c.key] } : c));
  const cols = v16() ? cols16 : v12() ? cols12 : colsOld;
  return <RecordTable tab="observations" m={m} rows={rows} columns={cols} getRowId={(r) => r.key} sort={{ key: "date", direction: "desc" }} search={v16() ? "Search by Observation or Code…" : "Search by Service Type or Service…"} providerOf={(r) => r.provider} note={v16() ? "Sample data: results, claim statuses and created and updated dates are made up from each record in this demo." : undefined} />;
}

/* ------------------------------------------------------------------ procedures */
function ProceduresV8({ m }: { m: Member }) {
  type R = ReturnType<typeof procRows>[number];
  // Version 16 (LPP-16162): Service Date, most recent first; the same date: Procedure A to Z.
  const rows = useMemo(() => procRows(m).sort((a, b) => b.date.getTime() - a.date.getTime() || (v16() ? a.name.localeCompare(b.name) : 0)), [m]);
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
  // Version 16 (LPP-16162): the code is written "CPT: 77067 - description"; the name has at most 2 lines. Hidden: Created On, Created By, Last Updated, Result,
  // Place of Service (no Related Care Gap). The info texts are the ticket's.
  const posOfProc = (r: R) =>
    /colonoscopy|sigmoidoscopy/i.test(r.name)
      ? "24 - Ambulatory Surgical Center"
      : /mastectomy/i.test(r.name)
        ? "21 - Inpatient Hospital"
        : /diagnostic mammogra/i.test(r.name)
          ? "11 - Office"
          : /screening mammogra|radiologic/i.test(r.name) || (/venipuncture|electrocardiogram|spirometry/i.test(r.name) && hashOf(r.key) % 6 === 0)
            ? "22 - On Campus Outpatient Hospital"
            : "11 - Office";
  const NO_HELP16 = ["psys", "created", "createdBy", "updated", "ppos"];
  const P16: Record<string, string> = {
    name: "The name of the procedure performed.",
    date: "The date the procedure was performed.",
    pcode: "The code for this procedure, and the coding system it comes from (e.g. CPT, HCPCS, SNOMED CT or ICD-10-PCS).",
    psys: "The coding system the procedure code comes from: CPT, HCPCS, SNOMED CT or ICD-10-PCS.",
    status: "Where the procedure is in its lifecycle, as reported by the source: In Progress, Not Done, On Hold, Stopped, Completed, Entered in Error or Unknown.",
    provider: "The provider who performed the procedure.",
    source: "The system or data feed this procedure was received from.",
    created: "The date this record was first received.",
    createdBy: "Who or what created this record.",
    updated: "The date this record was last changed.",
    value: "A detail recorded about the procedure, such as the body site or outcome, where applicable.",
    ppos: "The place where the procedure was done, with its place-of-service code.",
  };
  const cols16 = v16()
    ? ticket16<R>(cols12, {
        main: (c) =>
          c.map((x) =>
            x.key === "pcode"
              ? { ...x, width: 320, nowrap: false, render: (r: R) => withText(r.code, r.name) }
              : x.key === "name"
                ? {
                    ...x,
                    render: (r: R) => (
                      <Tooltip title={r.name} arrow>
                        <Box component="span" sx={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {r.name}
                        </Box>
                      </Tooltip>
                    ),
                  }
                : x,
          ),
        hidden: (h) => [
          col<R>("created", "Created On", (r) => r.created, { sortable: true, nowrap: true, render: (r) => day(r.created) }),
          col<R>("createdBy", "Created By", () => "System", { sortable: true }),
          col<R>("updated", "Last Updated", (r) => r.updated, { sortable: true, nowrap: true, render: (r) => day(r.updated) }),
          ...h.filter((c) => c.key === "value"),
          col<R>("ppos", "Place of Service", posOfProc, { width: 260 }),
        ],
      }).map((c) => (NO_HELP16.includes(c.key) ? { ...c, help: "" } : P16[c.key] ? { ...c, help: P16[c.key] } : c))
    : null;
  const cols = cols16 ?? (v12() ? cols12 : colsOld);
  return <RecordTable tab="procedures" m={m} rows={rows} columns={cols} getRowId={(r) => r.key} sort={{ key: "date", direction: "desc" }} search={v16() ? "Search by Procedure or Code…" : "Search by Procedure…"} providerOf={(r) => r.provider} note={v16() ? "Sample data: results, places of service and created and updated dates are made up from each record in this demo." : undefined} />;
}

/* ------------------------------------------------------------------ providers */
function ProvidersV8({ m }: { m: Member }) {
  type R = ReturnType<typeof provRows>[number];
  // Name A to Z; providers with the same name: the most recent interaction first (the table sort is stable).
  const rows = useMemo(() => {
    const base = provRows(m).sort((a, b) => b.last.getTime() - a.last.getTime() || (v16() ? a.name.localeCompare(b.name) : 0));
    // Version 16: the primary care manager is the one the header and the dashboards show, so the manager has a row here too.
    const pcm = v16() ? pcmPerson(m) : undefined;
    if (pcm && !base.some((r) => r.npi === pcm.npi)) {
      const [first, ...rest] = pcm.name.split(" ");
      const last = base.length ? base[0].last : DEMO_NOW;
      const early = base.length ? new Date(Math.min(...base.map((r) => r.first.getTime()))) : last;
      base.push({
        npi: pcm.npi,
        name: `${rest.join(" ")}, ${first}`,
        active: "Yes",
        entity: "I",
        specialty: "Primary Care",
        org: clinicOf(m),
        last,
        first: early,
        related: [],
        prescribing: "N",
        taxonomy: DASH,
        orgNpi: `19${String(hashOf(pcm.npi) % 100000000).padStart(8, "0")}`,
        phone: `(253) 555-0${String(100 + (hashOf(pcm.npi) % 900))}`,
        address: "9040 Jackson Ave, Tacoma, WA 98431",
        created: early,
        updated: last,
        source: "MHS GENESIS",
      });
    }
    return v16() ? base.sort((a, b) => b.last.getTime() - a.last.getTime() || a.name.localeCompare(b.name)) : base;
  }, [m]);
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
  const pcmNpi = pcmPerson(m)?.npi;
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
  // Version 16 (LPP-16163): newest Last Interaction first (then Provider A to Z); the hidden columns are the ticket's nine, in the ticket's order. The specialty is
  // written as the ticket does ("Family Medicine"), the role is PCM or the kind of specialist, the related records are comma separated links, and the search
  // covers the provider name and NPI only.
  const specialty16 = (t: string) => (t === DASH ? DASH : t.replace(/ \(PCP\)$/, "").replace(/^Family medicine$/, "Family Medicine").replace(/^Family nurse practitioner$/, "Family Nurse Practitioner"));
  const ROLE16: Record<string, string> = {
    "Family medicine (PCP)": "Primary Care Provider",
    "Family nurse practitioner (PCP)": "Primary Care Provider",
    "OB/GYN": "OB/GYN",
    Radiology: "Radiologist",
    "General surgery": "Surgeon",
    Gastroenterology: "Gastroenterologist",
    Dentist: "Dentist",
    Hospital: "Facility",
    Clinic: "Facility",
  };
  const role16 = (r: R) => (r.npi === pcmNpi ? "PCM" : (ROLE16[r.specialty] ?? "Encounter Provider"));
  const taxonomy16 = (r: R): string[] => {
    if (r.taxonomy === DASH) return [];
    const extra = r.entity === "I" && hashOf(r.npi) % 4 === 0 ? ["207R00000X"] : [];
    return [r.taxonomy, ...extra.filter((x) => x !== r.taxonomy)];
  };
  const PV16: Record<string, string> = {
    name: "The provider's name.",
    npi: "The provider's National Provider Identifier (NPI).",
    role: "The provider's role for this member, such as PCM or the kind of specialist (Cardiologist, Radiologist...).",
    specialty: "The provider's primary specialty.",
    org: "The practice, clinic or facility the provider belongs to.",
    last: "The most recent date this provider appears on any of the member's records.",
    related: "The member's records that include this provider. Click a record type to see them.",
    created: "The date this record was first received.",
    createdBy: "Who or what created this record.",
    updated: "The date this record was last changed.",
    orgNpi: "The National Provider Identifier (NPI) of the provider's organization.",
    taxonomy: "The standard code for the provider's type and specialty.",
    phone: "The provider's phone number.",
    address: "The provider's practice address.",
    first: "The earliest date this provider appears on any of the member's records.",
    source: "The system or data feed this provider's information was received from.",
  };
  const cols16 = ticket16<R>(cols12, {
    main: (c) =>
      c.map((x) =>
        x.key === "role"
          ? { ...x, accessor: (r: R) => role16(r), render: (r: R) => role16(r) }
          : x.key === "specialty"
            ? { ...x, s: false, accessor: (r: R) => specialty16(r.specialty), render: (r: R) => specialty16(r.specialty) }
            : x.key === "org"
              ? { ...x, s: false }
              : x.key === "related"
                ? {
                    ...x,
                    width: 260,
                    render: (r: R) =>
                      r.related.length === 0 ? (
                        DASH
                      ) : (
                        <>
                          {r.related.map((y, i) => (
                            <span key={y.tab}>
                              {i > 0 && ", "}
                              <TableLink to={`/members/${m.id}?tab=${y.tab}&provider=${encodeURIComponent(r.name)}`}>
                                {y.label} ({y.n})
                              </TableLink>
                            </span>
                          ))}
                        </>
                      ),
                  }
                : x,
      ),
    hidden: () => [
      col<R>("created", "Created On", (r) => r.created, { sortable: true, nowrap: true, render: (r) => day(r.created) }),
      col<R>("createdBy", "Created By", () => "System", { sortable: true }),
      col<R>("updated", "Last Updated", (r) => r.updated, { sortable: true, nowrap: true, render: (r) => day(r.updated) }),
      ...["orgNpi", "taxonomy", "phone", "first", "address", "source"].map((k) => columns.find((x) => x.key === k)!).map((x) =>
        x.key === "taxonomy"
          ? { ...x, accessor: (r: R) => taxonomy16(r).join(", "), render: (r: R) => (taxonomy16(r).length ? lines(taxonomy16(r)) : DASH) }
          : x,
      ),
    ],
  }).map((c) => (PV16[c.key] ? { ...c, help: PV16[c.key] } : c));
  const cols = v16() ? cols16 : v12() ? cols12 : colsOld;
  return <RecordTable tab="providers" m={m} rows={rows} columns={cols} getRowId={(r) => r.npi} sort={v16() ? { key: "last", direction: "desc" } : v12() ? { key: "role", direction: "asc" } : { key: "name", direction: "asc" }} search={v16() ? "Search by Provider or NPI…" : v12() ? "Search by Provider, NPI, Specialty or Organization…" : "Search by Provider, Provider ID, Specialty or Organization…"} />;
}
