import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import { PageContainer, SelectField, titleCase } from "sevida-ui";
import { renderCrumbLink } from "../components/RouterLinkAdapter";
import { NotesContext, QsFrame, QsSheet, QsTable, QsTile } from "../quicksight/kit";
import { qs } from "../quicksight/qsTheme";
import { fmtDate, measures } from "../data";
import type { MeasureCode } from "../data";
import { inputsFor } from "../dashboardData";
import { gapShort } from "../v3Data";
import { useRole } from "../roles";
import { useVersion } from "../version";
import { justSwitchedRun } from "../runs";
import { useDocumentTitle } from "../components/analytics/AnalyticsBits";
import { lucidTitle } from "./QuickSightDashboardPage";
import { Admin } from "./MeasureLucidPage";
import { OverviewV12, emptyOverview } from "./OverviewV12";
import type { OverviewState } from "./OverviewV12";
import { MeasureV12, emptyMeasure } from "./MeasureV12";
import type { MeasureV12State } from "./MeasureV12";
import { n0, whiteAll } from "./dashboardV12Bits";
import { DcsTab, HedisInputsTab } from "./hedisInputsV14";

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

/**
 * Version 16: what the dashboards keep while another run is chosen. Choosing a run remounts every page (so no number is left over from the run before),
 * so the filters are kept here for those few seconds. A visit that starts any other way begins with empty filters, as before.
 */
let kept: { ov: OverviewState; ms: Record<string, MeasureV12State>; shared: { provider: string[]; military: string } } | null = null;

export function DashboardsV12Page() {
  const [params, setParams] = useSearchParams();
  const first = params.get("m")?.replace(/-E$/i, "").toUpperCase() ?? "";
  const { role } = useRole();
  const versionId = useVersion().version.id;
  // Version 14 (Srikanth): Inputs is HEDIS Inputs, a DCS tab is new, and the page title sits below the tab bar. Versions 12 and 13 are not changed.
  const v14 = versionId >= 14;
  // Version 16: the tab is kept in the address (?m=BCS), the breadcrumb is Analytics / tab, and Primary Care Manager and Military Status are shared by every tab.
  const v16 = versionId >= 16;
  const [tabState, setTabState] = useState(MEASURE_TABS.includes(first) ? first : OVERVIEW);
  const [restore] = useState(() => {
    const r = v16 && kept !== null && justSwitchedRun();
    if (!r) kept = null;
    return r;
  });
  const [ovState, setOvState] = useState<OverviewState>(restore ? kept!.ov : emptyOverview());
  const [msState, setMsState] = useState<Record<string, MeasureV12State>>(restore ? kept!.ms : {});
  const tabs = v14
    ? [OVERVIEW, ...MEASURE_TABS, "HEDIS Inputs", "DCS", ...(role.dataQuality ? ["Admin"] : [])]
    : [OVERVIEW, ...MEASURE_TABS, "Inputs", ...(role.dataQuality ? ["Admin"] : [])];
  const fromAddress = params.get("m") ? (tabs.find((t) => t.toUpperCase() === (params.get("m") ?? "").replace(/-E$/i, "").toUpperCase()) ?? OVERVIEW) : OVERVIEW;
  const tab = v16 ? fromAddress : tabState;
  const setTab = (t: string) => {
    if (!v16) return setTabState(t);
    setParams(t === OVERVIEW ? {} : { m: t });
  };
  // Version 16: Primary Care Manager and Military Status are one choice for the whole page. The tab that was changed tells the others.
  const [shared, setShared] = useState(restore ? kept!.shared : { provider: ovState.provider, military: ovState.military });
  const ov: OverviewState = v16 ? { ...ovState, ...shared } : ovState;
  const msOf = (t: string): MeasureV12State => {
    const s = msState[t] ?? emptyMeasure();
    return v16 ? { ...s, f: { ...s.f, ...shared } } : s;
  };
  const setOv = (next: OverviewState) => {
    setOvState(next);
    if (v16) {
      const sh = { provider: next.provider, military: next.military };
      setShared(sh);
      kept = { ov: next, ms: msState, shared: sh };
    }
  };
  const setMs = (t: string, next: MeasureV12State) => {
    const all = { ...msState, [t]: next };
    setMsState(all);
    if (v16) {
      const sh = { provider: next.f.provider, military: next.f.military };
      setShared(sh);
      kept = { ov: ovState, ms: all, shared: sh };
    }
  };
  const code = codeOf(tab);
  useDocumentTitle(`${tab}, Analytics`);

  const title = code
    ? lucidTitle(code).replace("Care Gaps Dashboard", "Care Gaps")
    : v14 && tab === "HEDIS Inputs"
      ? "HEDIS Inputs Dashboard"
      : v14 && tab === "DCS"
        ? "DCS Validations"
        : v14 && tab === "Admin"
          ? "HEDIS Care Gaps - Admin"
          : "HEDIS Care Gaps - Overview";
  // Version 16: one step less. Every tab sits directly under Analytics, as the tab bar shows.
  const crumbs = code && !v16
    ? [{ label: "Analytics" }, { label: "Overview", href: "/dashboards" }, { label: tab }]
    : [{ label: "Analytics" }, { label: tab }];
  return (
    <PageContainer title={v14 ? undefined : title} titleVariant="overview" breadcrumbs={crumbs} renderLink={renderCrumbLink}>
      <NotesContext.Provider value={{ fr: false, ask: false }}>
        <QsFrame tabs={tabs} active={tab} onTab={setTab} onReset={() => undefined} toolbar={false}>
          {v14 && (
            <Box sx={{ px: 2, py: 1.5, bgcolor: qs.color.primaryBackground, borderBottom: qs.tile.border }}>
              <Typography variant="h3" component="h1" sx={{ overflowWrap: "anywhere" }}>
                {titleCase(title)}
              </Typography>
            </Box>
          )}
          {tab === OVERVIEW ? (
            <OverviewV12 s={ov} setS={setOv} onOpenMeasure={(t) => MEASURE_TABS.includes(t) && setTab(t)} />
          ) : code ? (
            <MeasureV12 key={code} code={code} s={msOf(tab)} setS={(s) => setMs(tab, s)} />
          ) : tab === "HEDIS Inputs" ? (
            <HedisInputsTab />
          ) : tab === "DCS" ? (
            <DcsTab />
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
