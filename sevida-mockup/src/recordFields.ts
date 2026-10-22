// Every field of the ingestion spec for one record, in the order of the file (FR-503: nothing hidden).
// The demo data holds only part of each row. The rest is made up from the record itself, so it is the same every time.
// In the real product these come straight from the file row.
import { specFiles } from "./spec";
import type { SpecField } from "./spec";
import { fmtDate, hashOf, providerName, providers } from "./data";
import type { Evt, Member, Provider, Segment } from "./data";
import { recordKey } from "./careGaps";

export interface FieldRow {
  name: string;
  /** What the file holds. Empty text means the cell is blank in the file. */
  value: string;
  required: SpecField["required"];
  /** The demo has this value in its own data (true) or made it up (false). */
  real: boolean;
}
export interface FieldSection {
  file: string;
  title: string;
  rows: FieldRow[];
}

const specOf = (file: string) => specFiles.find((f) => f.file === `${file}.csv`)!;
const blank = { v: "", real: true };
type Val = { v: string; real: boolean };
const real = (v: string): Val => ({ v, real: true });
const made = (v: string): Val => ({ v, real: false });
const pick = <T,>(xs: T[], h: number) => xs[h % xs.length];
const ymd = (d?: Date) => (d ? fmtDate(d) : "");
const money = (h: number, lo: number, span: number) =>
  `$${((lo * 100 + (h % (span * 100))) / 100).toFixed(2)}`;

const diagFlagOf = (system: string) =>
  system === "SNOMED" ? "S" : system === "ICD-9" ? "9" : "X";
const codeFlagOf = (system: string) =>
  system === "SNOMED"
    ? "S"
    : system === "ICD-10-PCS"
      ? "X"
      : system === "HCPCS"
        ? "H"
        : system === "LOINC"
          ? "L"
          : system === "NDC"
            ? "N"
            : system === "RxNorm"
              ? "R"
              : "C";
const sideOf = (e: Evt) => (e.side ? e.side : "");
const orgNpi = "1000000012";

/** One row of the file as name/value pairs. Unknown names stay blank, which is a valid optional cell. */
type Make = (name: string) => Val;

function claimMaker(e: Evt, m: Member, h: number): Make {
  const isDx = e.system === "ICD-10";
  const isPcs = e.system === "ICD-10-PCS";
  // Only a hospital procedure code marks an inpatient stay. 9921x is an office visit.
  const inpatient = e.system === "ICD-10-PCS";
  const nonPaid = e.status !== "paid";
  return (n) => {
    switch (n) {
      case "Claim ID":
        return made(`CLM-${1000 + (h % 9000)}`);
      case "Member ID":
        return real(m.id);
      case "Claim Type":
        return made(inpatient ? "I" : e.system === "CDT" ? "D" : "P");
      case "Statement From Date":
        return real(ymd(e.date));
      case "Statement To Date":
        return real(ymd(e.date));
      case "Admission Date":
        return inpatient ? real(ymd(e.date)) : blank;
      case "Discharge Date":
        return inpatient ? real(ymd(e.date)) : blank;
      case "Type of Bill":
        return inpatient ? made("111") : blank;
      case "Billing Provider NPI":
        return made(orgNpi);
      case "Attending Provider NPI":
        return inpatient && e.provider ? real(e.provider) : blank;
      case "Referring Provider NPI":
        return blank;
      case "Claim Status":
        return made(e.status === "cancelled" ? "cancelled" : "active");
      case "Payment Type":
        return real(e.status === "denied" ? "denied" : "paid");
      case "Claim Paid Amount":
        return nonPaid ? made("$0.00") : made(money(h, 40, 260));
      case "Supplemental Data":
        return real(e.supplemental ? "Y" : "N");
      case "ICD Version":
        return isDx || isPcs ? real("X") : blank;
      case "Principal ICD Diagnosis":
        return isDx ? real(e.code) : blank;
      case "Principal ICD Procedure":
        return isPcs ? real(e.code) : blank;
      case "Principal ICD Procedure Date":
        return isPcs ? real(ymd(e.date)) : blank;
      default:
        return blank;
    }
  };
}

