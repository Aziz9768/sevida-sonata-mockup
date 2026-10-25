import { useMemo } from "react";
import { StatusChip, DataTable } from "sevida-ui";
import type { Column, StatusTone } from "sevida-ui";
import {
  MY,
  fmtDate,
  memberForYear,
  providerName,
  providers,
  v3Filler,
  v3TabOf,
} from "../data";
import type { Evt, Member, V3Tab } from "../data";

export type V3RecordTab = V3Tab | "providers";

const TITLES: Record<V3RecordTab, string> = {
  claims: "Claims",
  diagnoses: "Diagnoses",
  labs: "Labs",
  observations: "Observations",
  procedures: "Procedures",
  providers: "Providers",
  visits: "Visits",
};

const DONE = ["paid", "final", "finished", "completed", "dispensed", "recorded"];
const tone = (s: string): StatusTone =>
  DONE.includes(s)
    ? "success"
    : s === "denied" || s === "cancelled" || s === "not-done"
      ? "danger"
      : "warning";
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Every record the files hold for the member, plus the routine demo records that fill each tab (see v3Filler). */
export const recordsOf = (m: Member): Evt[] => [
  ...memberForYear(m, MY).events,
  ...v3Filler(m),
];

const claimType = (e: Evt) =>
  e.kind === "Pharmacy"
    ? "Pharmacy"
    : e.system === "CDT"
      ? "Dental"
      : e.system === "ICD-10-PCS"
        ? "Institutional"
        : "Professional";
const diagSource = (e: Evt) => (e.kind === "Claim" ? "Claim" : "EHR");

/**
 * Version 3 Member page record tabs: Claims, Diagnoses, Labs, Observations, Procedures, Providers, Visits.
 * One simple table per tab. The sheet's long Claims field list is a later version.
 */
/** Search box text per tab: Title Case, naming what is searched (like "Search by Member Name or Tricare ID…"). */
const SEARCH: Record<Exclude<V3RecordTab, "providers">, string> = {
  claims: "Search by Service or Drug, or Code…",
  diagnoses: "Search by Diagnosis or ICD-10 Code…",
  labs: "Search by Test or LOINC Code…",
  observations: "Search by Observation or Code…",
  procedures: "Search by Procedure or Code…",
  visits: "Search by Visit or CPT Code…",
};

