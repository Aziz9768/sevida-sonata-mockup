import { useMemo, useState } from "react";
import { Box, Typography } from "@mui/material";
import { AutocompleteField } from "sevida-ui";
import { QsSheet, QsTable, QsTile } from "../quicksight/kit";
import type { QsCol } from "../quicksight/kit";
import { qs } from "../quicksight/qsTheme";
import { hashOf } from "../data";
import { PCMS } from "../v7Data";
import { controlsBox } from "./dashboardV12Bits";

/**
 * Version 14 (Srikanth): the HEDIS Inputs tab (the old Inputs tab, renamed) and the new DCS tab.
 * Both follow Srikanth's Sigma dashboard (HEDIS Inputs Dashboard): four filters, then one table with the same column names.
 * Every value is made-up sample data, the same on every load. Nothing here is used by Version 13 and older.
 */

const white = { "& .MuiInputBase-root": { background: qs.color.primaryBackground } };
const pick = <T,>(h: number, xs: T[]): T => xs[h % xs.length];
/** A well-mixed 32-bit hash, so made-up ids do not repeat in a pattern. */
const mix = (s: string) => {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
};
const hex = (seed: string, n: number) => {
  let out = "";
  let i = 0;
  while (out.length < n) out += mix(`${seed}#${i++}`).toString(16).padStart(8, "0");
  return out.slice(0, n);
};
const uuid = (seed: string) => `${hex(`${seed}a`, 8)}-${hex(`${seed}b`, 4)}-4${hex(`${seed}c`, 3)}-a${hex(`${seed}d`, 3)}-${hex(`${seed}e`, 12)}`;
const two = (n: number) => String(n).padStart(2, "0");
const stamp = (y: number, m: number, d: number, time = "00:00:00") => `${y}-${two(m)}-${two(d)} ${time}`;
const bool = (h: number, nullEvery = 0) => (nullEvery && h % nullEvery === 0 ? "null" : h % 2 ? "True" : "False");

type Rec = Record<string, string | number>;
const colsOf = (heads: [string, string][], numeric: string[] = []): QsCol<Rec>[] =>
  heads.map(([key, header]) => ({ key, header, value: (r) => r[key], align: numeric.includes(key) ? "right" : undefined, nowrap: true }));

/* ------------------------------------------------------------------ HEDIS Inputs */

const LINES = [
  { vs: "BH Outpatient", code: "99386", sys: "CPT", type: "procedure", flag: "C" },
  { vs: "Follow Up Visit", code: "99386", sys: "CPT", type: "procedure", flag: "C" },
  { vs: "Outpatient", code: "99386", sys: "CPT", type: "procedure", flag: "C" },
  { vs: "Outpatient Without UBREV", code: "99386", sys: "CPT", type: "procedure", flag: "C" },
  { vs: "Ambulatory Outpatient Visits", code: "99386", sys: "CPT", type: "procedure", flag: "C" },
  { vs: "Interactive Outpatient Encounter", code: "98966", sys: "CPT", type: "procedure", flag: "C" },
  { vs: "Well-Care", code: "99393", sys: "CPT", type: "procedure", flag: "C" },
  { vs: "Mammography", code: "77067", sys: "CPT", type: "procedure", flag: "C" },
  { vs: "Cervical Cytology Lab Test", code: "88142", sys: "CPT", type: "procedure", flag: "C" },
  { vs: "Colonoscopy", code: "45378", sys: "CPT", type: "procedure", flag: "C" },
  { vs: "HbA1c Lab Test", code: "83036", sys: "CPT", type: "procedure", flag: "C" },
  { vs: "Diabetes", code: "E11.9", sys: "ICD10CM", type: "diagnosis", flag: "X" },
  { vs: "Essential Hypertension", code: "I10", sys: "ICD10CM", type: "diagnosis", flag: "X" },
  { vs: "Well Child Visit", code: "Z00.129", sys: "ICD10CM", type: "diagnosis", flag: "X" },
];

const INPUT_HEADS: [string, string][] = [
  ["memberId", "Member Id"],
  ["dayOfService", "Day of Date of Service"],
  ["mainId", "Mainid"],
  ["valueSet", "Value Set or Medication List Name"],
  ["code", "Code"],
  ["value", "Value"],
  ["supp", "Supplemental Data"],
  ["claimPos", "Claim Pos"],
  ["startDate", "Start Date"],
  ["endDate", "End Date"],
  ["ageToday", "Age Today"],
  ["dod", "Date of Death"],
  ["codeSystem", "Code System"],
  ["flag", "Flag"],
  ["svcStatus", "Service Status"],
  ["dos", "Date of Service"],
  ["dob", "Date of Birth"],
  ["dataType", "Data Type"],
  ["clientId", "Client Id"],
  ["pcp", "Pcp"],
  ["obgyn", "Obgyn"],
  ["provName", "Provider Name"],
  ["provId", "Provider Id"],
  ["svcDesc", "Service Status Description"],
  ["claimStatus", "Claim Status"],
  ["daysSupply", "Days Supply"],
  ["vsType", "Value Set Type"],
  ["isPrincipal", "Is Principal"],
  ["isPcp", "Is Pcp"],
  ["isObgyn", "Is Obgyn"],
  ["isMh", "Is Mh Provider"],
  ["isEye", "Is Eye Care Provider"],
  ["isDentist", "Is Dentist"],
  ["isNeph", "Is Nephrologist"],
  ["isAnes", "Is Anesthesiologist"],
  ["isNpr", "Is Npr Provider"],
  ["isPas", "Is Pas Provider"],
  ["isPriv", "Is Provider Prescribing Privileges"],
  ["isPharm", "Is Clinical Pharmacist"],
  ["isHosp", "Is Hospital"],
  ["isSnf", "Is Snf"],
  ["isSurgeon", "Is Surgeon"],
  ["isRn", "Is Registered Nurse"],
];

