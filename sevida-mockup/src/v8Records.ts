/**
 * Version 8 member records (LPP-16154 to LPP-16163): the rows of the Claims, Diagnoses, Encounters, Immunizations, Labs, Medications,
 * Observations, Procedures and Providers tabs, with the fields the tickets ask for.
 * The files hold some of these fields. The rest (claim IDs, created and updated dates, paid amounts, places of service ...) are
 * made up the same way every time from the record itself, and every tab says so ("Sample data").
 */
import { DEMO_NOW, MY, hashOf, memberForYear, providerName, providers, v3Filler, v3TabOf } from "./data";
import type { Evt, Member } from "./data";
import { impactsOf } from "./careGaps";

export const DASH = "--";
const DAY = 86_400_000;
export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);
const pad = (n: number, w = 2) => String(n).padStart(w, "0");
const h = (s: string) => hashOf(s);

/** Every record the files hold for the member, plus the routine demo records that fill each tab (see v3Filler). */
export const allRecords = (m: Member): Evt[] => [...memberForYear(m, MY).events, ...v3Filler(m)];

export const evKey = (e: Evt) => `${e.file}|${e.code}|${e.date.getTime()}|${e.text}`;

/** "Linda M. Chen, NP" becomes "Chen, Linda M. NP" (LPP-16154: "Last, First" plus credentials). */
export const lastFirst = (name?: string): string => {
  if (!name) return DASH;
  const [main, cred] = name.split(", ");
  const words = main.trim().split(/\s+/);
  if (words.length < 2) return name; // an organization
  const last = words[words.length - 1];
  const first = words.slice(0, -1).join(" ");
  return `${last}, ${first}${cred ? ` ${cred}` : ""}`;
};

/** The provider on a record. A record from a file that has no provider gets the member's primary care provider, a sample value. */
export const providerFor = (m: Member, e: Evt): { npi: string; name: string } => {
  const npi = e.provider ?? (h(`${m.id}pcp`) % 2 ? "1000000111" : "1000000137");
  return { npi, name: providerName(npi) };
};
export const providerCell = (m: Member, e: Evt) => lastFirst(providerFor(m, e).name);

/** Sample dates: created a day or two after the service, last changed up to three weeks later, never after the demo's today. */
export const createdOn = (e: Evt): Date => {
  const c = e.identifiedOn ?? addDays(e.date, 1 + (h(`c${e.code}${e.date.getTime()}`) % 3));
  return c > DEMO_NOW ? DEMO_NOW : c;
};
export const updatedOn = (e: Evt): Date => {
  const u = addDays(createdOn(e), h(`u${e.code}${e.date.getTime()}`) % 21);
  return u > DEMO_NOW ? DEMO_NOW : u;
};

/** The system or feed a record came in on (LPP-16154: "Source system or feed name"). */
export const sourceName = (e: Evt): string =>
  e.kind === "Claim"
    ? e.supplemental
      ? "Supplemental data feed"
      : "TRICARE claims"
    : e.kind === "Pharmacy"
      ? e.file === "pharm"
        ? "MHS GENESIS Pharmacy"
        : "TRICARE pharmacy claims"
      : e.kind === "Vaccine"
        ? "MHS GENESIS immunizations"
        : "MHS GENESIS";

/** The HEDIS measures a record is evidence for (eligibility, exclusion or numerator), as the measure codes. */
export const measuresOf = (m: Member, e: Evt): string[] => [
  ...new Set(impactsOf(m, e).map((i) => i.code as string)),
];

const money = (n: number) => `$${n.toFixed(2)}`;

/* ------------------------------------------------------------------ claims (LPP-16156) */

export type ClaimType = "P" | "I" | "D";
export const CLAIM_TYPE_NAME: Record<ClaimType, string> = {
  P: "Professional",
  I: "Institutional",
  D: "Dental",
};
const claimTypeOf = (e: Evt): ClaimType =>
  e.system === "CDT" ? "D" : e.system === "ICD-10-PCS" ? "I" : "P";