function claimLineMaker(e: Evt, h: number): Make {
  const mods = e.side ? [e.side] : [];
  return (n) => {
    switch (n) {
      case "Claim ID":
        return made(`CLM-${1000 + (h % 9000)}`);
      case "Line Number":
        return made("1");
      case "Service From Date":
        return real(ymd(e.date));
      case "Service To Date":
        return blank;
      case "Revenue Code":
        return blank;
      case "Procedure Code":
        return real(e.code);
      case "Procedure Code Type":
        return real(e.system);
      case "Modifier 1":
        return mods[0] ? real(mods[0]) : blank;
      case "Modifier 2":
      case "Modifier 3":
      case "Modifier 4":
        return blank;
      case "Place of Service":
        return made("11");
      case "Rendering Provider NPI":
        return e.provider ? real(e.provider) : blank;
      case "Diagnosis Pointer 1":
        return made("1");
      default:
        return blank;
    }
  };
}

function pharmacyClaimMaker(e: Evt, m: Member, h: number): Make {
  return (n) => {
    switch (n) {
      case "Claim ID":
        return made(`RX-${5000 + (h % 4000)}`);
      case "Member ID":
        return real(m.id);
      case "Pharmacy NPI":
        return made(pick(["1000001051", "1000001069"], h));
      case "Prescriber NPI":
        return made("1000000111");
      case "Claim Status":
        return made("active");
      case "Payment Type":
        return real(e.status === "denied" ? "denied" : "paid");
      case "Claim Paid Amount":
        return e.status === "denied" ? made("$0.00") : made(money(h, 3, 40));
      default:
        return blank;
    }
  };
}

function pharmacyLineMaker(e: Evt, h: number): Make {
  return (n) => {
    switch (n) {
      case "Claim ID":
        return made(`RX-${5000 + (h % 4000)}`);
      case "Line Number":
        return made("1");
      case "Fill Date":
        return real(ymd(e.date));
      case "NDC Drug Code":
        return real(e.code);
      case "Days Supply":
        return made(pick(["30", "30", "90", "14"], h));
      case "Quantity Dispensed":
        return made(pick(["30", "60", "90", "28"], h >> 3));
      default:
        return blank;
    }
  };
}

function pharmMaker(e: Evt, m: Member, h: number): Make {
  return (n) => {
    switch (n) {
      case "Member ID":
        return real(m.id);
      case "Days Supply":
        return made(pick(["30", "30", "90", "14"], h));
      case "Service Date":
        return real(ymd(e.date));
      case "Drug Code":
        return real(e.code);
      case "Code Flag":
        return real(codeFlagOf(e.system));
      case "Quantity Dispensed":
        return made(pick(["30", "60", "90", "28"], h >> 3));
      case "Provider NPI":
        return e.provider ? real(e.provider) : made("1000000111");
      case "Pharmacy NPI":
        return made(pick(["1000001051", "1000001069"], h));
      default:
        return blank;
    }
  };
}

function visitMaker(e: Evt, m: Member, h: number): Make {
  return (n) => {
    switch (n) {
      case "Member ID":
        return real(m.id);
      case "Service Date":
        return real(ymd(e.date));
      case "Activity Type 1":
        return real(e.code);
      case "Code Flag 1":
        return real(codeFlagOf(e.system));
      case "End Date":
        return made(ymd(e.date));
      case "Status":
        return real(e.status);
      case "Provider ID":
        return e.provider ? real(e.provider) : blank;
      case "Place of Service":
        return made(e.telehealth ? "02" : "11");
      case "Diagnosis Code 1":
        return made(pick(["Z00.129", "I10", "E11.9", "Z01.419"], h));
      case "Diagnosis Flag 1":
        return made("X");
      default:
        return blank;
    }
  };
}

function diagMaker(e: Evt, m: Member): Make {
  return (n) => {
    switch (n) {
      case "Member ID":
        return real(m.id);
      case "Start Date":
        return real(ymd(e.date));
      case "Diagnosis Code":
        return real(e.code);
      case "Diagnosis Flag":
        return real(diagFlagOf(e.system));
      case "End Date":
        return blank;
      case "Attribute":
        return sideOf(e) ? real(sideOf(e)) : blank;
      default:
        return blank;
    }
  };
}

function procMaker(e: Evt, m: Member): Make {
  return (n) => {
    switch (n) {
      case "Member ID":
        return real(m.id);
      case "Service Date":
        return real(ymd(e.date));
      case "Procedure Code":
        return real(e.code);
      case "Code Flag":
        return real(codeFlagOf(e.system));
      case "End Date":
        return made(ymd(e.date));
      case "Service Status":
        return real(e.status);
      case "Provider ID":
        return e.provider ? real(e.provider) : blank;
      case "Attribute":
        return sideOf(e) ? real(sideOf(e)) : blank;
      default:
        return blank;
    }
  };
}

