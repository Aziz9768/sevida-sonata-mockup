import { useMemo } from "react";
import { Stack, Typography } from "@mui/material";
import { StatusChip, Term } from "sevida-ui";
import type { Column, DatePreset } from "sevida-ui";
import { TableLink } from "./TableLink";
import { groupOfRecord } from "./ClinicalTab";
import { memberExtras } from "../recordFields";
import {
  outreachResults,
  dataRefreshedOf,
  evidenceKindsFor,
  evidenceCodeOf,
  evidenceNameOf,
  fmtDay,
  parseDay,
  useGaps,
} from "../careGaps";
import type { GapView } from "../careGaps";
import {
  CURRENT_YEAR,
  DEMO_NOW,
  YEARS,
  yearOptions,
  a1cBandOf,
  a1cBands,
  ageStatusOf,
  latestA1c,
  ageAtYearEnd,
  careManagers,
  careTeamOf,
  careTeams,
  fmtDate,
  measures,
  members,
  resultsFor,
  spokenLanguageOf,
  stateLabel,
  stateTone,
  countyOf,
  militaryOf,
  memberStates,
  stateName,
  memberCounties,
  raceGroupOf,
  ethnicityGroupOf,
  primaryCareOf,
  NO_PCP,
  memberForYear,
} from "../data";
import type { Member, MeasureCode } from "../data";
import type { VersionId } from "../version";
import {
  AGE_GROUPS,
  LABEL,
  OPEN_GAP_VALUES,
  measureOptions,
  openGapsLabel,
  MILITARY_VALUES,
  RESULT_STATES,
  SEX_VALUES,
  ageGroupFor,
} from "../sharedFilters";

const opt = (list: string[]) => list.map((v) => ({ value: v, label: v }));
const sortedSet = (xs: string[]) =>
  [...new Set(xs)].sort((a, b) => a.localeCompare(b));
const raceValues = sortedSet(members.map(raceGroupOf));
const ethnicityValues = sortedSet(members.map(ethnicityGroupOf));
const pcpValues = sortedSet(
  members.map((m) => primaryCareOf(m)?.p.name ?? NO_PCP),
);
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const inDays = (n: number) =>
  new Date(DEMO_NOW.getFullYear(), DEMO_NOW.getMonth(), DEMO_NOW.getDate() + n);
/** Quick picks for the Next appointment filter, counted from the demo's today. */
export const apptPresets: DatePreset[] = [
  { label: "Next 7 days", from: iso(inDays(0)), to: iso(inDays(7)) },
  { label: "Next 14 days", from: iso(inDays(0)), to: iso(inDays(14)) },
  { label: "Later", from: iso(inDays(15)) },
  { label: "No appointment", blank: true },
];
/**
 * One name per diagnosis code, so the filter lists a code once: the longest description the data uses for it, without the notes in
 * brackets ("(problem list)", "(supplemental claim, $0)").
 */
const cleanDx = (t: string) => t.replace(/\s*\(.*\)\s*$/, "").trim();
const dxName = new Map<string, string>();
for (const m of members)
  for (const e of m.events)
    if (groupOfRecord(e) === "diagnoses") {
      const t = cleanDx(e.text);
      if (t.length > (dxName.get(e.code)?.length ?? 0)) dxName.set(e.code, t);
    }
/** "E11.9 · Type 2 diabetes without complications" for each diagnosis the member has in a year (claims and EHR problem list). */
export const diagnosesOfYear = (m: Member, year: number) =>
  sortedSet(
    memberForYear(m, year)
      .events.filter((e) => groupOfRecord(e) === "diagnoses")
      .map((e) => `${e.code} · ${dxName.get(e.code) ?? cleanDx(e.text)}`),
  );
const diagnosisValues = sortedSet(
  YEARS.flatMap((y) => members.flatMap((m) => diagnosesOfYear(m, y))),
);
const resultValues = sortedSet(
  measures.flatMap((x) =>
    (["Met", "Gap", "Review", "Excluded"] as const).map(
      (st) => `${x.code}: ${stateLabel[st]}`,
    ),
  ),
);

/** A member in one measurement year. A row without a year is the current year. */
export type MemberRow = Member & { year?: number };
/** One row per member per measurement year, newest year first. */
export const memberYearRows = (
  list: Member[],
  years: number[] = YEARS,
): MemberRow[] => years.flatMap((y) => list.map((m) => ({ ...m, year: y })));
export const yearOf = (r: MemberRow) => r.year ?? CURRENT_YEAR;
export const getMemberRowId = (r: MemberRow) => `${r.id}-${yearOf(r)}`;
/** A past year has final results only: no care manager work, appointments or outreach. */
const isPast = (r: MemberRow) => yearOf(r) !== CURRENT_YEAR;
export const NOT_CONTACTED = "Not contacted yet";
const dateCell = (d: Date | null, none = "–") => (d ? fmtDate(d) : none);