const DX_BY_TAG: Array<[RegExp, string, string]> = [
  [/mammogram/, "Z12.31", "Encounter for screening mammogram for malignant neoplasm of breast"],
  [/colonoscopy|fit|stool-dna|ct-colonography|sigmoidoscopy/, "Z12.11", "Encounter for screening for malignant neoplasm of colon"],
  [/cytology|hpv/, "Z12.4", "Encounter for screening for malignant neoplasm of cervix"],
  [/hba1c|diabetes/, "E11.9", "Type 2 diabetes mellitus without complications"],
  [/well-care/, "Z00.129", "Encounter for routine child health examination without abnormal findings"],
];

export interface ClaimRow {
  id: string;
  from: Date;
  to: Date;
  type: ClaimType;
  lines: Array<{ text: string; code: string; system: string }>;
  payment: "Paid" | "Denied" | "Partially Paid";
  paid: string;
  provider: string;
  providerNpi: string;
  diagnoses: Array<{ code: string; text: string }>;
  updated: Date;
  measures: string[];
  status: string;
  admission: Date | null;
  discharge: Date | null;
  supplement: "Y" | "N";
  source: string;
}

/** One row per claim. Service lines of the same day, type and provider are one claim. */
export const claimRows = (m: Member): ClaimRow[] => {
  const evs = allRecords(m).filter((e) => v3TabOf(e) === "claims" && e.kind !== "Pharmacy");
  const groups = new Map<string, Evt[]>();
  for (const e of evs) {
    const k = `${e.date.getTime()}|${claimTypeOf(e)}|${e.provider ?? ""}`;
    groups.set(k, [...(groups.get(k) ?? []), e]);
  }
  return [...groups.values()].map((g) => {
    const e0 = g[0];
    const type = claimTypeOf(e0);
    const seed = h(`${m.id}${e0.date.getTime()}${type}`);
    const denied = g.some((x) => x.status === "denied");
    const amt = 20 + (seed % 48000) / 100;
    const dx: ClaimRow["diagnoses"] = [];
    for (const x of g) {
      const hit = DX_BY_TAG.find(([re]) => re.test(x.tag));
      if (hit && !dx.some((d) => d.code === hit[1])) dx.push({ code: hit[1], text: hit[2] });
    }
    const p = e0.provider ? providerName(e0.provider) : undefined;
    return {
      id: `${e0.date.getFullYear()}${pad(e0.date.getMonth() + 1)}${pad(e0.date.getDate())}${pad(10000 + (seed % 89999), 5)}`,
      from: e0.date,
      to: type === "I" ? addDays(e0.date, 1 + (seed % 3)) : e0.date,
      type,
      lines: g.map((x) => ({ text: x.text, code: x.code, system: x.system })),
      payment: denied ? "Denied" : seed % 7 === 0 ? "Partially Paid" : "Paid",
      paid: denied ? money(0) : money(seed % 7 === 0 ? amt / 2 : amt),
      provider: lastFirst(p),
      providerNpi: e0.provider ?? DASH,
      diagnoses: type === "D" ? [] : dx,
      updated: updatedOn(e0),
      measures: [...new Set(g.flatMap((x) => measuresOf(m, x)))],
      status: "Active",
      admission: type === "I" ? e0.date : null,
      discharge: type === "I" ? addDays(e0.date, 1 + (seed % 3)) : null,
      supplement: g.some((x) => x.supplemental) ? "Y" : "N",
      source: sourceName(e0),
    };
  });
};

/* ------------------------------------------------------------------ diagnoses (LPP-16157) */

const SNOMED: Record<string, string> = {
  "E11.9": "44054006",
  I10: "38341003",
  "E78.5": "55822004",
  "J45.909": "195967001",
  "K21.9": "235595009",
};
const ACUTE = ["J06.9", "H66.90", "L22"];
export interface DxRow {
  key: string;
  e: Evt;
  start: Date;
  end: Date | null;
  name: string;
  codes: Array<{ code: string; system: string }>;
  status: "Active" | "Resolved" | "Inactive";
  provider: string;
  measures: string[];
  created: Date;
  updated: Date;
  source: string;
}
export const dxRows = (m: Member): DxRow[] =>
  allRecords(m)
    .filter((e) => v3TabOf(e) === "diagnoses")
    .map((e) => {
      const acute = ACUTE.includes(e.code);
      return {
        key: evKey(e),
        e,
        start: e.date,
        end: acute ? addDays(e.date, 7 + (h(e.code + e.date.getTime()) % 8)) : null,
        name: e.text,
        codes: [
          { code: e.code, system: e.system === "ICD-10" ? "ICD-10-CM" : e.system },
          ...(SNOMED[e.code] ? [{ code: SNOMED[e.code], system: "SNOMED CT" }] : []),
        ],
        status: acute ? ("Resolved" as const) : ("Active" as const),
        provider: providerCell(m, e),
        measures: measuresOf(m, e),
        created: createdOn(e),
        updated: updatedOn(e),
        source: sourceName(e),
      };
    });

