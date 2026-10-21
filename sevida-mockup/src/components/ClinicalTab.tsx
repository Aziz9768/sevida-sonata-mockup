import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Stack, Typography } from "@mui/material";
import { Button, DataTable, EmptyState, StatusChip } from "sevida-ui";
import type { Column, StatusTone } from "sevida-ui";
import { arrivedOn, impactsOf, recordKey, useGaps } from "../careGaps";
import {
  MY,
  fmtDate,
  memberForYear,
  providerHelp,
  providerOf,
  sourceSystemOf,
} from "../data";
import type { Evt, Member } from "../data";
import { SourceRecordModal } from "./SourceRecordModal";
import { TableLink } from "./TableLink";

const doneStatuses = [
  "paid",
  "final",
  "finished",
  "completed",
  "dispensed",
  "recorded",
];
const statusToneOf = (s: string): StatusTone =>
  doneStatuses.includes(s)
    ? "success"
    : s === "denied" || s === "cancelled" || s === "not-done"
      ? "danger"
      : "warning";
const resultOf = (e: Evt) =>
  e.value === undefined
    ? ""
    : e.tag === "hba1c"
      ? `${e.value}%`
      : String(e.value);
const opt = (xs: string[]) => xs.map((v) => ({ value: v, label: v }));

/**
 * The member's records are split by what they are, because each kind has its own codes and fields:
 * diagnoses (ICD-10), immunizations (CVX), labs (LOINC, with a result), medications (NDC), claims, and visits and procedures.
 * Every record sits in exactly one tab.
 */
export type RecordGroup =
  | "diagnoses"
  | "immunizations"
  | "labs"
  | "medications"
  | "claims"
  | "procedures";
export const groupOfRecord = (e: Evt): RecordGroup =>
  e.kind === "EHR diagnosis" || (e.kind === "Claim" && e.system === "ICD-10")
    ? "diagnoses"
    : e.kind === "Vaccine"
      ? "immunizations"
      : e.kind === "Lab" || e.kind === "Observation"
        ? "labs"
        : e.kind === "Pharmacy"
          ? "medications"
          : e.kind === "Claim"
            ? "claims"
            : "procedures";

interface GroupConfig {
  label: string;
  title: string;
  dateHeader: string;
  whatHeader: string;
  codeHeader: string;
  codeHelp: string;
  statusHeader: string;
  empty: string;
  /** Show the result value (labs only). */
  result?: boolean;
  /** Show the source system by default. */
  systemShown?: boolean;
  /** A mix of every kind (the All records tab): adds a Type column, and the result column shows a value when there is one. */
  mixed?: boolean;
}
export const recordGroups: Record<RecordGroup, GroupConfig> = {
  diagnoses: {
    label: "Diagnoses",
    title: "Diagnoses",
    dateHeader: "Diagnosis date",
    whatHeader: "Diagnosis",
    codeHeader: "ICD-10 code",
    codeHelp:
      "The ICD-10 diagnosis code, with what it means in the Diagnosis column. A diagnosis can come from a claim or from the EHR problem list (see Source).",
    statusHeader: "Status in the file",
    empty: "No diagnoses were sent for this member.",
    systemShown: true,
  },
  immunizations: {
    label: "Immunizations",
    title: "Immunizations",
    dateHeader: "Date given",
    whatHeader: "Vaccine",
    codeHeader: "CVX code",
    codeHelp: "The CVX code of the vaccine.",
    statusHeader: "Status in the file",
    empty: "No immunizations were sent for this member.",
  },
  labs: {
    label: "Labs",
    title: "Labs and observations",
    dateHeader: "Collection date",
    whatHeader: "Test",
    codeHeader: "LOINC code",
    codeHelp:
      "The code of the test, with the code system in brackets (LOINC, SNOMED…).",
    statusHeader: "Status in the file",
    empty: "No lab results were sent for this member.",
    result: true,
  },
  medications: {
    label: "Medications",
    title: "Medications",
    dateHeader: "Dispensed on",
    whatHeader: "Drug",
    codeHeader: "NDC code",
    codeHelp: "The National Drug Code of the drug dispensed.",
    statusHeader: "Claim status",
    empty: "No medication records were sent for this member.",
  },
  claims: {
    label: "Claims",
    title: "Claims",
    dateHeader: "Service date",
    whatHeader: "Service",
    codeHeader: "Service code",
    codeHelp:
      "The code billed on the claim line, with the code system in brackets (CPT, HCPCS, ICD-10-PCS…). Diagnosis codes on claims are in the Diagnoses tab.",
    statusHeader: "Claim status",
    empty: "No claims were sent for this member.",
  },
  procedures: {
    label: "Visits and procedures",
    title: "Visits and procedures",
    dateHeader: "Date",
    whatHeader: "Visit or procedure",
    codeHeader: "Code",
    codeHelp:
      "The code of the visit or procedure from the EHR, with the code system in brackets.",
    statusHeader: "Status in the file",
    empty: "No visits or procedures were sent for this member.",
    systemShown: true,
  },
};