/**
 * The first columns of every table that lists members (Members, and the members inside a quality measure).
 * Defined once so the two tables show the same member columns, with the same names and the same hidden-by-default ones.
 * `of` finds the member in a row, so the same columns work for a plain member row or a row that wraps one.
 */
export function memberColumns<T>(
  of: (row: T) => Member,
  yearOfRow: (row: T) => number = () => CURRENT_YEAR,
): Column<T>[] {
  return [
    {
      key: "name",
      header: "Member name",
      accessor: (r) => of(r).name,
      sortable: true,
      primary: true,
      defaultPinned: true,
      render: (r) => (
        <TableLink to={`/members/${of(r).id}`}>{of(r).name}</TableLink>
      ),
    },
    {
      key: "id",
      header: "Member ID",
      accessor: (r) => of(r).id,
      sortable: true,
      nowrap: true,
      render: (r) => (
        <TableLink to={`/members/${of(r).id}`}>{of(r).id}</TableLink>
      ),
    },
    {
      key: "insurance",
      header: "Insurance number",
      help: "The number on the member's insurance card (Subscriber or Family ID in the member file). Type it in the search box or the filter to find one member. Demo values: the demo members have no such number, so it is made up.",
      accessor: (r) => memberExtras(of(r)).subscriberId,
      sortable: true,
      nowrap: true,
      hideBelow: "lg",
      filter: { type: "text" },
    },
    {
      key: "first",
      header: "First name",
      help: "The member's first name. Use it with Last name, Date of birth or Insurance number in the Filters panel to narrow the list to one person.",
      accessor: (r) => of(r).first,
      sortable: true,
      defaultHidden: true,
      hideBelow: "lg",
      filter: { type: "text" },
    },
    {
      key: "last",
      header: "Last name",
      help: "The member's last name. Use it with First name, Date of birth or Insurance number in the Filters panel to narrow the list to one person.",
      accessor: (r) => of(r).last,
      sortable: true,
      defaultHidden: true,
      hideBelow: "lg",
      filter: { type: "text" },
    },
    {
      key: "dob",
      header: "Date of birth",
      help: "The member's date of birth. Use it with the name and Member ID to be sure it is the right person.",
      accessor: (r) => of(r).dob,
      render: (r) => fmtDate(of(r).dob),
      sortable: true,
      nowrap: true,
      filter: { type: "dateRange" },
    },
    {
      key: "age",
      header: "Age",
      help: "Age on December 31 of the measurement year.",
      accessor: (r) => ageAtYearEnd(of(r).dob, yearOfRow(r)),
      sortable: true,
      align: "right",
      hideBelow: "md",
      // Slider plus From / To boxes: pick any range, not only the preset age groups.
      filter: { type: "numberRange", min: 0, max: 100 },
    },
    {
      key: "sex",
      header: "Sex",
      accessor: (r) => (of(r).gender === "female" ? "Female" : "Male"),
      sortable: true,
      hideBelow: "lg",
      filter: { type: "select", options: opt(SEX_VALUES) },
    },
    {
      key: "lang",
      header: "Spoken language",
      defaultHidden: true,
      accessor: (r) => spokenLanguageOf(of(r)),
      sortable: true,
      hideBelow: "lg",
    },
  ];
}

/**
 * What is still needed to close a gap in this measure: any one of these records. The text is kept short (two names, then "N more")
 * so a measure with many accepted tests (COL-E) does not make the row tall; the hover shows every one with its date window.
 */
export function missingEvidenceFor(code: MeasureCode, year: number) {
  const kinds = evidenceKindsFor(code, year);
  const names = kinds.map((k) => k.label.replace(" (sDNA-FIT)", ""));
  const labels =
    names.length <= 2
      ? names.join(" or ")
      : `${names[0]}, ${names[1]} or ${names.length - 2} more`;
  const windows = kinds.map((k) => `${k.label} ${k.windowText}`).join(". Or: ");
  return { labels, windows };
}

/**
 * The member facets (age group, race, ethnicity, primary care provider, state, county, military status) as columns.
 * One definition for every table that lists members or their gaps, so the same filter has the same name and values everywhere.
 */
export function memberFacets<T>(
  of: (row: T) => Member,
  yearOfRow: (row: T) => number = () => CURRENT_YEAR,
): Record<
  "ageGroup" | "race" | "ethnicity" | "pcp" | "state" | "county" | "military",
  Column<T>