/* ------------------------------------------------------------------ encounters (LPP-16158) */

const VISIT_TYPE = (e: Evt): string => {
  if (e.telehealth) return "Telehealth visit";
  const n = Number(e.code);
  if (n >= 99381 && n <= 99397) return "Annual wellness visit";
  if (n >= 99202 && n <= 99215) return "Office visit";
  if (/well/i.test(e.text)) return "Annual wellness visit";
  return "Office visit";
};
const POS = ["Madigan Family Medicine Clinic", "Madigan Army Medical Center", "Madigan Pediatrics Clinic", "Madigan Internal Medicine Clinic"];
const STATUS_ENC: Record<string, string> = {
  finished: "Completed",
  completed: "Completed",
  final: "Completed",
  paid: "Completed",
  cancelled: "Canceled",
  planned: "Planned",
  "in-progress": "In Progress",
};
export interface EncRow {
  key: string;
  e: Evt;
  date: Date;
  end: Date | null;
  type: string;
  status: string;
  diagnoses: Array<{ code: string; text: string }>;
  provider: string;
  place: string;
  measures: string[];
  reason: string;
  encId: string;
  created: Date;
  updated: Date;
  source: string;
}
export const encRows = (m: Member): EncRow[] => {
  const all = allRecords(m);
  const dx = all.filter((e) => v3TabOf(e) === "diagnoses");
  return all
    .filter((e) => v3TabOf(e) === "visits")
    .map((e) => {
      const near = dx.filter((x) => Math.abs(x.date.getTime() - e.date.getTime()) <= 7 * DAY).slice(0, 2);
      const seed = h(`${m.id}enc${e.date.getTime()}${e.code}`);
      return {
        key: evKey(e),
        e,
        date: e.date,
        end: null,
        type: VISIT_TYPE(e),
        status: STATUS_ENC[e.status] ?? "Completed",
        diagnoses: near.map((x) => ({ code: x.code, text: x.text })),
        provider: providerCell(m, e),
        place: e.telehealth ? "Telehealth (member's home)" : POS[seed % POS.length],
        measures: measuresOf(m, e),
        reason: e.text,
        encId: `ENC-${e.date.getFullYear()}${pad(e.date.getMonth() + 1)}${pad(e.date.getDate())}-${pad(seed % 10000, 4)}`,
        created: createdOn(e),
        updated: updatedOn(e),
        source: sourceName(e),
      };
    });
};

/* ------------------------------------------------------------------ labs (LPP-16159) */

