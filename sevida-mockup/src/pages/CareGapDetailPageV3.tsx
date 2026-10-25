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
import { renderCrumbLink } from "../components/RouterLinkAdapter";
import { DataFreshness, MemberHeader } from "./MemberDetailPage";
import {
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

function Overview({ g }: { g: GapView }) {
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
          {sub("Who is Considered")}
          {V3_WHO[code] ? (
            <Typography>
              <b>{gapShort(code)}:</b> {V3_WHO[code]}
            </Typography>
          ) : (
            missing
          )}
        </Stack>
        <Stack spacing={0.5}>
          {sub("What is Left to Close the Gap")}
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
            ? "Closed"
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
      header: "Record Type",
      accessor: (r) => r.type,
      sortable: true,
      width: 130,
    },
    {
      key: "detail",
      header: "Detail",
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
    },
    {
      key: "src",
      header: "Source",
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
        searchPlaceholder="Search by Record Type or Detail…"
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
  const [search, setSearch] = useSearchParams();
  const tab = search.get("tab") === "evidence" ? "evidence" : "overview";
  const g = m && def ? get(m, def.code as MeasureCode) : null;
  const label = def ? V3_GAP_LABEL[def.code as MeasureCode] : "Not found";

  const crumbs = [
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
  return (
    <PageContainer
      breadcrumbsEnd={<DataFreshness />}
      title={`${m.name}: ${label}`}
      breadcrumbs={crumbs}
      renderLink={renderCrumbLink}
    >
      <Stack spacing={2}>
        <MemberHeader m={m} year={MY} />
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
            <Field label="Measure">{label}</Field>
            <Field label="For">{m.name}</Field>
            <Field label="Identified Date">{fmtDate(g.identified)}</Field>
            <Field label="Missing Evidence">{missingText}</Field>
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
          ]}
        />
      </Stack>
    </PageContainer>
  );
}