> {
  return {
    ageGroup: {
      key: "ageGroup",
      header: "Age group",
      help: "Age on December 31 of the measurement year, in groups. Use it to find, for example, the 12–17 group for well-care visits.",
      accessor: (r) => ageGroupFor(ageAtYearEnd(of(r).dob, yearOfRow(r))),
      sortable: true,
      defaultHidden: true,
      filter: {
        type: "multiselect",
        ordered: true,
        options: opt(AGE_GROUPS.map((g) => g.label)),
      },
    },
    race: {
      key: "race",
      header: "Race",
      help: "The member's race, grouped, from the member file. A member with more than one race is shown as Two or more races.",
      accessor: (r) => raceGroupOf(of(r)),
      sortable: true,
      defaultHidden: true,
      hideBelow: "lg",
      filter: { type: "multiselect", options: opt(raceValues) },
    },
    ethnicity: {
      key: "ethnicity",
      header: "Ethnicity",
      help: "Hispanic or Latino, Not Hispanic or Latino, or Unknown, from the member file.",
      accessor: (r) => ethnicityGroupOf(of(r)),
      sortable: true,
      defaultHidden: true,
      hideBelow: "lg",
      filter: { type: "multiselect", options: opt(ethnicityValues) },
    },
    pcp: {
      key: "pcp",
      header: "Primary care provider",
      help: 'The member\'s primary care provider, from the provider file. Members with none on file show "No primary care provider on file".',
      accessor: (r) => primaryCareOf(of(r))?.p.name ?? NO_PCP,
      sortable: true,
      defaultHidden: true,
      hideBelow: "lg",
      filter: { type: "multiselect", options: opt(pcpValues) },
    },
    state: {
      key: "state",
      header: "State",
      help: "The state in the member's mailing address, from the member file (State column).",
      accessor: (r) => stateName(of(r).state),
      sortable: true,
      nowrap: true,
      hideBelow: "lg",
      // Off by default so the table stays short enough to read a row without scrolling sideways. Switch on in Columns.
      defaultHidden: true,
      filter: { type: "select", options: opt(memberStates) },
    },
    county: {
      key: "county",
      header: "County",
      help: "Proposed new column of the member file. The ingestion spec has no County field yet, so it has to be added (or looked up from the Zip code). The values here are sample data.",
      accessor: (r) => countyOf(of(r)),
      sortable: true,
      nowrap: true,
      hideBelow: "lg",
      defaultHidden: true,
      filter: { type: "select", options: opt(memberCounties) },
    },
    military: {
      key: "military",
      header: "Military status",
      help: "Proposed new column of the member file. The ingestion spec has no military status field yet, so it has to be added. The values here are sample data.",
      accessor: (r) => militaryOf(of(r)),
      sortable: true,
      nowrap: true,
      hideBelow: "lg",
      defaultHidden: true,
      filter: {
        type: "select",
        options: opt(MILITARY_VALUES),
      },
    },
  };
}

/** Columns that version 2 of the Members list no longer shows (they stay in the code and in version 1). */
const REMOVED_IN_V2 = new Set([
  "excluded",
  "first",
  "last",
  "lang",
  "ageGroup",
  "pcp",
  "state",
  "county",
  "military",
  "ageStatus",
  "closed",
  "evDate",
  "evCode",
  "appt",
  "lastContact",
  "contactResult",
  "team",
  "cm",
  "updated",
  "diagnosis",
  "results",
  "a1c",
]);
const raceSourceValues = sortedSet(members.map((m) => m.raceSource));

/** In the Columns panel of version 2, columns sit under these headings (A to Z inside each). Member name and Member ID stay first, with no heading. */
const V2_GROUP: Record<string, string> = {
  age: "Demographics",
  dob: "Demographics",
  ethnicity: "Demographics",
  ethnicitySource: "Demographics",
  sex: "Demographics",
  race: "Demographics",
  raceSource: "Demographics",
  insurance: "Demographics",
  year: "Care Gaps",
  eligible: "Care Gaps",
  openCount: "Care Gaps",
  gaps: "Care Gaps",
  found: "Care Gaps",
  missing: "Care Gaps",
  excluded: "Care Gaps",
};

/**
 * Version 2 of the Members list (Jira LPP-16069, "Member search column updates from 10/22 call", Proof Point column):
 * the same columns as version 1 with some taken out, some renamed (Subscriber ID, Gender, Gap Measures, Gap Identified Date),
 * Race and Ethnicity shown with their sources, one gap date per gap measure, and a HEDIS Measures Eligibility column.
 * Columns sit under Demographics and Care Gaps, A to Z. Diagnosis and HbA1c moved to the member page.
 */
