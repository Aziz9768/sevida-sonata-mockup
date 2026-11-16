import { useMemo, useState } from "react";
import { clinicOf, countyOfMember, displayName, pcmPerson, stateNameOf } from "../v16Data";
import { useVersion } from "../version";
import { useNavigate } from "react-router-dom";
import { Stack } from "@mui/material";
import {
  DataTable,
  PageContainer,
  StatusChip,
  Tabs,
  Term,
  applyFilters,
  applySearch,
} from "sevida-ui";
import type { Column, FilterState } from "sevida-ui";
import { RowActions } from "../components/RowActions";
import { renderCrumbLink } from "../components/RouterLinkAdapter";
import { TableLink } from "../components/TableLink";
import { missingEvidenceFor } from "../components/memberColumns";
import { LlmText } from "../components/LlmText";
import { GapStatusChip } from "../components/GapStatusChip";
import { evidenceNameOf, fmtDay, gapPriority, gapStatusTone, gapStatusesV12, parseDay, priorityRank, useGaps } from "../careGaps";
import type { GapView } from "../careGaps";
import { CURRENT_YEAR, DEMO_NOW, fmtDate, hashOf, measures, v3Extra } from "../data";
import type { Member } from "../data";
import { useRole } from "../roles";
import {
  AGE_RANGES,
  GENDER_V3,
  militaryOptions,
  MISSING_SHORT,
  RECOMMENDED_SENTENCE,
  V3_GAP_LABEL,
  ageLabel,
  ageParts,
  ageRangeOf,
  ethnicityV3,
  gapShort,
  genderV3,
  memberIdsOf,
  militaryV3,
  raceV3,
  tricareIdOf,
  v3GapOptions,
} from "../v3Data";
import { memberExtras } from "../recordFields";
import { ageGroupFor } from "../sharedFilters";
import { ageAtYearEnd } from "../data";
import AssignmentLateOutlinedIcon from "@mui/icons-material/AssignmentLateOutlined";

/** Hover text of each measure tab (LPP-16144). */
const V8_TAB_TIP: Record<string, string> = {
  "BCS-E": "Breast Cancer Screening",
  "CCS-E": "Cervical Cancer Screening",
  "COL-E": "Colorectal Cancer Screening",
  GSD: "Glycemic Status Assessment for Patients With Diabetes",
  WCV: "Child and Adolescent Well-Care Visits",
};

/** One care gap (open or closed). `n` is how many open gaps the same member has in all. */
interface GapRow {
  id: string;
  m: Member;
  g: GapView;
  n: number;
}
const opt = (xs: string[]) => xs.map((v) => ({ value: v, label: v }));
const sortedSet = (xs: string[]) =>
  [...new Set(xs)].sort((a, b) => a.localeCompare(b));
/** Gaps are due by the end of the measurement year. The sheet says "X Days (MM/DD/YYYY)" and does not say where the date comes from. */
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

/**
 * Version 3 of the Care Gaps list (final sheet, Care Gaps Page tab): one row per gap, the tabs All Measures / BCS / CCS / COL / GSD /
 * WCV, default columns Member Name, Tricare ID, Open Gap, Gap Identified Date, Missing Evidence and Due Date, everything else
 * available as a hidden column, and the filters of the Members list plus Gap Name and Gap Status.
 */