export function RecordTabV3({ m, tab }: { m: Member; tab: V3RecordTab }) {
  const all = useMemo(() => recordsOf(m), [m]);
  const rows = useMemo(
    () =>
      all
        .filter((e) => tab !== "providers" && v3TabOf(e) === tab)
        .sort((a, b) => b.date.getTime() - a.date.getTime()),
    [all, tab],
  );

  if (tab === "providers") return <ProvidersTable events={all} />;

  const date = (header: string): Column<Evt> => ({
    key: "date",
    header,
    accessor: (e) => e.date,
    render: (e) => fmtDate(e.date),
    sortable: true,
    nowrap: true,
    primary: true,
  });
  const what = (header: string): Column<Evt> => ({
    key: "text",
    header,
    accessor: (e) => e.text,
  });
  const code = (header: string): Column<Evt> => ({
    key: "code",
    header,
    accessor: (e) => `${e.code} (${e.system})`,
    nowrap: true,
  });
  const provider: Column<Evt> = {
    key: "prov",
    header: "Provider",
    accessor: (e) => (e.provider ? providerName(e.provider) : "–"),
  };
  const status = (header: string): Column<Evt> => ({
    key: "status",
    header,
    accessor: (e) => e.status,
    render: (e) => <StatusChip tone={tone(e.status)} label={cap(e.status)} />,
    nowrap: true,
  });
  const result: Column<Evt>[] = [
    {
      key: "value",
      header: "Result",
      accessor: (e) => e.value ?? null,
      render: (e) =>
        e.value === undefined
          ? "–"
          : e.tag === "hba1c"
            ? `${e.value}%`
            : String(e.value),
      sortable: true,
      nowrap: true,
    },
    {
      key: "unit",
      header: "Unit",
      accessor: (e) => (e.tag === "hba1c" ? "%" : (e.unit ?? "–")),
      nowrap: true,
    },
  ];

  const columns: Record<Exclude<V3RecordTab, "providers">, Column<Evt>[]> = {
    claims: [
      date("Service Date"),
      {
        key: "type",
        header: "Claim Type",
        accessor: (e) => claimType(e),
        nowrap: true,
      },
      what("Service or Drug"),
      code("Code"),
      provider,
      status("Claim Status"),
    ],
    diagnoses: [
      date("Diagnosis Date"),
      what("Diagnosis"),
      code("ICD-10 Code"),
      {
        key: "src",
        header: "Source",
        accessor: (e) => diagSource(e),
        nowrap: true,
      },
      provider,
      status("Status"),
    ],
    labs: [
      date("Collection Date"),
      what("Test"),
      code("LOINC Code"),
      ...result,
      {
        key: "range",
        header: "Reference Range",
        accessor: (e) => e.refRange ?? "–",
        nowrap: true,
      },
      {
        key: "flag",
        header: "Flag",
        accessor: (e) => e.flag ?? "–",
        render: (e) =>
          e.flag ? (
            <StatusChip
              tone={e.flag === "Normal" ? "success" : "warning"}
              label={e.flag}
            />
          ) : (
            "–"
          ),
        nowrap: true,
      },
      status("Status"),
    ],
    observations: [
      date("Observation Date"),
      what("Observation"),
      code("Code"),
      ...result,
      status("Status"),
    ],
    procedures: [
      date("Procedure Date"),
      what("Procedure"),
      code("Code"),
      provider,
      status("Status"),
    ],
    visits: [
      date("Visit Date"),
      what("Visit"),
      code("CPT Code"),
      provider,
      status("Status"),
    ],
  };

  return (
    <DataTable
      ariaLabel={TITLES[tab]}
      title={TITLES[tab]}
      columns={columns[tab]}
      rows={rows}
      getRowId={(e) => `${e.file}|${e.code}|${e.date.getTime()}|${e.text}`}
      defaultSort={{ key: "date", direction: "desc" }}
      pageSize={10}
      searchPlaceholder={SEARCH[tab]}
    />
  );
}

interface ProviderRow {
  npi: string;
  name: string;
  type: string;
  org: string;
  records: number;
  last: Date;
}
function ProvidersTable({ events }: { events: Evt[] }) {
  const rows = useMemo(() => {
    const by = new Map<string, ProviderRow>();
    for (const e of events) {
      if (!e.provider) continue;
      const p = providers.find((x) => x.npi === e.provider);
      const cur = by.get(e.provider);
      if (cur) {
        cur.records++;
        if (e.date > cur.last) cur.last = e.date;
      } else
        by.set(e.provider, {
          npi: e.provider,
          name: p?.name ?? `NPI ${e.provider}`,
          type: p?.type ?? "–",
          org: p?.org ?? "–",
          records: 1,
          last: e.date,
        });
    }
    return [...by.values()].sort((a, b) => b.last.getTime() - a.last.getTime());
  }, [events]);
  const columns: Column<ProviderRow>[] = [
    {
      key: "name",
      header: "Provider",
      accessor: (r) => r.name,
      sortable: true,
      primary: true,
    },
    { key: "npi", header: "NPI", accessor: (r) => r.npi, nowrap: true },
    { key: "type", header: "Specialty", accessor: (r) => r.type },
    { key: "org", header: "Organization", accessor: (r) => r.org },
    {
      key: "n",
      header: "Records",
      accessor: (r) => r.records,
      sortable: true,
      nowrap: true,
    },
    {
      key: "last",
      header: "Last Seen",
      accessor: (r) => r.last,
      render: (r) => fmtDate(r.last),
      sortable: true,
      nowrap: true,
    },
  ];
  return (
    <DataTable
      ariaLabel="Providers"
      title="Providers"
      columns={columns}
      rows={rows}
      getRowId={(r) => r.npi}
      defaultSort={{ key: "last", direction: "desc" }}
      pageSize={10}
      searchPlaceholder="Search by Provider or NPI…"
    />
  );
}

