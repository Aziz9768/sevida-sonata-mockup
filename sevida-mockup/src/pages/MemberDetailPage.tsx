import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useRole } from "../roles";
import {
  Box,
  Collapse,
  Divider,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import {
  Button,
  Card,
  DataTable,
  DetailGrid,
  EmptyState,
  IconButton,
  InfoBanner,
  Modal,
  PageContainer,
  RowMenu,
  StatusChip,
  Tabs,
  exportAs,
} from "sevida-ui";
import { tips } from "../copy";
import type { Column } from "sevida-ui";
import { CareGapsTab } from "../components/CareGapsTab";
import {
  ClinicalTab,
  allRecords,
  groupOfRecord,
  recordGroups,
} from "../components/ClinicalTab";
import type { RecordGroup } from "../components/ClinicalTab";
import { renderCrumbLink } from "../components/RouterLinkAdapter";
import { Field } from "../components/Field";
import { TableLink } from "../components/TableLink";
import { TraceView } from "../components/TraceView";
import type { GapView } from "../careGaps";
import {
  evidenceTone,
  gapStatusTone,
  gapStatuses,
  statusHelp,
  measureVersionFor,
  recordKey,
  summaryOf,
  useGaps,
} from "../careGaps";
import {
  MY,
  NEWEST_FILE,
  ageAtYearEnd,
  continuouslyEnrolled,
  countyOf,
  currentPayer,
  ethnicityNames,
  fmtDate,
  fmtEnd,
  DEMO_NOW,
  dataFiles,
  stateName,
  enrollmentStatusOf,
  languageNames,
  measures,
  memberById,
  memberForYear,
  militaryOf,
  payerNames,
  productLineOf,
  productLineOfMember,
  primaryCareOf,
  raceNames,
  resultsFor,
  rulesOfYear,
  stateLabel,
  stateTone,
  yearFromParam,
} from "../data";
import type {
  FileId,
  MeasureCode,
  MeasureDef,
  MeasureResult,
  Member,
  MedicareStatus,
  Segment,
} from "../data";

const lang = (code?: string, src?: string) =>
  code ? `${languageNames[code] ?? code}${src ? ` · ${src}` : ""}` : "Not sent";

/* ------------------------------------------------------------------ measures tab */

/** One plain sentence on why the result is what it is. Says clearly when it is NOT a care gap. */
function whySentence(r: MeasureResult): string {
  switch (r.state) {
    case "Met":
      return `Met: ${r.reason}. This record satisfies the measure.`;
    case "Gap":
      return `Not met: ${r.reason}. The member is in the measure and the files were complete enough to decide, so this is a genuine care gap.`;
    case "Excluded":
      return `Excluded: ${r.reason}. The member is taken out of the rate.`;
    case "Review":
      return `Needs review: ${r.reason}`;
    default:
      return r.reason;
  }
}

interface MeasureRow {
  def: MeasureDef;
  r: MeasureResult;
  gap: GapView | null;
}

const stateOptions = Object.entries(stateLabel)
  .filter(([k]) => k !== "Not eligible")
  .map(([, v]) => ({ value: v, label: v }));

/** One row per measure with the result, the reason and the care gap. The step-by-step check opens from the row. */
function MeasuresTab({ m, year }: { m: Member; year: number }) {
  const navigate = useNavigate();
  const { get: getGap } = useGaps();
  // Care-gap work exists for the current year only.
  const get = (mm: Member, code: MeasureCode) =>
    year === MY ? getGap(mm, code) : null;
  const results = resultsFor(m, year);
  const rows: MeasureRow[] = measures
    .filter((def) => results[def.code].state !== "Not eligible")
    .map((def) => ({
      def,
      r: results[def.code],
      gap: get(m, def.code),
    }));
  const [openCode, setOpenCode] = useState<string | null>(null);
  const open = rows.find((x) => x.def.code === openCode);
  const detailPath = (x: MeasureRow) =>
    x.gap
      ? `/members/${m.id}/gaps/${x.def.code}`
      : `/members/${m.id}/measures/${x.def.code}${year === MY ? "" : `?year=${year}`}`;

  const columns: Column<MeasureRow>[] = [
    {
      key: "name",
      header: "Measure",
      accessor: (x) => x.def.name,
      sortable: true,
      primary: true,
      width: 280,
      help: "Opens the detail page for this member: the care gap when there is one, otherwise the measure result.",
      render: (x) => <TableLink to={detailPath(x)}>{x.def.name}</TableLink>,
    },
    {
      key: "code",
      header: "Code",
      accessor: (x) => x.def.code,
      sortable: true,
      nowrap: true,
    },
    {
      key: "result",
      header: "Final result",
      help: "Each measure checks this member in the same order. It stops at the first check that decides the result. The result is Met, Not met, Excluded or Needs review. Measures the member is not in are not listed.",
      accessor: (x) => stateLabel[x.r.state],
      sortable: true,
      nowrap: true,
      filter: { type: "multiselect", options: stateOptions },
      render: (x) => (
        <StatusChip tone={stateTone[x.r.state]} label={stateLabel[x.r.state]} />
      ),
    },
    {
      key: "why",
      header: "Why",
      help: "The reason behind the final result, taken from the check that decided it.",
      accessor: (x) => x.r.reason,
      width: 320,
    },
    {
      key: "eligibility",
      header: "Eligibility",
      accessor: (x) => x.r.steps[0]?.detail,
      defaultHidden: true,
      width: 260,
    },
    {
      key: "gap",
      header: "Care gap",
      help: statusHelp.gap,
      accessor: (x) => x.gap?.status,
      sortable: true,
      nowrap: true,
      filter: {
        type: "multiselect",
        options: gapStatuses.map((v) => ({ value: v, label: v })),
      },
      render: (x) =>
        x.gap ? (
          <StatusChip tone={gapStatusTone[x.gap.status]} label={x.gap.status} />
        ) : (
          "–"
        ),
    },
    {
      key: "evidence",
      header: "Evidence",
      help: statusHelp.evidence,
      accessor: (x) => x.gap?.evidenceStatus,
      sortable: true,
      nowrap: true,
      render: (x) =>
        x.gap ? (
          <StatusChip
            tone={evidenceTone[x.gap.evidenceStatus]}
            label={x.gap.evidenceStatus}
          />
        ) : (
          "–"
        ),
    },
    {
      key: "evaluation",
      header: "Evaluation",
      help: "The checks made for this member, in order, and which file each answer came from.",
      nowrap: true,
      render: (x) => (
        <Button
          variant="tertiary"
          size="small"
          sx={{ px: 0, whiteSpace: "nowrap" }}
          aria-label={`How it was decided: ${x.def.name}`}
          onClick={(e) => {
            e.stopPropagation();
            setOpenCode(x.def.code);
          }}
        >
          How it was decided
        </Button>
      ),
    },
  ];

  return (
    <>
      <DataTable
        ariaLabel="Measures"
        title="Measures"
        columns={columns}
        rows={rows}
        getRowId={(x) => x.def.code}
        paginated={false}
        toolbar={{ search: false }}
        emptyState={
          <EmptyState
            title="Not in any measure"
            description="Age, sex or enrollment keep this member out of all five measures, so there is nothing to show here."
          />
        }
        onRowClick={(x) => navigate(detailPath(x))}
        rowActions={(x) => (
          <RowMenu
            rowLabel={x.def.name}
            items={[
              {
                label: x.gap ? "Open care gap" : "Open measure result",
                onClick: () => navigate(detailPath(x)),
              },
              {
                label: "View evaluation details",
                onClick: () => setOpenCode(x.def.code),
              },
            ]}
          />
        )}
      />
      <Modal
        open={!!open}
        onClose={() => setOpenCode(null)}
        title={open ? `How the ${open.def.name} result was decided` : ""}
        size="lg"
        actions={
          <>
            {open && (
              <Button
                variant="secondary"
                onClick={() => navigate(detailPath(open))}
              >
                {open.gap ? "Open care gap" : "Open measure result"}
              </Button>
            )}
            <Button onClick={() => setOpenCode(null)}>Close</Button>
          </>
        }
      >
        {open && (
          <Stack spacing={1.5}>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {open.def.code} · Measurement year {year} · Measure version:{" "}
              {measureVersionFor(year)} · Last evaluated: {fmtDate(NEWEST_FILE)}
            </Typography>
            <Typography>{whySentence(open.r)}</Typography>
            {open.r.state === "Review" && (
              <InfoBanner tone="warning">
                Not a care gap. Check whether the data is complete (see the step
                marked Needs review). If the care really was missed, this
                becomes a gap when the next run reads complete data.
              </InfoBanner>
            )}
            <TraceView
              result={open.r}
              label={`How ${open.def.name} was decided for ${m.name}`}
            />
          </Stack>
        )}
      </Modal>
    </>
  );
}

/* ------------------------------------------------------------------ profile tab */

/** When the file behind a tab was last received. These tabs come from one file each, so one date covers every row. */
function LastUpdatedNote({ files }: { files: FileId[] }) {
  return (
    <Typography variant="body2" sx={{ color: "text.secondary" }}>
      Last updated:{" "}
      {files
        .map((id) => {
          const got = dataFiles.find((f) => f.id === id)?.receivedOn;
          return `${got ? fmtDate(got) : "not received yet"} (${id}.csv)`;
        })
        .join(", ")}
    </Typography>
  );
}

/** The data types and the files behind them, for the "Data last updated" line. */
const freshness: Array<[string, FileId[]]> = [
  ["Claims", ["claim", "claim-line"]],
  ["Diagnoses", ["diag"]],
  ["Immunizations", ["pharm-c"]],
  ["Labs", ["lab", "obs"]],
  ["Medications", ["pharmacy-claim-line", "pharm"]],
  ["Visits and procedures", ["visit-e", "proc"]],
  ["Enrollment", ["member-en"]],
];
const lastReceived = (files: FileId[]) =>
  files
    .map((id) => dataFiles.find((f) => f.id === id)?.receivedOn)
    .filter((x): x is Date => !!x)
    .sort((a, b) => b.getTime() - a.getTime())[0];

/** The newest date any kind of data arrived. */
const newestReceived = () =>
  lastReceived(freshness.flatMap(([, files]) => files));

/** One short line in the member header (checklist row 54). The date for each kind of data is in the opened details. */
function DataFreshness() {
  const newest = newestReceived();
  return (
    <Typography variant="body2" sx={{ color: "text.secondary" }}>
      <strong>Data last updated:</strong>{" "}
      {newest ? fmtDate(newest) : "not received"}
    </Typography>
  );
}

/** The date each kind of data last arrived, shown when the member details are opened. */
function DataFreshnessDetails() {
  return (
    <Stack spacing={1}>
      <Typography sx={{ fontSize: ".875rem", fontWeight: 600 }}>
        Data last updated, by type
      </Typography>
      <DetailGrid
        columns={4}
        items={freshness.map(([label, files]) => {
          const got = lastReceived(files);
          return { label, value: got ? fmtDate(got) : "Not received" };
        })}
      />
    </Stack>
  );
}

/**
 * A plain one-page summary for paper. It is hidden on screen and is the only thing the browser prints,
 * so "Print summary" gives the member, the measures and the open care gaps without the menus and tables.
 */
function PrintSummary({ m, year }: { m: Member; year: number }) {
  const { gapsOf } = useGaps();
  const results = resultsFor(m, year);
  const enroll = enrollmentStatusOf(m, DEMO_NOW);
  const gaps = year === MY ? gapsOf(m) : [];
  const th = {
    textAlign: "left",
    borderBottom: "1px solid #999",
    padding: "4px 8px",
  } as const;
  const td = {
    borderBottom: "1px solid #ddd",
    padding: "4px 8px",
    verticalAlign: "top",
  } as const;
  return (
    <>
      <style>{`
        .print-summary { display: none; }
        @media print {
          body * { visibility: hidden; }
          .print-summary, .print-summary * { visibility: visible; }
          .print-summary { display: block; position: absolute; left: 0; top: 0; width: 100%; color: #000; font-size: 12px; }
        }
      `}</style>
      <div className="print-summary">
        <h1 style={{ margin: 0, fontSize: 20 }}>{m.name}</h1>
        <p style={{ margin: "4px 0" }}>
          Member ID {m.id} · DOB {fmtDate(m.dob)} · Age{" "}
          {ageAtYearEnd(m.dob, year)} ·{" "}
          {m.gender === "female" ? "Female" : "Male"} · {enroll.label}{" "}
          {enroll.detail}
        </p>
        <p style={{ margin: "4px 0" }}>
          Measurement year {year} · Printed {fmtDate(DEMO_NOW)}
        </p>
        <h2 style={{ fontSize: 14, margin: "12px 0 4px" }}>Measures</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Measure</th>
              <th style={th}>Result</th>
              <th style={th}>Why</th>
            </tr>
          </thead>
          <tbody>
            {measures
              .filter((x) => results[x.code].state !== "Not eligible")
              .map((x) => (
                <tr key={x.code}>
                  <td style={td}>{x.name}</td>
                  <td style={td}>{stateLabel[results[x.code].state]}</td>
                  <td style={td}>{results[x.code].reason}</td>
                </tr>
              ))}
          </tbody>
        </table>
        {gaps.length > 0 && (
          <>
            <h2 style={{ fontSize: 14, margin: "12px 0 4px" }}>Care gaps</h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Measure</th>
                  <th style={th}>Status</th>
                  <th style={th}>Identified</th>
                  <th style={th}>Evidence</th>
                </tr>
              </thead>
              <tbody>
                {gaps.map((g) => (
                  <tr key={g.id}>
                    <td style={td}>{g.def.name}</td>
                    <td style={td}>{g.status}</td>
                    <td style={td}>{fmtDate(g.identified)}</td>
                    <td style={td}>{g.evidenceStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        <p style={{ margin: "12px 0 0", fontSize: 11 }}>
          Data last updated:{" "}
          {freshness
            .map(([label, files]) => {
              const got = lastReceived(files);
              return `${label} ${got ? fmtDate(got) : "not received"}`;
            })
            .join(" · ")}
        </p>
      </div>
    </>
  );
}

function ProfileTab({ m }: { m: Member }) {
  const pcp = primaryCareOf(m);
  return (
    <Stack spacing={2}>
      <LastUpdatedNote files={["member-gm", "member-RES"]} />
      <Card
        title="Contact information"
        hint="member-gm.csv"
        tooltip="Shown to people who are allowed to see patient records. Which records a person may open is a separate design (SON-P02) and is not shown here."
      >
        <DetailGrid
          columns={2}
          items={[
            {
              label: "Phone",
              value: m.phone.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3"),
            },
            { label: "Parent / caretaker", value: m.caretaker ?? null },
            {
              label: "Address",
              value: `${m.street}, ${m.city}, ${stateName(m.state)} ${m.zip}`,
              full: true,
            },
            {
              label: "County (proposed field)",
              value: countyOf(m),
            },
            {
              label: "Military status (proposed field)",
              value: militaryOf(m),
            },
          ]}
        />
      </Card>
      <Card
        title="Primary care provider"
        hint="worked out from visits"
        tooltip="The spec has no field that says who a member's primary care provider is. This is the provider marked as primary care with the most records for this member."
      >
        {pcp ? (
          <DetailGrid
            columns={2}
            items={[
              { label: "Provider", value: pcp.p.name },
              { label: "Type", value: pcp.p.type },
              { label: "Organization", value: pcp.p.org ?? null },
              { label: "NPI", value: pcp.p.npi },
              {
                label: "How we know",
                value: `${pcp.n} record${pcp.n === 1 ? "" : "s"} with this provider (provider.csv)`,
                full: true,
              },
            ]}
          />
        ) : (
          <Typography sx={{ color: "text.secondary" }}>
            No primary care provider could be worked out: no records for this
            member name one.
          </Typography>
        )}
      </Card>
      <Card
        title="Language and communication"
        hint="member-gm.csv"
        tooltip="Spoken language is also in the header above. This shows where it came from, and the other language fields."
      >
        <DetailGrid
          columns={2}
          items={[
            {
              label: "Where spoken language came from",
              value: m.spoken
                ? (m.spokenSource ?? "Not stated")
                : "Spoken language not sent",
            },
            {
              label: "Written language",
              value: lang(m.written, m.writtenSource),
            },
            {
              label: "Other language need",
              value: lang(m.other, m.otherSource),
            },
          ]}
        />
      </Card>
      <Card title="Disability" hint="member-gm.csv">
        <DetailGrid
          columns={2}
          items={[
            {
              label: "Disability status",
              value: m.disability
                ? `${m.disability}${m.disabilitySource ? ` · ${m.disabilitySource}` : ""}`
                : "Not sent",
            },
          ]}
        />
      </Card>
      <Card
        title="Race and ethnicity detail"
        hint="member-RES.csv"
        tooltip="Race and ethnicity are also in the header above. This shows the codes and how they were collected."
      >
        <DetailGrid
          columns={2}
          items={[
            {
              label: "Race codes",
              value: m.raceCodes
                .map((c) => `${raceNames[c] ?? c} (${c})`)
                .join(", "),
            },
            {
              label: "Ethnicity code",
              value: `${ethnicityNames[m.ethnicityCode] ?? m.ethnicityCode} (${m.ethnicityCode})`,
            },
            { label: "How it was collected", value: m.raceSource },
          ]}
        />
      </Card>
      {m.dod && (
        <Card title="Other" hint="member-gm.csv">
          <DetailGrid
            columns={2}
            items={[{ label: "Date of death", value: fmtDate(m.dod) }]}
          />
        </Card>
      )}
    </Stack>
  );
}

/* ------------------------------------------------------------------ enrollment tab */

function EnrollmentTab({ m: base, year }: { m: Member; year: number }) {
  const m = memberForYear(base, year);
  const Y_END = new Date(year, 11, 31);
  const yn = (b: boolean) => (b ? "Yes" : "No");
  const segColumns: Column<Segment>[] = [
    {
      key: "start",
      header: "Start",
      accessor: (s) => s.start,
      nowrap: true,
      primary: true,
      render: (s) => fmtDate(s.start),
    },
    {
      key: "end",
      header: "End",
      accessor: (s) => s.end,
      nowrap: true,
      render: (s) => fmtEnd(s.end),
    },
    {
      key: "payer",
      header: "Plan",
      accessor: (s) => `${s.payer} · ${payerNames[s.payer] ?? ""}`,
    },
    {
      key: "pl",
      header: "Product line",
      accessor: (s) => productLineOf(s.payer),
      hideBelow: "md",
    },
    {
      key: "med",
      header: "Medical benefit",
      accessor: (s) => yn(s.medical),
      hideBelow: "md",
    },
    {
      key: "drug",
      header: "Drug benefit",
      accessor: (s) => yn(s.drug),
      hideBelow: "md",
    },
  ];
  const medColumns: Column<MedicareStatus>[] = [
    {
      key: "start",
      header: "Start",
      accessor: (s) => s.start,
      nowrap: true,
      primary: true,
      render: (s) => fmtDate(s.start),
    },
    {
      key: "end",
      header: "End",
      accessor: (s) => s.end,
      nowrap: true,
      render: (s) => fmtDate(s.end),
    },
    {
      key: "hospice",
      header: "Hospice",
      help: "Members in hospice care are excluded from every measure.",
      accessor: (s) => yn(s.hospice),
      render: (s) => (
        <StatusChip
          tone={s.hospice ? "warning" : "neutral"}
          label={yn(s.hospice)}
        />
      ),
    },
    {
      key: "lti",
      header: "Long-term institutional",
      help: "Lives in a nursing home or similar long-term care setting.",
      accessor: (s) => yn(s.lti),
      hideBelow: "md",
    },
    {
      key: "orec",
      header: "OREC",
      help: "Original reason for entitlement: why the member first qualified for Medicare (age, disability or kidney disease).",
      accessor: (s) => s.orec,
      hideBelow: "md",
    },
    {
      key: "lis",
      header: "Low-income subsidy",
      help: tips.ses,
      accessor: (s) => yn(s.lis),
      hideBelow: "md",
    },
  ];
  const sorted = [...m.segments].sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );
  const now =
    m.segments.find((s) => s.end >= Y_END) ?? sorted[sorted.length - 1];
  const ce = continuouslyEnrolled(m, year);
  const r = resultsFor(base, year);
  const notEnrolled = measures.filter((x) =>
    r[x.code].reason.startsWith("Not enrolled"),
  );
  const hospice = m.medicare.some((x) => x.hospice && x.start <= Y_END);
  const active = now.end >= Y_END;
  return (
    <Stack spacing={2}>
      <LastUpdatedNote files={["member-en"]} />
      <Card title="Health plan and product" hint="member-en.csv">
        <DetailGrid
          columns={3}
          items={[
            {
              label: "Health plan",
              value: `${payerNames[now.payer] ?? now.payer} (${now.payer})`,
            },
            {
              label: "Line of business (LOB)",
              value: productLineOf(now.payer),
            },
            {
              label: "Coverage status",
              value: (
                <StatusChip
                  tone={active ? "success" : "neutral"}
                  label={active ? "Active" : "Ended"}
                />
              ),
            },
            { label: "Coverage start", value: fmtDate(sorted[0].start) },
            { label: "Coverage end", value: fmtEnd(now.end) },
            { label: "Enrollment periods", value: String(sorted.length) },
          ]}
        />
      </Card>
      <Card
        title={`Continuous enrollment and eligibility for ${year}`}
        hint="what the measures check"
        tooltip="Every measure first checks that the member was enrolled with a medical benefit all year (one gap of up to 45 days is allowed) and on December 31, and that the member did not die or enter hospice. Members who fail are not in the rates."
      >
        <Stack spacing={2}>
          <DetailGrid
            columns={3}
            items={[
              {
                label: "Continuous enrollment",
                value: (
                  <StatusChip
                    tone={ce.ok ? "success" : "warning"}
                    label={ce.ok ? "Met" : "Not met"}
                  />
                ),
              },
              {
                label: "Days not enrolled",
                value: `${ce.gapDays} (up to 45 allowed, in one gap)`,
              },
              {
                label: "Enrolled on December 31",
                value: yn(active && now.medical),
              },
              {
                label: "Medical benefit on Dec 31",
                value: yn(now.medical && active),
              },
              {
                label: "Drug benefit on Dec 31",
                value: yn(now.drug && active),
              },
              { label: "Hospice during the year", value: yn(hospice) },
              {
                label: "Died during the year",
                value:
                  m.dod && m.dod.getFullYear() === year
                    ? `Yes, ${fmtDate(m.dod)}`
                    : "No",
              },
            ]}
          />
          {notEnrolled.length > 0 ? (
            <InfoBanner tone="warning">
              Enrollment keeps this member out of:{" "}
              {notEnrolled.map((x) => x.name).join(", ")}.
            </InfoBanner>
          ) : (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Enrollment does not keep this member out of any measure.
            </Typography>
          )}
        </Stack>
      </Card>
      <DataTable
        ariaLabel="Enrollment periods"
        title="Enrollment periods (member-en.csv)"
        columns={segColumns}
        rows={[...m.segments].sort(
          (a, b) => b.start.getTime() - a.start.getTime(),
        )}
        defaultSort={{ key: "start", direction: "desc" }}
        getRowId={(s) => s.start.toISOString()}
        paginated={false}
        searchPlaceholder="Search enrollment…"
      />
      {m.medicare.length > 0 && (
        <DataTable
          ariaLabel="Medicare status"
          title="Medicare status (medicare-status.csv)"
          columns={medColumns}
          rows={m.medicare}
          getRowId={(s) => s.start.toISOString()}
          paginated={false}
          searchPlaceholder="Search Medicare status…"
        />
      )}
    </Stack>
  );
}

/* ------------------------------------------------------------------ page */

/** A small label with its value under it, for the compact member header. */
/**
 * Short header: name, date of birth, and the few facts and counts you need at a glance.
 * The arrow opens everything else about the member.
 */
function MemberHeader({ m, year }: { m: Member; year: number }) {
  const [open, setOpen] = useState(false);
  const { gapsOf } = useGaps();
  const results = resultsFor(m, year);
  const first = [...memberForYear(m, year).segments].sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  )[0];
  const sum = summaryOf(m, year === MY ? gapsOf(m) : [], year);
  const inAny = measures.some((x) => results[x.code].state !== "Not eligible");
  const detailsId = `member-details-${m.id}`;
  const [summaryEl, setSummaryEl] = useState<HTMLElement | null>(null);
  /** Enrollment status as of today, worked out from the enrollment periods. */
  const enroll = enrollmentStatusOf(m, DEMO_NOW);
  /** The same one-page summary as the printout, as a PDF or an Excel file (one tab per section). */
  const exportSummary = async (format: "pdf" | "xlsx") => {
    setSummaryEl(null);
    const gaps = year === MY ? gapsOf(m) : [];
    await exportAs(
      format,
      {
        title: `${m.name}: member summary`,
        lines: [
          `Member ID ${m.id} · Measurement year ${year} · Exported ${fmtDate(DEMO_NOW)}`,
        ],
        sheets: [
          {
            name: "Member",
            head: ["Field", "Value"],
            body: [
              ["Name", m.name],
              ["Member ID", m.id],
              ["Date of birth", fmtDate(m.dob)],
              ["Age", ageAtYearEnd(m.dob, year)],
              ["Sex", m.gender === "female" ? "Female" : "Male"],
              ["Enrollment status", `${enroll.label} ${enroll.detail}`],
              ["Plan", productLineOfMember(m)],
            ],
          },
          {
            name: "Measures",
            head: ["Measure", "Result", "Why"],
            body: measures
              .filter((x) => results[x.code].state !== "Not eligible")
              .map((x) => [
                x.name,
                stateLabel[results[x.code].state],
                results[x.code].reason,
              ]),
          },
          ...(gaps.length
            ? [
                {
                  name: "Care gaps",
                  head: ["Measure", "Status", "Identified", "Evidence status"],
                  body: gaps.map((g) => [
                    g.def.name,
                    g.status,
                    fmtDate(g.identified),
                    g.evidenceStatus,
                  ]),
                },
              ]
            : []),
          {
            name: "Data last updated",
            head: ["Data", "Last updated"],
            body: freshness.map(([label, files]) => {
              const got = lastReceived(files);
              return [label, got ? fmtDate(got) : "not received"];
            }),
          },
        ],
      },
      `member-${m.id}-summary`,
    );
  };
  const notes = [
    sum.scored > 0
      ? `${sum.scored} counted in the rate`
      : "None counted in the rate",
    sum.excluded ? `${sum.excluded} excluded` : null,
    sum.closed > 0
      ? `${sum.closed} closed gap${sum.closed === 1 ? "" : "s"}, awaiting the next calculation`
      : null,
    sum.review
      ? `${sum.review} need${sum.review === 1 ? "s" : ""} review: data missing or incomplete`
      : null,
  ].filter(Boolean);

  return (
    <Card>
      <Stack spacing={1.5}>
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="baseline"
          sx={{ flexWrap: "wrap", rowGap: 0.5, minWidth: 0 }}
        >
          <Typography
            variant="h6"
            component="h1"
            sx={{ overflowWrap: "anywhere" }}
          >
            {m.name}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            DOB {fmtDate(m.dob)}
          </Typography>
          <StatusChip tone="primary" label={productLineOfMember(m)} />
          <StatusChip
            tone={enroll.label === "Enrolled" ? "success" : "neutral"}
            label={`${enroll.label} ${enroll.detail}`}
          />
          {m.dod && <StatusChip tone="neutral" label="Deceased" />}
          <Box sx={{ ml: "auto" }}>
            <Tooltip title="Print or export summary">
              <IconButton
                aria-label="Print or export summary"
                aria-haspopup="menu"
                onClick={(e) => setSummaryEl(e.currentTarget)}
                variant="boxed"
              >
                <FileDownloadOutlinedIcon />
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={summaryEl}
              open={!!summaryEl}
              onClose={() => setSummaryEl(null)}
            >
              <MenuItem
                onClick={() => {
                  setSummaryEl(null);
                  window.print();
                }}
              >
                Print
              </MenuItem>
              <MenuItem onClick={() => void exportSummary("pdf")}>
                PDF (.pdf)
              </MenuItem>
              <MenuItem onClick={() => void exportSummary("xlsx")}>
                Excel (.xlsx)
              </MenuItem>
            </Menu>
          </Box>
        </Stack>

        <Divider />

        <Stack direction="row" alignItems="flex-start" spacing={2}>
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              display: "grid",
              gap: 2,
              gridTemplateColumns: {
                xs: "repeat(2, minmax(0, 1fr))",
                md: "repeat(3, minmax(0, 1fr))",
                lg: "repeat(6, minmax(0, 1fr))",
              },
            }}
          >
            <Field label="Member ID">{m.id}</Field>
            <Field label="Age · sex">
              {ageAtYearEnd(m.dob, year)} ·{" "}
              {m.gender === "female" ? "Female" : "Male"}
            </Field>
            <Field label="Open care gaps">
              {year === MY ? (
                <TableLink to={`/members/${m.id}?tab=gaps`}>
                  {sum.open}
                </TableLink>
              ) : (
                "–"
              )}
            </Field>
            <Field label="Awaiting evidence">
              {year === MY ? (
                <TableLink to={`/members/${m.id}?tab=gaps`}>
                  {sum.pending}
                </TableLink>
              ) : (
                "–"
              )}
            </Field>
            <Field label="Measures met">
              {sum.scored === 0 ? "–" : `${sum.met} of ${sum.scored}`}
            </Field>
            <Field label="Needs review">{sum.review}</Field>
          </Box>
          <Box
            sx={{
              alignSelf: "stretch",
              display: "flex",
              alignItems: "center",
              pl: 2,
              borderLeft: 1,
              borderColor: "divider",
            }}
          >
            <IconButton
              aria-label={
                open ? "Hide member details" : "Show all member details"
              }
              aria-expanded={open}
              aria-controls={detailsId}
              onClick={() => setOpen((v) => !v)}
              variant="boxed"
            >
              <KeyboardArrowDownIcon
                sx={{
                  transition: "transform .2s",
                  transform: open ? "rotate(180deg)" : "none",
                }}
              />
            </IconButton>
          </Box>
        </Stack>

        <DataFreshness />
        <PrintSummary m={m} year={year} />

        <Collapse in={open} unmountOnExit id={detailsId}>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <Divider />
            <DataFreshnessDetails />
            <Divider />
            <DetailGrid
              columns={4}
              items={[
                { label: "Member since", value: fmtDate(first.start) },
                {
                  label: "Plan",
                  value: payerNames[currentPayer(m)] ?? currentPayer(m),
                },
                {
                  label: "Spoken language",
                  value: m.spoken
                    ? (languageNames[m.spoken] ?? m.spoken)
                    : "Not sent",
                },
                {
                  label: "Race / ethnicity",
                  value: `${m.raceCodes.map((c) => raceNames[c] ?? c).join(", ")} · ${ethnicityNames[m.ethnicityCode] ?? m.ethnicityCode}`,
                },
              ]}
            />
            {inAny ? (
              <Stack spacing={1}>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ flexWrap: "wrap", rowGap: 1 }}
                >
                  <Typography sx={{ fontSize: ".875rem", fontWeight: 600 }}>
                    Results for {year}:
                  </Typography>
                  {measures
                    .filter((x) => results[x.code].state !== "Not eligible")
                    .map((x) => (
                      <StatusChip
                        key={x.code}
                        tone={stateTone[results[x.code].state]}
                        label={`${x.short}: ${stateLabel[results[x.code].state]}`}
                      />
                    ))}
                </Stack>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {notes.join(" · ")}
                </Typography>
              </Stack>
            ) : (
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Not in any of the five measures for {year}
              </Typography>
            )}
          </Stack>
        </Collapse>
      </Stack>
    </Card>
  );
}

export function MemberDetailPage() {
  const { memberId } = useParams();
  const { role } = useRole();
  const navigate = useNavigate();
  const m = memberById(memberId);
  const [search, setSearch] = useSearchParams();
  const { gapsOf } = useGaps();

  if (!m) {
    return (
      <PageContainer
        breadcrumbs={[
          { label: "Home", href: "/members" },
          { label: "Members", href: "/members" },
          { label: "Not found" },
        ]}
        renderLink={renderCrumbLink}
      >
        <EmptyState
          title="Member not found"
          description="This member does not exist."
          action={
            <Button variant="secondary" onClick={() => navigate("/members")}>
              Back to Members
            </Button>
          }
        />
      </PageContainer>
    );
  }
  const year = yearFromParam(search.get("year"));
  const yearEvents = memberForYear(m, year).events;
  const recordCount = (g: RecordGroup) =>
    yearEvents.filter((e) => groupOfRecord(e) === g).length;
  // Older links say tab=clinical. Send them to the tab that holds the record they point to.
  const rawTab = search.get("tab") ?? "measures";
  const tab =
    rawTab === "clinical"
      ? (() => {
          const rec = search.get("record");
          const hit = yearEvents.find((e) => recordKey(e) === rec);
          return hit ? groupOfRecord(hit) : "claims";
        })()
      : rawTab;
  const yq: Record<string, string> = year === MY ? {} : { year: String(year) };
  const sum = summaryOf(m, year === MY ? gapsOf(m) : [], year);

  return (
    <PageContainer
      breadcrumbs={[
        { label: "Home", href: "/members" },
        { label: "Members", href: "/members" },
        { label: m.name },
      ]}
      renderLink={renderCrumbLink}
    >
      <Stack spacing={2}>
        {year !== MY && (
          <InfoBanner
            tone="info"
            title={`Measurement year ${year}: final results`}
            action={
              <Button
                variant="tertiary"
                size="small"
                onClick={() => setSearch({ tab }, { replace: true })}
              >
                Show {MY}
              </Button>
            }
          >
            {rulesOfYear(year).note}
          </InfoBanner>
        )}
        <MemberHeader m={m} year={year} />

        <Tabs
          ariaLabel="Member sections"
          value={tab}
          onChange={(k) => setSearch({ tab: k, ...yq }, { replace: true })}
          items={[
            { key: "profile", label: "Profile", content: <ProfileTab m={m} /> },
            {
              key: "measures",
              label: "Measures",
              content: <MeasuresTab m={m} year={year} />,
            },
            {
              key: "gaps",
              label: "Care gaps",
              count: year === MY ? sum.open : undefined,
              content: <CareGapsTab m={m} year={year} />,
            },
            {
              key: "enrollment",
              label: "Enrollment",
              content: <EnrollmentTab m={m} year={year} />,
            },
            {
              key: "all",
              label: allRecords.label,
              count: yearEvents.length,
              content: <ClinicalTab m={m} year={year} group="all" />,
            },
            ...(Object.keys(recordGroups) as RecordGroup[]).map((g) => ({
              key: g,
              label: recordGroups[g].label,
              count: recordCount(g),
              content: <ClinicalTab m={m} year={year} group={g} />,
            })),
          ].filter((t) => !role.hiddenTabs.includes(t.key))}
        />
      </Stack>
    </PageContainer>
  );
}
