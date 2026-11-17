/**
 * Version 8 member records (LPP-16154 to LPP-16163): the rows of the Claims, Diagnoses, Encounters, Immunizations, Labs, Medications,
 * Observations, Procedures and Providers tabs, with the fields the tickets ask for.
 * The files hold some of these fields. The rest (claim IDs, created and updated dates, paid amounts, places of service ...) are
 * made up the same way every time from the record itself, and every tab says so ("Sample data").
 */
import { DEMO_NOW, MY, hashOf, memberForYear, providerName, providers, v3Filler, v3TabOf } from "./data";
import type { Evt, Member } from "./data";
import { impactsOf } from "./careGaps";
import { getVersion } from "./version";

export const DASH = "--";
const DAY = 86_400_000;
export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);
const pad = (n: number, w = 2) => String(n).padStart(w, "0");
const h = (s: string) => hashOf(s);
/** Version 16: a small share of sample records come without a value ("--" if not sent), the same ones every time. */
const missing = (key: string, oneIn: number) => getVersion() >= 16 && h(key) % oneIn === 0;
/** Version 16 (LPP-16156, LPP-16157): the ticket's names for the diagnosis code systems. */
export const dxSystem = () => (getVersion() >= 16 ? "ICD-10 Diagnosis" : "ICD-10-CM");
const snomedName = () => (getVersion() >= 16 ? "SNOMED" : "SNOMED CT");

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
  payment: "Paid" | "Denied" | "Partially Paid" | "Not Paid";
  paid: string;
  provider: string;
  providerNpi: string;
  diagnoses: Array<{ code: string; text: string }>;
  updated: Date;
  /** Version 16 (LPP-16156): when the claim reached the system (sample). */
  created?: Date;
  /** Version 16: place of service as "code - name" (sample). */
  pos?: string;
  /** Version 16: the source did not send a Service End Date. */
  endMissing?: boolean;
  measures: string[];
  status: string;
  admission: Date | null;
  discharge: Date | null;
  supplement: "Y" | "N";
  source: string;
}

/** One row per claim. Service lines of the same day, type and provider are one claim. */
export const claimRows = (m: Member): ClaimRow[] => {
  const base = claimRowsBase(m);
  return getVersion() >= 16 ? claimsV16(m, base) : base;
};