/** The All records tab: every record in one list, newest first (checklist row 55). It only has the columns every kind shares. */
export type RecordTab = RecordGroup | "all";
export const allRecords: GroupConfig = {
  label: "All records",
  title: "All records",
  dateHeader: "Date",
  whatHeader: "What",
  codeHeader: "Code",
  codeHelp:
    "The standard code of the record, with the code system in brackets (ICD-10, CPT, LOINC, CVX, NDC…). Each kind has its own tab with the fields that only it has.",
  statusHeader: "Status or result",
  empty: "No records were sent for this member.",
  mixed: true,
};

/** The records of one kind the files hold for this member. Click one to inspect it and see what it did to each measure. */
export function ClinicalTab({
  m,
  year = MY,
  group,
}: {
  m: Member;
  year?: number;
  group: RecordTab;
}) {
  const g = group === "all" ? allRecords : recordGroups[group];
  const { get: getGap } = useGaps();
  // Care gap work exists for the current year only.
  const get = (mm: Member, code: Parameters<typeof getGap>[1]) =>
    year === MY ? getGap(mm, code) : null;
  const [search] = useSearchParams();
  const rows = memberForYear(m, year)
    .events.filter((e) => group === "all" || groupOfRecord(e) === group)
    .sort((a, b) => b.date.getTime() - a.date.getTime());
  /** A link from a care gap (?record=…) opens that record straight away. */
  const linked = search.get("record");
  const [open, setOpen] = useState<Evt | null>(
    () => rows.find((e) => recordKey(e) === linked) ?? null,
  );
  const files = Array.from(new Set(rows.map((e) => `${e.file}.csv`)));
  const statuses = Array.from(new Set(rows.map((e) => e.status)));

  const outcomeText = {
    decided: "Decided the result",
    counted: "Counted",
    "not counted": "Did not count",
    context: "Context only",
  } as const;
  const hasGap = (e: Evt) =>
    impactsOf(m, e, year).some((i) => !!get(m, i.code));

  const columns: Column<Evt>[] = [
    {
      key: "date",
      header: g.dateHeader,
      help: "The day the care happened. The day the record reached Sonata is in the Last updated and Date identified columns.",
      accessor: (e) => e.date,
      sortable: true,
      nowrap: true,
      primary: true,
      filter: { type: "dateRange" },
      render: (e) => fmtDate(e.date),
    },
    ...(g.mixed
      ? ([
          {
            key: "kind",
            header: "Type",
            help: "What kind of record this is. Each kind has its own tab.",
            accessor: (e) => recordGroups[groupOfRecord(e)].label,
            sortable: true,
            nowrap: true,
            filter: {
              type: "multiselect",
              options: opt(Object.values(recordGroups).map((x) => x.label)),
            },
          },
        ] as Column<Evt>[])
      : []),
    { key: "text", header: g.whatHeader, accessor: (e) => e.text },
    {
      key: "code",
      header: g.codeHeader,
      help: g.codeHelp,
      accessor: (e) => `${e.code} (${e.system})`,
      nowrap: true,
      hideBelow: "md",
    },
    {
      key: "result",
      header: g.result ? "Result" : g.statusHeader,
      help: g.mixed
        ? "The value for a lab or test. For other records, the status in the file (paid, finished, denied…)."
        : g.result
          ? "The value of the lab or test. If a value was not sent, the status in the file."
          : "The status of the record in the file (paid, finished, denied…).",
      accessor: (e) =>
        (g.result || g.mixed) && e.value !== undefined ? resultOf(e) : e.status,
      filterLabel: "Status in the file",
      filterAccessor: (e) => e.status,
      filter: { type: "multiselect", options: opt(statuses) },
      render: (e) =>
        (g.result || g.mixed) && e.value !== undefined ? (
          <>
            {resultOf(e)}
            {e.status !== "final" && (
              <Typography
                variant="caption"
                component="div"
                sx={{ color: "text.secondary" }}
              >
                {e.status}
              </Typography>
            )}
          </>
        ) : (
          <StatusChip tone={statusToneOf(e.status)} label={e.status} />
        ),
    },
    ...(g.result
      ? ([
          {
            key: "unit",
            header: "Unit",
            help: "The unit of the result (for example %). PROPOSED field: only obs.csv has Units in the spec; lab.csv does not.",
            accessor: (e) => e.unit ?? "–",
            nowrap: true,
          },
          {
            key: "range",
            header: "Reference range",
            help: "The normal range for this test. PROPOSED field: no file in the spec sends it, so it may have to come from the customer separately.",
            accessor: (e) => e.refRange ?? "–",
            nowrap: true,
            hideBelow: "md",
          },
          {
            key: "flag",
            header: "Flag",
            help: "Normal, High, Low or Abnormal, when the result is outside the range. PROPOSED field: only obs.csv has Result Value Flag in the spec.",
            accessor: (e) => e.flag ?? "–",
            nowrap: true,
            filter: {
              type: "multiselect",
              options: opt(["Normal", "High", "Low", "Abnormal"]),
            },
            render: (e) =>
              e.flag ? (
                <StatusChip
                  tone={e.flag === "Normal" ? "success" : "warning"}
                  label={e.flag}
                />
              ) : (
                "–"
              ),
          },
          {
            key: "resulted",
            header: "Resulting date",
            help: "The day the result was released. The collection date is the first column. PROPOSED field: no file in the spec sends it.",
            accessor: (e) => e.resultedOn ?? null,
            render: (e) => (e.resultedOn ? fmtDate(e.resultedOn) : "–"),
            sortable: true,
            nowrap: true,
            hideBelow: "md",
            filter: { type: "dateRange" },
          },
        ] as Column<Evt>[])
      : []),
    {
      key: "file",
      header: "Source",
      help: "The file this record came in.",
      accessor: (e) => `${e.file}.csv`,
      nowrap: true,
      hideBelow: "lg",
      filter: { type: "multiselect", options: opt(files) },
    },
    {
      key: "prov",
      header: "Provider",
      help: providerHelp,
      accessor: (e) => providerOf(e),
      hideBelow: "lg",
    },
    {
      key: "system",
      header: "Source system",
      help: "Paid claim, or supplemental data from the EHR or a lab feed.",
      accessor: (e) => sourceSystemOf(e),
      nowrap: true,
      defaultHidden: !g.systemShown,
      hideBelow: "lg",
    },
    {
      key: "recv",
      header: "Last updated",
      help: "The day the file holding this record last arrived in Sonata (last refresh of that source). It is not the service date: claims often arrive weeks later.",
      accessor: (e) => arrivedOn(e) ?? null,
      render: (e) => (arrivedOn(e) ? fmtDate(arrivedOn(e)!) : "–"),
      sortable: true,
      nowrap: true,
      hideBelow: "lg",
      filter: { type: "dateRange" },
    },
    {
      key: "identified",
      header: "Date identified",
      help: "The day Sonata first saw this record. Kept apart from Last updated, because a record that is sent again can be overwritten. PROPOSED field: the spec does not have it, and the first value is lost today when a record is overwritten.",
      accessor: (e) => e.identifiedOn ?? null,
      render: (e) => (e.identifiedOn ? fmtDate(e.identifiedOn) : "–"),
      sortable: true,
      nowrap: true,
      hideBelow: "lg",
      filter: { type: "dateRange" },
    },
    {
      key: "data",
      header: "Data type",
      help: "Administrative data comes from claims and enrollment. Supplemental data comes from clinical sources such as the EHR, and is kept apart for audit.",
      accessor: (e) => (e.supplemental ? "Supplemental" : "Administrative"),
      defaultHidden: true,
      filter: {
        type: "select",
        options: opt(["Supplemental", "Administrative"]),
      },
    },
    {
      key: "measure",
      header: "Measure or care gap",
      help: "The measures that read this kind of record and what the record did to each one. Rows with a care gap are tinted. The link opens the care gap.",
      accessor: (e) =>
        impactsOf(m, e, year)
          .map((i) => i.def.short)
          .join(", ") || null,
      filter: {
        type: "select",
        options: [
          { value: "gap", label: "Tied to a care gap" },
          { value: "none", label: "Not tied to a care gap" },
        ],
      },
      filterAccessor: (e) => (hasGap(e) ? "gap" : "none"),
      render: (e) => {
        const imp = impactsOf(m, e, year);
        if (imp.length === 0) return "–";
        return (
          <Stack spacing={0.5}>
            {imp.map((i) => (
              <div key={i.code}>
                <TableLink
                  to={
                    get(m, i.code)
                      ? `/members/${m.id}/gaps/${i.code}`
                      : `/members/${m.id}?tab=measures${year === MY ? "" : `&year=${year}`}`
                  }
                >
                  {i.def.code}
                  {get(m, i.code) ? " (care gap)" : ""}
                </TableLink>
                <Typography
                  variant="caption"
                  component="div"
                  sx={{ color: "text.secondary" }}
                >
                  {outcomeText[i.outcome]}
                </Typography>
              </div>
            ))}
          </Stack>
        );
      },
    },
  ];
  return (
    <>
      <DataTable
        ariaLabel={g.title}
        title={g.title}
        columns={columns}
        rows={rows}
        getRowId={recordKey}
        defaultSort={{ key: "date", direction: "desc" }}
        pageSize={10}
        searchPlaceholder="Search codes and descriptions…"
        storageKey={`demo-clinical-${group}-v2`}
        highlightRow={hasGap}
        onRowClick={(e) => setOpen(e)}
        rowActions={(e) => (
          <Button
            variant="tertiary"
            size="small"
            sx={{ whiteSpace: "nowrap" }}
            onClick={() => setOpen(e)}
            aria-label={`Inspect ${e.text}`}
          >
            Inspect
          </Button>
        )}
        emptyState={<EmptyState title="No records" description={g.empty} />}
      />
      <SourceRecordModal
        m={m}
        e={open}
        year={year}
        onClose={() => setOpen(null)}
      />
    </>
  );
}