const PANEL: Record<string, string> = {
  "2089-1": "Lipid Panel",
  "2085-9": "Lipid Panel",
  "2160-0": "Basic Metabolic Panel",
  "2345-7": "Basic Metabolic Panel",
  "718-7": "Complete Blood Count",
};
const CPT_OF_LAB: Record<string, string> = {
  "4548-4": "83036",
  "2089-1": "83721",
  "2085-9": "83718",
  "2160-0": "82565",
  "2345-7": "82947",
  "718-7": "85018",
  "3016-3": "84443",
};
export interface LabRow {
  key: string;
  e: Evt;
  date: Date;
  test: string;
  result: string;
  range: string;
  flag: string;
  resulted: Date | null;
  panel: string;
  loinc: string;
  provider: string;
  measures: string[];
  encounter: { label: string; date: Date } | null;
  cpt: string;
  created: Date;
  updated: Date;
  source: string;
}
export const labRows = (m: Member): LabRow[] => {
  const all = allRecords(m);
  const visits = all.filter((e) => v3TabOf(e) === "visits");
  return all
    .filter((e) => v3TabOf(e) === "labs")
    .map((e) => {
      const unit = e.tag === "hba1c" ? "%" : (e.unit ?? "");
      const prelim = e.status === "preliminary";
      const near = visits
        .map((v) => ({ v, d: Math.abs(v.date.getTime() - e.date.getTime()) }))
        .filter((x) => x.d <= 14 * DAY)
        .sort((a, b) => a.d - b.d)[0];
      return {
        key: evKey(e),
        e,
        date: e.date,
        test: e.text.replace(/,? ?\d+(\.\d+)?%.*$/, "").replace(/ \(preliminary\)$/, ""),
        result: e.value === undefined ? DASH : `${e.value}${unit ? ` ${unit}` : ""}`,
        range: e.refRange ? (/[A-Za-z%]/.test(e.refRange.replace(/ to /, "")) || !unit ? e.refRange : `${e.refRange} ${unit}`) : DASH,
        flag: e.flag && e.flag !== "Normal" ? e.flag : DASH,
        resulted: prelim ? null : (e.resultedOn ?? addDays(e.date, 1 + (h(e.code + e.date.getTime()) % 3))),
        panel: PANEL[e.code] ?? DASH,
        loinc: e.code,
        provider: providerCell(m, e),
        measures: measuresOf(m, e),
        encounter: near ? { label: VISIT_TYPE(near.v), date: near.v.date } : null,
        cpt: CPT_OF_LAB[e.code] ?? DASH,
        created: createdOn(e),
        updated: updatedOn(e),
        source: sourceName(e),
      };
    });
};

/* ------------------------------------------------------------------ medications (LPP-16160) and immunizations */

export interface MedRow {
  key: string;
  date: Date;
  name: string;
  status: "Active" | "Inactive" | "Discontinued";
  quantity: string;
  days: number;
  code: string;
  provider: string;
  prescriberNpi: string;
  measures: string[];
  pharmacy: string;
  pharmacyNpi: string;
  refills: string;
  claimId: string;
  claimStatus: string;
  payment: string;
  paid: string;
  created: Date;
  updated: Date;
  source: string;
}
const MED_FILL = {
  infant: [["Cholecalciferol 400 IU/mL oral drops", "00536-1234-08", 30]],
  child: [
    ["Albuterol sulfate 90 mcg/actuation inhaler", "00093-3174-31", 30],
    ["Amoxicillin 400 mg/5 mL oral suspension", "00093-4150-73", 10],
  ],
  adult: [
    ["Lisinopril 10 mg tablet", "00093-7339-56", 30],
    ["Atorvastatin 20 mg tablet", "00093-5057-98", 30],
    ["Omeprazole 20 mg capsule", "00093-7347-56", 30],
  ],
} as const;
const band = (m: Member) => {
  const age = MY - m.dob.getFullYear();
  return age < 1 ? "infant" : age < 18 ? "child" : "adult";
};
export const medRows = (m: Member): MedRow[] => {
  const mk = (
    key: string,
    date: Date,
    name: string,
    days: number,
    codeSystem: string,
    code: string,
    npi: string,
    measures: string[],
    clinic: boolean,
    created: Date,
    updated: Date,
    source: string,
  ): MedRow => {
    const seed = h(`${m.id}${key}`);
    const total = 1 + (seed % 4);
    return {
      key,
      date,
      name,
      status: DEMO_NOW.getTime() - date.getTime() <= 100 * DAY ? "Active" : "Inactive",
      quantity: `${days * (/inhaler|drops|suspension/i.test(name) ? 1 : 2)} ${/tablet/i.test(name) ? "tablets" : /capsule/i.test(name) ? "capsules" : /mL/.test(name) ? "mL" : "doses"}`,
      days,
      code: `${codeSystem}: ${code}`,
      provider: lastFirst(providerName(npi)),
      prescriberNpi: npi,
      measures,
      pharmacy: clinic ? "Madigan Outpatient Pharmacy" : "Madigan Outpatient Pharmacy",
      pharmacyNpi: `18${pad(seed % 100000000, 8)}`,
      refills: `${seed % (total + 1)} out of ${total}`,
      claimId: clinic ? DASH : `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(10000 + (seed % 89999), 5)}`,
      claimStatus: clinic ? DASH : "Active",
      payment: clinic ? DASH : "Paid",
      paid: clinic ? DASH : money(5 + (seed % 4500) / 100),
      created,
      updated,
      source,
    };
  };
  const fromFiles = allRecords(m)
    .filter((e) => e.kind === "Pharmacy")
    .map((e) => {
      const name = e.text.replace(/,? ?\d+ days?.*$/i, "").replace(/ \(clinic dispensing\)$/, "");
      const days = Number(/(\d+) days?/i.exec(e.text)?.[1] ?? 30);
      return mk(
        evKey(e),
        e.date,
        name,
        days,
        e.system,
        e.code,
        providerFor(m, e).npi,
        measuresOf(m, e),
        e.file === "pharm",
        createdOn(e),
        updatedOn(e),
        sourceName(e),
      );
    });
  const need = Math.max(0, 2 - fromFiles.length);
  const pool = MED_FILL[band(m)];
  const filler = Array.from({ length: Math.min(need, pool.length) }, (_, i) => {
    const [name, ndc, days] = pool[(h(m.id + "med") + i) % pool.length];
    const date = new Date(2026, 3 + ((h(m.id + "md" + i) % 5)), 3 + ((h(m.id + "dd" + i) % 22)));
    const d = date < m.dob ? addDays(m.dob, 30) : date;
    const e = { code: ndc, date: d } as Evt;
    return mk(`fill-${i}-${name}`, d, name, days, "NDC", ndc, providerFor(m, { provider: undefined } as Evt).npi, [], false, createdOn(e), updatedOn(e), "TRICARE pharmacy claims");
  });
  return [...fromFiles, ...filler];
};