const inputRows = (): Rec[] => {
  const rows: Rec[] = [];
  for (let i = 0; i < 40; i++) {
    const memberId = String(100000 + i);
    const h = hashOf(memberId);
    const year = 1960 + (h % 60);
    const dob = stamp(year, 1 + (h % 12), 1 + (h % 27));
    const ageToday = 2026 - year;
    const mainId = hex(`main-${memberId}`, 32);
    const prov = pick(h >>> 3, PCMS);
    const provId = `NPR${two(1 + ((h >>> 5) % 9)).padStart(3, "0")}`;
    const n = 5 + (h % 4);
    for (let k = 0; k < n; k++) {
      const hh = hashOf(`${memberId}-${k}`);
      const line = pick(hh, LINES);
      const month = 1 + ((h + k * 3) % 10);
      const day = 1 + ((h + k * 5) % 27);
      const dos = stamp(2026, month, day);
      const denied = hh % 6 === 0;
      rows.push({
        memberId,
        dayOfService: dos.slice(0, 10),
        mainId,
        valueSet: line.vs,
        code: line.code,
        value: "",
        supp: hh % 11 === 0 ? "Y" : "N",
        claimPos: "",
        startDate: "null",
        endDate: "null",
        ageToday,
        dod: "null",
        codeSystem: line.sys,
        flag: line.flag,
        svcStatus: denied ? "Denied" : "Completed",
        dos,
        dob,
        dataType: line.type,
        clientId: `test-decks-${line.type === "diagnosis" ? "DX" : "WCC"}-2026-${memberId}`,
        pcp: bool(hh >>> 2),
        obgyn: bool(hh >>> 3),
        provName: `${prov.name}`,
        provId,
        svcDesc: "",
        claimStatus: denied ? "Denied" : "Paid",
        daysSupply: "null",
        vsType: "HEDIS",
        isPrincipal: bool(hh >>> 4, 3),
        isPcp: bool(hh >>> 5),
        isObgyn: bool(hh >>> 6),
        isMh: bool(hh >>> 7),
        isEye: bool(hh >>> 8),
        isDentist: bool(hh >>> 9),
        isNeph: bool(hh >>> 10),
        isAnes: bool(hh >>> 11),
        isNpr: "True",
        isPas: bool(hh >>> 12),
        isPriv: bool(hh >>> 13),
        isPharm: bool(hh >>> 14),
        isHosp: bool(hh >>> 15),
        isSnf: bool(hh >>> 16),
        isSurgeon: bool(hh >>> 17),
        isRn: bool(hh >>> 18),
      });
    }
  }
  return rows;
};

const uniq = (rows: Rec[], key: string) => [...new Set(rows.map((r) => String(r[key])))].sort((a, b) => a.localeCompare(b)).map((v) => ({ value: v, label: v === "" ? "(blank)" : v }));
const keep = (picked: string[], v: string | number) => picked.length === 0 || picked.includes(String(v));

export function HedisInputsTab() {
  const rows = useMemo(inputRows, []);
  const cols = useMemo(() => colsOf(INPUT_HEADS, ["ageToday"]), []);
  const [f, setF] = useState<{ memberId: string[]; valueSet: string[]; code: string[]; supp: string[] }>({ memberId: [], valueSet: [], code: [], supp: [] });
  const shown = rows.filter((r) => keep(f.memberId, r.memberId) && keep(f.valueSet, r.valueSet) && keep(f.code, r.code) && keep(f.supp, r.supp));
  const filter = (key: keyof typeof f, label: string, source: string) => (
    <Box sx={white}>
      <AutocompleteField multiple label={label} placeholder="Select values" options={uniq(rows, source)} value={f[key]} onChange={(v) => setF({ ...f, [key]: v })} />
    </Box>
  );
  return (
    <>
      <Box sx={{ ...controlsBox(4), borderTop: qs.tile.border }}>
        {filter("memberId", "Member Id", "memberId")}
        {filter("valueSet", "Value Set or Medication List Name", "valueSet")}
        {filter("code", "Code", "code")}
        {filter("supp", "Supplemental Data", "supp")}
      </Box>
      <QsSheet>
        <QsTile cols={36} title="Member Details">
          <Typography sx={{ fontSize: qs.type.small.size, color: qs.color.mutedText, mb: 1 }}>
            Sample data: every row and value is made up to show the layout of Srikanth's HEDIS Inputs dashboard. {shown.length.toLocaleString("en-US")} rows.
          </Typography>
          <QsTable label="Member Details" exportFile="hedis-inputs-member-details" cols={cols} rows={shown} rowKey={(r) => `${r.memberId}-${r.dos}-${r.code}-${r.valueSet}`} maxHeight={560} defaultSort={{ key: "dos", dir: "desc" }} />
        </QsTile>
      </QsSheet>
    </>
  );
}