function versionTwo(
  all: Column<MemberRow>[],
  extra: { eligible: Column<MemberRow>; found: Column<MemberRow> },
): Column<MemberRow>[] {
  const byKey = (k: string) => all.find((c) => c.key === k)!;
  const sourceCol = (
    label: string,
    key: string,
    what: string,
  ): Column<MemberRow> => ({
    key,
    header: label,
    help: `Where the member's ${what} came from, for example Health Plan Collected or the enrollment files. The member file records one source for race and ethnicity together, so the two columns match for now.`,
    accessor: (m) => m.raceSource,
    sortable: true,
    hideBelow: "lg",
    filter: { type: "multiselect", options: opt(raceSourceValues) },
  });
  const list: Column<MemberRow>[] = [];
  for (const c of all) {
    if (REMOVED_IN_V2.has(c.key) || c.key === "race" || c.key === "ethnicity")
      continue;
    if (c.key === "insurance") {
      list.push({
        ...c,
        header: "Subscriber ID",
        help: "The ID on the member's insurance card (Subscriber or Family ID in the member file). Type it in the search box or the filter to find one member. Demo values: the demo members have no such ID, so it is made up.",
      });
    } else if (c.key === "sex") {
      list.push(
        { ...c, header: "Gender" },
        { ...byKey("race"), defaultHidden: false },
        { ...byKey("ethnicity"), defaultHidden: false },
        sourceCol("Race source", "raceSource", "race"),
        sourceCol("Ethnicity source", "ethnicitySource", "ethnicity"),
      );
    } else if (c.key === "openCount") {
      list.push(
        extra.eligible,
        {
          ...c,
          filterLabel: "Open gaps",
          help: c.help?.replace("the Measure filter", "the Gap Measures filter"),
        },
      );
    } else if (c.key === "gaps") {
      list.push({
        ...c,
        header: "Gap measures",
        filterLabel: "Gap measures",
        help: c.help?.replace("The Gaps column", "This column"),
      });
    } else if (c.key === "found") {
      list.push(extra.found);
    } else {
      list.push(c);
    }
  }
  // Table order: Member name and Member ID first, then Demographics A to Z, then Care Gaps A to Z.
  const grouped = list.map((c) => ({ ...c, group: V2_GROUP[c.key] }));
  const lead = grouped.filter((c) => !c.group);
  const sortAZ = (g: string) =>
    grouped
      .filter((c) => c.group === g)
      .sort((a, b) => a.header.localeCompare(b.header));
  return [...lead, ...sortAZ("Demographics"), ...sortAZ("Care Gaps")];
}

/**
 * Every column of the member table. The Members list and the members inside a quality measure both use this,
 * so the two tables always show the same columns in the same order.
 */
