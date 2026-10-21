import {
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { Box, Divider, Stack, Typography } from "@mui/material";
import {
  Button,
  Card,
  DataTable,
  DetailGrid,
  EmptyState,
  InfoBanner,
  PageContainer,
  StatusChip,
  Tabs,
} from "sevida-ui";
import type { Column } from "sevida-ui";
import { Field } from "../components/Field";
import { renderCrumbLink } from "../components/RouterLinkAdapter";
import { RecordBox } from "../components/RecordBox";
import { groupOfRecord } from "../components/ClinicalTab";
import { TraceView } from "../components/TraceView";
import {
  evidenceKindsFor,
  measureVersionFor,
  recordKey,
  specCheck,
  statusHelp,
  supportingEvents,
} from "../careGaps";
import {
  MY,
  NEWEST_FILE,
  fmtDate,
  measureByCode,
  measureFor,
  memberById,
  memberForYear,
  rulesOfYear,
  yearFromParam,
  providerHelp,
  providerOf,
  sourceSystemOf,
  resultsFor,
  stateLabel,
  stateTone,
} from "../data";
import type { Evt, MeasureCode, MeasureResult } from "../data";

/** One plain sentence on why the result is what it is. */
function whyText(r: MeasureResult): string {
  switch (r.state) {
    case "Met":
      return `Met: ${r.reason}. This record satisfies the measure, so no care gap was opened.`;
    case "Excluded":
      return `Excluded: ${r.reason}. The member is taken out of the rate, so no care gap was opened.`;
    case "Review":
      return `Needs Review: ${r.reason}`;
    default:
      return r.reason;
  }
}

function Overview({
  memberId,
  memberName,
  code,
  year,
}: {
  memberId: string;
  memberName: string;
  code: MeasureCode;
  year: number;
}) {
  const m = memberById(memberId)!;
  const def = measureFor(measureByCode(code)!, year);
  const r = resultsFor(m, year)[code];
  const kinds = evidenceKindsFor(code, year);
  const past = year !== MY;
  return (
    <Stack spacing={2}>
      <Card title="Why this result">
        <Stack spacing={1.5}>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ flexWrap: "wrap", rowGap: 1 }}
          >
            <StatusChip
              tone={stateTone[r.state]}
              label={`Measure result: ${stateLabel[r.state]}`}
            />
            <StatusChip
              tone="neutral"
              label={r.state === "Gap" ? "Year ended" : "No care gap"}
              tip={
                r.state === "Gap"
                  ? `Not Met when ${year} ended. Care-gap work exists for ${MY} only, so this result is final.`
                  : "A care gap exists only when the result is Not Met. This result did not create one."
              }
            />
          </Stack>
          <Typography>
            {r.state === "Gap"
              ? `Not Met: ${r.reason}. This is the final result for ${year}.`
              : whyText(r)}
          </Typography>
          {r.state === "Review" && (
            <InfoBanner tone="warning">
              Not a care gap. Check whether the data is complete (see the step
              marked Needs review below). If the care really was missed, this
              becomes a gap when the next run reads complete data.
            </InfoBanner>
          )}
        </Stack>
      </Card>
      <Card title="Measure and criteria">
        <Stack spacing={2}>
          <DetailGrid
            columns={3}
            items={[
              {
                label: "Measurement period",
                value: `${fmtDate(new Date(year, 0, 1))} to ${fmtDate(new Date(year, 11, 31))} (measurement year ${year})`,
              },
              { label: "Measure version", value: measureVersionFor(year) },
              { label: "Who is counted", value: def.population },
              { label: "What meets the measure", value: def.needs, full: true },
              ...kinds.map((k) => ({
                label: `Accepted evidence: ${k.label}`,
                value: k.windowText,
              })),
            ]}
          />
          <InfoBanner tone="warning">
            {past ? (
              <>
                <strong>Partly confirmed for MY {year}.</strong>{" "}
                {rulesOfYear(year).note}
              </>
            ) : (
              <>
                <strong>
                  Not yet validated against the official MY {MY} measure
                  specification.
                </strong>{" "}
                These criteria come from the Sonata ingestion spec and
                simplified demo rules, so do not treat them as authoritative
                yet.
                <Stack component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5 }}>
                  {specCheck[code].points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </Stack>
              </>
            )}
          </InfoBanner>
        </Stack>
      </Card>
      <RecordBox m={m} code={code} year={year} />
      <Card title="How the result was decided">
        <TraceView
          result={r}
          label={`How ${def.name} was decided for ${memberName}`}
        />
      </Card>
    </Stack>
  );
}