export interface ImmRow {
  key: string;
  date: Date;
  vaccine: string;
  status: string;
  code: string;
  provider: string;
  measures: string[];
  created: Date;
  updated: Date;
  source: string;
}
const IMM_FILL = {
  infant: [["Hepatitis B vaccine, pediatric", "08"], ["Rotavirus vaccine, pentavalent", "116"], ["DTaP vaccine", "20"]],
  child: [["Influenza vaccine, seasonal, injectable", "141"], ["MMR vaccine", "03"], ["DTaP vaccine", "20"]],
  adult: [["Influenza vaccine, seasonal, injectable", "141"], ["Tdap vaccine", "115"], ["COVID-19 mRNA vaccine", "208"]],
} as const;
export const immRows = (m: Member): ImmRow[] => {
  const mk = (key: string, date: Date, vaccine: string, cvx: string, status: string, npi: string, measures: string[], e: Evt): ImmRow => ({
    key,
    date,
    vaccine,
    status: status === "completed" ? "Completed" : status === "not-done" ? "Not Done" : status.charAt(0).toUpperCase() + status.slice(1),
    code: `CVX: ${cvx}`,
    provider: lastFirst(providerName(npi)),
    measures,
    created: createdOn(e),
    updated: updatedOn(e),
    source: sourceName(e),
  });
  const fromFiles = allRecords(m)
    .filter((e) => e.kind === "Vaccine")
    .map((e) => mk(evKey(e), e.date, e.text, e.code, e.status, providerFor(m, e).npi, measuresOf(m, e), e));
  const need = Math.max(0, 2 - fromFiles.length);
  const pool = IMM_FILL[band(m)];
  const filler = Array.from({ length: Math.min(need, pool.length) }, (_, i) => {
    const [name, cvx] = pool[(h(m.id + "imm") + i) % pool.length];
    const date = new Date(2025 + (i % 2), 8 + (h(m.id + "im" + i) % 3), 2 + (h(m.id + "id" + i) % 24));
    const d = date < m.dob ? addDays(m.dob, 45) : date > DEMO_NOW ? DEMO_NOW : date;
    return mk(`fill-${i}-${name}`, d, name, cvx, "completed", providerFor(m, { provider: undefined } as Evt).npi, [], { code: cvx, date: d } as Evt);
  });
  return [...fromFiles, ...filler];
};

/* ------------------------------------------------------------------ observations (LPP-16161) */