function obsMaker(e: Evt, m: Member): Make {
  return (n) => {
    switch (n) {
      case "Member ID":
        return real(m.id);
      case "Observation Date":
        return real(ymd(e.date));
      case "Test":
        return real(e.code);
      case "Test Code Flag":
        return real(codeFlagOf(e.system));
      case "Value":
        return e.value !== undefined ? real(String(e.value)) : blank;
      case "Units":
        return e.unit ? real(e.unit) : blank;
      case "End Date":
        return made(ymd(e.date));
      case "Status":
        return real(e.status);
      case "Result Value Flag":
        return e.value === undefined ? made("L") : blank;
      case "Type":
        return made(e.kind === "Observation" ? "vital-signs" : "laboratory");
      default:
        return blank;
    }
  };
}

function labMaker(e: Evt, m: Member): Make {
  return (n) => {
    switch (n) {
      case "Member ID":
        return real(m.id);
      case "CPT Code":
        return e.system === "CPT" ? real(e.code) : blank;
      case "LOINC Code":
        return e.system === "LOINC" ? real(e.code) : blank;
      case "Value":
        return e.value !== undefined ? real(String(e.value)) : blank;
      case "Date of Service":
        return real(ymd(e.date));
      case "Supplemental Data":
        return real(e.supplemental ? "Y" : "N");
      default:
        return blank;
    }
  };
}

function vaxMaker(e: Evt, m: Member): Make {
  return (n) => {
    switch (n) {
      case "Member ID":
        return real(m.id);
      case "Vaccine Code":
        return real(e.code);
      case "Code Flag":
        return made("C");
      case "Vaccination Date":
        return real(ymd(e.date));
      case "Status":
        return real(e.status);
      case "Year of Immunization":
        return made(String(e.date.getFullYear()));
      case "Quantity":
        return made("1");
      default:
        return blank;
    }
  };
}

const section = (file: string, title: string, make: Make): FieldSection => ({
  file,
  title,
  rows: specOf(file).fields.map((f) => {
    const { v, real } = make(f.name);
    return { name: f.name, value: v, required: f.required, real };
  }),
});

/** The file rows behind one record. A claim line also shows its claim, because the spec splits them over two files. */
export function fieldSections(e: Evt, m: Member): FieldSection[] {
  const h = hashOf(`${recordKey(e)}${m.id}`);
  switch (e.file) {
    case "claim-line": {
      const dxOrPcs = e.system === "ICD-10" || e.system === "ICD-10-PCS";
      return [
        section("claim", "claim.csv: the claim", claimMaker(e, m, h)),
        ...(dxOrPcs
          ? []
          : [section("claim-line", "claim-line.csv: the line", claimLineMaker(e, h))]),
      ];
    }
    case "pharmacy-claim-line":
      return [
        section("pharmacy-claim", "pharmacy-claim.csv: the claim", pharmacyClaimMaker(e, m, h)),
        section("pharmacy-claim-line", "pharmacy-claim-line.csv: the line", pharmacyLineMaker(e, h)),
      ];
    case "pharm":
      return [section("pharm", "pharm.csv", pharmMaker(e, m, h))];
    case "visit-e":
      return [section("visit-e", "visit-e.csv", visitMaker(e, m, h))];
    case "diag":
      return [section("diag", "diag.csv", diagMaker(e, m))];
    case "proc":
      return [section("proc", "proc.csv", procMaker(e, m))];
    case "obs":
      return [section("obs", "obs.csv", obsMaker(e, m))];
    case "lab":
      return [section("lab", "lab.csv", labMaker(e, m))];
    case "pharm-c":
      return [section("pharm-c", "pharm-c.csv", vaxMaker(e, m))];
    default:
      return [];
  }
}

/* ------------------------------------------------------------------ enrollment benefits (member-en.csv) */

