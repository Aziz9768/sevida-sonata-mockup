import type { ExportSheet } from "sevida-ui";
import type { Member, MeasureCode } from "../../data";
import {
  defaultRange,
  dimensionLabel,
  groupRates,
  kpisFor,
  periodText,
  trendSeries,
} from "../../dashboardData";
import type { DashFilters, Dimension } from "../../dashboardData";
import { stateLabel } from "../../data";
import { LABEL } from "../../sharedFilters";

/** One line per applied filter, written at the top of an export so the file says what it shows. */
export function filterLines(f: DashFilters): string[] {
  const out = [`Measurement period: ${periodText(f.year)}`];
  const add = (label: string, v: string) => v && out.push(`${label}: ${v}`);
  add(LABEL.member, f.memberId.trim());
  add(LABEL.result, f.status ? stateLabel[f.status] : "");
  add(
    LABEL.age,
    f.ageFrom !== "" || f.ageTo !== ""
      ? `${f.ageFrom !== "" ? `from ${f.ageFrom}` : ""}${f.ageFrom !== "" && f.ageTo !== "" ? " " : ""}${f.ageTo !== "" ? `to ${f.ageTo}` : ""}`
      : "",
  );
  const span = (a: string, b: string) =>
    a || b
      ? `${a ? `from ${a}` : ""}${a && b ? " " : ""}${b ? `to ${b}` : ""}`
      : "";
  add(LABEL.dob, span(f.dobFrom, f.dobTo));
  add(LABEL.sex, f.sex);
  add(LABEL.openGaps, f.openGaps);
  add(LABEL.multiGap, f.multiGap);
  add(LABEL.ageGroup, f.ageGroup.join(", "));
  add(LABEL.race, f.race.join(", "));
  add(LABEL.ethnicity, f.ethnicity.join(", "));
  add(LABEL.provider, f.provider.join(", "));
  add(LABEL.excluded, f.excluded.join(", "));
  add(LABEL.evDate, span(f.evFrom, f.evTo));
  add(LABEL.evSystem, f.evSystem.join(", "));
  add(LABEL.a1c, f.a1c);
  add(LABEL.state, f.state);
  add(LABEL.county, f.county);
  add(LABEL.military, f.military);
  if (out.length === 1) out.push("No filters applied");
  return out;
}

const DIMS: Dimension[] = ["race", "ethnicity", "ageGroup", "sex", "provider"];
const r1 = (n: number) => Math.round(n * 10) / 10;

export function measureSheets(
  code: MeasureCode,
  list: Member[],
  f: DashFilters,
): ExportSheet[] {
  const { initial, t } = kpisFor(code, list, f.year);
  const rate = (n: number) =>
    t.denominator ? r1((n / t.denominator) * 100) : 0;
  const groups: ExportSheet = {
    name: "By group",
    head: ["Split by", "Group", "Counted", "Met", "Not met", "Met %"],
    body: DIMS.flatMap((d) =>
      groupRates(code, list, f.year, d).map((g) => [
        dimensionLabel[d],
        g.group,
        g.t.denominator,
        g.t.met,
        g.t.gap,
        r1(g.t.rate),
      ]),
    ),
  };
  const range = defaultRange("monthly");
  const tr = trendSeries(code, list, "monthly", range, "met");
  return [
    {
      name: "Summary",
      head: ["Number", "Value"],
      body: [
        ["Initial population", initial],
        ["Eligible (counted)", t.denominator],
        ["Excluded", t.excluded],
        ["Met", t.met],
        ["Met %", rate(t.met)],
        ["Not met", t.gap],
        ["Not met %", rate(t.gap)],
      ],
    },
    groups,
    {
      name: "Trend (monthly)",
      head: ["Period", "Met %"],
      body: tr.labels.map((l, i) => [
        l,
        tr.values[i] === null ? "" : r1(tr.values[i] as number),
      ]),
    },
  ];
}

/** One row per measure, for the filters that are applied. */
export function allMeasuresSheet(
  rows: {
    def: { name: string; code: string };
    initial: number;
    t: {
      denominator: number;
      excluded: number;
      met: number;
      gap: number;
      rate: number;
    };
    closed: number | null;
  }[],
): ExportSheet {
  return {
    name: "All measures",
    head: [
      "Measure",
      "Code",
      "Initial population",
      "Eligible",
      "Excluded",
      "Met",
      "Not met",
      "Met %",
      "Gaps closed since last run",
    ],
    body: rows.map((r) => [
      r.def.name,
      r.def.code,
      r.initial,
      r.t.denominator,
      r.t.excluded,
      r.t.met,
      r.t.gap,
      r1(r.t.rate),
      r.closed ?? "",
    ]),
  };
}