function Records({
  memberId,
  code,
  year,
}: {
  memberId: string;
  code: MeasureCode;
  year: number;
}) {
  const navigate = useNavigate();
  const m = memberById(memberId)!;
  const deciding = resultsFor(m, year)[code].evidence;
  const rows = supportingEvents(memberForYear(m, year), code);
  const open = (e: Evt) =>
    navigate(
      `/members/${memberId}?tab=${groupOfRecord(e)}&record=${encodeURIComponent(recordKey(e))}${year === MY ? "" : `&year=${year}`}`,
    );
  const columns: Column<Evt>[] = [
    {
      key: "date",
      header: "Service date",
      accessor: (e) => e.date,
      render: (e) => fmtDate(e.date),
      sortable: true,
      nowrap: true,
    },
    {
      key: "kind",
      header: "Record type",
      accessor: (e) => e.kind,
      sortable: true,
      nowrap: true,
      filter: {
        type: "multiselect",
        options: [...new Set(rows.map((e) => e.kind))].map((v) => ({
          value: v,
          label: v,
        })),
      },
    },
    { key: "code", header: "Code", accessor: (e) => e.code, nowrap: true },
    { key: "text", header: "Description", accessor: (e) => e.text, width: 280 },
    {
      key: "provider",
      header: "Provider",
      help: providerHelp,
      accessor: (e) => providerOf(e),
    },
    {
      key: "system",
      header: "Source system",
      help: "Paid claim, or supplemental data from the EHR or a lab feed.",
      accessor: (e) => sourceSystemOf(e),
      nowrap: true,
      hideBelow: "lg",
    },
    {
      key: "file",
      header: "Source file",
      accessor: (e) => `${e.file}.csv`,
      nowrap: true,
      hideBelow: "lg",
    },
    {
      key: "used",
      header: "Used for the result",
      help: "The record the measure relied on to reach its result.",
      accessor: (e) => (e === deciding ? "Yes" : "No"),
      render: (e) =>
        e === deciding ? <StatusChip tone="success" label="Used" /> : "–",
      nowrap: true,
    },
  ];
  return (
    <DataTable
      ariaLabel="Supporting records"
      title="Supporting records"
      columns={columns}
      rows={rows}
      getRowId={(e) => recordKey(e)}
      paginated={rows.length > 10}
      highlightRow={(e) => e === deciding}
      defaultSort={{ key: "date", direction: "desc" }}
      onRowClick={open}
      emptyState={
        <EmptyState
          title="No supporting records"
          description="No records related to this measure were found in the files for this member."
        />
      }
    />
  );
}

export function MemberMeasurePage() {
  const { memberId, code } = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useSearchParams();
  const tab = search.get("tab") ?? "overview";
  const m = memberById(memberId);
  const year = yearFromParam(search.get("year"));
  const baseDef = measureByCode(code);
  const def = baseDef ? measureFor(baseDef, year) : undefined;
  const r = m && def ? resultsFor(m, year)[def.code as MeasureCode] : undefined;
  const yq: Record<string, string> = year === MY ? {} : { year: String(year) };

  const crumbs = [
    { label: "Home", href: "/members" },
    { label: "Members", href: "/members" },
    ...(m
      ? [
          {
            label: m.name,
            href: `/members/${m.id}${year === MY ? "" : `?year=${year}`}`,
          },
        ]
      : []),
    { label: def ? `Measure: ${def.short}` : "Not found" },
  ];

  if (m && def && r?.state === "Gap" && year === MY)
    return <Navigate to={`/members/${m.id}/gaps/${def.code}`} replace />;

  if (!m || !def || !r || r.state === "Not eligible") {
    return (
      <PageContainer breadcrumbs={crumbs} renderLink={renderCrumbLink}>
        <EmptyState
          title="No result here"
          description={
            m && def
              ? `${m.name} is not in ${def.name}, so there is no result to show.`
              : "This measure result does not exist."
          }
          action={
            <Button
              variant="secondary"
              onClick={() => navigate(m ? `/members/${m.id}` : "/members")}
            >
              Back
            </Button>
          }
        />
      </PageContainer>
    );
  }
  const sources = [
    ...new Set(
      r.steps
        .filter((s) => s.outcome !== "skipped")
        .flatMap((s) => s.source.split(", "))
        .filter(Boolean),
    ),
  ];
  const supporting = supportingEvents(
    memberForYear(m, year),
    def.code as MeasureCode,
  ).length;
  return (
    <PageContainer
      title={def.name}
      subtitle={`${def.code} · measure result for ${m.name} (${m.id})`}
      breadcrumbs={crumbs}
      renderLink={renderCrumbLink}
    >
      <Stack spacing={2}>
        <Card>
          <Stack spacing={2}>
            <Box
              role="group"
              aria-label="Statuses"
              sx={{
                display: "grid",
                gap: 3,
                gridAutoFlow: "column",
                gridAutoColumns: "max-content",
                justifyContent: "start",
              }}
            >
              <Field label="Measure result" help={statusHelp.result}>
                <StatusChip
                  tone={stateTone[r.state]}
                  label={stateLabel[r.state]}
                />
              </Field>
              <Field
                label="Care gap"
                help="A care gap exists only when the result is Not Met. This result did not create one."
              >
                <StatusChip
                  tone="neutral"
                  label={r.state === "Gap" ? "Year ended" : "No care gap"}
                />
              </Field>
            </Box>
            <Divider />
            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: {
                  xs: "repeat(2, minmax(0, 1fr))",
                  md: "repeat(3, minmax(0, 1fr))",
                  lg: "repeat(4, minmax(0, 1fr))",
                },
              }}
            >
              <Field label="Measurement year">
                {`${year} (${fmtDate(new Date(year, 0, 1))} to ${fmtDate(new Date(year, 11, 31))})`}
              </Field>
              <Field label="Measure version">{measureVersionFor(year)}</Field>
              <Field label="Last evaluated">{fmtDate(NEWEST_FILE)}</Field>
              <Field label="Source files">{sources.join(", ") || "–"}</Field>
            </Box>
          </Stack>
        </Card>
        <Tabs
          ariaLabel="Measure result sections"
          value={tab}
          onChange={(k) => setSearch({ tab: k, ...yq }, { replace: true })}
          items={[
            {
              key: "overview",
              label: "Overview",
              content: (
                <Overview
                  memberId={m.id}
                  memberName={m.name}
                  code={def.code as MeasureCode}
                  year={year}
                />
              ),
            },
            {
              key: "records",
              label: "Supporting records",
              count: supporting,
              content: (
                <Records
                  memberId={m.id}
                  code={def.code as MeasureCode}
                  year={year}
                />
              ),
            },
          ]}
        />
      </Stack>
    </PageContainer>
  );
}