const claimRowsBase = (m: Member): ClaimRow[] => {
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
    // Version 16 (LPP-16156): every professional or institutional claim carries a diagnosis, so the Code column shows ICD-10-CM codes (sample data).
    if (getVersion() >= 16 && type !== "D" && dx.length === 0) {
      const lab = g.some((x) => x.tag && /lab|a1c|cbc|panel/i.test(x.tag)) || g.every((x) => /^8\d{4}$/.test(x.code));
      dx.push(lab ? { code: "Z01.89", text: "Encounter for other specified special examinations" } : { code: "Z00.00", text: "Encounter for general adult medical examination without abnormal findings" });
    }
    const p = e0.provider ? providerName(e0.provider) : undefined;
    return {
      id: `${e0.date.getFullYear()}${pad(e0.date.getMonth() + 1)}${pad(e0.date.getDate())}${pad(10000 + (seed % 89999), 5)}`,
      from: e0.date,
      to: type === "I" ? addDays(e0.date, 1 + (seed % 3)) : e0.date,
      type,
      // Version 16 (LPP-16156): a claim has one header and one or more lines. About one office claim in three also bills the blood draw.
      lines: [
        ...g.map((x) => ({ text: x.text, code: x.code, system: x.system })),
        ...(getVersion() >= 16 && type === "P" && seed % 3 === 0 && !g.some((x) => x.code === "36415")
          ? [{ text: "Collection of venous blood by venipuncture", code: "36415", system: "CPT" }]
          : []),
      ],
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

/**
 * Version 16 (LPP-16156): the sample claims look like a real member's claim history (all sample data, made up the same way every time):
 * the office claims fall on the days of the member's completed visits, labs are billed by a laboratory, screenings by a hospital outpatient
 * department, and some members also have an emergency room claim (Institutional), an observation stay or a dental claim (Dental).
 * A few claims are Cancelled, Draft or Entered-in-Error, and a few come without a Service End Date or without a provider.
 */
const ORG_PROVIDERS = {
  lab: { npi: "1000000900", name: "Sample Regional Laboratory" },
  er: { npi: "1000000910", name: "Sample Community Hospital" },
  dental: { npi: "1000000920", name: "Sample Family Dental" },
};
const claimsV16 = (m: Member, base: ClaimRow[]): ClaimRow[] => {
  const age = DEMO_NOW.getFullYear() - m.dob.getFullYear();
  const child = age < 18;
  const isEm = (r: ClaimRow) => r.type === "P" && r.measures.length === 0 && r.lines.some((l) => /^99\d{3}$/.test(l.code));
  const idFor = (d: Date, seed: number) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(10000 + (seed % 89999), 5)}`;
  const clampNow = (d: Date) => (d > DEMO_NOW ? DEMO_NOW : d);

  // 1. Office claims on the days of the completed visits (the newest claim to the newest visit).
  const visitDays = [
    ...new Set(
      encRows(m)
        .filter((r) => r.status === "Completed" && r.date <= DEMO_NOW)
        .map((r) => r.date.getTime()),
    ),
  ].sort((a, b) => b - a);
  const emClaims = base.filter(isEm).sort((a, b) => b.from.getTime() - a.from.getTime());
  const moved = new Map<ClaimRow, Date>();
  emClaims.forEach((r, i) => {
    if (visitDays[i] !== undefined) moved.set(r, new Date(visitDays[i]));
  });

  const rows: ClaimRow[] = base.map((r) => {
    const seed = h(`${m.id}${r.from.getTime()}${r.type}`);
    const from = moved.get(r) ?? r.from;
    const to = r.type === "I" ? addDays(from, Math.max(1, Math.round((r.to.getTime() - r.from.getTime()) / DAY))) : from;
    const created = clampNow(addDays(from, 1 + (seed % 3)));
    const updated = clampNow(addDays(created, h(`u16${r.id}`) % 21));
    const allLab = r.lines.length > 0 && r.lines.every((l) => /^8\d{4}$/.test(l.code) || l.code === "36415");
    const screening = r.lines.some((l) => /^(77067|45\d{3}|88\d{3})$/.test(l.code));
    const pos = r.type === "I" ? "21 - Inpatient Hospital" : allLab ? "81 - Independent Laboratory" : screening ? "22 - On Campus Outpatient Hospital" : "11 - Office";
    const org = allLab ? ORG_PROVIDERS.lab : null;
    // A claim's status: most are Active.
    const roll = h(`st16${m.id}${r.from.getTime()}${r.type}`) % 100;
    const status = roll < 3 ? "Cancelled" : roll === 3 ? "Entered-in-Error" : roll < 6 ? "Draft" : "Active";
    const unpaid = status !== "Active";
    const noEnd = r.type !== "I" && h(`ne16${r.id}`) % 50 === 0;
    const noProvider = !org && h(`np16${r.id}`) % 25 === 1;
    return {
      ...r,
      id: idFor(from, seed),
      from,
      to,
      created,
      updated,
      pos,
      endMissing: noEnd,
      status,
      payment: unpaid ? "Not Paid" : r.payment,
      paid: unpaid ? money(0) : r.paid,
      provider: org ? org.name : noProvider ? DASH : r.provider,
      providerNpi: org ? org.npi : noProvider ? DASH : r.providerNpi,
      admission: r.type === "I" ? from : null,
      discharge: r.type === "I" ? to : null,
    };
  });

  // 2. Extra claims some members have: emergency room, observation stay, dental.
  const mk = (kind: string, from: Date, extra: Partial<ClaimRow> & Pick<ClaimRow, "type" | "lines" | "diagnoses" | "pos" | "providerNpi" | "provider">): ClaimRow => {
    const seed = h(`${m.id}${kind}${from.getTime()}`);
    const created = clampNow(addDays(from, 1 + (seed % 3)));
    const amt = 60 + (seed % 90000) / 100;
    return {
      id: idFor(from, seed),
      from,
      to: from,
      payment: "Paid",
      paid: money(amt),
      updated: clampNow(addDays(created, seed % 14)),
      created,
      measures: [],
      status: "Active",
      admission: null,
      discharge: null,
      supplement: "N",
      source: "TRICARE claims",
      ...extra,
    };
  };
  const dayInLastYear = (key: string) => addDays(DEMO_NOW, -(20 + (h(`${m.id}${key}`) % 330)));
  if (h(`${m.id}er16`) % 6 === 0) {
    const d = dayInLastYear("er");
    const dx = child
      ? [{ code: "R50.9", text: "Fever, unspecified" }]
      : [{ code: h(`${m.id}erdx`) % 2 ? "R07.9" : "R10.9", text: h(`${m.id}erdx`) % 2 ? "Chest pain, unspecified" : "Unspecified abdominal pain" }];
    rows.push(
      mk("er", d, {
        type: "I",
        lines: [{ text: "Emergency department visit for the evaluation and management of a patient, low to moderate severity", code: "99283", system: "CPT" }],
        diagnoses: dx,
        pos: "23 - Emergency Room - Hospital",
        provider: ORG_PROVIDERS.er.name,
        providerNpi: ORG_PROVIDERS.er.npi,
      }),
    );
  }
  if (!child && h(`${m.id}obs16`) % 12 === 1) {
    const d = dayInLastYear("obs");
    rows.push(
      mk("obs", d, {
        type: "I",
        to: addDays(d, 1),
        lines: [{ text: "Hospital observation services, per hour", code: "G0378", system: "HCPCS" }],
        diagnoses: [{ code: "R07.9", text: "Chest pain, unspecified" }],
        pos: "22 - On Campus Outpatient Hospital",
        provider: ORG_PROVIDERS.er.name,
        providerNpi: ORG_PROVIDERS.er.npi,
        admission: d,
        discharge: addDays(d, 1),
      }),
    );
  }
  if (h(`${m.id}dental16`) % 2 === 0) {
    const d = dayInLastYear("dental");
    const cleaning = child
      ? { text: "Prophylaxis - child", code: "D1120", system: "CDT" }
      : { text: "Prophylaxis - adult", code: "D1110", system: "CDT" };
    rows.push(
      mk("dental", d, {
        type: "D",
        lines: [{ text: "Periodic oral evaluation - established patient", code: "D0120", system: "CDT" }, cleaning],
        diagnoses: [],
        pos: "11 - Office",
        provider: ORG_PROVIDERS.dental.name,
        providerNpi: ORG_PROVIDERS.dental.npi,
      }),
    );
  }
  return rows;
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
  status: "Active" | "Resolved" | "Inactive" | "Recurrence" | "Relapse" | "Remission";
  provider: string;
  measures: string[];
  created: Date;
  updated: Date;
  source: string;
}
const dxBase = (m: Member): DxRow[] =>
  allRecords(m)
    .filter((e) => v3TabOf(e) === "diagnoses")
    .map((e) => {
      const acute = ACUTE.includes(e.code);
      // Version 16 (LPP-16157): the six statuses of the ticket appear in the sample data. Most long-term conditions stay Active.
      const roll = getVersion() >= 16 && !acute ? h(`${m.id}${e.code}${e.date.getTime()}`) % 20 : 99;
      const rolled = roll === 0 ? ("Recurrence" as const) : roll === 1 ? ("Relapse" as const) : roll <= 3 ? ("Remission" as const) : roll === 4 ? ("Inactive" as const) : ("Active" as const);
      // Version 16: only statuses that make sense for the condition. A lifelong condition (frailty, dementia, hypertension, high cholesterol, a missing organ) stays Active;
      // diabetes can go into remission or relapse but is never "Inactive"; a routine exam is a one-day record, so it is Resolved on the day of the visit.
      const visitCode = getVersion() >= 16 && /^Z0[01]/.test(e.code);
      const lifelong = getVersion() >= 16 && ["R54", "F03.90", "I10", "E78.5", "Z90.710", "Z90.12"].includes(e.code);
      const chronic = visitCode ? ("Resolved" as const) : lifelong || (getVersion() >= 16 && e.code === "E11.9" && (rolled === "Inactive" || rolled === "Recurrence")) ? ("Active" as const) : rolled;
      return {
        key: evKey(e),
        e,
        start: e.date,
        end: acute ? addDays(e.date, 7 + (h(e.code + e.date.getTime()) % 8)) : visitCode ? e.date : chronic === "Inactive" ? addDays(e.date, 60 + (h(e.code) % 90)) : null,
        name: e.text,
        codes: [
          { code: e.code, system: e.system === "ICD-10" ? dxSystem() : e.system },
          ...(SNOMED[e.code] ? [{ code: SNOMED[e.code], system: snomedName() }] : []),
        ],
        status: acute ? ("Resolved" as const) : chronic,
        provider: missing(`${m.id}dxp${e.code}${e.date.getTime()}`, 30) ? DASH : providerCell(m, e),
        measures: measuresOf(m, e),
        created: createdOn(e),
        updated: updatedOn(e),
        // Version 16 (LPP-16157): for the Madigan POC every diagnosis comes from the Encounters (the EHR feed); claim diagnoses come with the full product.
        source: getVersion() >= 16 ? "MHS GENESIS" : sourceName(e),
      };
    });

/**
 * Version 16 (LPP-16157): "Populate all records with a Diagnosis Code from Encounters". Every diagnosis code on a visit of the Encounters tab
 * has one row here, even when the code is a routine-exam code. One row per diagnosis: the first visit it was used on is the Start Date, and a
 * routine exam is Resolved on the day of the visit.
 */
export const dxRows = (m: Member): DxRow[] => {
  const base = dxBase(m);
  if (getVersion() < 16) return base;
  const have = new Set(base.flatMap((r) => r.codes.map((c) => c.code)));
  const first = new Map<string, { enc: EncRow; text: string }>();
  for (const enc of [...encRows(m)].sort((a, b) => a.date.getTime() - b.date.getTime())) {
    if (enc.status !== "Completed" || enc.date > DEMO_NOW) continue;
    for (const d of enc.diagnoses) if (!have.has(d.code) && !first.has(d.code)) first.set(d.code, { enc, text: d.text });
  }
  const extra: DxRow[] = [...first.entries()].map(([code, { enc, text }]) => ({
    key: `enc|${code}|${enc.key}`,
    e: enc.e,
    start: enc.date,
    end: enc.date,
    name: text,
    codes: [{ code, system: dxSystem() }],
    status: "Resolved" as const,
    provider: enc.provider,
    measures: [],
    created: enc.created,
    updated: enc.updated,
    source: "MHS GENESIS",
  }));
  return [...base, ...extra];
};

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
/** Version 16 (LPP-16158): the eight statuses of the ticket appear in the sample data. Planned, Arrived, Triaged and In Progress visits are added by encRows (a future or a today visit). */
const statusV16 = (e: Evt, seed: number): string => {
  const base = STATUS_ENC[e.status] ?? "Completed";
  if (base !== "Completed" || e.tag !== "other") return base;
  const roll = seed % 40;
  if (roll === 0 || roll === 1) return "Canceled";
  if (roll === 2) return "Entered in Error";
  if (roll === 3) return "On Leave";
  return "Completed";
};
const encBase = (m: Member): EncRow[] => {
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
        end: getVersion() >= 16 && !["Planned", "Arrived", "Triaged", "In Progress"].includes(statusV16(e, seed)) ? e.date : null,
        type: missing(`${m.id}ety${seed}`, 60) ? DASH : VISIT_TYPE(e),
        status: getVersion() >= 16 ? statusV16(e, seed) : STATUS_ENC[e.status] ?? "Completed",
        // Version 16 (LPP-16158): every visit shows a primary diagnosis; with no diagnosis near the date it is the routine-exam code for the member's age.
        diagnoses:
          getVersion() >= 16 && !["Completed", "On Leave"].includes(statusV16(e, seed))
            ? [] // Version 16: a visit that did not happen, or is not finished yet, has no diagnosis.
            : near.length === 0 && getVersion() >= 16
            ? [
                (e.date.getFullYear() - m.dob.getFullYear() < 18
                  ? { code: "Z00.129", text: "Encounter for routine child health examination without abnormal findings" }
                  : { code: "Z00.00", text: "Encounter for general adult medical examination without abnormal findings" }),
              ]
            : near.map((x) => ({ code: x.code, text: x.text })),
        provider: missing(`${m.id}epv${seed}`, 30) ? DASH : providerCell(m, e),
        place: missing(`${m.id}epl${seed}`, 40) ? DASH : e.telehealth
          ? "Telehealth (member's home)"
          : getVersion() >= 16
            ? // Version 16: a children's clinic only for children, internal medicine only for adults.
              (e.date.getFullYear() - m.dob.getFullYear() < 18
                ? ["Madigan Pediatrics Clinic", "Madigan Family Medicine Clinic", "Madigan Army Medical Center"]
                : ["Madigan Family Medicine Clinic", "Madigan Internal Medicine Clinic", "Madigan Army Medical Center"])[seed % 3]
            : POS[seed % POS.length],
        measures: measuresOf(m, e),
        reason: e.text,
        encId: `ENC-${e.date.getFullYear()}${pad(e.date.getMonth() + 1)}${pad(e.date.getDate())}-${pad(seed % 10000, 4)}`,
        created: createdOn(e),
        updated: updatedOn(e),
        source: sourceName(e),
      };
    });
};

/**
 * Version 16 (LPP-16158): some members also have an upcoming visit (Planned, in the future) and a few have a visit that is happening today
 * (Arrived, Triaged or In Progress), so all eight statuses of the ticket show up with dates that make sense. Sample data, made the same way every time.
 */
export const encRows = (m: Member): EncRow[] => {
  const base = encBase(m);
  if (getVersion() < 16) return base;
  const ev0 = allRecords(m).find((e) => v3TabOf(e) === "visits");
  if (!ev0) return base;
  const child = DEMO_NOW.getFullYear() - m.dob.getFullYear() < 18;
  const today = new Date(DEMO_NOW.getFullYear(), DEMO_NOW.getMonth(), DEMO_NOW.getDate());
  const extra: EncRow[] = [];
  const add = (kind: string, date: Date, status: string, type: string, reason: string, code: string) => {
    const seed = h(`${m.id}enc${kind}`);
    const e: Evt = { ...ev0, date, code, text: reason, status: kind, tag: "other", telehealth: false };
    const created = addDays(DEMO_NOW, -(1 + (seed % 20)));
    extra.push({
      key: evKey(e),
      e,
      date,
      end: null,
      type,
      status,
      diagnoses: [],
      provider: providerCell(m, ev0),
      place: (child ? ["Madigan Pediatrics Clinic", "Madigan Family Medicine Clinic"] : ["Madigan Family Medicine Clinic", "Madigan Internal Medicine Clinic"])[seed % 2],
      measures: [],
      reason,
      encId: `ENC-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(seed % 10000, 4)}`,
      created: status === "Planned" ? created : today,
      updated: status === "Planned" ? addDays(created, seed % 5) : today,
      source: "MHS GENESIS",
    });
  };
  if (h(`${m.id}planned16`) % 4 === 0) {
    const d = addDays(today, 7 + (h(`${m.id}pl16`) % 53));
    const wellness = h(`${m.id}plt16`) % 3 === 0;
    add("planned", d, "Planned", wellness ? "Annual wellness visit" : "Office visit", wellness ? "Annual wellness visit" : "Follow-up office visit", wellness ? "99395" : "99213");
  }
  const open = h(`${m.id}open16`) % 25;
  if (open >= 1 && open <= 3) add("open", today, ["Arrived", "Triaged", "In Progress"][open - 1], "Office visit", "Office visit", "99213");
  return [...base, ...extra];
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
/** Version 16 (LPP-16159): the test name people know, and the LOINC name that goes after the code. */
const LAB_NAME: Record<string, string> = {
  "4548-4": "Hemoglobin A1c",
  "2160-0": "Creatinine",
  "2345-7": "Glucose",
  "2085-9": "HDL Cholesterol",
  "2089-1": "LDL Cholesterol",
  "718-7": "Hemoglobin",
  "5671-3": "Lead",
  "3016-3": "Thyroid Stimulating Hormone (TSH)",
  "30167-1": "High-Risk HPV DNA Test",
  "20454-5": "Urine Protein (Dipstick)",
};
const LOINC_NAME: Record<string, string> = {
  "4548-4": "Hemoglobin A1c/Hemoglobin.total in Blood",
  "2160-0": "Creatinine [Mass/volume] in Serum or Plasma",
  "2345-7": "Glucose [Mass/volume] in Serum or Plasma",
  "2085-9": "Cholesterol in HDL [Mass/volume] in Serum or Plasma",
  "2089-1": "Cholesterol in LDL [Mass/volume] in Serum or Plasma",
  "718-7": "Hemoglobin [Mass/volume] in Blood",
  "5671-3": "Lead [Mass/volume] in Blood",
  "3016-3": "Thyrotropin [Units/volume] in Serum or Plasma",
  "30167-1": "High-risk HPV DNA test",
  "20454-5": "Protein [Presence] in Urine by Test strip",
};
export interface LabRow {
  key: string;
  e: Evt;
  date: Date;
  test: string;
  /** Version 16: the LOINC name shown after the code. */
  loincText?: string;
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
const labBase = (m: Member): LabRow[] => {
  const all = allRecords(m);
  const visits = all.filter((e) => v3TabOf(e) === "visits");
  return all
    .filter((e) => v3TabOf(e) === "labs")
    .map((e) => {
      const unit = e.tag === "hba1c" ? "%" : (e.unit ?? "");
      const prelim = e.status === "preliminary";
      // Version 16 (LPP-16159): the sample also has Low and Abnormal flags (the ticket lists High, Low and Abnormal). Display only: the quality measures read the record itself.
      const range = e.refRange ? /^\s*(-?[\d.]+)\s*(?:to|–|-)\s*(-?[\d.]+)/.exec(e.refRange) : null;
      const roll = getVersion() >= 16 && range && e.tag !== "hba1c" && e.value !== undefined && (!e.flag || e.flag === "Normal") ? h(`${m.id}${e.code}${e.date.getTime()}lab`) % 36 : 99;
      const lo = range ? Number(range[1]) : 0;
      const hi = range ? Number(range[2]) : 0;
      // A high HDL is good news, so it is never shown as High.
      const okRoll = (roll === 0 && lo <= 0) || (roll === 1 && e.code === "2085-9") ? 99 : roll;
      const shownValue = okRoll === 0 ? Math.round(lo * 0.85 * 10) / 10 : okRoll === 1 ? Math.round(hi * 1.25 * 10) / 10 : e.value;
      const shownFlag = okRoll === 0 ? "Low" : okRoll === 1 ? "High" : e.flag;
      const near = visits
        .map((v) => ({ v, d: Math.abs(v.date.getTime() - e.date.getTime()) }))
        .filter((x) => x.d <= 14 * DAY)
        .sort((a, b) => a.d - b.d)[0];
      return {
        key: evKey(e),
        e,
        date: e.date,
        test: getVersion() >= 16 && LAB_NAME[e.code] ? LAB_NAME[e.code] : e.text.replace(/,? ?\d+(\.\d+)?%.*$/, "").replace(/ \(preliminary\)$/, ""),
        loincText: getVersion() >= 16 ? LOINC_NAME[e.code] : undefined,
        // Version 16: a text result is shown as sent ("Negative").
        result: shownValue === undefined ? (getVersion() >= 16 && /, negative$/i.test(e.text) ? "Negative" : DASH) : `${shownValue}${unit ? ` ${unit}` : ""}`,
        range: e.refRange ? (/[A-Za-z%]/.test(e.refRange.replace(/ to /, "")) || !unit ? e.refRange : `${e.refRange} ${unit}`) : DASH,
        flag: shownFlag && shownFlag !== "Normal" ? shownFlag : DASH,
        resulted: prelim ? null : (e.resultedOn ?? addDays(e.date, 1 + (h(e.code + e.date.getTime()) % 3))),
        panel: PANEL[e.code] ?? DASH,
        loinc: e.code,
        provider: missing(`${m.id}lpv${e.code}${e.date.getTime()}`, 25) ? DASH : providerCell(m, e),
        measures: measuresOf(m, e),
        encounter: near ? { label: VISIT_TYPE(near.v), date: near.v.date } : null,
        cpt: CPT_OF_LAB[e.code] ?? DASH,
        created: createdOn(e),
        updated: updatedOn(e),
        source: sourceName(e),
      };
    });
};

/**
 * Version 16 (LPP-16159): all three flags and both panel statuses of the ticket show up in the sample data: some members have a dipstick urine protein
 * that came back positive (Abnormal, a text result), and some have a lab collected in the last three days with no result yet (Preliminary, "--").
 */
export const labRows = (m: Member): LabRow[] => {
  const base = labBase(m);
  if (getVersion() < 16) return base;
  const t = base[0];
  if (!t) return base;
  const extra: LabRow[] = [];
  const mk = (code: string, date: Date, result: string, range: string, flag: string, prelim: boolean, unit: string): LabRow => {
    const e: Evt = { ...t.e, date, code, text: LAB_NAME[code], status: prelim ? "preliminary" : "final", value: undefined, flag: undefined, refRange: undefined, resultedOn: undefined, unit, tag: "other" };
    return {
      key: evKey(e),
      e,
      date,
      test: LAB_NAME[code],
      loincText: LOINC_NAME[code],
      result,
      range,
      flag,
      resulted: prelim ? null : addDays(date, 1),
      panel: DASH,
      loinc: code,
      provider: t.provider,
      measures: [],
      encounter: null,
      cpt: DASH,
      created: createdOn(e),
      updated: updatedOn(e),
      source: "MHS GENESIS",
    };
  };
  const today = new Date(DEMO_NOW.getFullYear(), DEMO_NOW.getMonth(), DEMO_NOW.getDate());
  if (h(`${m.id}ua16`) % 15 === 0) {
    const d = addDays(today, -(40 + (h(`${m.id}ua16d`) % 200)));
    extra.push(mk("20454-5", d, "Positive", "Negative", "Abnormal", false, ""));
  }
  if (h(`${m.id}pend16`) % 18 === 1) {
    extra.push(mk("2345-7", addDays(today, -(1 + (h(`${m.id}pend16d`) % 3))), DASH, DASH, DASH, true, "mg/dL"));
  }
  return [...base, ...extra];
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
    // Version 16 (LPP-16160): the name carries strength and form ("Metformin 500 mg tablet"); about one fill in four is coded in RxNorm, the rest in NDC;
    // the status shows all three values of the ticket (Active, Discontinued, Inactive).
    const v16 = getVersion() >= 16;
    if (v16 && /\d\s?(mg|mcg|IU)$/.test(name)) name = `${name} tablet`;
    const RXNORM: Record<string, string> = { "Metformin 500 mg tablet": "861004", "Lisinopril 10 mg tablet": "314076", "Atorvastatin 20 mg tablet": "617310" };
    if (v16 && RXNORM[name] && seed % 4 === 0) {
      codeSystem = "RxNorm";
      code = RXNORM[name];
    }
    return {
      key,
      date,
      name,
      status: v16 && seed % 7 === 0 ? "Discontinued" : DEMO_NOW.getTime() - date.getTime() <= 100 * DAY ? "Active" : "Inactive",
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
  /** Version 16 (LPP-16360): the dose given, a number and a unit (sample). */
  dose?: string;
  measures: string[];
  created: Date;
  updated: Date;
  source: string;
}
/** Version 16: the dose of a vaccine, made up the same way every time. A child under three gets the small flu dose, and the rotavirus vaccine is a drink. */
const doseOf = (vaccine: string, ageDays: number, key: string): string => {
  if (/rotavirus/i.test(vaccine)) return "2 mL";
  if (/covid/i.test(vaccine)) return h(key) % 2 ? "0.3 mL" : "0.5 mL";
  if (/influenza/i.test(vaccine) && ageDays < 3 * 365) return "0.25 mL";
  return "0.5 mL";
};
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
    // Version 16 (LPP-16360): the three statuses of the ticket (Completed, Not Done, Entered in Error) appear in the sample data, as a small share of the records.
    status:
      getVersion() >= 16 && status === "completed" && h(`${m.id}${key}imm`) % 30 < 2
        ? h(`${m.id}${key}imm`) % 30 === 0
          ? "Not Done"
          : "Entered in Error"
        : status === "completed"
          ? "Completed"
          : status === "not-done"
            ? "Not Done"
            : status.charAt(0).toUpperCase() + status.slice(1),
    code: `CVX: ${cvx}`,
    provider: missing(`${m.id}${key}ipv`, 30) ? DASH : lastFirst(providerName(npi)),
    dose: getVersion() >= 16 ? doseOf(vaccine, (date.getTime() - m.dob.getTime()) / DAY, `${m.id}${key}dose`) : undefined,
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
  /** Version 16 (LPP-16161): the unit on its own, for the Unit column. */
  unit: string;
}
/** Version 16 (LPP-16161): the SNOMED CT code of a vital sign, used for some of the sample rows. */
const SCT: Record<string, string> = { "8480-6": "271649006", "8462-4": "271650006", "29463-7": "27113001", "8302-2": "50373000", "39156-5": "60621009", "8867-4": "364075005" };
const OBS_STATUS16 = ["Preliminary", "Amended", "Corrected", "Registered", "Cancelled", "Entered in Error"];
/** Flag (High / Low / Abnormal) for the sample vitals; the sample data carries none. */
const obsFlag16 = (code: string, v: number): "H" | "L" | "A" | "" =>
  code === "8480-6" ? (v >= 120 ? "H" : v < 90 ? "L" : "") : code === "8462-4" ? (v >= 80 ? "H" : v < 60 ? "L" : "") : code === "8867-4" ? (v > 100 ? "H" : v < 60 ? "L" : "") : code === "39156-5" ? (v >= 25 ? "H" : v < 18.5 ? "L" : "") : "";
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
      const vital = VITAL.includes(e.code) || e.code === "9843-4";
      const v16 = getVersion() >= 16;
      const roll = v16 ? h(`${m.id}${e.code}${e.date.getTime()}obs`) % 20 : 0;
      // Version 16 (LPP-16161): the name without the result, the value with its unit and flag, the code system (LOINC / SNOMED CT), the claim status.
      const parsed = /^(.*?)[:\s]+(-?\d+(?:\.\d+)?)\s*(\S+)?$/.exec(e.text);
      const coded = /^([^:]+):\s*(.+)$/.exec(e.text);
      const num = e.value ?? (parsed ? Number(parsed[2]) : undefined);
      const unit16 = e.value !== undefined ? (e.tag === "hba1c" ? "%" : (e.unit ?? "")) : (parsed?.[3] ?? "");
      const f16 = (num !== undefined ? obsFlag16(e.code, num) : "") || (e.flag && e.flag !== "Normal" ? e.flag.charAt(0) : "");
      const value16 =
        num !== undefined
          ? `${num}${unit16 ? ` ${unit16}` : ""}${f16 ? ` (${f16})` : ""}`
          : coded
            ? coded[2].charAt(0).toUpperCase() + coded[2].slice(1)
            : DASH;
      const name16 = parsed && e.value === undefined ? parsed[1] : coded ? coded[1] : e.text;
      const sct = v16 && SCT[e.code] && roll % 4 === 0;
      return {
        key: evKey(e),
        e,
        date: e.date,
        end: null,
        type: v16
          ? e.code === "76689-9"
            ? "Social History"
            : e.tag === "hba1c" || e.code === "29771-3"
              ? "Laboratory"
              : vital
                ? "Vital Signs"
                : "Exam"
          : vital ? "Vital Signs" : e.tag === "hba1c" ? "Laboratory" : "Exam",
        service: v16 ? name16 : e.text.replace(/ \d+(\.\d+)?.*$/, "").replace(/,.*$/, ""),
        value: v16
          ? value16
          : e.value === undefined
            ? (/\d/.test(e.text) ? e.text.replace(/^[^\d]*/, "") : DASH) + flag
            : `${e.value}${unit ? ` ${unit}` : ""}${flag}`,
        status: v16 ? (h(`${m.id}${e.code}${e.date.getTime()}os`) % 6 === 0 ? OBS_STATUS16[h(`${e.code}${e.date.getTime()}os2`) % OBS_STATUS16.length] : "Final") : (OBS_STATUS[e.status] ?? "Final"),
        code: sct ? `SCT: ${SCT[e.code]}` : `L: ${e.code}`,
        provider: providerCell(m, e),
        measures: measuresOf(m, e),
        related: near ? { label: VISIT_TYPE(near.v), date: near.v.date, tab: "encounters" } : null,
        claimStatus: v16 ? (roll < 12 ? "Active" : roll === 12 ? "Cancelled" : roll === 13 ? "Draft" : roll === 14 ? "Entered in Error" : DASH) : DASH,
        payment: DASH,
        paid: DASH,
        created: createdOn(e),
        updated: updatedOn(e),
        source: v16 ? "MHS GENESIS" : sourceName(e),
        unit: v16 ? unit16 : unit,
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
        status:
          getVersion() >= 16
            ? (() => {
                // Version 16 (LPP-16162): all seven statuses of the ticket appear in the sample.
                const base = e.status === "not-done" ? "Not Done" : e.status === "cancelled" ? "Stopped" : "Completed";
                if (base !== "Completed" || e.tag !== "other") return base;
                const roll = seed % 20;
                const recent = DEMO_NOW.getTime() - e.date.getTime() < 45 * DAY;
                return recent && roll < 4 ? (roll < 2 ? "In Progress" : "On Hold") : roll === 4 ? "Unknown" : roll === 5 ? "Entered in Error" : roll === 6 ? "Stopped" : base;
              })()
            : e.status === "not-done" ? "Not Done" : e.status === "cancelled" ? "Stopped" : "Completed",
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
        source: getVersion() >= 16 ? "MHS GENESIS" : sourceName(e),
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