export function CareGapsPageV3() {
  const navigate = useNavigate();
  // Version 4 calls the Missing Evidence column Recommended Actions.
  const versionNo = useVersion().version.id;
  const actionsName = versionNo >= 4 ? "Recommended Actions" : "Missing Evidence";
  // Version 8 follows the Jira tickets word for word (LPP-16144): see the Tickets vs Mockup sheet.
  const v8 = versionNo >= 8;
  // Version 11: LPP-16144 as updated (11 default columns, four selector groups) and Mansi's selector standard.
  const v11 = versionNo >= 11;
  // Version 12 (Application Tables): Excluded status + Exclusion Reason, one shared Priority, opens on the open gaps sorted by Priority then Due Date.
  const v12 = versionNo >= 12;
  const { gapsOf, excludedOf } = useGaps();
  const { visible: visibleBase, canSee } = useRole();
  // Version 16 (SevidaLite count ticket): the Members list also shows the 4 infant demo members, so the Care Gaps list must show their gaps too, or the counts disagree.
  const visible = useMemo(
    () => (versionNo >= 16 ? [...visibleBase, ...v3Extra.filter(canSee)] : visibleBase),
    [visibleBase, canSee, versionNo],
  );
  const rows = useMemo<GapRow[]>(() => {
    const all = visible.flatMap((m) => {
      const gaps = v12 ? [...gapsOf(m), ...excludedOf(m)] : gapsOf(m);
      const n = gaps.filter((g) => g.status === "Open" || (!v12 && g.status !== "Closed")).length;
      return gaps.map((g) => ({ id: g.id, m, g, n }));
    });
    if (!v12) return all;
    // Priority (High first), then Due Date (one date for every gap today), then the newest identified; Open, Closed, then Excluded.
    const order = { Open: 0, Closed: 1, Excluded: 2 } as const;
    return [...all].sort(
      (a, b) =>
        order[a.g.status] - order[b.g.status] ||
        priorityRank(gapPriority(a.g)) - priorityRank(gapPriority(b.g)) ||
        b.g.identified.getTime() - a.g.identified.getTime() ||
        a.m.name.localeCompare(b.m.name),
    );
  }, [gapsOf, excludedOf, visible, v12]);
  // Version 12: the table shows Gap Closed Date when the list is filtered to Closed gaps, and Exclusion Reason when filtered to Excluded.
  const [filters, setFilters] = useState<FilterState>(
    // Version 16 (LPP-16144): the list shows every gap of the year, open and closed, so no status is chosen when the page opens.
    versionNo >= 16 ? {} : v12 ? { gapStatus: ["Open"] } : v8 ? {} : { gapStatus: ["Open"] },
  );
  const statusPick = (filters.gapStatus as string[] | undefined) ?? [];
  const mode: "all" | "closed" | "excluded" =
    !v12 || statusPick.length !== 1 ? "all" : statusPick[0] === "Closed" ? "closed" : statusPick[0] === "Excluded" ? "excluded" : "all";

  const columns = useMemo<Column<GapRow>[]>(() => {
    const toMember = (r: GapRow) => `/members/${r.m.id}?tab=gaps`;
    const valuesOf = (f: (m: Member) => string) =>
      sortedSet(visible.map(f));
    const sourceCol = (
      label: string,
      key: string,
      what: string,
    ): Column<GapRow> => ({
      key,
      header: label,
      help: `Where the member's ${what} came from. The member file records one source for race and ethnicity together, so the two columns match for now.`,
      accessor: (r) => r.m.raceSource,
      sortable: true,
      defaultHidden: true,
      group: "Demographics",
      searchable: false,
    });
    const cols: Column<GapRow>[] = [
      {
        key: "name",
        header: "Member Name",
        accessor: (r) => r.m.name,
        render: (r) => <TableLink to={toMember(r)}>{r.m.name}</TableLink>,
        sortable: true,
        primary: true,
        defaultPinned: true,
        searchable: true,
      },
      {
        key: "tricare",
        header: "Tricare ID",
        // LPP-16144: no (i) on Tricare ID.
        ...(v8
          ? {}
          : {
              help: "The member's Tricare ID. Sample data: the demo members have no such number, so it is made up.",
            }),
        accessor: (r) => tricareIdOf(r.m),
        sortable: true,
        nowrap: true,
        group: "IDs",
        searchable: true,
      },
      {
        key: "measure",
        header: v8 ? "Gap Name" : "Open Gap",
        filterLabel: "Gap Name",
        filterPinned: true,
        filterOrder: 1,
        // LPP-16144: Gap Name and Member Name are pinned left and cannot be hidden or moved.
        ...(v8 ? { defaultPinned: true, alwaysVisible: true } : {}),
        help: v8
          ? "The HEDIS Care Gap"
          : "The care gap on this row, one gap per row. A member with more than one gap appears more than once. Hover for the measure's full name.",
        group: "Care Gaps",
        accessor: (r) => V3_GAP_LABEL[r.g.def.code],
        sortable: true,
        render: (r) =>
          // Version 4: the gap name opens that care gap's own page (before, only the Member Name link and the row menu did).
          versionNo >= 4 ? (
            <TableLink to={`/members/${r.m.id}/gaps/${r.g.def.code}`}>
              {V3_GAP_LABEL[r.g.def.code]}
              {versionNo >= 16 && r.g.rate ? ` (HbA1c ${r.g.rate === "<8" ? "below 8%" : "above 9%"} rate)` : ""}
            </TableLink>
          ) : (
            <StatusChip
              tone="primary"
              label={V3_GAP_LABEL[r.g.def.code]}
              tip={r.g.def.name}
            />
          ),
        filterAccessor: (r) => r.g.def.code,
        filter: { type: "multiselect", options: v3GapOptions },
        searchable: false,
        width: 280,
      },
      {
        key: "openCount",
        header: "# Open Gaps",
        filterLabel: "# Open Gaps",
        filterOrder: 11,
        // Not in LPP-16144: kept as an optional column, off by default.
        ...(v8 ? { defaultHidden: true } : {
          help: "How many open gaps this member has in all. A plain count.",
        }),
        group: "Care Gaps",
        accessor: (r) => r.n,
        sortable: true,
        align: "right",
        nowrap: true,
        searchable: false,
        filter: { type: "numberCompare" },
      },
      {
        key: "found",
        header: "Gap Identified Date",
        help: v8
          ? "Date on which the gap was identified. Based on information used to identify the gap - e.g. claims service date if known, otherwise shows the run date when the Gaps in Care engine was last run."
          : "The date this gap was found. Demo date: the spec has no such field.",
        group: "Care Gaps",
        accessor: (r) => r.g.identified,
        render: (r) => fmtDate(r.g.identified),
        sortable: true,
        nowrap: true,
        filterOrder: 9,
        filter: { type: "dateRange" },
        searchable: false,
      },
      {
        key: "missing",
        header: actionsName,
        help: v8
          ? "Actions to take to close the gap. A gap will show as Closed once evidence such as claims confirms the closure. Conducting the activity does not automatically close the gap."
          : "What is still needed to close this gap, in two or three words. Hover to see every record that counts and its date window.",
        group: "Care Gaps",
        accessor: (r) =>
          r.g.status === "Closed" || r.g.status === "Excluded"
            ? ""
            : v8
              ? RECOMMENDED_SENTENCE(r.g.def.code, CURRENT_YEAR)
              : MISSING_SHORT[r.g.def.code],
        render: (r) => {
          if (r.g.status === "Closed" || r.g.status === "Excluded") return v8 ? "N/A" : "–";
          // LPP-16144: the AI's sentence, two lines at most, then "…see more".
          if (v8)
            return <LlmText text={RECOMMENDED_SENTENCE(r.g.def.code, CURRENT_YEAR)} />;
          const x = missingEvidenceFor(r.g.def.code, CURRENT_YEAR);
          return <Term tip={x.windows}>{MISSING_SHORT[r.g.def.code]}</Term>;
        },
        sortable: true,
        searchable: false,
        width: v8 ? 260 : 180,
      },
      {
        key: "due",
        header: "Due Date",
        help: v8
          ? "Date by which the gap needs to be closed in order to manage member's care. Also impacts the Gap Met % rates."
          : "Gaps are due by the end of the measurement year: the number of days left, then the date.",
        group: "Care Gaps",
        accessor: (r) => (v8 && r.g.status !== "Open" && (v12 || r.g.status === "Closed") ? null : DUE),
        // LPP-16144: MM/DD/YYYY only, and N/A once the gap is closed.
        render: (r) =>
          v8
            ? r.g.status === "Closed" || r.g.status === "Excluded"
              ? "N/A"
              : fmtDate(DUE)
            : `${daysToDue()} days (${fmtDate(DUE)})`,
        sortable: true,
        nowrap: true,
        searchable: false,
      },
      // ---- hidden columns the user can switch on
      {
        ...{
          key: "id",
          header: "Member ID",
          accessor: (r: GapRow) => r.m.id,
          sortable: true,
          nowrap: true,
          defaultHidden: true,
          group: "IDs",
          searchable: false,
        },
      },
      {
        key: "subscriber",
        header: "Subscriber ID",
        ...(v8 ? { help: "An ID that may be used by more than one family member." } : {}),
        accessor: (r) => memberExtras(r.m).subscriberId,
        sortable: true,
        nowrap: true,
        defaultHidden: true,
        group: "IDs",
        searchable: false,
      },
      {
        key: "genesisEhr",
        header: "Genesis EHR ID",
        ...(v8 ? { help: "Member's ID in the Genesis EHR" } : {}),
        accessor: (r) => memberIdsOf(r.m)[3].value,
        sortable: true,
        nowrap: true,
        defaultHidden: true,
        group: "IDs",
        searchable: false,
      },
      {
        key: "closedDate",
        header: versionNo >= 4 && !v8 ? "Gap Closed On" : "Gap Closed Date",
        help: v8
          ? "Date on which the gap was closed. Based on information used to close the gap - e.g. claims service date if known, otherwise shows the run date when the Gaps in Care engine was last run."
          : "The day this gap was closed. Empty for an open gap.",
        group: "Care Gaps",
        accessor: (r) =>
          r.g.work.closed ? new Date(r.g.work.closed.on) : null,
        render: (r) =>
          r.g.work.closed ? fmtDay(r.g.work.closed.on) : v8 ? "N/A" : "",
        sortable: true,
        nowrap: true,
        defaultHidden: !v8,
        searchable: false,
      },
      {
        key: "age",
        header: "Age",
        ...(v8 ? {} : { help: "Age today: days under 1 month, months under 1 year, then years and months." }),
        accessor: (r) => ageParts(r.m.dob).days,
        render: (r) => ageLabel(r.m.dob),
        sortable: true,
        nowrap: true,
        defaultHidden: true,
        group: "Demographics",
        searchable: false,
      },
      {
        key: "dob",
        header: "Date of Birth",
        accessor: (r) => r.m.dob,
        render: (r) => fmtDate(r.m.dob),
        sortable: true,
        nowrap: true,
        defaultHidden: true,
        group: "Demographics",
        filterOrder: 6,
        filter: { type: "dateRange" },
        searchable: false,
      },
      {
        key: "ethnicity",
        header: "Ethnicity",
        accessor: (r) => ethnicityV3(r.m),
        sortable: true,
        defaultHidden: true,
        group: "Demographics",
        filterOrder: 7,
        filter: {
          type: "multiselect",
          options: opt(valuesOf(ethnicityV3)),
        },
        searchable: false,
      },
      sourceCol("Ethnicity Source", "ethnicitySource", "ethnicity"),
      {
        key: "sex",
        header: "Gender",
        accessor: (r) => genderV3(r.m),
        sortable: true,
        defaultHidden: true,
        group: "Demographics",
        filterOrder: 10,
        filter: { type: "select", ordered: true, options: opt(GENDER_V3) },
        searchable: false,
      },
      {
        key: "military",
        header: "Military Status",
        ...(v8 ? {} : { help: "Proposed new column of the member file. We likely do not have this data yet. The values here are sample data." }),
        accessor: (r) => militaryV3(r.m),
        render: (r) => militaryV3(r.m) ?? "–",
        sortable: true,
        nowrap: true,
        defaultHidden: true,
        group: "Demographics",
        filterOrder: 12,
        filter: { type: "select", ordered: true, options: opt(militaryOptions()) },
        searchable: false,
      },
      {
        key: "race",
        header: "Race",
        accessor: (r) => raceV3(r.m),
        sortable: true,
        defaultHidden: true,
        group: "Demographics",
        filterOrder: 13,
        filter: { type: "multiselect", options: opt(valuesOf(raceV3)) },
        searchable: false,
      },
      sourceCol("Race Source", "raceSource", "race"),
      // ---- filters with no column of their own
      {
        key: "gapStatus",
        header: "Gap Status",
        // Version 4 also shows Gap Status as a column (Open / Closed), so a closed gap is clear on its row. Before, it was a filter only.
        filterOnly: versionNo < 4,
        ...(versionNo >= 4
          ? {
              group: "Care Gaps",
              sortable: true,
              nowrap: true,
              help: v8
                ? "Indicates whether the care gap is open or closed. Open gaps require actions."
                : "Whether this care gap is Open or Closed. The Gap Status filter chooses which ones the list shows.",
              render: (r: GapRow) =>
                r.g.status === "Excluded" ? (
                  <StatusChip tone={gapStatusTone.Excluded} label="Excluded" />
                ) : (
                  <GapStatusChip closed={r.g.status === "Closed"} />
                ),
            }
          : {}),
        searchable: false,
        filterPinned: true,
        filterOrder: 2,
        accessor: (r) => r.g.status,
        filter: {
          type: "multiselect",
          ordered: true,
          options: opt(v12 ? gapStatusesV12 : ["Open", "Closed"]),
        },
      },
      {
        key: "ageRange",
        header: "Age Range",
        filterOnly: true,
        searchable: false,
        filterOrder: 3,
        accessor: (r) => ageRangeOf(r.m.dob),
        filter: {
          type: "multiselect",
          ordered: true,
          options: opt(AGE_RANGES.map((x) => x.label)),
        },
      },
      ...(["Min", "Max"] as const).map(
        (b): Column<GapRow> => ({
          key: `age${b}`,
          header: `Age ${b}`,
          filterOnly: true,
          searchable: false,
          filterOrder: b === "Min" ? 4 : 5,
          accessor: (r) => ageParts(r.m.dob).months,
          filter: {
            type: "numberUnit",
            bound: b === "Min" ? "min" : "max",
            units: [
              { value: "year", label: "year", perUnit: 12 },
              { value: "month", label: "month", perUnit: 1 },
            ],
          },
        }),
      ),
    ];
    // Version 4: Gap Status sits right after Open Gap in the table (it was last because it started as a filter-only column).
    if (versionNo >= 4) {
      const i = cols.findIndex((c) => c.key === "gapStatus");
      const [c] = cols.splice(i, 1);
      cols.splice(cols.findIndex((x) => x.key === "measure") + 1, 0, c);
    }
    // LPP-16144: Gap Name, Member Name, Tricare ID, Gap Status, Gap Identified Date, Gap Closed Date, Recommended Actions, Due Date.
    if (v8 && !v11) {
      const first = ["measure", "name", "tricare", "gapStatus", "found", "closedDate", "missing", "due"];
      const by = new Map(cols.map((c) => [c.key, c]));
      return [
        ...first.map((k) => by.get(k)!),
        ...cols.filter((c) => !first.includes(c.key)),
      ];
    }
    // Version 11 (LPP-16144 description + Application Tables): Member Name, Tricare ID, Age, Sex, Gap Name, Gap Status, Gap Identified Date,
    // Priority, Due Date, Recommended Action, Primary Care Manager. Selector groups: Identifiers, Demographics, Care Team & Engagement, Care Gaps.
    // Only Member Name is pinned (Application Tables). The array is in table order; the panel keeps the groups in the ticket's order.
    if (v11) {
      const by = new Map(cols.map((c) => [c.key, c]));
      const g = (k: string) => by.get(k)!;
      const sample = " Sample data: the demo members have none, so it is made up.";
      const pcm = (r: GapRow) => {
        const p = pcmPerson(r.m);
        return p ? `${p.name} - NPI: ${p.npi}` : null;
      };
      const lastVisit = (r: GapRow) => {
        const d = r.m.events
          .filter((e) => e.kind === "EHR visit" && e.date.getTime() <= DEMO_NOW.getTime())
          .map((e) => e.date.getTime());
        return d.length ? new Date(Math.max(...d)) : null;
      };
      const SOURCE: Record<string, string> = {
        "BCS-E": "No mammogram in the prior 27 months.",
        "CCS-E": "No cervical cytology in the prior 3 years.",
        "COL-E": "No colonoscopy in the prior 10 years and no FIT in the measurement year.",
        GSD: "No HbA1c result on file for the measurement year.",
        WCV: "No well-care visit in the measurement year.",
      };
      const priorityOf = (r: GapRow) =>
        v12 ? gapPriority(r.g) : r.g.status === "Closed" ? null : (["High", "Medium", "Low"] as const)[hashOf(r.g.id) % 3];
      const base = (c: Column<GapRow>, extra: Partial<Column<GapRow>>): Column<GapRow> => ({ ...c, ...extra, searchable: c.searchable });
      const closedEvidence = (r: GapRow) => {
        const c = r.g.work.closed;
        const rec = c && r.g.work.evidence.find((x) => x.id === c.evidenceId);
        return rec ? `${evidenceNameOf(rec.kind)} on ${fmtDate(parseDay(rec.date))}` : null;
      };
      const none = { searchable: false } as const;
      // Version 16 (LPP-16144): info (i) texts only on the columns the ticket names; Closure Source instead of Evidence; the sex column is called Gender.
      const v16 = versionNo >= 16;
      const rankOf = (r: GapRow) => ({ High: 0, Medium: 1, Low: 2 } as Record<string, number>)[priorityOf(r) ?? ""] ?? 3;
      return [
        base(g("name"), {
          group: "Identifiers",
          defaultPinned: true,
          primary: true,
          help: undefined,
          // LPP-16213: a member with more than one open gap is easy to spot.
          render: (r) => (
            <Stack spacing={0.5} alignItems="flex-start">
              <TableLink to={`/members/${r.m.id}?tab=gaps`}>{displayName(r.m)}</TableLink>
              {r.n > 1 && <StatusChip tone="warning" label={`${r.n} open gaps`} />}
            </Stack>
          ),
        }),
        { key: "dodId", header: "DoD ID", help: "The member's Department of Defense ID. Kept for the demo and discussion." + sample, accessor: (r) => String(1000000000 + (hashOf(`${r.m.id}-dod`) % 9000000000)), sortable: true, nowrap: true, defaultHidden: true, group: "Identifiers", ...none },
        base(g("tricare"), { group: "Identifiers", help: undefined, ...(v16 ? { header: "Member ID" } : {}) }),
        base(g("genesisEhr"), { header: "Genesis MRN", help: "The member's ID in the Genesis EHR. Supplied by and unique to Madigan.", group: "Identifiers" }),
        base(g("dob"), { group: "Demographics", ...(v16 ? { help: undefined } : {}) }),
        base(g("age"), { defaultHidden: false, help: undefined, group: "Demographics" }),
        { key: "ageGroup", header: "Age Group", help: "Age group, from the application's standard ranges.", accessor: (r) => ageGroupFor(ageAtYearEnd(r.m.dob, CURRENT_YEAR)), sortable: true, defaultHidden: true, group: "Demographics", ...none },
        { key: "sex", header: v16 ? "Gender" : "Sex", accessor: (r) => (genderV3(r.m) === "Other" ? "Unknown" : genderV3(r.m)), sortable: true, group: "Demographics", filterOrder: 10, filter: { type: "select", ordered: true, options: opt(["Male", "Female", "Unknown"]) }, ...none },
        base(g("military"), { help: v16 ? undefined : "The member's military status. Madigan does not send this yet, so a dash means no data.", group: "Demographics" }),
        base(g("race"), { group: "Demographics" }),
        base(g("ethnicity"), { group: "Demographics" }),
        { key: "state", header: "State", help: "The state the member lives in, from the member file.", accessor: (r) => stateNameOf(r.m), sortable: true, defaultHidden: true, group: "Demographics", ...none },
        { key: "county", header: "County", help: "The county the member lives in. Madigan does not send this yet.", accessor: (r) => countyOfMember(r.m), sortable: true, defaultHidden: true, group: "Demographics", ...none },
        // ---- Care Gaps (table order); PCM comes last in the table but its group is listed before Care Gaps in the panel
        base(g("measure"), { group: "Care Gaps", defaultPinned: false, alwaysVisible: false, help: "The HEDIS care gap", nowrap: true }),
        base(g("gapStatus"), { group: "Care Gaps", ...(v16 ? { help: "Open when the member still needs the service, Closed when a record closed the gap, Excluded when the member is out of the measure." } : {}) }),
        ...(v12
          ? [
              { key: "priority", header: "Priority", help: "How urgent an open gap is: High, Medium or Low. The same value is shown on the member's Care Gaps tab and on the Care Gap Details page. Tier definitions to be confirmed. Sample data.", accessor: (r: GapRow) => (v16 ? rankOf(r) : priorityOf(r)), filterAccessor: (r: GapRow) => priorityOf(r) ?? "N/A", render: (r: GapRow) => priorityOf(r) ?? "N/A", sortable: true, nowrap: true, group: "Care Gaps", filterOrder: 14, filter: { type: "multiselect" as const, ordered: true, options: opt(["High", "Medium", "Low"]) }, ...none } as Column<GapRow>,
            ]
          : []),
        base(g("found"), { group: "Care Gaps", ...(v16 ? { help: "Date on which the gap was identified. Based on the information used to identify it, for example the claim service date, otherwise the date the engine last ran." } : {}) }),
        { key: "gapSource", header: "Gap Source", help: "Evidence used to open the gap. Sample text: the real wording comes from the quality engine.", accessor: (r) => SOURCE[r.g.def.code], sortable: true, defaultHidden: true, width: 260, group: "Care Gaps", ...none },
        ...(v12
          ? []
          : [{ key: "priority", header: "Priority", help: "How urgent the gap is, based on how close it is to its due date: High, Medium or Low. Tier definitions to be confirmed. Sample data.", accessor: (r: GapRow) => priorityOf(r), render: (r: GapRow) => priorityOf(r) ?? "N/A", sortable: true, nowrap: true, group: "Care Gaps", ...none } as Column<GapRow>]),
        base(g("due"), { group: "Care Gaps", filterOrder: 7, filter: { type: "dateRange" }, help: "Date on which the next recommended action is due to close the gap." }),
        base(g("closedDate"), { group: "Care Gaps", defaultHidden: v12 ? mode !== "closed" : true, filterOrder: 8, filter: { type: "dateRange" }, ...(v16 ? { help: "Date the gap was closed. N/A for an open gap." } : {}) }),
        ...(v12
          ? [
              { key: "exclusionReason", header: "Exclusion Reason", help: "Why the member is excluded from the measure, for example hospice or palliative care. Shown for Excluded gaps. Sample data: the dates are made up, the reason comes from the measure result.", accessor: (r: GapRow) => r.g.exclusionReason ?? null, render: (r: GapRow) => r.g.exclusionReason ?? "N/A", sortable: true, defaultHidden: mode !== "excluded", width: 280, group: "Care Gaps", ...none } as Column<GapRow>,
            ]
          : []),
        { key: v16 ? "closureSource" : "evidence", header: v16 ? "Closure Source" : "Evidence", help: v16 ? undefined : "Evidence used to close the gap. Blank for an open gap.", accessor: (r) => closedEvidence(r), render: (r) => closedEvidence(r) ?? "N/A", sortable: true, defaultHidden: true, width: 240, group: "Care Gaps", ...none },
        { key: "lastService", header: "Last Service / Result Date", help: "Date on the member's last encounter.", accessor: (r) => lastVisit(r), render: (r) => (lastVisit(r) ? fmtDate(lastVisit(r)!) : "–"), sortable: true, nowrap: true, defaultHidden: true, group: "Care Gaps", ...none },
        base(g("missing"), { header: "Recommended Action", group: "Care Gaps", help: "Recommendation on next steps to close the gap." }),
        // ---- Care Team & Engagement
        { key: "pcm", header: "Primary Care Manager", accessor: (r) => pcm(r), render: (r) => pcm(r) ?? "–", sortable: true, group: "Care Team & Engagement", ...none },
        { key: "clinic", header: "Clinic", help: "The clinic of the member's primary care manager." + sample, accessor: (r) => (clinicOf(r.m) === "–" ? null : clinicOf(r.m)), render: (r) => clinicOf(r.m), sortable: true, defaultHidden: true, group: "Care Team & Engagement", ...none },
        { key: "lastVisit", header: "Last Visit", help: "Date of the member's last encounter.", accessor: (r) => lastVisit(r), render: (r) => (lastVisit(r) ? fmtDate(lastVisit(r)!) : "–"), sortable: true, nowrap: true, defaultHidden: true, group: "Care Team & Engagement", ...none },
        { key: "nextAppt", header: "Next Appointment", help: "Date of the member's next scheduled visit. Madigan does not send appointments yet.", accessor: (r) => r.g.nextAppointment, render: (r) => (r.g.nextAppointment ? fmtDate(r.g.nextAppointment) : "–"), sortable: true, nowrap: true, defaultHidden: true, group: "Care Team & Engagement", ...none },
        { key: "outreachStatus", header: "Outreach Status", help: "Needs Madigan input.", accessor: () => null, render: () => "–", defaultHidden: true, group: "Care Team & Engagement", ...none },
        { key: "lastOutreach", header: "Last Outreach", help: "Needs Madigan input.", accessor: () => null, render: () => "–", defaultHidden: true, group: "Care Team & Engagement", ...none },
        // ---- filters with no column of their own
        g("ageRange"),
        g("ageMin"),
        g("ageMax"),
        { ...g("openCount"), filterOnly: true, group: undefined },
      ];
    }
    return cols;
  }, [visible, actionsName, versionNo, v8, v11, v12, mode]);
  // Version 16: the table opens by Priority (High first), and gaps with the same priority stay in member-name order.
  const tableRows = useMemo(() => (versionNo >= 16 ? [...rows].sort((a, b) => a.m.name.localeCompare(b.m.name)) : rows), [rows, versionNo]);

  // The page opens on the open gaps (the Open Gap column); Gap Status adds the closed ones.
  // Version 8 (LPP-16144): the table shows all the care gaps, open and closed, and the user narrows with Gap Status.
  const [search, setSearch] = useState("");
  const countIn = (xs: GapRow[]) =>
    v8 ? xs.length : xs.filter((r) => r.g.status !== "Closed").length;
  const [shown, setShown] = useState(countIn(rows));
  const totalAll = countIn(rows);

  // The tab counts follow the search and every filter except Gap Name itself, so picking one measure still shows the others.
  const counts = useMemo(() => {
    const rest = applyFilters(applySearch(rows, columns, search), columns, {
      ...filters,
      measure: [],
    });
    return [...measures]
      .sort((a, b) => a.code.localeCompare(b.code))
      .map((d) => ({
        def: d,
        n: rest.filter((r) => r.g.def.code === d.code).length,
      }));
  }, [rows, columns, search, filters]);
  const picked = (filters.measure as string[] | undefined) ?? [];
  const total = counts.reduce((a, c) => a + c.n, 0);

  return (
    <PageContainer
      breadcrumbs={v11 ? [{ label: "Care Gaps" }] : [{ label: "Home", href: "/" }, { label: "Care Gaps" }]}
      renderLink={renderCrumbLink}
      titleIcon={v11 ? <AssignmentLateOutlinedIcon /> : undefined}
      title={
        shown === totalAll
          ? `Care Gaps List (${totalAll})`
          : `Care Gaps List (${shown} of ${totalAll})`
      }
    >
      <Stack spacing={2}>
        <Tabs
          ariaLabel="Care gaps by measure"
          gap={false}
          value={picked.length === 1 ? picked[0] : "all"}
          onChange={(k) =>
            setFilters((f) => ({ ...f, measure: k === "all" ? [] : [k] }))
          }
          items={[
            { key: "all", label: "All Measures", count: total, tip: v8 ? "All care gaps" : undefined },
            ...counts.map(({ def, n }) => ({
              key: def.code,
              label: gapShort(def.code),
              count: n,
              tip: v8 ? V8_TAB_TIP[def.code] : undefined,
            })),
          ]}
        />
        <DataTable
          ariaLabel="Care gaps"
          columns={columns}
          rows={tableRows}
          getRowId={(r) => r.id}
          defaultSort={versionNo >= 16 ? { key: "priority", direction: "asc" } : v12 ? undefined : { key: "found", direction: v8 ? "desc" : "asc" }}
          noResultsTitle={v8 ? "No care gaps found" : undefined}
          searchOnEnter={v11}
          applyFirst={v11}
          columnsPanel={v11 ? { tableOrder: true, search: true, groups: ["Identifiers", "Demographics", "Care Team & Engagement", "Care Gaps"] } : undefined}
          searchPlaceholder={versionNo >= 16 ? "Search by Member Name or Member ID" : v11 ? "Search by Member Name or Tricare ID" : "Search by Member Name or Tricare ID…"}
          searchPlaceholderCompact="Member name, Tricare ID"
          search={search}
          onSearchChange={setSearch}
          filters={filters}
          onFiltersChange={setFilters}
          onResultCountChange={setShown}
          key={v12 ? mode : undefined}
          storageKey={versionNo >= 16 ? `demo-care-gaps-v3-ver16-a-${mode}` : v12 ? `demo-care-gaps-v3-ver12-a-${mode}` : v11 ? "demo-care-gaps-v3-ver11-a" : v8 ? "demo-care-gaps-v3-ver8-a" : "demo-care-gaps-v3-ver3-a"}
          savedViews={versionNo >= 16 ? "care-gaps-v16" : v12 ? "care-gaps-v12" : v11 ? "care-gaps-v11" : v8 ? "care-gaps-v8" : "care-gaps-v3"}
          exportFile="care-gaps"
          stickyHeader
          // Version 11: always room for about five rows, even on a short screen (the page scrolls instead of squeezing the table).
          maxHeight={v11 ? "max(calc(100vh - 360px), 400px)" : "calc(100vh - 360px)"}
          onRowClick={(r) => navigate(`/members/${r.m.id}?tab=gaps`)}
          rowActions={(r) => (
            <RowActions
              id={r.m.id}
              name={r.m.name}
              year={CURRENT_YEAR}
              gapCode={r.g.def.code}
            />
          )}
        />
      </Stack>
    </PageContainer>
  );
}