const VITAL = ["8867-4", "8480-6", "8462-4", "29463-7", "8302-2", "39156-5", "8310-5", "9279-1"];
const OBS_STATUS: Record<string, string> = { final: "Final", preliminary: "Preliminary", amended: "Amended", corrected: "Corrected", cancelled: "Cancelled", registered: "Registered" };
export interface ObsRow {
  key: string;
  e: Evt;
  date: Date;
  end: Date | null;
  type: string;
  service: string;
  value: string;
  status: string;
  code: string;
  provider: string;
  measures: string[];
  related: { label: string; date: Date; tab: string } | null;
  claimStatus: string;
  payment: string;
  paid: string;
  created: Date;
  updated: Date;
  source: string;
}
export const obsRows = (m: Member): ObsRow[] => {
  const all = allRecords(m);
  const visits = all.filter((e) => v3TabOf(e) === "visits");
  return all
    .filter((e) => v3TabOf(e) === "observations")
    .map((e) => {
      const unit = e.tag === "hba1c" ? "%" : (e.unit ?? "");
      const flag = e.flag && e.flag !== "Normal" ? ` (${e.flag.charAt(0)})` : "";
      const near = visits
        .map((v) => ({ v, d: Math.abs(v.date.getTime() - e.date.getTime()) }))
        .filter((x) => x.d <= 14 * DAY)
        .sort((a, b) => a.d - b.d)[0];
      const vital = VITAL.includes(e.code);
      return {
        key: evKey(e),
        e,
        date: e.date,
        end: null,
        type: vital ? "Vital Signs" : e.tag === "hba1c" ? "Laboratory" : "Exam",
        service: e.text.replace(/ \d+(\.\d+)?.*$/, "").replace(/,.*$/, ""),
        value:
          e.value === undefined
            ? (/\d/.test(e.text) ? e.text.replace(/^[^\d]*/, "") : DASH) + flag
            : `${e.value}${unit ? ` ${unit}` : ""}${flag}`,
        status: OBS_STATUS[e.status] ?? "Final",
        code: `L: ${e.code}`,
        provider: providerCell(m, e),
        measures: measuresOf(m, e),
        related: near ? { label: VISIT_TYPE(near.v), date: near.v.date, tab: "encounters" } : null,
        claimStatus: DASH,
        payment: DASH,
        paid: DASH,
        created: createdOn(e),
        updated: updatedOn(e),
        source: sourceName(e),
      };
    });
};

/* ------------------------------------------------------------------ procedures (LPP-16162) */

export interface ProcRow {
  key: string;
  e: Evt;
  date: Date;
  name: string;
  value: string;
  status: string;
  provider: string;
  code: string;
  measures: string[];
  encounter: { label: string; date: Date } | null;
  claim: string;
  claimStatus: string;
  payment: string;
  paid: string;
  created: Date;
  updated: Date;
  source: string;
}
export const procRows = (m: Member): ProcRow[] => {
  const all = allRecords(m);
  const visits = all.filter((e) => v3TabOf(e) === "visits");
  return all
    .filter((e) => v3TabOf(e) === "procedures" && e.kind !== "Vaccine")
    .map((e) => {
      const near = visits
        .map((v) => ({ v, d: Math.abs(v.date.getTime() - e.date.getTime()) }))
        .filter((x) => x.d <= 14 * DAY)
        .sort((a, b) => a.d - b.d)[0];
      const seed = h(`${m.id}proc${e.date.getTime()}${e.code}`);
      const isClaim = e.kind === "Claim";
      return {
        key: evKey(e),
        e,
        date: e.date,
        name: e.text,
        value:
          e.tag === "mammogram"
            ? `Body site: ${e.side === "LT" ? "Left breast" : e.side === "RT" ? "Right breast" : "Both breasts"}`
            : e.tag === "colonoscopy" || e.tag === "sigmoidoscopy"
              ? "Body site: Colon"
              : DASH,
        status: e.status === "not-done" ? "Not Done" : e.status === "cancelled" ? "Stopped" : "Completed",
        provider: providerCell(m, e),
        code: `${e.system}: ${e.code}`,
        measures: measuresOf(m, e),
        encounter: near ? { label: VISIT_TYPE(near.v), date: near.v.date } : null,
        claim: isClaim ? `${e.date.getFullYear()}${pad(e.date.getMonth() + 1)}${pad(e.date.getDate())}${pad(10000 + (seed % 89999), 5)}` : DASH,
        claimStatus: isClaim ? "Active" : DASH,
        payment: isClaim ? (e.status === "denied" ? "Denied" : "Paid") : DASH,
        paid: isClaim ? (e.status === "denied" ? money(0) : money(50 + (seed % 20000) / 100)) : DASH,
        created: createdOn(e),
        updated: updatedOn(e),
        source: sourceName(e),
      };
    });
};