/* ------------------------------------------------------------------ DCS */

const ARTEFACTS = ["Condition", "Coverage", "Encounter", "ExplanationOfBenefit", "Immunization", "MedicationRequest", "Observation", "Patient", "Procedure"];
const DCS_HEADS: [string, string][] = [
  ["medicaidId", "Medicaid Id"],
  ["artefacts", "ListAggDistinct of Artefact"],
  ["snapshotId", "Snapshot Id"],
  ["artefact", "Artefact"],
  ["artefactId", "Artefact Id"],
  ["result", "Result"],
  ["status", "Status"],
  ["json", "Artefact Json"],
  ["createdAt", "Created At"],
  ["orgId", "Organization Id"],
  ["indicator", "Indicator"],
  ["patient", "Patient"],
  ["eobId", "EOB Id"],
  ["isValid", "Is Valid"],
];

const dcsRows = (): Rec[] => {
  const snaps = [uuid("snap-1"), uuid("snap-2"), uuid("snap-3")];
  const org = "38ea8435-164a-4196-a088-43da11fb69a8";
  const rows: Rec[] = [];
  for (let i = 0; i < 90; i++) {
    const h = hashOf(`dcs-${i}`);
    const artefact = ARTEFACTS[i % ARTEFACTS.length];
    const kind = h % 9 === 0 ? "pending" : h % 7 === 0 ? "failed" : "ok";
    const patient = String(100000 + (h % 40));
    rows.push({
      medicaidId: h % 5 === 0 ? `MCD${100000 + (h % 90000)}` : "null",
      artefacts: ARTEFACTS.join(", "),
      snapshotId: snaps[h % snaps.length],
      artefact,
      artefactId: hex(`art-${i}`, 32),
      result: kind === "ok" ? "Artefact successfully validated" : kind === "failed" ? "Artefact failed validation: a required element is missing" : "Validation has not run yet",
      status: kind === "ok" ? "SUCCESS" : kind === "failed" ? "FAILURE" : "PENDING",
      json: "null",
      createdAt: stamp(2026, 11, 11, `13:03:${two(i % 60)}`),
      orgId: org,
      indicator: "C",
      patient,
      eobId: artefact === "ExplanationOfBenefit" ? `EOB-${hex(`eob-${i}`, 8).toUpperCase()}` : "null",
      isValid: kind === "ok" ? "True" : kind === "failed" ? "False" : "null",
    });
  }
  return rows;
};

export function DcsTab() {
  const rows = useMemo(dcsRows, []);
  const cols = useMemo(() => colsOf(DCS_HEADS), []);
  const [f, setF] = useState<{ isValid: string[]; artefactId: string[]; patient: string[]; eobId: string[] }>({ isValid: [], artefactId: [], patient: [], eobId: [] });
  const shown = rows.filter((r) => keep(f.isValid, r.isValid) && keep(f.artefactId, r.artefactId) && keep(f.patient, r.patient) && keep(f.eobId, r.eobId));
  const filter = (key: keyof typeof f, label: string, source: string) => (
    <Box sx={white}>
      <AutocompleteField multiple label={label} placeholder="Select values" options={uniq(rows, source)} value={f[key]} onChange={(v) => setF({ ...f, [key]: v })} />
    </Box>
  );
  return (
    <>
      <Box sx={{ ...controlsBox(4), borderTop: qs.tile.border }}>
        {filter("isValid", "Is Valid", "isValid")}
        {filter("artefactId", "Artefact Id", "artefactId")}
        {filter("patient", "Patient", "patient")}
        {filter("eobId", "EOB Id", "eobId")}
      </Box>
      <QsSheet>
        <QsTile cols={36} title="Client HEDIS DCS Artefacts">
          <Typography sx={{ fontSize: qs.type.small.size, color: qs.color.mutedText, mb: 1 }}>
            Sample data: every row and value is made up to show the layout of Srikanth's DCS Validations dashboard. {shown.length.toLocaleString("en-US")} rows. Patient, EOB Id and Is Valid are the last three columns so the filters above have something to filter.
          </Typography>
          <QsTable label="Client HEDIS DCS Artefacts" exportFile="dcs-artefacts" cols={cols} rows={shown} rowKey={(r) => String(r.artefactId)} maxHeight={560} defaultSort={{ key: "createdAt", dir: "desc" }} />
        </QsTile>
      </QsSheet>
    </>
  );
}
