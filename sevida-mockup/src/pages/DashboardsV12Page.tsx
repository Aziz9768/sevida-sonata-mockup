import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import { PageContainer, SelectField } from "sevida-ui";
import { renderCrumbLink } from "../components/RouterLinkAdapter";
import { NotesContext, QsFrame, QsSheet, QsTable, QsTile } from "../quicksight/kit";
import { qs } from "../quicksight/qsTheme";
import { fmtDate, measures } from "../data";
import type { MeasureCode } from "../data";
import { inputsFor } from "../dashboardData";
import { gapShort } from "../v3Data";
import { useRole } from "../roles";
import { useDocumentTitle } from "../components/analytics/AnalyticsBits";
import { lucidTitle } from "./QuickSightDashboardPage";
import { Admin } from "./MeasureLucidPage";
import { OverviewV12, emptyOverview } from "./OverviewV12";
import type { OverviewState } from "./OverviewV12";
import { MeasureV12, emptyMeasure } from "./MeasureV12";
import type { MeasureV12State } from "./MeasureV12";
import { n0, whiteAll } from "./dashboardV12Bits";

/**
 * Version 12 Analytics dashboards (Balsamiq board, Analytics - Quality Measures).
 * One tab bar on every page: the Overview on the left, one tab for each measure, then Inputs and Admin.
 * Overview and the five measures follow the board. Inputs has a label on the board but no screen, so it lists the files each measure reads.
 */
const OVERVIEW = "Overview";
const MEASURE_TABS = ["BCS", "CCS", "COL", "GSD", "WCV"];
const codeOf = (tab: string): MeasureCode | undefined => measures.find((m) => gapShort(m.code) === tab)?.code;

/** Inputs: the files each measure reads, and what came of them. Placeholder until the board draws this tab. */
function Inputs() {
  const rows = measures.flatMap((m) => inputsFor(m.code).map((r) => ({ measure: gapShort(m.code), ...r })));
  return (
    <QsSheet>
      <QsTile cols={36} title="Inputs">
        <Typography sx={{ fontSize: qs.type.small.size, color: qs.color.mutedText, mb: 1 }}>
          To confirm: the board names this tab but does not draw it yet. This is a first draft of the files each measure reads.
        </Typography>
        <QsTable
          label="Input files"
          exportFile="input-files"
          maxHeight={560}
          rowKey={(r) => `${r.measure}-${r.file.id}`}
          rows={rows}
          cols={[
            { key: "measure", header: "Measure", value: (r) => r.measure, nowrap: true },
            { key: "file", header: "File", value: (r) => r.title },
            { key: "status", header: "Status", value: (r) => r.file.status, nowrap: true },
            { key: "rows", header: "Rows Used", value: (r) => r.rowsUsed, render: (r) => n0(r.rowsUsed), align: "right" },
            { key: "rej", header: "Rejected", value: (r) => r.rejected, render: (r) => n0(r.rejected), align: "right" },
            { key: "on", header: "Received On", value: (r) => r.file.receivedOn?.getTime() ?? 0, render: (r) => (r.file.receivedOn ? fmtDate(r.file.receivedOn) : "–"), nowrap: true },
          ]}
        />
      </QsTile>
    </QsSheet>
  );
}

/** Admin: the Measurement Run History of Version 11, now one level up, so it asks which measure. */
function AdminTab() {
  const [code, setCode] = useState<MeasureCode>("BCS-E");
  return (
    <>
      <Box sx={{ px: 2, pt: 2, maxWidth: 260, ...whiteAll }}>
        <SelectField label="Measure" value={code} onChange={(v) => setCode(v as MeasureCode)} options={measures.map((m) => ({ value: m.code, label: gapShort(m.code) }))} />
      </Box>
      <Admin code={code} />
    </>
  );
}

export function DashboardsV12Page() {
  const [params] = useSearchParams();
  const first = params.get("m")?.toUpperCase() ?? "";
  const { role } = useRole();
  const [tab, setTab] = useState(MEASURE_TABS.includes(first) ? first : OVERVIEW);
  const [ov, setOv] = useState<OverviewState>(emptyOverview());
  const [ms, setMs] = useState<Record<string, MeasureV12State>>({});
  const tabs = [OVERVIEW, ...MEASURE_TABS, "Inputs", ...(role.dataQuality ? ["Admin"] : [])];
  const code = codeOf(tab);
  useDocumentTitle(`${tab}, Analytics`);

  const title = code ? lucidTitle(code).replace("Care Gaps Dashboard", "Care Gaps") : "HEDIS Care Gaps - Overview";
  const crumbs = code
    ? [{ label: "Analytics" }, { label: "Overview", href: "/dashboards" }, { label: tab }]
    : [{ label: "Analytics" }, { label: tab }];
  return (
    <PageContainer title={title} titleVariant="overview" breadcrumbs={crumbs} renderLink={renderCrumbLink}>
      <NotesContext.Provider value={{ fr: false, ask: false }}>
        <QsFrame tabs={tabs} active={tab} onTab={setTab} onReset={() => undefined} toolbar={false}>
          {tab === OVERVIEW ? (
            <OverviewV12 s={ov} setS={setOv} />
          ) : code ? (
            <MeasureV12 key={code} code={code} s={ms[tab] ?? emptyMeasure()} setS={(s) => setMs({ ...ms, [tab]: s })} />
          ) : tab === "Inputs" ? (
            <Inputs />
          ) : (
            <AdminTab />
          )}
          <Typography sx={{ fontSize: qs.type.small.size, color: qs.color.mutedText, textAlign: "right", px: 2, pb: 1 }}>Powered by Amazon Quick</Typography>
        </QsFrame>
      </NotesContext.Provider>
    </PageContainer>
  );
}

export default DashboardsV12Page;