/* ------------------------------------------------------------------ providers (LPP-16163) */

const TAXONOMY: Record<string, string> = {
  "Family medicine (PCP)": "207Q00000X",
  "Family nurse practitioner (PCP)": "363LF0000X",
  "OB/GYN": "207V00000X",
  Radiology: "2085R0202X",
  Gastroenterology: "207RG0100X",
  Dentist: "122300000X",
  Hospital: "282N00000X",
  Clinic: "261QP2300X",
};
export type RecordTabKey = "claims" | "diagnoses" | "encounters" | "immunizations" | "labs" | "medications" | "observations" | "procedures";
const TAB_LABEL: Record<RecordTabKey, string> = {
  claims: "Claims",
  diagnoses: "Diagnoses",
  encounters: "Encounters",
  immunizations: "Immunizations",
  labs: "Labs",
  medications: "Medications",
  observations: "Observations",
  procedures: "Procedures",
};
export const tabKeyOfRecord = (e: Evt): RecordTabKey =>
  e.kind === "Pharmacy"
    ? "medications"
    : e.kind === "Vaccine"
      ? "immunizations"
      : ({ claims: "claims", diagnoses: "diagnoses", labs: "labs", observations: "observations", procedures: "procedures", visits: "encounters" } as const)[v3TabOf(e)];

export interface ProvRow {
  npi: string;
  name: string;
  active: "Yes" | "No";
  entity: "I" | "O";
  specialty: string;
  org: string;
  last: Date;
  first: Date;
  related: Array<{ tab: RecordTabKey; label: string; n: number }>;
  prescribing: "Y" | "N";
  taxonomy: string;
  orgNpi: string;
  phone: string;
  address: string;
  created: Date;
  updated: Date;
  source: string;
}
export const provRows = (m: Member): ProvRow[] => {
  type Grp = { npi: string; dates: Date[]; counts: Map<RecordTabKey, number>; last: Evt };
  const by = new Map<string, Grp>();
  for (const e of allRecords(m)) {
    const { npi } = providerFor(m, e);
    const cur: Grp = by.get(npi) ?? { npi, dates: [], counts: new Map<RecordTabKey, number>(), last: e };
    cur.dates.push(e.date);
    const t = tabKeyOfRecord(e);
    cur.counts.set(t, (cur.counts.get(t) ?? 0) + 1);
    by.set(npi, cur);
  }
  return [...by.values()].map((g) => {
    const p = providers.find((x) => x.npi === g.npi);
    const org = providers.find((x) => x.name === p?.org);
    const dates = [...g.dates].sort((a, b) => a.getTime() - b.getTime());
    const seed = h(g.npi);
    const individual = !!p && /,\s?(MD|NP|DDS|DO|PA)$/.test(p.name);
    return {
      npi: g.npi,
      name: lastFirst(p?.name ?? `NPI ${g.npi}`),
      active: "Yes" as const,
      entity: individual ? ("I" as const) : ("O" as const),
      specialty: p?.type ?? DASH,
      org: p?.org ?? DASH,
      last: dates[dates.length - 1],
      first: dates[0],
      related: [...g.counts.entries()].map(([tab, n]) => ({ tab, label: TAB_LABEL[tab], n })).sort((a, b) => b.n - a.n),
      prescribing: /MD|NP|DO|PA/.test(p?.name ?? "") ? ("Y" as const) : ("N" as const),
      taxonomy: TAXONOMY[p?.type ?? ""] ?? DASH,
      orgNpi: org ? org.npi : `19${pad(seed % 100000000, 8)}`.slice(0, 10),
      phone: `(253) 555-0${pad(100 + (seed % 900), 3)}`,
      address: "9040 Jackson Ave, Tacoma, WA 98431",
      created: addDays(dates[0], 1),
      updated: addDays(dates[dates.length - 1], 1) > DEMO_NOW ? DEMO_NOW : addDays(dates[dates.length - 1], 1),
      source: "MHS GENESIS",
    };
  });
};