export interface Benefits {
  dental: boolean;
  mhInpatient: boolean;
  mhIntensive: boolean;
  mhOutpatient: boolean;
  cdInpatient: boolean;
  cdIntensive: boolean;
  cdOutpatient: boolean;
  ltssInstitutional: boolean;
  ltssHome: boolean;
  employee: boolean;
}
/** The benefit columns the demo data does not hold, made up per member and period. Medical and drug are real (Segment). */
export function benefitsOf(m: Member, s: Segment): Benefits {
  const h = hashOf(`${m.id}${s.start.toISOString()}`);
  const on = (n: number) => (h >> n) % 7 !== 0;
  return {
    dental: on(1),
    mhInpatient: s.medical,
    mhIntensive: s.medical,
    mhOutpatient: s.medical,
    cdInpatient: s.medical && on(2),
    cdIntensive: s.medical && on(3),
    cdOutpatient: s.medical,
    ltssInstitutional: s.payer === "SN2",
    ltssHome: false,
    employee: h % 11 === 0,
  };
}

/* ------------------------------------------------------------------ provider.csv */

const taxonomyOf = (type: string): [string, string] =>
  /OB\/GYN/i.test(type)
    ? ["207V00000X", "207VX0000X"]
    : /nurse practitioner/i.test(type)
      ? ["363LF0000X", "363LP2300X"]
      : /radiology/i.test(type)
        ? ["2085R0202X", "2085D0003X"]
        : /gastro/i.test(type)
          ? ["207RG0100X", ""]
          : /dentist/i.test(type)
            ? ["122300000X", ""]
            : /hospital/i.test(type)
              ? ["282N00000X", ""]
              : /clinic/i.test(type)
                ? ["261QP2300X", ""]
                : ["207Q00000X", "207QA0000X"];

/** The whole provider.csv row for a provider, in file order. */
export function providerFields(p: Provider): FieldRow[] {
  const person = /,\s*[A-Za-z]+$/.test(p.name);
  const h = hashOf(p.npi);
  const [cred] = person ? [p.name.split(",").pop()!.trim()] : [""];
  const words = (person ? p.name.split(",")[0] : p.name).split(" ");
  const last = person ? words[words.length - 1] : p.name;
  const first = person ? words[0] : "";
  const middle = person && words.length > 2 ? words[1].replace(".", "") : "";
  const [t1, t2] = taxonomyOf(p.type);
  const male = ["Daniel", "Raj", "Thomas"].includes(first);
  const org = p.org ?? p.name;
  const orgId = ({ "Sample Family Medicine Group": "ORG001", "Sample Imaging Center": "ORG002", "Sample General Hospital": "ORG003", "Sample Dental": "ORG004" } as Record<string, string>)[org] ?? "ORG001";
  const orgNpiOf = providers.find((x) => x.name === org)?.npi ?? orgNpi;
  const start = new Date(2015 + (h % 9), h % 12, 1 + (h % 27));
  const val = (n: string): string => {
    switch (n) {
      case "Provider ID":
      case "Provider NPI":
        return p.npi;
      case "Provider Entity Type":
        return person ? "I" : "O";
      case "Provider Last Name":
        return last;
      case "Provider First Name":
        return first;
      case "Provider Middle Name":
        return middle;
      case "Provider Credential":
        return cred;
      case "Provider Gender":
        return person ? (male ? "male" : "female") : "";
      case "Provider Prescribing Privileges":
        return person && /MD|NP|DDS/.test(cred) ? "Y" : "N";
      case "Taxonomy Code 1":
        return t1;
      case "Primary Taxonomy Switch 1":
        return t1 ? "Y" : "";
      case "Taxonomy Code 2":
        return t2;
      case "Primary Taxonomy Switch 2":
        return t2 ? "N" : "";
      case "Role Start Date":
        return fmtDate(start);
      case "Active Flag":
        return "Y";
      case "Organization ID":
        return orgId;
      case "Organization Name":
        return org;
      case "Organization NPI":
        return orgNpiOf;
      default:
        return "";
    }
  };
  return specOf("provider").fields.map((f) => ({
    name: f.name,
    value: val(f.name),
    required: f.required,
    real: ["Provider ID", "Provider NPI", "Provider Last Name", "Provider First Name", "Provider Credential", "Organization Name"].includes(f.name),
  }));
}

export const providerByNpi = (npi?: string) => providers.find((p) => p.npi === npi);
export { providerName };

/* ------------------------------------------------------------------ member-gm.csv fields the demo members do not carry */

/** Middle initial, subscriber or family ID and mailing address 2, made up per member (the same every time). */
export function memberExtras(m: Member) {
  const h = hashOf(m.id);
  return {
    middle: String.fromCharCode(65 + (h % 26)),
    subscriberId: `SUB-${100000 + (h % 900000)}`,
    address2: h % 3 === 0 ? `Apt ${1 + (h % 40)}` : "",
  };
}