export function useMemberTableColumns(
  only?: MeasureCode,
  withYear = false,
  /** Which version of the mockup to build the columns for. Version 1 is the table as it was; version 2 is the slimmer table (see src/version.tsx). */
  version: VersionId = 1,
): Column<MemberRow>[] {
  const { openOf: openOfNow, gapsOf: gapsOfNow } = useGaps();
  return useMemo<Column<MemberRow>[]>(() => {
    // Care work exists for the current year only. A past year has none, so these are empty for it.
    const openOf = (m: MemberRow): GapView[] => (isPast(m) ? [] : openOfNow(m));
    const gapsOf = (m: MemberRow): GapView[] => (isPast(m) ? [] : gapsOfNow(m));
    /** The measures still not met: the open gaps now, or at the end of a past year. */
    const gapCodes = (m: MemberRow): MeasureCode[] =>
      isPast(m)
        ? measures
            .filter(
              (x) =>
                (!only || x.code === only) &&
                resultsFor(m, yearOf(m))[x.code].state === "Gap",
            )
            .map((x) => x.code)
        : openOf(m).map((g) => g.def.code);
    const diagnosesOf = (m: MemberRow) => diagnosesOfYear(m, yearOf(m));
    /** "BCS-E: Met" for every measure the member is in (not for measures that do not apply to them). */
    const resultLines = (m: MemberRow) =>
      measures.flatMap((x) => {
        const st = resultsFor(m, yearOf(m))[x.code].state;
        return st === "Not eligible" ? [] : [`${x.code}: ${stateLabel[st]}`];
      });
    const facets = memberFacets<MemberRow>((m) => m, yearOf);
    const primary = (m: MemberRow): GapView | null => openOf(m)[0] ?? null;
    const yearColumn: Column<MemberRow> = {
      key: "year",
      header: "Measurement year",
      help: "The year the results are for. The current year is being worked now. A past year shows final results only: no care-gap work, appointments or outreach.",
      accessor: (m) => String(yearOf(m)),
      sortable: true,
      nowrap: true,
      filter: { type: "select", options: yearOptions, required: true },
    };
    const earliest = (m: MemberRow) =>
      openOf(m)
        .map((g) => g.identified)
        .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
    const nextAppt = (m: MemberRow) =>
      openOf(m)
        .map((g) => g.nextAppointment)
        .filter((d): d is Date => !!d)
        .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
    const updated = (m: MemberRow) => {
      if (isPast(m)) return null;
      const latest = gapsOf(m).map((g) => g.lastUpdated.getTime());
      return new Date(Math.max(dataRefreshedOf(m).getTime(), ...latest));
    };
    // Evidence belongs to the gaps: the record that closed each closed gap, one line per gap, in the usual measure order.
    const closedOf = (m: MemberRow): GapView[] =>
      gapsOf(m).filter(
        (g) => g.status === "Closed" && (!only || g.def.code === only),
      );
    const evidenceOf = (m: MemberRow) =>
      closedOf(m).flatMap((g) => {
        const c = g.work.closed;
        const rec = c && g.work.evidence.find((x) => x.id === c.evidenceId);
        return rec
          ? [
              {
                code: g.def.code,
                date: parseDay(rec.date),
                title:
                  rec.value !== undefined
                    ? `${evidenceNameOf(rec.kind)}: ${rec.value}%`
                    : evidenceNameOf(rec.kind),
                // The technical code goes in the small text, under the name of the test or service.
                sub: evidenceCodeOf(rec.kind) ?? "",
              },
            ]
          : [];
      });
    const latestEvidence = (m: MemberRow) =>
      evidenceOf(m)
        .map((x) => x.date)
        .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
    /** What is still needed to close each open gap: any one of these records. */
    const missingOf = (m: MemberRow) =>
      openOf(m)
        .filter((g) => !only || g.def.code === only)
        .map((g) => ({
          code: g.def.code,
          ...missingEvidenceFor(g.def.code, yearOf(m)),
        }));
    const evidenceCol = (
      key: string,
      header: string,
      line: (x: {
        code: MeasureCode;
        date: Date;
        title: string;
        sub: string;
      }) => string,
      extra: Partial<Column<MemberRow>> = {},
    ): Column<MemberRow> => ({
      key,
      header,
      accessor: (m) => evidenceOf(m).map(line),
      render: (m) => {
        const ev = evidenceOf(m);
        return ev.length === 0 ? (
          "–"
        ) : (
          <Stack spacing={0.5} alignItems="flex-start">
            {ev.map((x) => (
              <span key={x.code}>{line(x)}</span>
            ))}
          </Stack>
        );
      },
      hideBelow: "lg",
      ...extra,
    });
    const lastOutreach = (m: MemberRow) =>
      openOf(m)
        .flatMap((g) => g.work.outreach)
        .sort((a, b) => b.when.localeCompare(a.when))[0];
    const lastContact = (m: MemberRow) => {
      if (openOf(m).length === 0) return null;
      const o = lastOutreach(m);
      return o ? new Date(o.when) : null;
    };
    const contactResult = (m: MemberRow) =>
      openOf(m).length === 0
        ? null
        : (lastOutreach(m)?.result ?? NOT_CONTACTED);
    const excludedOf = (m: MemberRow) =>
      measures.filter(
        (x) => resultsFor(m, yearOf(m))[x.code].state === "Excluded",
      );
    // Inside one measure: how this member came out for it (Met, Not met, Excluded, Needs review).
    const resultColumn: Column<MemberRow> | null = only
      ? {
          key: "result",
          header: "Measure result",
          help: "How the member came out for this measure in the measurement year. Not met is the care gap. Needs review means the evidence is missing or conflicting, so it is not counted as a gap yet. Excluded members are not in the rate.",
          accessor: (m) => stateLabel[resultsFor(m, yearOf(m))[only].state],
          sortable: true,
          nowrap: true,
          render: (m) => {
            const st = resultsFor(m, yearOf(m))[only].state;
            return <StatusChip tone={stateTone[st]} label={stateLabel[st]} />;
          },
          filter: {
            type: "select",
            options: opt(RESULT_STATES.map((x) => stateLabel[x])),
          },
        }
      : null;
    const all: Column<MemberRow>[] = [
      ...(() => {
        const base = memberColumns<MemberRow>((m) => m, yearOf);
        const lead = [
          ...base.slice(0, 2),
          ...(withYear ? [yearColumn] : []),
          ...(resultColumn ? [resultColumn] : []),
        ];
        return [...lead, ...base.slice(2)];
      })(),
      {
        key: "openCount",
        header: "Open gaps",
        help: "How many of this member's care gaps are not closed yet. The Gaps column lists them, and Closed gaps lists the ones already closed this year. In the Filters panel, pick measures in the Measure filter first and the count then covers only those measures (2 open gaps across BCS and CCS). For a past year it counts the measures that were not met when the year ended.",
        accessor: (m) => gapCodes(m).length,
        sortable: true,
        align: "right",
        nowrap: true,
        filterLabel: LABEL.openGaps,
        // On the Members list: pick how many. Inside one measure a member has at most one open gap, so it stays yes / no.
        filterAccessor: (m, f) => {
          // With measures picked in the Measure filter, count only the open gaps in those measures.
          const picked = (f.gaps as string[] | undefined) ?? [];
          const n = gapCodes(m).filter(
            (c) => picked.length === 0 || picked.includes(c),
          ).length;
          if (only) return n > 0 ? "Has an open gap" : "No open gaps";
          return openGapsLabel(n);
        },
        filter: {
          type: "select",
          ordered: true,
          options: opt(
            only ? ["Has an open gap", "No open gaps"] : OPEN_GAP_VALUES,
          ),
        },
      },
      facets.ageGroup,
      facets.race,
      facets.ethnicity,
      facets.pcp,
      {
        key: "gaps",
        header: "Gaps",
        // In the Filters panel this is "Measure", right under Measurement year.
        filterLabel: "Measure",
        filterPinned: true,
        help: "The measures where this member has an open care gap, by the short form of the measure. Hover a short form to read the full name. The Open gaps column counts them. A gap that was closed is not listed here: see Closed gaps.",
        accessor: (m) => gapCodes(m),
        render: (m) => {
          const codes = gapCodes(m);
          return codes.length === 0 ? (
            "None"
          ) : (
            <Stack spacing={0.5} alignItems="flex-start">
              {codes.map((c) => (
                <StatusChip
                  key={c}
                  tone="primary"
                  label={c}
                  tip={measures.find((x) => x.code === c)?.name}
                />
              ))}
            </Stack>
          );
        },
        // Inside one measure this filter makes no sense (every row is that measure), so it is left out there.
        filter: only
          ? undefined
          : {
              type: "multiselect",
              options: measureOptions,
            },
      },
      {
        key: "found",
        header: "Gap identified",
        help: "The earliest date any of this member's open gaps was found. Demo date: the spec has no such field.",
        accessor: earliest,
        render: (m) => dateCell(earliest(m)),
        sortable: true,
        nowrap: true,
        filter: { type: "dateRange" },
      },
      {
        key: "missing",
        header: "Missing evidence",
        help: "What is still needed to close each open gap: any one of the listed records. Hover the text to see the date window for each one. Members with no open gap show a dash.",
        accessor: (m) => missingOf(m).map((x) => `${x.code}: ${x.labels}`),
        render: (m) => {
          const ms = missingOf(m);
          return ms.length === 0 ? (
            "–"
          ) : (
            <Stack spacing={0.5} alignItems="flex-start">
              {ms.map((x) => (
                <span key={x.code}>
                  <b>{x.code}</b>: <Term tip={x.windows}>{x.labels}</Term>
                </span>
              ))}
            </Stack>
          );
        },
        hideBelow: "lg",
        width: 260,
      },
      {
        key: "closed",
        header: "Closed gaps",
        defaultHidden: false,
        help: "Gaps closed in the current measurement year (January 1 to December 31), with the day each was closed. A closed gap is no longer counted in Open gaps. The Evidence date and Evidence code columns show the record that closed it. A past year has no care-gap work, so it shows a dash.",
        accessor: (m) =>
          closedOf(m).map((g) => `${g.def.code}: ${fmtDay(g.work.closed!.on)}`),
        render: (m) => {
          const cs = closedOf(m);
          return cs.length === 0 ? (
            "–"
          ) : (
            <Stack spacing={0.5} alignItems="flex-start">
              {cs.map((g) => (
                <span key={g.id}>
                  <Term tip={g.def.name}>
                    <b>{g.def.code}</b>
                  </Term>
                  : {fmtDay(g.work.closed!.on)}
                </span>
              ))}
            </Stack>
          );
        },
        hideBelow: "lg",
        filterLabel: "Closed gap in measure",
        filterAccessor: (m) => closedOf(m).map((g) => g.def.code),
        filter: only
          ? undefined
          : { type: "multiselect", options: measureOptions },
      },
      {
        ...evidenceCol(
          "evDate",
          "Evidence date",
          (x) => (only ? "" : `${x.code}: `) + fmtDate(x.date),
          {
            help: "The service date of the record that closed each closed gap, one line per gap (same measures as Closed gaps). Open gaps have no evidence yet: see Missing evidence. Sorting and the date filter use the latest.",
            accessor: latestEvidence,
            sortable: true,
            nowrap: true,
            filter: { type: "dateRange" },
          },
        ),
        render: (m) => {
          const ev = evidenceOf(m);
          return ev.length === 0 ? (
            "–"
          ) : (
            <Stack spacing={0.5} alignItems="flex-start">
              {ev.map((x) => (
                <span key={x.code}>
                  {!only && (
                    <>
                      <Term tip={measures.find((d) => d.code === x.code)?.name}>
                        {x.code}
                      </Term>
                      :{" "}
                    </>
                  )}
                  {fmtDate(x.date)}
                </span>
              ))}
            </Stack>
          );
        },
      },
      {
        ...evidenceCol("evCode", "Evidence", (x) => x.title, {
          help: "The record that closed each closed gap, one line per gap: the test or service (and its result, for a lab) in larger text, with its code under it, for example Hemoglobin A1c: 7.8% and 4548-4 (LOINC). Open gaps have no evidence yet: see Missing evidence.",
        }),
        render: (m) => {
          const ev = evidenceOf(m);
          return ev.length === 0 ? (
            "–"
          ) : (
            <Stack spacing={0.75} alignItems="flex-start">
              {ev.map((x) => (
                <span key={x.code}>
                  {!only && <b>{x.code}: </b>}
                  <b>{x.title}</b>
                  {x.sub && (
                    <>
                      <br />
                      <Typography
                        component="span"
                        sx={{ fontSize: ".75rem", color: "ink.500" }}
                      >
                        {x.sub}
                      </Typography>
                    </>
                  )}
                </span>
              ))}
            </Stack>
          );
        },
      },
      {
        key: "excluded",
        header: "Excluded from",
        help: "The measures this member is excluded from, because an exclusion applies (for example a colectomy for COL-E). An excluded member has no care gap for that measure.",
        accessor: (m) => excludedOf(m).map((x) => x.code),
        render: (m) => {
          const ex = excludedOf(m);
          return ex.length === 0 ? (
            "None"
          ) : (
            <Stack spacing={0.5} alignItems="flex-start">
              {ex.map((x) => (
                <StatusChip
                  key={x.code}
                  tone="neutral"
                  label={x.code}
                  tip={x.name}
                />
              ))}
            </Stack>
          );
        },
        filter: {
          type: "multiselect",
          options: measureOptions,
        },
      },
      {
        key: "diagnosis",
        header: "Diagnosis",
        help: "The diagnoses on file for the member in the measurement year, from claims and the EHR problem list (code and name). Pick one or more in the Filters panel to find members who have any of them.",
        accessor: (m) => diagnosesOf(m),
        render: (m) => {
          const d = diagnosesOf(m);
          return d.length === 0 ? (
            "–"
          ) : (
            <Stack spacing={0.5} alignItems="flex-start">
              {d.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </Stack>
          );
        },
        defaultHidden: true,
        hideBelow: "lg",
        filter: { type: "multiselect", options: opt(diagnosisValues) },
      },
      ...(only
        ? []
        : [
            {
              key: "results",
              header: "Measure results",
              help: "How the member came out in each measure they are in: Met, Not met, Excluded or Needs review. Pick, for example, BCS-E: Met in the Filters panel to find the members who met breast cancer screening.",
              accessor: (m: MemberRow) => resultLines(m),
              render: (m: MemberRow) => {
                const l = resultLines(m);
                return l.length === 0 ? (
                  "–"
                ) : (
                  <Stack spacing={0.5} alignItems="flex-start">
                    {l.map((t) => (
                      <span key={t}>{t}</span>
                    ))}
                  </Stack>
                );
              },
              defaultHidden: true,
              hideBelow: "lg",
              filterLabel: "Measure result",
              filter: {
                type: "multiselect" as const,
                options: opt(resultValues),
              },
            } as Column<MemberRow>,
          ]),
      {
        key: "a1c",
        header: "Latest HbA1c",
        help: "The most recent final HbA1c result of the year, for members the diabetes blood sugar measure (GSD) counts. Above 9% is poor control, a clinical priority even when the test was done. No result means no final test, or a lab that sent no value.",
        accessor: (m) => latestA1c(m, yearOf(m))?.value ?? null,
        render: (m) => {
          const t = latestA1c(m, yearOf(m));
          return t && t.value !== undefined ? `${t.value}%` : "–";
        },
        sortable: true,
        align: "right",
        nowrap: true,
        defaultHidden: only !== "GSD",
        filterAccessor: (m) => a1cBandOf(m, yearOf(m)),
        filter: { type: "select", ordered: true, options: opt(a1cBands) },
      },
      {
        key: "ageStatus",
        header: "Age status",
        help: "Ages out next year: the member is at the top age of a measure in the measurement year. Just aged in: the member reached the lowest age of a measure that year. Based on age on December 31 of that year, with that year's age ranges.",
        accessor: (m) =>
          measures
            .filter((x) => !only || x.code === only)
            .flatMap((x) => {
              const a = ageStatusOf(m, x.code, yearOf(m));
              return a ? [`${x.code}: ${a.toLowerCase()}`] : [];
            }),
        render: (m) => {
          const l = measures
            .filter((x) => !only || x.code === only)
            .flatMap((x) => {
              const a = ageStatusOf(m, x.code, yearOf(m));
              return a ? [`${x.code}: ${a.toLowerCase()}`] : [];
            });
          return l.length === 0 ? (
            "–"
          ) : (
            <Stack spacing={0.5} alignItems="flex-start">
              {l.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </Stack>
          );
        },
        defaultHidden: true,
        hideBelow: "lg",
        filterAccessor: (m) =>
          measures
            .filter((x) => !only || x.code === only)
            .flatMap((x) => {
              const a = ageStatusOf(m, x.code, yearOf(m));
              return a ? [a] : [];
            }),
        filter: {
          type: "multiselect",
          options: opt(["Ages out next year", "Just aged in"]),
        },
      },
      {
        key: "appt",
        header: "Next appointment",
        help: "The soonest scheduled visit across this member's open gaps. Demo data: the spec has no appointment file.",
        accessor: nextAppt,
        render: (m) => dateCell(nextAppt(m), isPast(m) ? "–" : "None"),
        sortable: true,
        nowrap: true,
        filter: { type: "dateRange", presets: apptPresets },
      },
      {
        key: "lastContact",
        header: "Last contact",
        help: "The most recent outreach logged on any of this member's open gaps. Demo data: the contact log is made up.",
        accessor: lastContact,
        render: (m) =>
          dateCell(lastContact(m), isPast(m) ? "–" : NOT_CONTACTED),
        sortable: true,
        nowrap: true,
        filter: { type: "dateRange" },
      },
      {
        key: "contactResult",
        header: "Contact result",
        help: "What happened at the most recent contact. Not contacted yet means no outreach is logged on any of the member's open gaps, so staff will not repeat a call.",
        accessor: contactResult,
        render: (m) => contactResult(m) ?? "–",
        sortable: true,
        hideBelow: "lg",
        filter: {
          type: "multiselect",
          options: opt([NOT_CONTACTED, ...outreachResults]),
        },
      },
      {
        key: "team",
        header: "Care team",
        help: "The team that looks after this member. Demo data: the spec has no care team field.",
        accessor: (m) => careTeamOf(m).team,
        sortable: true,
        hideBelow: "lg",
        filter: { type: "multiselect", options: opt(careTeams) },
      },
      {
        key: "cm",
        header: "Care manager",
        help: "The member's primary care manager. When the member has an open gap, it is the care manager of the first open gap, in the usual measure order. Demo name: the spec has no care manager field.",
        accessor: (m) => primary(m)?.careManager ?? careTeamOf(m).manager,
        sortable: true,
        hideBelow: "lg",
        filter: { type: "multiselect", options: opt(careManagers) },
      },
      facets.state,
      facets.county,
      facets.military,
      {
        key: "updated",
        header: "Last updated",
        help: "The later of the last data refresh and the last change to a care gap. The refresh date is demo data: the spec has no per-member date.",
        accessor: updated,
        render: (m) => {
          const u = updated(m);
          return u ? fmtDay(u.toISOString()) : "–";
        },
        sortable: true,
        nowrap: true,
        hideBelow: "lg",
        filter: { type: "dateRange" },
      },
    ];
    // Version 2 only. Gap identified shows one date per open gap instead of the earliest one.
    const foundMulti: Column<MemberRow> = {
      key: "found",
      header: "Gap identified date",
      help: "The date each open care gap was found, one line per gap, with the measure it belongs to (same measures as Gap Measures). Sorting and the date filter use the earliest one. Demo dates: the spec has no such field.",
      accessor: earliest,
      render: (m) => {
        // Same order as the Gap Measures column, so each date lines up with its measure.
        const gs = openOf(m);
        return gs.length === 0 ? (
          dateCell(null)
        ) : (
          <Stack spacing={0.5} alignItems="flex-start">
            {gs.map((g) => (
              <span key={g.id}>
                <Term tip={g.def.name}>
                  <b>{g.def.code}</b>
                </Term>
                : {fmtDate(g.identified)}
              </span>
            ))}
          </Stack>
        );
      },
      sortable: true,
      nowrap: true,
      filter: { type: "dateRange" },
    };
    // Version 2 only. The measures whose eligible population (the members a measure counts) the member is in.
    const eligibleOf = (m: MemberRow) =>
      measures.filter(
        (x) =>
          (!only || x.code === only) &&
          resultsFor(m, yearOf(m))[x.code].state !== "Not eligible",
      );
    const eligibleCol: Column<MemberRow> = {
      key: "eligible",
      header: "HEDIS measures eligibility",
      help: "All the HEDIS measures this member is part of, by the short form of the measure. Hover a short form to read the full name. It is the same list as Members in Measure on the Quality Measures page, so a member who is excluded from a measure still shows it here. A dash means no measure counts the member.",
      accessor: (m) => eligibleOf(m).map((x) => x.code),
      render: (m) => {
        const l = eligibleOf(m);
        return l.length === 0 ? (
          "–"
        ) : (
          <Stack spacing={0.5} alignItems="flex-start">
            {l.map((x) => (
              <StatusChip
                key={x.code}
                tone="neutral"
                label={x.code}
                tip={x.name}
              />
            ))}
          </Stack>
        );
      },
      filterLabel: "HEDIS measures eligibility",
      filter: only ? undefined : { type: "multiselect", options: measureOptions },
    };
    const final =
      version === 2
        ? versionTwo(all, { eligible: eligibleCol, found: foundMulti })
        : all;
    // The search box looks at the member's name, Member ID and insurance number only. Without this a name such as "Paul" also found members whose care manager is Paul.
    return final.map((c) => ({
      ...c,
      searchable: c.key === "name" || c.key === "id" || c.key === "insurance",
    }));
  }, [openOfNow, gapsOfNow, only, withYear, version]);
}
