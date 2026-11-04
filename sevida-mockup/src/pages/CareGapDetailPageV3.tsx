import { useVersion } from "../version";
import { useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Box, Stack, Typography } from "@mui/material";
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  PageContainer,
  Tabs,
} from "sevida-ui";
import type { Column } from "sevida-ui";
import { Field } from "../components/Field";
import { GapStatusChip } from "../components/GapStatusChip";
import { LlmText } from "../components/LlmText";
import { renderCrumbLink } from "../components/RouterLinkAdapter";
import { MemberHeader } from "./MemberDetailPage";
import {
  fmtDay,
  fmtWhen,
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
  measureByCode,
  memberById,
  providerName,
} from "../data";
import type { Evt, MeasureCode } from "../data";
import {
  MISSING_SHORT,
  RECOMMENDED_SENTENCE,
  V3_GAP_LABEL,
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

function Overview({ g }: { g: GapView }) {
  const v8 = useVersion().version.id >= 8;
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
      Not written in the requirements sheet yet.
    </Typography>
  );
  return (
    <Card title="Why the Gap Is Open">
      <Stack spacing={2.5}>
        <Typography>{sentence}</Typography>
        <Stack spacing={0.5}>
          {sub(v8 ? "Gap Considerations" : "Who is Considered")}
          {V3_WHO[code] ? (
            <Typography>
              <b>{gapShort(code)}:</b> {V3_WHO[code]}
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
          {V3_LEFT[code].length ? (
            V3_LEFT[code].map((t, i) => (
              <Typography key={i}>
                {i === 0 && <b>{gapShort(code)}: </b>}
                {t}
              </Typography>
            ))
          ) : (
            missing
          )}
        </Stack>
        <Field label="Due Date">
          {g.status === "Closed"
            ? v8
              ? "N/A"
              : "Closed"
            : v8
              ? fmtDate(DUE)
              : `${daysToDue()} Days (${fmtDate(DUE)})`}
        </Field>
      </Stack>
    </Card>
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
    {
      key: "type",
      // LPP-16228: "Source" is the kind of record (Claims, Labs ...). The file it came in on is the optional Feed column.
      header: v8 ? "Source" : "Record Type",
      help: v8 ? "The kind of record this evidence comes from: Claims, Labs, Diagnoses, Procedures, Observations or Visits." : undefined,
      accessor: (r) => r.type,
      sortable: true,
      width: 130,
    },
    {
      key: "detail",
      header: v8 ? "Details" : "Detail",
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
        searchPlaceholder={v8 ? "Search by Source or Details…" : "Search by Record Type or Detail…"}
        storageKey={v8 ? "demo-gap-evidence-ver8-a" : undefined}
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
}

/**
 * LPP-16229: one row for each state the care gap has been in, newest first: Gap Name, Identified Date, Due Date (open) or Closed
 * Date (closed), Last Updated and Recommended Actions. A closed gap has two rows: the closed one and the open one it came from.
 */
function History({ g }: { g: GapView }) {
  const code = g.def.code as MeasureCode;
  const rows = useMemo<HistRow[]>(() => {
    const open: HistRow = {
      key: "open",
      gap: V3_GAP_LABEL[code],
      identified: g.identified,
      due: DUE,
      closed: null,
      updated: g.identified,
      action: RECOMMENDED_SENTENCE(code, CURRENT_YEAR),
    };
    if (g.status === "Closed") {
      const on = g.work.closed ? parseDayLocal(g.work.closed.on) : g.lastUpdated;
      return [
        {
          key: "closed",
          gap: V3_GAP_LABEL[code],
          identified: g.identified,
          due: null,
          closed: on,
          updated: on,
          action: "N/A",
        },
        open,
      ];
    }
    return [{ ...open, updated: g.lastUpdated }];
  }, [g, code]);
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
      header: "Recommended Actions",
      accessor: (r) => r.action,
      render: (r) => (r.action === "N/A" ? "N/A" : <LlmText text={r.action} />),
      width: 300,
    },
  ];
  return (
    <DataTable
      ariaLabel="History"
      title="History"
      columns={cols}
      rows={rows}
      getRowId={(r) => r.key}
      paginated={false}
      defaultSort={{ key: "updated", direction: "desc" }}
      storageKey="demo-gap-history-ver8-a"
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
  const { get } = useGaps();
  const { version } = useVersion();
  const [search, setSearch] = useSearchParams();
  const v8 = version.id >= 8;
  const tab =
    search.get("tab") === "evidence"
      ? "evidence"
      : v8 && search.get("tab") === "history"
        ? "history"
        : "overview";
  const g = m && def ? get(m, def.code as MeasureCode) : null;
  const label = def ? V3_GAP_LABEL[def.code as MeasureCode] : "Not found";

  // Version 8 (LPP-16153): Care Gaps > BCS > Member Name. Earlier versions: Care Gaps > Member Name > Gap Name.
  const crumbs = v8
    ? [
        { label: "Care Gaps", href: "/care-gaps" },
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
  return (
    <PageContainer
      title={v8 ? undefined : `${m.name}: ${label}`}
      breadcrumbs={crumbs}
      renderLink={renderCrumbLink}
    >
      <Stack spacing={2}>
        {v8 && (
          // LPP-16153: "Care Gap Name: Member Name" and the Open / Closed label (same green and red everywhere).
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", flexWrap: "wrap" }}>
            <Typography variant="h4" component="h1" sx={{ overflowWrap: "anywhere" }}>
              {label}: {m.name}
            </Typography>
            <GapStatusChip closed={closed} />
          </Stack>
        )}
        <MemberHeader m={m} year={MY} nameTo={`/members/${m.id}`} />
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
            {!v8 && <Field label="For">{m.name}</Field>}
            <Field label="Identified Date">{fmtDate(g.identified)}</Field>
            {v8 &&
              (closed ? (
                <Field label="Closed Date">
                  {g.work.closed ? fmtDay(g.work.closed.on) : fmtDate(g.lastUpdated)}
                </Field>
              ) : (
                <Field label="Due Date">{fmtDate(DUE)}</Field>
              ))}
            <Field label={version.id >= 4 ? "Recommended Actions" : "Missing Evidence"}>
              {v8 ? (
                closed ? (
                  "N/A"
                ) : (
                  <LlmText text={RECOMMENDED_SENTENCE(def.code as MeasureCode, CURRENT_YEAR)} />
                )
              ) : (
                missingText
              )}
            </Field>
            <Field label="Last Updated">
              {fmtWhen(g.lastUpdated.toISOString())}
            </Field>
          </Box>
        </Card>
        <Tabs
          ariaLabel="Care gap sections"
          value={tab}
          onChange={(k) => setSearch({ tab: k }, { replace: true })}
          items={[
            { key: "overview", label: "Overview", content: <Overview g={g} /> },
            { key: "evidence", label: "Evidence", content: <Evidence g={g} /> },
            ...(v8
              ? [{ key: "history", label: "History", content: <History g={g} /> }]
              : []),
          ]}
        />
      </Stack>
    </PageContainer>
  );
}
