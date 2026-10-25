// Made-up demo data for the quality-measure demo. Nothing here is real.
// M1001–M1010 copy the sample tabs of "Leap Sonata Quality Measure Data Ingestion Spec.xlsx".
// M1011 onward are generated (same code every time) so the dashboard has believable numbers.
import { getVersion } from './version';
import type { StatusTone } from 'sevida-ui';

/* ------------------------------------------------------------------ dates */

export const MY = 2026; // measurement year
export const MY_START = new Date(MY, 0, 1);
export const MY_END = new Date(MY, 11, 31);
/** Measurement years the demo can show. The first is the one that is being worked now (care managers, appointments, outreach); older years are final results only. */
export const CURRENT_YEAR = MY;
export const YEARS: number[] = [2026, 2025];
export const yearOptions = YEARS.map((y) => ({ value: String(y), label: String(y) }));
/** Reads "?year=" from the address: only a known year counts, anything else is the current year. */
export const yearFromParam = (v: string | null | undefined) => (v && YEARS.includes(Number(v)) ? Number(v) : CURRENT_YEAR);
/** The demo's "today". Nothing in the sample data (service, file, gap or note dates) is later than this; only due dates, planned visits and coverage end dates look ahead. */
export const DEMO_NOW = new Date(2026, 9, 16);
/** The last month a generated service can fall in, so no sample service date is later than the files that carry it. */
const LAST_SERVICE_MONTH = 8;
const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);
const OPEN = new Date(2099, 11, 31);

const pad2 = (n: number) => String(n).padStart(2, '0');
/** Every date on every screen: MM/DD/YYYY (US), always two digits for month and day. */
export const fmtDate = (x: Date) => `${pad2(x.getMonth() + 1)}/${pad2(x.getDate())}/${x.getFullYear()}`;
/** Date and time: MM/DD/YYYY, h:mm AM. */
export const fmtDateTime = (x: Date) => `${fmtDate(x)}, ${x.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
export const fmtEnd = (x: Date) => (x.getFullYear() === 2099 ? 'Open' : fmtDate(x));
const DAY = 86_400_000;

/** Age on Dec 31 of the measurement year: the age every measure uses. */
export const ageAtYearEnd = (dob: Date, year: number = MY) => year - dob.getFullYear();
export const initials = (name: string) =>
  name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('');

/* ------------------------------------------------------------------ vocab */

export type Gender = 'female' | 'male';
export type ProductLine = 'Commercial' | 'Exchange' | 'Medicaid' | 'Medicare';

export const payerNames: Record<string, string> = {
  CEP: 'Commercial EPO',
  HMO: 'Commercial HMO',
  POS: 'Commercial POS',
  PPO: 'Commercial PPO',
  MEP: 'Exchange EPO',
  MMO: 'Exchange HMO',
  MOS: 'Exchange POS',
  MPO: 'Exchange PPO',
  MCD: 'Medicaid',
  MD: 'Medicaid Disabled HMO',
  MDE: 'Medicaid Dual Eligible HMO',
  MLI: 'Medicaid Low Income HMO',
  MRB: 'Medicaid Restricted Benefit HMO',
  MCR: 'Medicare',
  MCS: 'Medicare Advantage POS',
  MP: 'Medicare Advantage PPO',
  MC: 'Medicare Cost',
  MMP: 'Medicare-Medicaid Plans',
  SN1: 'Special Needs Plan (chronic condition)',
  SN2: 'Special Needs Plan (institutionalized)',
  SN3: 'Special Needs Plan (dual eligible)',
};
export const productLineOf = (payer: string): ProductLine => {
  if (['CEP', 'HMO', 'POS', 'PPO'].includes(payer)) return 'Commercial';
  if (['MEP', 'MMO', 'MOS', 'MPO'].includes(payer)) return 'Exchange';
  if (['MCD', 'MD', 'MDE', 'MLI', 'MRB'].includes(payer)) return 'Medicaid';
  return 'Medicare';
};

export const raceNames: Record<string, string> = {
  '1002-5': 'American Indian or Alaska Native',
  '2028-9': 'Asian',
  '2054-5': 'Black or African American',
  '2076-8': 'Native Hawaiian or Other Pacific Islander',
  '2106-3': 'White',
  '2131-1': 'Other race',
  '2039-6': 'Asian (Japanese)',
  ASKU: 'Asked but no answer',
  UNK: 'Unknown',
};
export const ethnicityNames: Record<string, string> = {
  '2135-2': 'Hispanic or Latino',
  '2148-5': 'Hispanic or Latino (Mexican)',
  '2186-5': 'Not Hispanic or Latino',
  ASKU: 'Asked but no answer',
  UNK: 'Unknown',
};
/** Roll a race code up to the group used when reporting results. */
const raceGroupOfCode = (c: string) => {
  if (c === '2039-6') return 'Asian';
  if (c === 'ASKU' || c === 'UNK') return 'Unknown';
  return raceNames[c] ?? 'Unknown';
};
export const raceGroupOf = (m: { raceCodes: string[] }) => {
  const groups = Array.from(new Set(m.raceCodes.map(raceGroupOfCode)));
  return groups.length > 1 ? 'Two or more races' : groups[0];
};
export const ethnicityGroupOf = (m: { ethnicityCode: string }) => (m.ethnicityCode === '2135-2' || m.ethnicityCode === '2148-5' ? 'Hispanic or Latino' : m.ethnicityCode === '2186-5' ? 'Not Hispanic or Latino' : 'Unknown');

export const languageNames: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  zh: 'Chinese',
  ja: 'Japanese',
  ar: 'Arabic',
  vi: 'Vietnamese',
  ko: 'Korean',
  'asked-declined': 'Asked, declined',
  unknown: 'Unknown',
};

/* ------------------------------------------------------------------ providers */

export interface Provider {
  npi: string;
  name: string;
  type: string;
  org?: string;
}
export const providers: Provider[] = [
  {
    npi: '1000000111',
    name: 'Maria L. Rivera, MD',
    type: 'Family medicine (PCP)',
    org: 'Sample Family Medicine Group',
  },
  {
    npi: '1000000129',
    name: 'Daniel Okafor, MD',
    type: 'OB/GYN',
    org: 'Sample Family Medicine Group',
  },
  {
    npi: '1000000137',
    name: 'Linda M. Chen, NP',
    type: 'Family nurse practitioner (PCP)',
    org: 'Sample Family Medicine Group',
  },
  {
    npi: '1000000210',
    name: 'Grace Kim, MD',
    type: 'Radiology',
    org: 'Sample Imaging Center',
  },
  {
    npi: '1000000228',
    name: 'Raj Mehta, MD',
    type: 'Gastroenterology',
    org: 'Sample General Hospital',
  },
  {
    npi: '1000000160',
    name: 'Thomas Nguyen, DDS',
    type: 'Dentist',
    org: 'Sample Dental',
  },
  { npi: '1000001010', name: 'Sample General Hospital', type: 'Hospital' },
  { npi: '1000000012', name: 'Sample Family Medicine Group', type: 'Clinic' },
];
export const providerName = (npi?: string) => providers.find((p) => p.npi === npi)?.name ?? (npi ? `NPI ${npi}` : '–');

/** Files with no provider field in the spec, so a record from them can never name one. */
const filesWithoutProvider: string[] = ['lab', 'obs', 'diag', 'pharmacy-claim-line'];
/** The provider on a record, or the reason there is none. */
export const providerOf = (e: Evt) => (e.provider ? providerName(e.provider) : filesWithoutProvider.includes(e.file) ? `Not in ${e.file}.csv` : '–');
export const providerHelp = 'The rendering provider on the record. Lab, observation, diagnosis-list and pharmacy-line files have no provider field in the spec, so those records show "Not in" and the file name.';
/** Where a record came from, in plain words: a paid claim, or supplemental data from the EHR or a lab feed. */
export const sourceSystemOf = (e: Evt) =>
  e.kind === 'Claim'
    ? e.supplemental
      ? 'Claim (supplemental, $0)'
      : 'Paid claim'
    : e.kind === 'Pharmacy'
      ? e.file === 'pharm'
        ? 'EHR pharmacy (supplemental)'
        : 'Pharmacy claim'
      : e.kind === 'Lab'
        ? 'Lab feed (supplemental)'
        : 'EHR (supplemental)';

/* ------------------------------------------------------------------ model */

export type FileId = 'member-gm' | 'member-en' | 'member-RES' | 'claim' | 'claim-line' | 'pharmacy-claim' | 'pharmacy-claim-line' | 'pharm' | 'pharm-c' | 'provider' | 'medicare-status' | 'visit-e' | 'diag' | 'proc' | 'obs' | 'lab';

export type Tag =
  | 'well-care'
  | 'mammogram'
  | 'mastectomy'
  | 'chest-surgery'
  | 'cytology'
  | 'hpv'
  | 'hysterectomy'
  | 'colonoscopy'
  | 'fit'
  | 'stool-dna'
  | 'ct-colonography'
  | 'sigmoidoscopy'
  | 'colorectal-cancer'
  | 'colectomy'
  | 'palliative'
  | 'hba1c'
  | 'diabetes'
  | 'frailty'
  | 'dementia'
  | 'vaccine'
  | 'other';

export interface Evt {
  date: Date;
  /** The file this row would arrive in. */
  file: Exclude<FileId, 'member-gm' | 'member-en' | 'member-RES' | 'provider' | 'medicare-status'>;
  /** Kind shown in the clinical-data table. */
  kind: 'Claim' | 'EHR visit' | 'EHR diagnosis' | 'EHR procedure' | 'Lab' | 'Observation' | 'Pharmacy' | 'Vaccine';
  code: string;
  system: string;
  text: string;
  tag: Tag;
  /** Result value (for example HbA1c %). */
  value?: number;
  /** finished / final / preliminary / cancelled / preparation / paid / denied … */
  status: string;
  /** True when it comes from supplemental data (EHR, lab feed) and not from a paid claim. */
  supplemental: boolean;
  side?: 'LT' | 'RT';
  provider?: string;
  /** A well-care visit held by video or phone. From 2025 on, NCQA does not count these for WCV. */
  telehealth?: boolean;
  /** A claim sent by a lab. From 2025 on, NCQA does not count lab claims toward the bilateral mastectomy exclusion. */
  labClaim?: boolean;
  /** How many file rows this event takes in claim-line / pharmacy-claim-line (default 1). */
  lines?: number;
  /** PROPOSED new field, not in the ingestion spec: the day Sonata first saw this record. Kept apart from the last file refresh. */
  identifiedOn?: Date;
  /** PROPOSED new lab fields. The spec has Units and Result Value Flag in obs.csv only; reference range and result date are in no file. */
  unit?: string;
  refRange?: string;
  flag?: 'Normal' | 'High' | 'Low' | 'Abnormal';
  /** PROPOSED: the day the lab result was released. The record date is the collection date (Date of Service). */
  resultedOn?: Date;
}

export interface Segment {
  start: Date;
  end: Date;
  payer: string;
  medical: boolean;
  drug: boolean;
}
export interface MedicareStatus {
  start: Date;
  end: Date;
  hospice: boolean;
  lti: boolean;
  orec: string;
  lis: boolean;
}

export interface Member {
  id: string;
  first: string;
  last: string;
  name: string;
  gender: Gender;
  dob: Date;
  dod?: Date;
  street: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  caretaker?: string;
  /** PROPOSED new member-file column. Not in the ingestion spec yet. */
  county?: string;
  /** PROPOSED new member-file column. Not in the ingestion spec yet. */
  military?: 'Active' | 'Retired' | 'Not military';
  spoken?: string;
  spokenSource?: string;
  written?: string;
  writtenSource?: string;
  other?: string;
  otherSource?: string;
  disability?: 'Disabled' | 'Not Disabled' | 'Missing';
  disabilitySource?: string;
  raceCodes: string[];
  ethnicityCode: string;
  raceSource: string;
  segments: Segment[];
  medicare: MedicareStatus[];
  events: Evt[];
}

/* ------------------------------------------------------------------ small helpers to write events */

const mk = (e: Omit<Evt, 'status' | 'supplemental'> & Partial<Pick<Evt, 'status' | 'supplemental'>>): Evt => ({ status: 'finished', supplemental: false, ...e });
const claim = (date: Date, code: string, system: string, text: string, tag: Tag, extra: Partial<Evt> = {}) =>
  mk({
    date,
    file: 'claim-line',
    kind: 'Claim',
    code,
    system,
    text,
    tag,
    status: 'paid',
    ...extra,
  });
const visit = (date: Date, code: string, text: string, tag: Tag, extra: Partial<Evt> = {}) =>
  mk({
    date,
    file: 'visit-e',
    kind: 'EHR visit',
    code,
    system: 'CPT',
    text,
    tag,
    supplemental: true,
    ...extra,
  });
const proc = (date: Date, code: string, system: string, text: string, tag: Tag, extra: Partial<Evt> = {}) =>
  mk({
    date,
    file: 'proc',
    kind: 'EHR procedure',
    code,
    system,
    text,
    tag,
    supplemental: true,
    status: 'completed',
    ...extra,
  });
const diag = (date: Date, code: string, system: string, text: string, tag: Tag, extra: Partial<Evt> = {}) =>
  mk({
    date,
    file: 'diag',
    kind: 'EHR diagnosis',
    code,
    system,
    text,
    tag,
    supplemental: true,
    status: 'recorded',
    ...extra,
  });
const lab = (date: Date, loinc: string, text: string, tag: Tag, value?: number, extra: Partial<Evt> = {}) =>
  mk({
    date,
    file: 'lab',
    kind: 'Lab',
    code: loinc,
    system: 'LOINC',
    text,
    tag,
    value,
    supplemental: true,
    status: 'final',
    ...extra,
  });
const obs = (date: Date, code: string, text: string, tag: Tag, extra: Partial<Evt> = {}) =>
  mk({
    date,
    file: 'obs',
    kind: 'Observation',
    code,
    system: 'LOINC',
    text,
    tag,
    supplemental: true,
    status: 'final',
    ...extra,
  });
const rx = (date: Date, ndc: string, text: string, tag: Tag = 'other', extra: Partial<Evt> = {}) =>
  mk({
    date,
    file: 'pharmacy-claim-line',
    kind: 'Pharmacy',
    code: ndc,
    system: 'NDC',
    text,
    tag,
    status: 'paid',
    ...extra,
  });
const vax = (date: Date, cvx: string, text: string, status = 'completed') =>
  mk({
    date,
    file: 'pharm-c',
    kind: 'Vaccine',
    code: cvx,
    system: 'CVX',
    text,
    tag: 'vaccine',
    supplemental: true,
    status,
  });

const seg = (start: Date, end: Date, payer: string, extra: Partial<Segment> = {}): Segment => ({ start, end, payer, medical: true, drug: true, ...extra });

type Base = Omit<Member, 'name' | 'medicare'> & { medicare?: MedicareStatus[] };
const person = (b: Base): Member => ({
  ...b,
  name: `${b.first} ${b.last}`,
  medicare: b.medicare ?? [],
});

/* ------------------------------------------------------------------ the ten members from the spec's sample tabs */

const sample: Member[] = [
  person({
    id: 'M1001',
    first: 'Sofia',
    last: 'Reyes',
    gender: 'female',
    dob: d(2019, 5, 14),
    street: '100 Main St',
    city: 'Springfield',
    state: 'IL',
    zip: '62701',
    phone: '2175550101',
    caretaker: 'Ana Reyes',
    spoken: 'es',
    spokenSource: 'Health Plan Direct',
    written: 'es',
    writtenSource: 'Health Plan Direct',
    raceCodes: ['2106-3'],
    ethnicityCode: '2148-5',
    raceSource: 'Health Plan Collected',
    segments: [seg(d(2025, 1, 1), OPEN, 'HMO')],
    events: [
      claim(d(2026, 3, 10), '99393', 'CPT', 'Preventive visit, age 5–11', 'well-care', { provider: '1000000111' }),
      claim(d(2026, 7, 22), 'D0120', 'CDT', 'Periodic oral evaluation (dental)', 'other', { provider: '1000000160' }),
      vax(d(2020, 5, 20), '03', 'MMR'),
      vax(d(2020, 5, 20), '21', 'Varicella'),
    ],
  }),
  person({
    id: 'M1002',
    first: 'James',
    last: 'Carter',
    gender: 'male',
    dob: d(1968, 3, 4),
    street: '22 Oak Ave, Apt 4',
    city: 'Springfield',
    state: 'IL',
    zip: '62702',
    phone: '2175550102',
    spoken: 'en',
    spokenSource: 'Health Plan Direct',
    written: 'en',
    writtenSource: 'Health Plan Direct',
    disability: 'Not Disabled',
    disabilitySource: 'SelfReportedQuestionnaire',
    raceCodes: ['2054-5'],
    ethnicityCode: '2186-5',
    raceSource: 'CMS/State Databases (Enrollment Files)',
    segments: [seg(d(2024, 1, 1), OPEN, 'PPO')],
    events: [
      claim(d(2026, 4, 15), '99214', 'CPT', 'Office visit, established patient', 'other', { provider: '1000000111' }),
      claim(d(2026, 4, 15), 'E11.9', 'ICD-10', 'Type 2 diabetes without complications', 'diabetes', { provider: '1000000111' }),
      claim(d(2026, 4, 15), '83036', 'CPT', 'Hemoglobin A1c test', 'other', {
        provider: '1000000111',
      }),
      claim(d(2026, 4, 15), '3044F', 'CPT II', 'Most recent HbA1c below 7.0%', 'other', { provider: '1000000111' }),
      claim(d(2026, 8, 5), '99213', 'CPT', 'Office visit (claim denied)', 'other', { status: 'denied', provider: '1000000111' }),
      claim(d(2026, 9, 10), 'E11.9', 'ICD-10', 'Diabetes (supplemental claim, $0)', 'diabetes', { supplemental: true }),
      rx(d(2026, 4, 15), '00093104801', 'Metformin 500 mg, 30 days'),
      rx(d(2026, 5, 16), '00093104801', 'Metformin 500 mg, 30 days'),
      mk({
        date: d(2026, 3, 1),
        file: 'pharm',
        kind: 'Pharmacy',
        code: '861007',
        system: 'RxNorm',
        text: 'Metformin (clinic dispensing)',
        tag: 'other',
        supplemental: true,
        status: 'dispensed',
      }),
      obs(d(2026, 4, 15), '39156-5', 'Body mass index 31.2 kg/m²', 'other'),
      lab(d(2026, 4, 15), '4548-4', 'Hemoglobin A1c, 6.8%', 'hba1c', 6.8),
      lab(d(2026, 10, 12), '4548-4', 'Hemoglobin A1c, 7.4% (preliminary)', 'hba1c', 7.4, { status: 'preliminary' }),
      diag(d(2020, 1, 15), 'E11.9', 'ICD-10', 'Type 2 diabetes (problem list)', 'diabetes'),
    ],
  }),
  person({
    id: 'M1003',
    first: 'Mei',
    last: 'Tanaka',
    gender: 'female',
    dob: d(1974, 9, 22),
    street: '8 Pine Rd',
    city: 'Springfield',
    state: 'IL',
    zip: '62703',
    phone: '2175550103',
    spoken: 'en',
    spokenSource: 'CMS Databases',
    written: 'en',
    writtenSource: 'CMS Databases',
    raceCodes: ['2028-9', '2106-3'],
    ethnicityCode: '2186-5',
    raceSource: 'Health Plan Collected',
    segments: [seg(d(2020, 1, 1), OPEN, 'HMO')],
    events: [
      claim(d(2026, 5, 20), '77067', 'CPT', 'Screening mammogram, both breasts', 'mammogram', { provider: '1000000210' }),
      claim(d(2026, 5, 20), 'Z12.31', 'ICD-10', 'Screening mammogram for breast cancer', 'other'),
      claim(d(2026, 2, 2), '0UT90ZZ', 'ICD-10-PCS', 'Hysterectomy: resection of uterus (hospital stay 02/02–02/05)', 'hysterectomy', { provider: '1000001010' }),
      claim(d(2026, 2, 2), '0UTC0ZZ', 'ICD-10-PCS', 'Resection of cervix', 'hysterectomy', { provider: '1000001010' }),
      diag(d(2026, 3, 1), 'Z90.710', 'ICD-10', 'Acquired absence of both cervix and uterus', 'hysterectomy'),
    ],
  }),
  person({
    id: 'M1004',
    first: 'Peter',
    last: 'Novak',
    gender: 'male',
    dob: d(1965, 7, 11),
    street: '415 Elm St',
    city: 'Chatham',
    state: 'IL',
    zip: '62629',
    phone: '2175550104',
    raceCodes: ['2106-3'],
    ethnicityCode: '2186-5',
    raceSource: 'Surname Analysis (Imputed)',
    segments: [seg(d(2022, 1, 1), d(2025, 12, 31), 'PPO'), seg(d(2026, 1, 1), OPEN, 'PPO')],
    events: [
      claim(d(2026, 6, 12), '45380', 'CPT', 'Colonoscopy with biopsy (hospital outpatient)', 'colonoscopy', { provider: '1000001010', lines: 2 }),
      rx(d(2026, 6, 20), '00093732156', 'Prescription fill (partially paid)', 'other', { status: 'partiallypaid' }),
      rx(d(2026, 7, 1), '00378395277', 'Prescription fill (denied)', 'other', {
        status: 'denied',
      }),
      proc(d(2026, 12, 1), '45378', 'CPT', 'Colonoscopy, planned (status: preparation, not done)', 'colonoscopy', { status: 'preparation' }),
    ],
  }),
  person({
    id: 'M1005',
    first: 'Margaret',
    last: 'Hughes',
    gender: 'female',
    dob: d(1955, 4, 30),
    street: '77 Lake Dr',
    city: 'Springfield',
    state: 'IL',
    zip: '62704',
    phone: '2175550105',
    spoken: 'en',
    spokenSource: 'CMS Databases',
    written: 'en',
    writtenSource: 'CMS Databases',
    raceCodes: ['2106-3'],
    ethnicityCode: '2186-5',
    raceSource: 'CMS/State Databases (Enrollment Files)',
    segments: [seg(d(2020, 5, 1), OPEN, 'MCR')],
    medicare: [
      {
        start: d(2025, 1, 1),
        end: d(2025, 12, 31),
        hospice: false,
        lti: false,
        orec: '0',
        lis: true,
      },
      {
        start: d(2026, 1, 1),
        end: d(2026, 12, 31),
        hospice: false,
        lti: false,
        orec: '0',
        lis: true,
      },
    ],
    events: [
      visit(d(2026, 3, 5), '99213', 'Office visit: age-related weakness, dementia, hypertension, high cholesterol', 'other', { provider: '1000000111' }),
      diag(d(2026, 3, 5), 'R54', 'ICD-10', 'Age-related physical debility (frailty)', 'frailty'),
      diag(d(2025, 9, 10), '52448006', 'SNOMED', 'Dementia (advanced illness)', 'dementia'),
      mk({
        date: d(2026, 3, 10),
        file: 'pharm',
        kind: 'Pharmacy',
        code: '996561',
        system: 'RxNorm',
        text: 'Dementia medication',
        tag: 'dementia',
        supplemental: true,
        status: 'dispensed',
      }),
    ],
  }),
  person({
    id: 'M1006',
    first: 'Dorothy',
    last: 'Owens',
    gender: 'female',
    dob: d(1958, 2, 18),
    dod: d(2026, 9, 20),
    street: '1200 Care Way, Room 12',
    city: 'Springfield',
    state: 'IL',
    zip: '62711',
    phone: '2175550106',
    spoken: 'unknown',
    spokenSource: 'State Databases',
    disability: 'Disabled',
    disabilitySource: 'EnrollmentStatus',
    raceCodes: ['2054-5'],
    ethnicityCode: '2186-5',
    raceSource: 'CMS/State Databases (Enrollment Files)',
    segments: [seg(d(2023, 1, 1), d(2026, 9, 20), 'SN2')],
    medicare: [
      {
        start: d(2026, 1, 1),
        end: d(2026, 6, 30),
        hospice: false,
        lti: true,
        orec: '1',
        lis: false,
      },
      {
        start: d(2026, 7, 1),
        end: d(2026, 9, 20),
        hospice: true,
        lti: true,
        orec: '1',
        lis: false,
      },
    ],
    events: [visit(d(2026, 7, 1), '183919006', 'Hospice care (SNOMED), place of service 34', 'other', { status: 'finished' })],
  }),
  person({
    id: 'M1007',
    first: 'Camila',
    last: 'Diaz',
    gender: 'female',
    dob: d(2011, 9, 9),
    street: '9 Cedar Ct',
    city: 'Rochester',
    state: 'IL',
    zip: '62563',
    phone: '2175550107',
    caretaker: 'Luis Diaz',
    spoken: 'es',
    spokenSource: 'State Databases',
    written: 'en',
    writtenSource: 'State Databases',
    other: 'es',
    otherSource: 'State Databases',
    raceCodes: ['2131-1'],
    ethnicityCode: '2135-2',
    raceSource: 'Other Direct',
    segments: [seg(d(2015, 1, 1), OPEN, 'MCD')],
    events: [
      visit(d(2026, 8, 18), '99394', 'Preventive visit, age 12–17', 'well-care', { provider: '1000000137' }),
      vax(d(2023, 8, 15), '115', 'Tdap'),
      vax(d(2023, 1, 1), '114', 'MenACWY'),
      vax(d(2025, 9, 10), '165', 'HPV'),
      vax(d(2026, 3, 10), '165', 'HPV (not done)', 'not-done'),
    ],
  }),
  person({
    id: 'M1008',
    first: 'Taylor',
    last: 'Brooks',
    gender: 'female',
    dob: d(1996, 5, 5),
    street: '301 Maple Ln, Unit B',
    city: 'Springfield',
    state: 'IL',
    zip: '62707',
    phone: '2175550108',
    spoken: 'asked-declined',
    spokenSource: 'Health Plan Direct',
    raceCodes: ['ASKU'],
    ethnicityCode: 'ASKU',
    raceSource: 'Health Plan Collected',
    segments: [seg(d(2024, 1, 1), d(2025, 9, 30), 'MMO'), seg(d(2026, 1, 1), OPEN, 'MMO')],
    events: [
      proc(d(2026, 2, 20), '88175', 'CPT', 'Cervical cytology (Pap test)', 'cytology', { provider: '1000000129' }),
      obs(d(2026, 2, 20), '76689-9', 'Sex assigned at birth: female', 'other'),
      visit(d(2026, 6, 1), '99395', 'Preventive visit, age 18–39 (cancelled)', 'other', { status: 'cancelled', provider: '1000000129' }),
    ],
  }),
  person({
    id: 'M1009',
    first: 'Kenji',
    last: 'Sato',
    gender: 'male',
    dob: d(1979, 8, 12),
    street: '56 Birch Blvd',
    city: 'Sherman',
    state: 'IL',
    zip: '62684',
    phone: '2175550109',
    spoken: 'ja',
    spokenSource: 'Health Plan Direct',
    written: 'en',
    writtenSource: 'Health Plan Direct',
    other: 'ja',
    otherSource: 'Health Plan Direct',
    raceCodes: ['2039-6'],
    ethnicityCode: '2186-5',
    raceSource: 'Geo-Coding Analysis (Imputed)',
    segments: [seg(d(2018, 1, 1), OPEN, 'POS')],
    events: [
      proc(d(2022, 5, 10), '73761001', 'SNOMED', 'Colonoscopy', 'colonoscopy', {
        provider: '1000000228',
      }),
      obs(d(2026, 4, 15), '29771-3', 'Fecal immunochemical test: negative', 'fit'),
    ],
  }),
  person({
    id: 'M1010',
    first: 'Laura',
    last: 'Morgan',
    gender: 'female',
    dob: d(1981, 1, 27),
    street: '14 Willow St',
    city: 'Springfield',
    state: 'IL',
    zip: '62704',
    phone: '2175550110',
    raceCodes: ['UNK'],
    ethnicityCode: 'UNK',
    raceSource: 'No Data',
    segments: [seg(d(2021, 1, 1), OPEN, 'CEP')],
    events: [diag(d(2018, 6, 5), 'Z90.12', 'ICD-10', 'Acquired absence of left breast', 'mastectomy', { side: 'LT' }), proc(d(2019, 3, 12), '19303', 'CPT', 'Mastectomy, right breast', 'mastectomy', { side: 'RT' })],
  }),
];

/* ------------------------------------------------------------------ generated members (same every run) */

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const firstF = ['Maria', 'Aisha', 'Sofia', 'Priya', 'Grace', 'Chloe', 'Hannah', 'Zara', 'Nora', 'Ana', 'Yara', 'Ivy', 'Emma', 'Lucia', 'Fatima', 'Hana', 'Olivia', 'Rosa', 'Linh', 'Eva'];
const firstM = ['Liam', 'Noah', 'Daniel', 'Ethan', 'Omar', 'Lucas', 'Isaac', 'Owen', 'Felix', 'Ben', 'Theo', 'Marcus', 'Diego', 'Amir', 'Henry', 'Jin', 'Samuel', 'Victor', 'Tuan', 'Paul'];
const lastN = [
  'Lopez',
  'Khan',
  "O'Brien",
  'Rossi',
  'Williams',
  'Nair',
  'Kim',
  'Okafor',
  'Brooks',
  'Martin',
  'Haddad',
  'Schmidt',
  'Silva',
  'Cohen',
  'Ali',
  'Davis',
  'Jensen',
  'Moreau',
  'Torres',
  'Murphy',
  'Saleh',
  'Walker',
  'Chen',
  'Nguyen',
  'Garcia',
  'Patel',
  'Young',
  'Baker',
  'Flores',
  'Reed',
];
const streetN = ['Maple Ave', 'Oak Street', 'Cedar Lane', 'Lakeview Dr', 'Pine Court', 'Elm Street', 'Walnut Rd'];
const cityN: Array<[string, string]> = [
  ['Springfield', '627'],
  ['Chatham', '626'],
  ['Rochester', '625'],
  ['Sherman', '626'],
  ['Riverton', '626'],
];
const raceSources = ['Health Plan Collected', 'CMS/State Databases (Enrollment Files)', 'Surname Analysis (Imputed)', 'Geo-Coding Analysis (Imputed)', 'Other Direct', 'Health Plan Collected'];

const ageCycle = [8, 15, 52, 48, 61, 19, 67, 44, 58, 70, 29, 36, 72, 55, 63, 50, 12, 41, 66, 33, 59, 45, 17, 69, 38, 56, 73, 47, 5, 62];

function generate(count: number): Member[] {
  const r = rng(2026);
  const pick = <T>(a: T[]) => a[Math.floor(r() * a.length)];
  const chance = (p: number) => r() < p;
  const out: Member[] = [];

  for (let i = 0; i < count; i++) {
    const n = 1011 + i;
    const gender: Gender = i % 2 === 0 ? 'female' : 'male';
    const age = ageCycle[i % ageCycle.length] + ((i * 7) % 3);
    const dob = d(MY - age, 1 + ((i * 5) % 12), 1 + ((i * 11) % 27));
    const first = pick(gender === 'female' ? firstF : firstM);
    const last = pick(lastN);
    const [city, zip3] = pick(cityN);

    // product line by age
    let payer: string;
    if (age >= 66) payer = pick(['MCR', 'MCR', 'MP', 'MCS', 'SN3']);
    else if (age < 22) payer = pick(['MCD', 'MCD', 'MLI', 'HMO', 'PPO']);
    else payer = pick(['HMO', 'PPO', 'POS', 'CEP', 'PPO', 'MPO', 'MMO', 'MCD']);

    // enrollment (a few members have a gap longer than 45 days in 2026)
    const gapMember = chance(0.07);
    const segments: Segment[] = gapMember
      ? [seg(d(2024, 1, 1), d(2026, 3, 31), payer), seg(d(2026, 6, 15), OPEN, payer)]
      : [
          seg(d(2018 + (i % 7), 1 + (i % 12), 1), OPEN, payer, {
            drug: chance(0.93),
          }),
        ];

    // race / ethnicity / language
    const hispanic = chance(0.24);
    const rr = r();
    const baseRace = rr < 0.45 ? '2106-3' : rr < 0.65 ? '2054-5' : rr < 0.73 ? '2028-9' : rr < 0.75 ? '1002-5' : rr < 0.76 ? '2076-8' : rr < 0.86 ? '2131-1' : rr < 0.93 ? 'ASKU' : 'UNK';
    const raceCodes = chance(0.06) && baseRace !== 'ASKU' && baseRace !== 'UNK' ? [baseRace, '2106-3'].filter((x, k, a) => a.indexOf(x) === k) : [baseRace];
    const ethnicityCode = baseRace === 'UNK' ? 'UNK' : hispanic ? '2135-2' : chance(0.05) ? 'ASKU' : '2186-5';
    const lr = r();
    const spoken = hispanic && chance(0.7) ? 'es' : lr < 0.8 ? 'en' : lr < 0.86 ? 'zh' : lr < 0.91 ? 'ar' : lr < 0.96 ? 'vi' : 'ko';
    const hasLang = chance(0.8);
    const dr = r();

    // events
    const ev: Evt[] = [];
    const medicare: MedicareStatus[] = [];
    const prov = pick(['1000000111', '1000000137']);
    const rdate = (y: number, m1 = 1, m2 = 12) => {
      const hi = y === MY ? Math.min(m2, LAST_SERVICE_MONTH) : m2;
      return d(y, m1 + Math.floor(r() * (hi - m1 + 1)), 1 + Math.floor(r() * 27));
    };

    ev.push(claim(rdate(2026, 1, 9), '99213', 'CPT', 'Office visit, established patient', 'other', { provider: prov }));

    if (age >= 3 && age <= 21 && chance(0.56)) {
      const code = age < 12 ? '99393' : age < 18 ? '99394' : '99395';
      if (chance(0.7)) ev.push(claim(rdate(2026, 1, 11), code, 'CPT', `Preventive visit, age ${age < 12 ? '5–11' : age < 18 ? '12–17' : '18–39'}`, 'well-care', { provider: prov }));
      else ev.push(visit(rdate(2026, 1, 11), code, 'Preventive visit (EHR)', 'well-care', { provider: prov }));
    }

    if (gender === 'female') {
      if (age >= 42 && age <= 74 && chance(0.74)) ev.push(claim(rdate(chance(0.55) ? 2026 : 2025, 1, 12), chance(0.8) ? '77067' : '77065', 'CPT', 'Screening mammogram', 'mammogram', { provider: '1000000210' }));
      if (age >= 24 && age <= 64 && chance(0.8)) ev.push(proc(rdate(chance(0.5) ? 2026 : 2024 + Math.floor(r() * 2), 1, 12), '88175', 'CPT', 'Cervical cytology (Pap test)', 'cytology', { provider: '1000000129' }));
      if (age >= 35 && chance(0.06)) ev.push(diag(rdate(2022), 'Z90.710', 'ICD-10', 'Acquired absence of both cervix and uterus', 'hysterectomy'));
      if (age >= 42 && chance(0.04)) {
        ev.push(diag(rdate(2019), 'Z90.12', 'ICD-10', 'Acquired absence of left breast', 'mastectomy', { side: 'LT' }));
        ev.push(proc(rdate(2020), '19303', 'CPT', 'Mastectomy, right breast', 'mastectomy', { side: 'RT' }));
      }
    }

    if (age >= 46 && age <= 75 && chance(0.6)) {
      if (chance(0.7)) ev.push(proc(rdate(2018 + Math.floor(r() * 8)), '45378', 'CPT', 'Colonoscopy', 'colonoscopy', { provider: '1000000228' }));
      else ev.push(obs(rdate(2026, 1, 11), '29771-3', 'Fecal immunochemical test: negative', 'fit'));
    }

    const diabetic = age >= 30 && chance(0.26);
    if (diabetic) {
      ev.push(claim(rdate(2026, 1, 6), 'E11.9', 'ICD-10', 'Type 2 diabetes without complications', 'diabetes', { provider: prov }));
      if (chance(0.9)) {
        const v = chance(0.74) ? 5.9 + r() * 2 : 8.1 + r() * 2.4;
        ev.push(lab(rdate(2026, 2, 11), '4548-4', `Hemoglobin A1c, ${v.toFixed(1)}%`, 'hba1c', Math.round(v * 10) / 10));
      }
      ev.push(rx(rdate(2026, 1, 6), '00093104801', 'Metformin 500 mg, 30 days'));
    }

    if (age >= 66 && chance(0.13)) {
      ev.push(diag(rdate(2026, 1, 8), 'R54', 'ICD-10', 'Age-related physical debility (frailty)', 'frailty'));
      ev.push(diag(rdate(2025), 'F03.90', 'ICD-10', 'Dementia (advanced illness)', 'dementia'));
    }

    if (productLineOf(payer) === 'Medicare') {
      const hospice = i === 24 || i === 61; // two Medicare members in hospice
      medicare.push({
        start: d(2026, 1, 1),
        end: hospice ? d(2026, 5, 31) : d(2026, 12, 31),
        hospice: false,
        lti: false,
        orec: age >= 65 ? '0' : '1',
        lis: chance(0.3),
      });
      if (hospice)
        medicare.push({
          start: d(2026, 6, 1),
          end: d(2026, 12, 31),
          hospice: true,
          lti: false,
          orec: '0',
          lis: false,
        });
    }

    out.push({
      id: `M${n}`,
      first,
      last,
      name: `${first} ${last}`,
      gender,
      dob,
      street: `${100 + ((i * 37) % 800)} ${pick(streetN)}`,
      city,
      state: 'IL',
      zip: `${zip3}${String(10 + (i % 80)).padStart(2, '0')}`,
      phone: `217555${String(1000 + i * 13).slice(-4)}`,
      caretaker: age < 18 ? `${pick(gender === 'female' ? firstF : firstM)} ${last}` : undefined,
      spoken: hasLang ? spoken : undefined,
      spokenSource: hasLang ? pick(['Health Plan Direct', 'CMS Databases', 'State Databases']) : undefined,
      written: hasLang && chance(0.8) ? spoken : undefined,
      writtenSource: hasLang ? 'Health Plan Direct' : undefined,
      disability: dr < 0.08 ? 'Disabled' : dr < 0.62 ? 'Not Disabled' : undefined,
      disabilitySource: dr < 0.62 ? pick(['SelfReportedQuestionnaire', 'EnrollmentStatus']) : undefined,
      raceCodes,
      ethnicityCode,
      raceSource: raceSources[i % raceSources.length],
      segments,
      medicare,
      events: ev,
    });
  }
  return out;
}

/**
 * Demo only: so the list shows members with several gaps at once, every third woman age 46–64
 * has no mammogram, Pap test or colonoscopy/stool test on file (3 gaps), and every sixth of them also has diabetes
 * with no HbA1c this year (4 gaps). The 10 sample members from the spec are not touched.
 * It changes no random numbers, so every other member stays the same.
 */
function withSeveralGaps(list: Member[]): Member[] {
  const screens = new Set(['mammogram', 'cytology', 'colonoscopy', 'fit', 'hysterectomy', 'mastectomy']);
  let k = 0;
  return list.map((m) => {
    const age = ageAtYearEnd(m.dob);
    if (m.gender !== 'female' || age < 46 || age > 64) return m;
    k += 1;
    if (k % 3 !== 0) return m;
    const events = m.events.filter((e) => !screens.has(e.tag) && e.tag !== 'hba1c');
    if (k % 6 === 0 && !events.some((e) => e.tag === 'diabetes')) {
      events.push(claim(d(MY, 3, 9), 'E11.9', 'ICD-10', 'Type 2 diabetes without complications', 'diabetes', { provider: '1000000111' }));
      events.push(rx(d(MY, 3, 9), '00093104801', 'Metformin 500 mg, 30 days'));
    }
    return { ...m, events };
  });
}

/**
 * Demo only: adds the cases managers ask about, so each one can be seen in the mockup. It works on a fixed rhythm
 * (every Nth member who qualifies), changes no random numbers, and never touches the 10 sample members.
 *  - colorectal screening done with each test type, inside or outside its window
 *  - colorectal cancer, total colectomy, palliative care, one death
 *  - a final HbA1c lab with no result value
 *  - a screening code that looks right but is not mapped to the measure (Z12.31, Z01.419, Z12.11, 83036)
 */
function withEdgeCases(list: Member[]): Member[] {
  const colCases: ((k: Member) => Evt[])[] = [
    () => [lab(d(2025, 6, 3), '77353-1', 'Stool DNA-FIT test (Cologuard), negative', 'stool-dna')],
    () => [proc(d(2023, 3, 14), '74263', 'CPT', 'CT colonography (virtual colonoscopy)', 'ct-colonography', { provider: '1000000228' })],
    () => [proc(d(2022, 5, 9), '45330', 'CPT', 'Flexible sigmoidoscopy', 'sigmoidoscopy', { provider: '1000000228' })],
    () => [lab(d(2022, 4, 5), '77353-1', 'Stool DNA-FIT test (Cologuard), negative', 'stool-dna')],
    () => [obs(d(2025, 8, 20), '29771-3', 'Fecal immunochemical test: negative', 'fit')],
    () => [proc(d(2018, 9, 12), '45330', 'CPT', 'Flexible sigmoidoscopy', 'sigmoidoscopy', { provider: '1000000228' })],
    () => [diag(d(2021, 5, 17), 'C18.9', 'ICD-10', 'Malignant neoplasm of colon, unspecified', 'colorectal-cancer')],
    () => [proc(d(2019, 11, 4), '44150', 'CPT', 'Total abdominal colectomy', 'colectomy', { provider: '1000000228' })],
  ];
  const colTags = new Set<Tag>(['colonoscopy', 'fit']);
  const agedIn = { col: 0, bcs: 0, ccs: 0, wcv: 0 };
  let colSeen = 0,
    colUsed = 0,
    palSeen = 0,
    glucSeen = 0,
    noValSeen = 0,
    bcsSeen = 0,
    ccsSeen = 0,
    colNoneSeen = 0,
    deadDone = false;
  return list.map((m, idx) => {
    const age = ageAtYearEnd(m.dob);
    const plain = !m.events.some((e) => e.tag === 'frailty') && m.medicare.every((x) => !x.hospice);
    let events = m.events;
    let dod = m.dod;
    let segments = m.segments;
    let touched = false;

    // colorectal screening cases
    if (age >= 46 && age <= 75 && plain && events.some((e) => colTags.has(e.tag))) {
      colSeen += 1;
      if (colSeen % 5 === 0) {
        events = [...events.filter((e) => !colTags.has(e.tag)), ...colCases[colUsed % colCases.length](m)];
        colUsed += 1;
        touched = true;
      }
    }
    // palliative care
    if (!touched && age >= 50 && age <= 74 && plain) {
      palSeen += 1;
      if (palSeen % 13 === 0) {
        events = [...events, diag(d(MY, 4, 22), 'Z51.5', 'ICD-10', 'Encounter for palliative care', 'palliative')];
        touched = true;
      }
    }
    // one member who died in the year, with no hospice
    if (!touched && !deadDone && idx > 40 && age >= 55 && plain && m.medicare.length === 0) {
      deadDone = true;
      dod = d(MY, 8, 12);
      segments = segments.map((s) => (s.end > dod! ? { ...s, end: dod! } : s));
      events = events.filter((e) => e.date <= dod!);
      touched = true;
    }
    // HbA1c lab with no result value
    const a1c = events.find((e) => e.tag === 'hba1c' && e.status === 'final' && e.value !== undefined);
    if (!touched && a1c && age <= 75) {
      noValSeen += 1;
      if (noValSeen % 6 === 0) {
        events = events.map((e) =>
          e === a1c
            ? {
                ...e,
                value: undefined,
                text: 'Hemoglobin A1c (result value not sent)',
              }
            : e,
        );
        touched = true;
      }
    }
    // codes that look right but are not mapped
    if (!touched) {
      const has = (tag: Tag) => events.some((e) => e.tag === tag);
      const extra: Evt[] = [];
      if (m.gender === 'female' && age >= 42 && age <= 74 && !has('mammogram') && !has('mastectomy') && ++bcsSeen % 3 === 0)
        extra.push(claim(d(MY, 5, 20), 'Z12.31', 'ICD-10', 'Screening mammogram for breast cancer (diagnosis code only, no procedure)', 'other', { provider: '1000000210' }));
      if (m.gender === 'female' && age >= 24 && age <= 64 && !has('cytology') && !has('hysterectomy') && ++ccsSeen % 3 === 0)
        extra.push(claim(d(MY, 4, 8), 'Z01.419', 'ICD-10', 'Routine gynecological exam without abnormal findings', 'other', { provider: '1000000129' }));
      if (age >= 46 && age <= 75 && plain && !has('colonoscopy') && !has('fit') && ++colNoneSeen % 4 === 0)
        extra.push(claim(d(MY, 6, 2), 'Z12.11', 'ICD-10', 'Encounter for screening for malignant neoplasm of colon (no test result)', 'other', { provider: '1000000228' }));
      if (has('diabetes') && !events.some((e) => e.tag === 'hba1c') && ++glucSeen % 2 === 0) extra.push(claim(d(MY, 2, 17), '83036', 'CPT', 'Hemoglobin A1c test, billed (no result sent)', 'other', { provider: '1000000111' }));
      if (extra.length) events = [...events, ...extra];
    }
    // a few members who just reached the lowest age of a measure this year (born one year later), so "Just aged in" has examples
    let dob = m.dob;
    const youngerBy = (_n: number) => new Date(m.dob.getFullYear() + 1, m.dob.getMonth(), m.dob.getDate());
    if (age === 47 && agedIn.col < 3) {
      dob = youngerBy(1);
      agedIn.col += 1;
    } else if (age === 43 && m.gender === 'female' && agedIn.bcs < 3) {
      dob = youngerBy(1);
      agedIn.bcs += 1;
    } else if (age === 25 && m.gender === 'female' && agedIn.ccs < 3) {
      dob = youngerBy(1);
      agedIn.ccs += 1;
    } else if (age === 4 && agedIn.wcv < 3) {
      dob = youngerBy(1);
      agedIn.wcv += 1;
    }
    return events === m.events && dod === m.dod && dob === m.dob ? m : { ...m, events, dod, segments, dob };
  });
}

/**
 * Demo only: a few records that show what changed between 2025 and 2026 rules, so the two years differ in a way you can click into.
 *  - children whose only well-care visit was by telehealth (counts in 2026, not in 2025)
 *  - women with a high-risk HPV test and no Pap test (counts in 2025, a gap in 2026)
 *  - women with a mastectomy on one breast plus one billed only on a lab claim (excluded in 2026, not excluded in 2025)
 * Fixed rhythm, no random numbers, never touches the 10 sample members.
 */
function withYearCases(list: Member[]): Member[] {
  let tele = 0,
    hpv = 0,
    mast = 0;
  return list.map((m) => {
    if (m.id <= 'M1010') return m;
    const age = ageAtYearEnd(m.dob);
    const has = (tag: Tag) => m.events.some((e) => e.tag === tag);
    const plain = !m.events.some((e) => e.tag === 'frailty') && m.medicare.every((x) => !x.hospice);
    if (age >= 5 && age <= 21 && tele < 6) {
      const visits = m.events.filter((e) => e.tag === 'well-care' && e.date.getFullYear() === MY);
      if (visits.length === 1 && ++tele > 0) {
        const v = visits[0];
        return { ...m, events: m.events.map((e) => (e === v ? { ...e, telehealth: true, text: `${e.text} (telehealth, video)` } : e)) };
      }
    }
    if (m.gender === 'female' && age >= 33 && age <= 64 && plain && !has('cytology') && !has('hysterectomy') && hpv < 5 && ++hpv > 0) {
      return { ...m, events: [...m.events, lab(d(2025, 5, 14), '30167-1', 'High-risk HPV DNA test, negative', 'hpv')] };
    }
    if (m.gender === 'female' && age >= 52 && age <= 74 && plain && !has('mammogram') && !has('mastectomy') && !has('palliative') && mast < 3 && ++mast > 0) {
      return {
        ...m,
        events: [
          ...m.events,
          diag(d(2018, 6, 5), 'Z90.12', 'ICD-10', 'Acquired absence of left breast', 'mastectomy', { side: 'LT' }),
          claim(d(2019, 3, 12), '19303', 'CPT', 'Mastectomy, right breast (billed by a lab)', 'mastectomy', { side: 'RT', labClaim: true, provider: '1000000210' }),
        ],
      };
    }
    return m;
  });
}

/**
 * The ingestion spec has City, State and Zip, but no County and no military status. Both are PROPOSED new columns of
 * the member file, so here they are stored on each member like any other field (not worked out on the screen).
 * Like every member in this demo the values are sample data. County follows the city (a look-up table, as a real
 * Zip-to-county table would); a third of the made-up members live in other places so the State and County filters have
 * more than one value to pick.
 */
const otherPlaces: Array<[string, string, string]> = [
  ['Terre Haute', 'IN', '478'],
  ['St. Louis', 'MO', '631'],
  ['Davenport', 'IA', '528'],
  ['Decatur', 'IL', '625'],
  ['Peoria', 'IL', '616'],
];
const countyByCity: Record<string, string> = {
  'Springfield|IL': 'Sangamon County',
  'Chatham|IL': 'Sangamon County',
  'Rochester|IL': 'Sangamon County',
  'Sherman|IL': 'Sangamon County',
  'Riverton|IL': 'Sangamon County',
  'Decatur|IL': 'Macon County',
  'Peoria|IL': 'Peoria County',
  'Terre Haute|IN': 'Vigo County',
  'St. Louis|MO': 'St. Louis City',
  'Davenport|IA': 'Scott County',
};
function withLocations(list: Member[]): Member[] {
  return list.map((m) => {
    const n = Number(m.id.slice(1));
    const moved = n >= 1011 && n % 15 <= 4;
    const [city, state, zip3] = moved ? otherPlaces[n % 15] : [m.city, m.state, m.zip.slice(0, 3)];
    const age = MY - m.dob.getFullYear();
    const military: Member['military'] =
      age >= 18 && age <= 60 && n % 13 === 0 ? 'Active' : age >= 45 && n % 11 === 0 ? 'Retired' : 'Not military';
    return {
      ...m,
      city,
      state,
      zip: `${zip3}${m.zip.slice(3)}`,
      county: countyByCity[`${city}|${state}`] ?? 'Not sent',
      military,
    };
  });
}
/** Read the stored values. 'Not sent' when the file had none, as for the spoken language. */
export const countyOf = (m: Member) => m.county ?? 'Not sent';
export type MilitaryStatus = 'Active' | 'Retired' | 'Not military' | 'Not sent';
export const militaryOf = (m: Member): MilitaryStatus => m.military ?? 'Not sent';

/**
 * Stored values for the PROPOSED record fields (see Evt): date identified, and for labs the unit, reference range, flag and result date.
 * They are written once here, onto the record, like any other field. The screens only read them.
 */
function withRecordFields(list: Member[]): Member[] {
  const claimFiles = ['claim', 'claim-line', 'pharmacy-claim', 'pharmacy-claim-line', 'pharm'];
  // Same value as NEWEST_FILE (defined further down, after `members` is built) and the same hash as hashOf.
  const newest = new Date(2026, 9, 15);
  const hashOfKey = (id: string) => [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  return list.map((m) => ({
    ...m,
    events: m.events.map((e) => {
      const h = hashOfKey(`${m.id}${e.file}${e.code}${e.date.toISOString()}`);
      // Claims reach us weeks after the visit; EHR and lab feeds within days.
      const lag = claimFiles.includes(e.file) ? 20 + (h % 40) : 1 + (h % 9);
      const soon = new Date(e.date.getTime() + lag * DAY);
      const out: Evt = { ...e, identifiedOn: soon > newest ? newest : soon };
      if (e.kind === 'Lab' || e.kind === 'Observation') {
        out.resultedOn = new Date(e.date.getTime() + (1 + ((h >>> 3) % 3)) * DAY);
        if (e.tag === 'hba1c') {
          out.refRange = '4.0 to 5.6';
          if (e.value !== undefined) {
            out.unit = '%';
            out.flag = e.value > 5.6 ? 'High' : e.value < 4 ? 'Low' : 'Normal';
          }
        } else {
          out.refRange = 'Negative';
          out.flag = /positive|abnormal|ASC|HSIL|LSIL/i.test(e.text) ? 'Abnormal' : 'Normal';
        }
      }
      return out;
    }),
  }));
}

export const members: Member[] = withRecordFields(withLocations([...sample, ...withYearCases(withEdgeCases(withSeveralGaps(generate(290))))]));
/** The member file stores the two-letter postal code (State column). Screens always show the full name. */
const stateNames: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  DC: 'District of Columbia',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
};
export const stateName = (code: string) => stateNames[code.toUpperCase()] ?? code;
export const memberStates = Array.from(new Set(members.map((m) => stateName(m.state)))).sort();
export const memberCounties = Array.from(new Set(members.map(countyOf))).sort();
/**
 * Version 3 demo members: four young children (a few days, some months, just over a year and four years old), so the Age column and the Age Range
 * filter can be seen. They are NOT part of `members`, so versions 1 and 2 are unchanged. Only the four-year-old is in a measure (WCV, no well-care visit yet, so one care gap);
 * the file has no race or ethnicity for them.
 */
const young = (id: string, first: string, last: string, gender: Gender, dob: Date): Member => ({
  ...members[0],
  id,
  first,
  last,
  name: `${first} ${last}`,
  gender,
  dob,
  dod: undefined,
  raceCodes: [],
  ethnicityCode: '',
  raceSource: 'No Data',
  military: undefined,
  events: [],
  segments: [{ ...members[0].segments[0], start: dob, end: new Date(2026, 11, 31) }],
  medicare: [],
});
export const v3Extra: Member[] = [
  young('M1301', 'Noah', 'Bennett', 'male', new Date(2026, 9, 10)),
  young('M1302', 'Amara', 'Okafor', 'female', new Date(2026, 1, 16)),
  young('M1303', 'Lucas', 'Rivera', 'female', new Date(2025, 6, 16)),
  young('M1304', 'Mia', 'Alvarez', 'female', new Date(2022, 2, 14)),
];
/** Every member shown in the app: the 300 demo members, plus the 3 infants in Version 3. */
export const allMembers = (): Member[] => (getVersion() === 3 ? [...members, ...v3Extra] : members);
export const memberById = (id: string | undefined) => members.find((m) => m.id === id) ?? v3Extra.find((m) => m.id === id);

/* ------------------------------------------------------------------ enrollment checks */

export const productLineOfMember = (m: Member): ProductLine => {
  const covering = m.segments.find((s) => s.start <= MY_END && s.end >= MY_START && s.end >= d(MY, 6, 30)) ?? m.segments[m.segments.length - 1];
  return productLineOf(covering.payer);
};
/**
 * Enrollment status for the member header, worked out from the enrollment periods (member-en.csv has dates, not a status).
 * Enrolled = a period covers the day. Not enrolled = none does, with when the last period ended (or when the first one starts).
 */
export function enrollmentStatusOf(m: Member, on: Date): { label: 'Enrolled' | 'Not enrolled'; detail: string } {
  const sorted = [...m.segments].sort((a, b) => a.start.getTime() - b.start.getTime());
  const covering = sorted.find((x) => x.start <= on && x.end >= on);
  if (covering) {
    // walk back over periods that touch each other, so "since" is the start of the unbroken run
    let since = covering.start;
    for (const x of [...sorted].reverse()) {
      if (x.end < since && since.getTime() - x.end.getTime() <= 2 * DAY) since = x.start;
    }
    return { label: 'Enrolled', detail: `since ${fmtDate(since)}` };
  }
  const past = sorted.filter((x) => x.end < on);
  if (past.length) return { label: 'Not enrolled', detail: `ended ${fmtDate(past[past.length - 1].end)}` };
  return { label: 'Not enrolled', detail: `starts ${fmtDate(sorted[0].start)}` };
}
export const currentPayer = (m: Member) => (m.segments.find((s) => s.end >= MY_END) ?? m.segments[m.segments.length - 1]).payer;

/** Enrolled all year with at most one gap of 45 days or less (members who died are checked up to the date of death). */
export function continuouslyEnrolled(m: Member, year: number = MY): {
  ok: boolean;
  gapDays: number;
} {
  const YS = new Date(year, 0, 1);
  const YE = new Date(year, 11, 31);
  const end = m.dod && m.dod < YE ? m.dod : YE;
  const segs = m.segments.filter((s) => s.medical && s.end >= YS && s.start <= end).sort((a, b) => a.start.getTime() - b.start.getTime());
  if (segs.length === 0) return { ok: false, gapDays: 365 };
  let gapDays = 0;
  let gaps = 0;
  let cursor = YS.getTime();
  for (const s of segs) {
    const st = Math.max(s.start.getTime(), YS.getTime());
    if (st > cursor + DAY) {
      gapDays += Math.round((st - cursor) / DAY) - 1;
      gaps += 1;
    }
    cursor = Math.max(cursor, Math.min(s.end.getTime(), end.getTime()));
  }
  if (cursor < end.getTime() - DAY) {
    gapDays += Math.round((end.getTime() - cursor) / DAY);
    gaps += 1;
  }
  return { ok: gaps === 0 || (gaps === 1 && gapDays <= 45), gapDays };
}

/* ------------------------------------------------------------------ the five measures (simplified demo rules) */

export type MeasureCode = 'WCV' | 'BCS-E' | 'CCS-E' | 'COL-E' | 'GSD';
/** Gap = "Not met" on screen. Review = "Needs review": the evidence is missing, incomplete or conflicting, so it is NOT counted as a care gap. */
export type MeasureState = 'Met' | 'Gap' | 'Excluded' | 'Review' | 'Not eligible';

export interface Rule {
  text: string;
  /** 'spec' = written in the Leap Sonata data spec. 'hedis' = standard HEDIS definition that the spec does not spell out. 'ncqa' = confirmed in NCQA's public MY 2025 documents. 'same' = carried over from the 2026 rules, not confirmed for 2025. */
  from: 'spec' | 'hedis' | 'ncqa' | 'same';
  /** Where in the spec (or which files carry the data). */
  where: string;
}

export interface MeasureDef {
  code: MeasureCode;
  name: string;
  short: string;
  population: string;
  ageRule: string;
  needs: string;
  /** Data files this measure reads. */
  files: FileId[];
  rules: Rule[];
  /** Names of the five checks in the member trace. */
  evidenceLabel: string;
  checks: {
    age: string;
    ageSource: string;
    other: string;
    otherSource: string;
    evidenceSource: string;
  };
}

export const measures: MeasureDef[] = [
  {
    code: 'WCV',
    name: 'Child and Adolescent Well-Care Visits',
    short: 'Well-care visits',
    population: 'Members age 3–21',
    ageRule: 'Age 3–21 on Dec 31',
    needs: 'At least one well-care visit with a primary care provider or OB/GYN during the year.',
    files: ['member-gm', 'member-en', 'claim', 'claim-line', 'visit-e', 'provider'],
    evidenceLabel: 'Well-care visit',
    checks: {
      age: 'Age',
      ageSource: 'member-gm.csv',
      other: 'Other exclusions',
      otherSource: 'None for this measure',
      evidenceSource: 'visit-e.csv, claim-line.csv, provider.csv',
    },
    rules: [
      {
        text: 'Member is 3–21 on Dec 31 of the measurement year.',
        from: 'spec',
        where: 'member-gm: Date of Birth',
      },
      {
        text: 'Enrolled in a medical benefit all year (one gap of up to 45 days allowed) and enrolled on Dec 31.',
        from: 'spec',
        where: 'member-en',
      },
      {
        text: 'Met when a well-care visit appears on a claim or in an EHR encounter that is not cancelled, in the measurement year.',
        from: 'spec',
        where: 'visit-e, claim-line',
      },
      {
        text: 'The visit must be with a PCP, OB/GYN or prenatal care provider. A claim with an NPI that is not in provider.csv cannot meet this.',
        from: 'spec',
        where: 'provider, visit-e, claim',
      },
      {
        text: 'Excluded: member in hospice, or died during the year.',
        from: 'spec',
        where: 'medicare-status, member-gm',
      },
    ],
  },
  {
    code: 'BCS-E',
    name: 'Breast Cancer Screening (ECDS)',
    short: 'Breast cancer screening',
    population: 'Women age 42–74',
    ageRule: 'Female, age 42–74 on Dec 31',
    needs: 'A mammogram in the look-back window.',
    files: ['member-gm', 'member-en', 'claim', 'claim-line', 'proc', 'diag', 'medicare-status', 'pharm', 'pharmacy-claim-line'],
    evidenceLabel: 'Mammogram',
    checks: {
      age: 'Age and sex',
      ageSource: 'member-gm.csv',
      other: 'Other exclusions',
      otherSource: 'diag.csv, proc.csv, claim-line.csv, pharm.csv',
      evidenceSource: 'proc.csv, claim-line.csv, obs.csv',
    },
    rules: [
      {
        text: 'Member is female, 42–74 on Dec 31.',
        from: 'spec',
        where: 'member-gm: Gender, Date of Birth',
      },
      {
        text: 'Enrolled all year (one gap of up to 45 days). The spec says BCS-E also looks at earlier years; this demo checks the measurement year only.',
        from: 'spec',
        where: 'member-en',
      },
      {
        text: 'Met when a mammogram (claim, EHR procedure or screening result) falls in the look-back window.',
        from: 'spec',
        where: 'proc, obs, claim-line',
      },
      {
        text: 'The look-back window is Oct 1 two years before to Dec 31 of the measurement year.',
        from: 'hedis',
        where: 'not in the spec',
      },
      {
        text: 'Excluded: hospice or death.',
        from: 'spec',
        where: 'medicare-status, member-gm',
      },
      {
        text: 'Excluded: mastectomy on both breasts. Left and right together count as bilateral (procedure side, or modifiers 50, LT, RT on claim lines).',
        from: 'spec',
        where: 'proc, diag, claim-line',
      },
      {
        text: 'Excluded: frailty together with advanced illness (including dementia medication fills in the year or the year before).',
        from: 'spec',
        where: 'diag, visit-e, pharm, pharmacy-claim-line',
      },
      {
        text: 'Excluded: palliative care during the measurement year (diagnosis or encounter). The demo reads it from diag.',
        from: 'hedis',
        where: 'not in the spec',
      },
    ],
  },
  {
    code: 'CCS-E',
    name: 'Cervical Cancer Screening (ECDS)',
    short: 'Cervical cancer screening',
    population: 'Women age 24–64',
    ageRule: 'Female, age 24–64 on Dec 31',
    needs: 'Cervical cytology in the look-back window.',
    files: ['member-gm', 'member-en', 'claim', 'claim-line', 'proc', 'diag', 'obs'],
    evidenceLabel: 'Cervical cytology',
    checks: {
      age: 'Age and sex',
      ageSource: 'member-gm.csv',
      other: 'Other exclusions',
      otherSource: 'diag.csv, proc.csv, claim.csv',
      evidenceSource: 'proc.csv, lab.csv, obs.csv, claim-line.csv',
    },
    rules: [
      {
        text: 'Member is female, 24–64 on Dec 31.',
        from: 'spec',
        where: 'member-gm: Gender, Date of Birth',
      },
      {
        text: 'Enrolled all year (one gap of up to 45 days). The spec says CCS-E also looks at earlier years for commercial members; this demo checks the measurement year only.',
        from: 'spec',
        where: 'member-en',
      },
      {
        text: 'Met when cervical cytology (Pap test) is on a claim, an EHR procedure, a coded lab result or a screening observation inside the look-back window.',
        from: 'spec',
        where: 'proc, lab, obs',
      },
      {
        text: 'The look-back window is three years.',
        from: 'hedis',
        where: 'not in the spec',
      },
      {
        text: 'Excluded: hospice or death.',
        from: 'spec',
        where: 'medicare-status, member-gm',
      },
      {
        text: 'Excluded: hysterectomy, or absence of cervix recorded as a diagnosis.',
        from: 'spec',
        where: 'proc, diag, claim',
      },
    ],
  },
  {
    code: 'COL-E',
    name: 'Colorectal Cancer Screening (ECDS)',
    short: 'Colorectal cancer screening',
    population: 'Members age 46–75',
    ageRule: 'Age 46–75 on Dec 31',
    needs: 'A colonoscopy in the last ten years, CT colonography or flexible sigmoidoscopy in the last five, a stool DNA test in the last three, or a stool test (FIT) this year.',
    files: ['member-gm', 'member-en', 'claim', 'claim-line', 'proc', 'obs', 'lab', 'diag', 'medicare-status'],
    evidenceLabel: 'Colorectal screening test',
    checks: {
      age: 'Age',
      ageSource: 'member-gm.csv',
      other: 'Other exclusions',
      otherSource: 'diag.csv, visit-e.csv, pharm.csv',
      evidenceSource: 'proc.csv, obs.csv, lab.csv, claim-line.csv',
    },
    rules: [
      {
        text: 'Member is 46–75 on Dec 31.',
        from: 'spec',
        where: 'member-gm: Date of Birth',
      },
      {
        text: 'Enrolled all year (one gap of up to 45 days). The spec says COL-E also looks at earlier years; this demo checks the measurement year only.',
        from: 'spec',
        where: 'member-en',
      },
      {
        text: 'Met when a colonoscopy was done in the last 10 years. A planned or not-done procedure does not count.',
        from: 'spec',
        where: 'proc',
      },
      {
        text: 'Met when a stool test (FOBT or sDNA-FIT) result is recorded, coded in LOINC for labs.',
        from: 'spec',
        where: 'lab, obs',
      },
      {
        text: `Each test has its own window: colonoscopy ${MY - 9}–${MY}, CT colonography and flexible sigmoidoscopy ${MY - 4}–${MY}, stool DNA test ${MY - 2}–${MY}, FIT/FOBT ${MY} only.`,
        from: 'hedis',
        where: 'not in the spec',
      },
      {
        text: 'Excluded: hospice or death.',
        from: 'spec',
        where: 'medicare-status, member-gm',
      },
      {
        text: 'Excluded: frailty together with advanced illness, colorectal cancer, or total colectomy.',
        from: 'spec',
        where: 'diag, claim, pharm',
      },
      {
        text: 'Excluded: palliative care during the measurement year.',
        from: 'hedis',
        where: 'not in the spec',
      },
    ],
  },
  {
    code: 'GSD',
    name: 'Glycemic Status Assessment for Patients With Diabetes',
    short: 'Diabetes blood sugar',
    population: 'Members age 18–75 with diabetes',
    ageRule: 'Age 18–75 with diabetes',
    needs: 'The most recent final HbA1c of the year is below 8%.',
    files: ['member-gm', 'member-en', 'claim', 'claim-line', 'lab', 'obs', 'pharmacy-claim', 'pharmacy-claim-line', 'pharm', 'diag'],
    evidenceLabel: 'Latest HbA1c',
    checks: {
      age: 'Age and diabetes',
      ageSource: 'member-gm.csv, diag.csv, claim.csv, pharmacy-claim-line.csv',
      other: 'Other exclusions',
      otherSource: 'diag.csv, visit-e.csv, pharm.csv',
      evidenceSource: 'lab.csv, obs.csv, claim-line.csv',
    },
    rules: [
      {
        text: 'Member is 18–75 and has diabetes (a diagnosis or diabetes medication matched against the NCQA medication list).',
        from: 'spec',
        where: 'member-gm, diag, claim, pharmacy-claim-line',
      },
      {
        text: 'Enrolled all year (one gap of up to 45 days). Measures that use pharmacy data also need a drug benefit.',
        from: 'spec',
        where: 'member-en',
      },
      {
        text: 'Uses the most recent HbA1c (or GMI) in the measurement year. Only final, amended and corrected results count.',
        from: 'spec',
        where: 'obs, lab',
      },
      {
        text: 'The spec names two thresholds, below 8% and above 9%. This demo shows the result as the Latest HbA1c column, with a filter for above 9%, 8–9% and below 8%.',
        from: 'spec',
        where: 'obs, lab',
      },
      {
        text: 'Gap when there is no final HbA1c this year, or the latest one is 8% or higher.',
        from: 'hedis',
        where: 'not in the spec',
      },
      {
        text: 'A final lab with no result value cannot be scored. It shows as Needs review, not as a gap, until the value arrives.',
        from: 'hedis',
        where: 'lab',
      },
      {
        text: 'Excluded: hospice, death, or frailty together with advanced illness.',
        from: 'spec',
        where: 'medicare-status, diag, pharm',
      },
      {
        text: 'Excluded: palliative care during the measurement year.',
        from: 'hedis',
        where: 'not in the spec',
      },
    ],
  },
];
export const measureByCode = (c: string | undefined) => measures.find((m) => m.code === c);

/** A measure as it reads for a measurement year. 2026 is the measure as written. 2025 changes the age range and the items NCQA confirmed; every other rule is carried over from 2026 and labelled that way. */
const v3Defs = new Map<string, MeasureDef>();
/** Version 3 wording of the current-year measure, from the final requirements sheet (HED-001 to HED-005). */
function v3Def(def: MeasureDef): MeasureDef {
  let r = v3Defs.get(def.code);
  if (r) return r;
  const swap = (rules: Rule[], prefix: string, text: string): Rule[] => rules.map((x) => (x.text.startsWith(prefix) ? { ...x, text } : x));
  const add = (rules: Rule[], prefix: string, extra: Rule): Rule[] => {
    const i = rules.findIndex((x) => x.text.startsWith(prefix));
    const out = [...rules];
    out.splice(i >= 0 ? i + 1 : out.length, 0, extra);
    return out;
  };
  const sheet = 'final requirements sheet';
  const institution: Rule = { text: 'Excluded: age 66+ and enrolled in an institutional special needs plan (I-SNP), or living in a long-term institution (LTI flag) during the year.', from: 'spec', where: 'member-en, medicare-status' };
  r = { ...def };
  if (def.code === 'BCS-E') {
    r.population = 'Women age 52–74';
    r.ageRule = 'Female, age 52–74 on Dec 31';
    let rules = swap(def.rules, 'Member is female', 'Member is female, 52–74 on Dec 31.');
    rules = swap(rules, 'Excluded: mastectomy', 'Excluded: mastectomy on one or both breasts, or gender-affirming chest surgery, before or during the year.');
    rules = add(rules, 'Excluded: mastectomy', institution);
    r.rules = rules;
  } else if (def.code === 'CCS-E') {
    r.needs = 'Cervical cytology in the last three years, or a high-risk HPV test in the last five years (age 30–64 and 30 or older on the test date).';
    let rules = swap(def.rules, 'The look-back window is three years', 'Cytology counts in the year and the two years before (age 24–64). A high-risk HPV (hrHPV) test also counts when done in the year or the four years before, at age 30–64 and 30 or older on the test date.');
    rules = swap(rules, 'Excluded: hysterectomy', 'Excluded: hysterectomy with no cervix, cervical agenesis or acquired absence of the cervix, recorded as a procedure or diagnosis.');
    rules = [...rules, { text: 'Excluded: palliative care during the measurement year (diagnosis or encounter).', from: 'spec', where: sheet }];
    r.rules = rules;
  } else if (def.code === 'COL-E') {
    r.rules = add(def.rules, 'Excluded: frailty', institution);
  } else if (def.code === 'GSD') {
    r.needs = 'The lowest final HbA1c of the year is below 8%.';
    r.evidenceLabel = 'Lowest HbA1c';
    let rules = swap(def.rules, 'Uses the most recent HbA1c', 'Uses the lowest final HbA1c (or GMI) in the measurement year. Only final, amended and corrected results count.');
    rules = swap(rules, 'The spec names two thresholds', 'The dashboard shows the total, the members above 8% and the members above 9%. The result column is the lowest HbA1c.');
    rules = swap(rules, 'Gap when there is no final HbA1c', 'Gap when there is no final HbA1c this year, or the lowest one is 8% or higher.');
    r.rules = rules;
  }
  v3Defs.set(def.code, r);
  return r;
}

export function measureFor(base: MeasureDef, year: number): MeasureDef {
  const def = getVersion() === 3 && year === MY ? v3Def(base) : base;
  if (year === MY) return def;
  const R = rulesOfYear(year);
  const [lo, hi] = R.ages[def.code];
  const range = `${lo}–${hi}`;
  const ncqa = (text: string, where = `NCQA MY ${year} documents`): Rule => ({ text, from: 'ncqa', where });
  const carried: Rule[] = def.rules.map((r) => ({ ...r, from: 'same' as const }));
  const at = (prefix: string) => carried.findIndex((r) => r.text.startsWith(prefix));
  const out = [...carried];
  const set = (prefix: string, rule: Rule) => {
    const i = at(prefix);
    if (i >= 0) out[i] = rule;
  };
  const insertAfter = (prefix: string, rule: Rule) => {
    const i = at(prefix);
    out.splice(i >= 0 ? i + 1 : out.length, 0, rule);
  };
  let population = def.population;
  let ageRule = def.ageRule;
  let needs = def.needs;
  set('Member is', ncqa(`Member is ${def.code === 'BCS-E' || def.code === 'CCS-E' ? 'female, ' : ''}${range} on Dec 31${def.code === 'GSD' ? ' and has diabetes (a diagnosis or diabetes medication matched against the NCQA medication list)' : ''}.`));
  if (def.code === 'WCV') {
    insertAfter('Met when a well-care visit', ncqa('A well-care visit held by telehealth (video or phone) does not count. NCQA removed telehealth visits from this measure for MY 2025.'));
  }
  if (def.code === 'BCS-E') {
    population = `Women age ${range}`;
    ageRule = `Female, age ${range} on Dec 31`;
    set('Excluded: mastectomy on both breasts', ncqa('Excluded: mastectomy on both breasts. Left and right together count as bilateral. A mastectomy code that appears only on a lab claim does not count.', 'proc, diag, claim-line'));
  }
  if (def.code === 'CCS-E') {
    population = `Women age ${range}`;
    ageRule = `Female, age ${range} on Dec 31`;
    needs = 'Cervical cytology in the last three years, or a high-risk HPV test in the last five years (age 30 or older on the test date).';
    insertAfter('Met when cervical cytology', ncqa('Also met when a high-risk HPV (hrHPV) test was done in the last 5 years, with the member age 30 or older on the test date. Cytology and hrHPV done together (cotesting) is covered by the hrHPV test alone.', 'proc, lab, obs'));
  }
  if (def.code === 'COL-E') {
    population = `Members age ${range}`;
    ageRule = `Age ${range} on Dec 31`;
    set('Each test has its own window', { text: `Each test has its own window: colonoscopy ${year - 9}–${year}, CT colonography and flexible sigmoidoscopy ${year - 4}–${year}, stool DNA test ${year - 2}–${year}, FIT/FOBT ${year} only. Carried over from 2026 and not confirmed for ${year}.`, from: 'same', where: 'not in the spec' });
  }
  if (def.code === 'GSD') {
    population = `Members age ${range} with diabetes`;
    ageRule = `Age ${range} with diabetes`;
  }
  if (def.code === 'WCV') {
    population = `Members age ${range}`;
    ageRule = `Age ${range} on Dec 31`;
  }
  return { ...def, population, ageRule, needs, rules: out };
}

export type StepOutcome = 'pass' | 'fail' | 'excluded' | 'unmet' | 'review' | 'skipped';
export interface TraceStep {
  label: string;
  outcome: StepOutcome;
  detail: string;
  source: string;
}
export interface MeasureResult {
  state: MeasureState;
  reason: string;
  evidence?: Evt;
  steps: TraceStep[];
}

export const stateLabel: Record<MeasureState, string> = {
  Met: 'Met',
  Gap: 'Not met',
  Excluded: 'Excluded',
  Review: 'Needs review',
  'Not eligible': 'Not in this measure',
};

const inRange = (x: Date, from: Date, to: Date) => x >= from && x <= to;

/* ------------------------------------------------------------------ measurement years */

/** What changes from one measurement year to the next. 2026 follows the Leap spec; 2025 follows NCQA's public MY 2025 documents for the items listed, and is the same as 2026 for everything else. */
export interface YearRules {
  year: number;
  ages: Record<MeasureCode, [number, number]>;
  /** CCS-E: a high-risk HPV test in the last 5 years (age 30+ on the test date) also counts. */
  hpvPath: boolean;
  /** WCV: a well-care visit held by video or phone counts. */
  telehealthCounts: boolean;
  /** BCS-E: a mastectomy that only appears on a lab claim counts toward the bilateral exclusion. */
  labMastectomyCounts: boolean;
  /** Short note shown on screens about how the year's data and rules were made. */
  note: string;
}
export const yearRules: Record<number, YearRules> = {
  2026: {
    year: 2026,
    ages: { WCV: [3, 21], 'BCS-E': [42, 74], 'CCS-E': [24, 64], 'COL-E': [46, 75], GSD: [18, 75] },
    hpvPath: false,
    telehealthCounts: true,
    labMastectomyCounts: true,
    note: 'Current year. Rules follow the Leap Sonata data spec.',
  },
  2025: {
    year: 2025,
    ages: { WCV: [3, 21], 'BCS-E': [50, 74], 'CCS-E': [21, 64], 'COL-E': [45, 75], GSD: [18, 75] },
    hpvPath: true,
    telehealthCounts: false,
    labMastectomyCounts: false,
    note: 'Final results for a past year. The records are a demo copy of the 2026 records with every date moved back one year. The rules follow NCQA MY 2025 documents for ages, the HPV test, telehealth visits and lab-claim mastectomy; the colorectal test windows are carried over from 2026 and not confirmed.',
  },
};
/** Version 3 follows the final requirements sheet: breast screening starts at 52, and the high-risk HPV test also counts for cervical screening. */
const v3Rules = (r: YearRules): YearRules => ({ ...r, ages: { ...r.ages, 'BCS-E': [52, 74], 'CCS-E': [24, 64], 'COL-E': [46, 75] }, hpvPath: true });
const v3Cache = new Map<number, YearRules>();
export const rulesOfYear = (year: number): YearRules => {
  const base = yearRules[year] ?? yearRules[MY];
  if (getVersion() !== 3) return base;
  let r = v3Cache.get(base.year);
  if (!r) v3Cache.set(base.year, (r = v3Rules(base)));
  return r;
};
/** Age range of each measure on Dec 31 of the current year (from the measure rules). */
export const ageBandsOf = (year: number) => rulesOfYear(year).ages;

const shiftBack = (x: Date, years: number) => (x.getFullYear() >= 2099 ? x : new Date(x.getFullYear() - years, x.getMonth(), x.getDate()));
const shifted = new Map<string, Member>();
/** The same member one or more years earlier: every service, enrollment and status date moves back, the birth date stays. Used for the demo copy of past years. */
export function memberForYear(base: Member, year: number): Member {
  const m = withV3Events(base);
  if (year === MY) return m;
  const key = `${m.id}:${year}:${getVersion()}`;
  let r = shifted.get(key);
  if (!r) {
    const n = MY - year;
    r = {
      ...m,
      dod: m.dod ? shiftBack(m.dod, n) : undefined,
      segments: m.segments.map((x) => ({ ...x, start: shiftBack(x.start, n), end: shiftBack(x.end, n) })),
      medicare: m.medicare.map((x) => ({ ...x, start: shiftBack(x.start, n), end: shiftBack(x.end, n) })),
      events: m.events.map((e) => ({
        ...e,
        date: shiftBack(e.date, n),
        identifiedOn: e.identifiedOn ? shiftBack(e.identifiedOn, n) : undefined,
        resultedOn: e.resultedOn ? shiftBack(e.resultedOn, n) : undefined,
      })),
    };
    shifted.set(key, r);
  }
  return r;
}


/** COL-E tests and how far back each one counts. The ingestion spec names colonoscopy and stool tests but gives no windows: these are the HEDIS windows, NOT yet checked against the official MY 2026 specification. */
export const colTests: {
  tag: Tag;
  label: string;
  /** How many years back the test counts, this year included. */
  years: number;
  windowText: string;
  from: (year?: number) => Date;
}[] = ([
  { tag: 'colonoscopy', label: 'Colonoscopy', years: 10 },
  { tag: 'ct-colonography', label: 'CT colonography', years: 5 },
  { tag: 'sigmoidoscopy', label: 'Flexible sigmoidoscopy', years: 5 },
  { tag: 'stool-dna', label: 'Stool DNA test (sDNA-FIT)', years: 3 },
  { tag: 'fit', label: 'Stool test (FIT)', years: 1 },
] as { tag: Tag; label: string; years: number }[]).map((t) => ({ ...t, windowText: colWindowText(t.years, MY), from: (year: number = MY) => new Date(year - t.years + 1, 0, 1) }));
function colWindowText(years: number, year: number) {
  return years === 1 ? `in ${year}` : `in the last ${years} years (since 01/01/${year - years + 1})`;
}
/** The window of one colorectal test, written for a given measurement year. */
export const colWindowFor = (t: { years: number }, year: number) => colWindowText(t.years, year);
export const done = (e: Evt) => !['cancelled', 'preparation', 'not-done', 'denied', 'preliminary'].includes(e.status);

/** `m` is the member as of `year` (already moved back for past years, see memberForYear). */
function evaluateCore(m: Member, code: MeasureCode, year: number): MeasureResult {
  const def = measureFor(measures.find((x) => x.code === code)!, year);
  const R = rulesOfYear(year);
  const Y = year;
  const Y_START = new Date(year, 0, 1);
  const Y_END = new Date(year, 11, 31);
  const age = ageAtYearEnd(m.dob, year);
  const [lo, hi] = R.ages[code];
  const f = m.gender === 'female';
  const plan = [
    { label: def.checks.age, source: def.checks.ageSource },
    {
      label: 'Died or in hospice',
      source: 'member-gm.csv, medicare-status.csv',
    },
    { label: 'Enrolled all year', source: 'member-en.csv' },
    { label: def.checks.other, source: def.checks.otherSource },
    { label: def.evidenceLabel, source: def.checks.evidenceSource },
  ];
  const steps: TraceStep[] = [];
  const add = (i: number, outcome: StepOutcome, detail: string, source?: string) =>
    steps.push({
      label: plan[i].label,
      outcome,
      detail,
      source: source ?? plan[i].source,
    });
  const finish = (state: MeasureState, reason: string, evidence?: Evt): MeasureResult => {
    for (let i = steps.length; i < plan.length; i++)
      steps.push({
        label: plan[i].label,
        outcome: 'skipped',
        detail: 'Not checked',
        source: plan[i].source,
      });
    return { state, reason, evidence, steps };
  };
  const diabetic = m.events.some((e) => e.tag === 'diabetes');

  // 1. who the measure is for
  const why =
    (code === 'BCS-E' || code === 'CCS-E') && !f
      ? 'Measure is for women'
      : !(age >= lo && age <= hi)
        ? `Age is outside ${lo}–${hi}`
        : code === 'GSD' && !diabetic
          ? 'No diabetes on record'
          : null;
  if (why) {
    add(0, 'fail', `${f ? 'Female' : 'Male'}, age ${age}. ${why}`);
    return finish('Not eligible', why);
  }
  const dx = m.events.filter((e) => e.tag === 'diabetes').sort((x, y) => x.date.getTime() - y.date.getTime());
  const qualifying =
    code === 'GSD' && dx.length > 0
      ? ` Diabetes found: ${dx[0].text} (${dx[0].system} ${dx[0].code}), ${dx[0].kind.toLowerCase()} dated ${fmtDate(dx[0].date)}${dx.length > 1 ? `, and ${dx.length - 1} more record${dx.length > 2 ? 's' : ''}` : ''}. The demo looks for a diabetes diagnosis only, not a medication.`
      : '';
  add(
    0,
    'pass',
    `${f ? 'Female' : 'Male'}, age ${age} on Dec 31. This measure counts ${def.population.charAt(0).toLowerCase()}${def.population.slice(1)}.${qualifying}`,
    code === 'GSD' && dx.length > 0 ? `member-gm.csv, ${dx[0].file}.csv` : undefined,
  );

  // 2. died or hospice
  const hospiceRow = m.medicare.find((x) => x.hospice && x.start <= Y_END && x.end >= Y_START);
  if (hospiceRow) {
    const r = `In hospice during the year (since ${fmtDate(hospiceRow.start)})`;
    add(1, 'excluded', r, 'medicare-status.csv: Hospice');
    return finish('Excluded', r);
  }
  if (m.dod && m.dod.getFullYear() === Y) {
    const r = `Died on ${fmtDate(m.dod)}`;
    add(1, 'excluded', r, 'member-gm.csv: Date of Death');
    return finish('Excluded', r);
  }
  add(1, 'pass', 'No hospice or death on record');

  // 3. enrolled all year
  const ce = continuouslyEnrolled(m);
  if (!ce.ok) {
    const r = `Not enrolled all year (gap of ${ce.gapDays} days)`;
    add(2, 'fail', r);
    return finish('Not eligible', r);
  }
  add(2, 'pass', ce.gapDays > 0 ? `Enrolled all year with one gap of ${ce.gapDays} days (up to 45 allowed)` : 'Enrolled all year, no gap');

  // 4. other exclusions
  const frailAdvanced = age >= 66 && m.events.some((e) => e.tag === 'frailty') && m.events.some((e) => e.tag === 'dementia');
  const palliative = m.events.find((e) => e.tag === 'palliative' && inRange(e.date, Y_START, Y_END));
  if (code !== 'WCV' && code !== 'CCS-E' && palliative) {
    const r = `Palliative care during ${Y} (${palliative.text}, ${fmtDate(palliative.date)})`;
    add(3, 'excluded', r, `${palliative.file}.csv`);
    return finish('Excluded', r, palliative);
  }
  if (code !== 'WCV' && code !== 'CCS-E' && frailAdvanced) {
    add(3, 'excluded', 'Age 66+ with frailty and advanced illness');
    return finish('Excluded', 'Age 66+ with frailty and advanced illness');
  }
  if (getVersion() === 3 && (code === 'BCS-E' || code === 'COL-E') && age >= 66) {
    const isnp = m.segments.find((x) => x.payer === 'SN2' && x.start <= Y_END && x.end >= Y_START);
    if (isnp) {
      const r = 'Age 66+ and enrolled in an institutional special needs plan (I-SNP)';
      add(3, 'excluded', `${r} during ${Y}`, 'member-en.csv: Payer SN2');
      return finish('Excluded', r);
    }
    const lti = m.medicare.find((x) => x.lti && x.start <= Y_END && x.end >= Y_START);
    if (lti) {
      const r = 'Age 66+ and living in a long-term institution (LTI flag)';
      add(3, 'excluded', `${r} during ${Y}`, 'medicare-status.csv: LTI');
      return finish('Excluded', r);
    }
  }
  if (getVersion() === 3 && code === 'CCS-E' && palliative) {
    const r = `Palliative care during ${Y} (${palliative.text}, ${fmtDate(palliative.date)})`;
    add(3, 'excluded', r, `${palliative.file}.csv`);
    return finish('Excluded', r, palliative);
  }
  if (code === 'COL-E') {
    const cancer = m.events.find((e) => e.tag === 'colorectal-cancer' && e.date <= Y_END);
    if (cancer) {
      const r = `Colorectal cancer on record (${cancer.text}, ${fmtDate(cancer.date)})`;
      add(3, 'excluded', r, `${cancer.file}.csv`);
      return finish('Excluded', r, cancer);
    }
    const colectomy = m.events.find((e) => e.tag === 'colectomy' && e.date <= Y_END);
    if (colectomy) {
      const r = `Total colectomy on record (${colectomy.text}, ${fmtDate(colectomy.date)})`;
      add(3, 'excluded', r, `${colectomy.file}.csv`);
      return finish('Excluded', r, colectomy);
    }
  }
  if (code === 'BCS-E') {
    const mast = m.events.filter((e) => e.tag === 'mastectomy' && (R.labMastectomyCounts || !e.labClaim));
    if (getVersion() === 3) {
      const one = mast.find((e) => e.date <= Y_END);
      if (one) {
        const both = mast.some((e) => e.side === 'LT') && mast.some((e) => e.side === 'RT');
        const r = both ? 'Mastectomy on both breasts' : `Mastectomy on one breast (${one.text}, ${fmtDate(one.date)})`;
        add(3, 'excluded', both ? 'Mastectomy on both breasts (left and right procedures found)' : r, `${one.file}.csv`);
        return finish('Excluded', r, both ? undefined : one);
      }
      const chest = m.events.find((e) => e.tag === 'chest-surgery' && e.date <= Y_END);
      if (chest) {
        const r = `Gender-affirming chest surgery (${chest.text}, ${fmtDate(chest.date)})`;
        add(3, 'excluded', r, `${chest.file}.csv`);
        return finish('Excluded', r, chest);
      }
    } else if (mast.some((e) => e.side === 'LT') && mast.some((e) => e.side === 'RT')) {
      add(3, 'excluded', 'Mastectomy on both breasts (left and right procedures found)');
      return finish('Excluded', 'Mastectomy on both breasts');
    }
  }
  if (code === 'CCS-E' && m.events.some((e) => e.tag === 'hysterectomy')) {
    add(3, 'excluded', 'Hysterectomy (no cervix)');
    return finish('Excluded', 'Hysterectomy (no cervix)');
  }
  add(3, 'pass', code === 'WCV' ? 'No other exclusions apply to this measure' : 'No other exclusion found');

  // 5. evidence
  const src = (e: Evt) => `${e.file}.csv`;
  /** Newest finished record of these kinds that is older than the window, so the trace can say "it exists, but too old". */
  const tooOld = (tags: Tag[], from: Date) => m.events.filter((e) => tags.includes(e.tag) && done(e) && e.date < from).sort((x, y) => y.date.getTime() - x.date.getTime())[0];
  const oldNote = (e: Evt | undefined, windowText: string) => (e ? ` Latest on file: ${e.text} on ${fmtDate(e.date)} (${e.system} ${e.code}), which is outside the window (${windowText}).` : '');
  switch (code) {
    case 'WCV': {
      const visits = m.events.filter((e) => e.tag === 'well-care' && done(e) && inRange(e.date, Y_START, Y_END));
      const hit = visits.find((e) => R.telehealthCounts || !e.telehealth);
      if (hit) {
        add(4, 'pass', `Well-care visit on ${fmtDate(hit.date)}`, src(hit));
        return finish('Met', `Well-care visit on ${fmtDate(hit.date)}`, hit);
      }
      const tele = visits[0];
      if (tele) {
        const r = `Only a telehealth well-care visit (${fmtDate(tele.date)}), which does not count in ${Y}`;
        add(4, 'unmet', `${r}. NCQA stopped counting well-care visits held by video or phone from MY 2025.`, src(tele));
        return finish('Gap', r, tele);
      }
      add(4, 'unmet', 'No well-care visit found this year');
      return finish('Gap', 'No well-care visit this year');
    }
    case 'BCS-E': {
      const hit = m.events.find((e) => e.tag === 'mammogram' && done(e) && inRange(e.date, d(Y - 2, 10, 1), Y_END));
      if (hit) {
        add(4, 'pass', `Mammogram on ${fmtDate(hit.date)}`, src(hit));
        return finish('Met', `Mammogram on ${fmtDate(hit.date)}`, hit);
      }
      const old = tooOld(['mammogram'], d(Y - 2, 10, 1));
      add(4, 'unmet', `No mammogram since 10/01/${Y - 2}.${oldNote(old, `since 10/01/${Y - 2}`)}`, old ? src(old) : undefined);
      return finish('Gap', `No mammogram since 10/01/${Y - 2}`);
    }
    case 'CCS-E': {
      const hit = m.events.find((e) => e.tag === 'cytology' && done(e) && inRange(e.date, d(Y - 2, 1, 1), Y_END));
      if (hit) {
        add(4, 'pass', `Cervical cytology on ${fmtDate(hit.date)}`, src(hit));
        return finish('Met', `Cervical cytology on ${fmtDate(hit.date)}`, hit);
      }
      if (R.hpvPath) {
        const from5 = d(Y - 4, 1, 1);
        const hpv = m.events.find((e) => e.tag === 'hpv' && done(e) && inRange(e.date, from5, Y_END) && e.date.getFullYear() - m.dob.getFullYear() >= 30);
        if (hpv) {
          const r = `High-risk HPV test on ${fmtDate(hpv.date)}`;
          add(4, 'pass', `${r}. A high-risk HPV test counts when done in the last 5 years (since 01/01/${Y - 4}) at age 30 or older.`, src(hpv));
          return finish('Met', r, hpv);
        }
      }
      const old = tooOld(['cytology'], d(Y - 2, 1, 1));
      const miss = R.hpvPath ? 'No cervical cytology in the last 3 years and no high-risk HPV test in the last 5' : 'No cervical cytology in the last 3 years';
      add(4, 'unmet', `${miss}.${oldNote(old, `since 01/01/${Y - 2}`)}`, old ? src(old) : undefined);
      return finish('Gap', miss);
    }
    case 'COL-E': {
      const hit = m.events.find((e) => done(e) && colTests.some((t) => t.tag === e.tag && inRange(e.date, t.from(Y), Y_END)));
      if (hit) {
        const t = colTests.find((x) => x.tag === hit.tag)!;
        const r = `${t.label} on ${fmtDate(hit.date)}`;
        add(4, 'pass', `${r}. ${t.label} counts when done ${colWindowFor(t, Y)}.`, src(hit));
        return finish('Met', r, hit);
      }
      const planned = m.events.find((e) => e.tag === 'colonoscopy' && e.status === 'preparation');
      const r = planned ? `Colonoscopy planned for ${fmtDate(planned.date)}, not done yet` : 'No qualifying colorectal screening in its window';
      const older = m.events.filter((e) => done(e) && colTests.some((t) => t.tag === e.tag && e.date < t.from(Y))).sort((x, y) => y.date.getTime() - x.date.getTime())[0];
      const olderT = older ? colTests.find((t) => t.tag === older.tag)! : undefined;
      add(
        4,
        'unmet',
        planned
          ? `${r}. A planned procedure does not count.`
          : `${r}.${older && olderT ? ` Latest on file: ${older.text} on ${fmtDate(older.date)} (${older.system} ${older.code}). ${olderT.label} must be done ${colWindowFor(olderT, Y)}, so it does not count.` : ' Accepted: ' + colTests.map((t) => `${t.label.toLowerCase()} ${colWindowFor(t, Y)}`).join('; ') + '.'}`,
        planned ? src(planned) : older ? src(older) : undefined,
      );
      return finish('Gap', r);
    }
    case 'GSD': {
      const tests = m.events.filter((e) => e.tag === 'hba1c' && e.status === 'final' && inRange(e.date, Y_START, Y_END)).sort((a, b) => b.date.getTime() - a.date.getTime());
      if (tests.length === 0) {
        add(4, 'unmet', 'No final HbA1c this year (preliminary results are ignored)');
        return finish('Gap', 'No final HbA1c this year');
      }
      const withValue = tests.filter((e) => e.value !== undefined);
      const lowest = getVersion() === 3 && withValue.length > 0 ? withValue.reduce((a, b) => (b.value! < a.value! ? b : a)) : undefined;
      const t = lowest ?? tests[0];
      if (t.value === undefined) {
        const r = `Final HbA1c lab on ${fmtDate(t.date)} has no result value`;
        add(4, 'unmet', `${r}. This measure needs the actual HbA1c (or GMI) value; a lab that only says a test was done cannot be scored.`, src(t));
        return finish('Gap', r, t);
      }
      const v = t.value;
      const low = lowest ? ` Lowest of ${withValue.length} final result${withValue.length > 1 ? 's' : ''} this year.` : '';
      if (v < 8) {
        const r = `${lowest ? 'Lowest ' : ''}HbA1c ${t.value}% on ${fmtDate(t.date)}`;
        add(4, 'pass', `${r}: below 8%${v > 9 ? '' : ', not above 9%'}.${low}`, src(t));
        return finish('Met', r, t);
      }
      const r = lowest ? `Lowest HbA1c ${t.value}% (8% or higher)` : `Latest HbA1c ${t.value}% (8% or higher)`;
      add(4, 'unmet', `${r} on ${fmtDate(t.date)}${v > 9 ? '. Also above 9%' : ''}.${low}`, src(t));
      return finish('Gap', r, t);
    }
  }
}

/** Why a "not met" is really missing or incomplete data, not a care gap. Null when it is a genuine gap. */
function reviewReason(m: Member, def: MeasureDef, year: number): string | null {
  const Y = year;
  const inYear = m.events.filter((e) => inRange(e.date, new Date(year, 0, 1), new Date(year, 11, 31)));
  if (inYear.length === 0) return `No claims or clinical records at all are dated ${Y}. We cannot tell whether care was missed or the data has not arrived.`;
  if (def.code === 'GSD' && !inYear.some((e) => e.tag === 'hba1c' && e.status === 'final') && inYear.some((e) => e.tag === 'hba1c' && e.status === 'preliminary'))
    return 'Only a preliminary HbA1c result is on file. A final result is needed before this can be decided.';
  if (def.code === 'GSD') {
    const last = inYear.filter((e) => e.tag === 'hba1c' && e.status === 'final').sort((x, y) => y.date.getTime() - x.date.getTime())[0];
    if (last && last.value === undefined) return `A final HbA1c lab is on file (${fmtDate(last.date)}) but it has no result value. GSD needs the actual HbA1c (or GMI) value, so it cannot be decided until the lab sends it.`;
  }
  return null;
}

/**
 * Version 3 only: a few demo records added so the new rules have members to show (one-sided mastectomy, gender-affirming chest surgery,
 * I-SNP and long-term-institution flags for age 66+, palliative care for cervical screening, several HbA1c results in one year).
 * Versions 1 and 2 never see them.
 */
interface V3Patch {
  events?: Evt[];
  isnp?: boolean;
  lti?: boolean;
}
const wholeYear = { start: d(2026, 1, 1), end: d(2026, 12, 31) };
export const V3_PATCH: Record<string, V3Patch> = {
  M1019: { events: [diag(d(2024, 5, 6), 'Z87.890', 'ICD-10', 'Personal history of sex reassignment', 'chest-surgery')] },
  M1045: { events: [diag(d(2023, 9, 14), 'Z87.890', 'ICD-10', 'Personal history of sex reassignment', 'chest-surgery')] },
  M1121: { events: [proc(d(2021, 3, 12), '19303', 'CPT', 'Mastectomy, right breast', 'mastectomy', { side: 'RT' })] },
  M1139: { events: [diag(d(2019, 6, 5), 'Z90.12', 'ICD-10', 'Acquired absence of left breast', 'mastectomy', { side: 'LT' })] },
  M1137: { isnp: true },
  M1197: { lti: true },
  M1077: { isnp: true },
  M1107: { lti: true },
  M1073: { events: [diag(d(2026, 4, 22), 'Z51.5', 'ICD-10', 'Encounter for palliative care', 'palliative')] },
  M1062: { events: [lab(d(2026, 1, 20), '4548-4', 'Hemoglobin A1c, 7.6%', 'hba1c', 7.6)] },
  M1128: { events: [lab(d(2026, 1, 15), '4548-4', 'Hemoglobin A1c, 8.2%', 'hba1c', 8.2)] },
  M1036: { events: [lab(d(2026, 2, 10), '4548-4', 'Hemoglobin A1c, 9.4%', 'hba1c', 9.4)] },
  M1122: { events: [lab(d(2026, 1, 25), '4548-4', 'Hemoglobin A1c, 8.4%', 'hba1c', 8.4)] },
  M1002: { events: [lab(d(2026, 8, 20), '4548-4', 'Hemoglobin A1c, 8.9%', 'hba1c', 8.9)] },
  // The four-year-old has an ordinary sick visit this year but no well-care visit, so WCV shows a care gap.
  M1304: { events: [visit(d(2026, 4, 21), '99213', 'Office visit, established patient (sick visit)', 'other', { provider: '1000000111' })] },
};

/* ------------------------------------------------------------------ Version 3 member records (every member has some data in every tab) */

export type V3Tab = 'claims' | 'diagnoses' | 'labs' | 'observations' | 'procedures' | 'visits';
/** Which Member page tab (Version 3) a record belongs to. Pharmacy and professional, institutional and dental claims are all Claims. */
export const v3TabOf = (e: Evt): V3Tab =>
  e.kind === 'EHR diagnosis' || (e.kind === 'Claim' && e.system === 'ICD-10')
    ? 'diagnoses'
    : e.kind === 'Lab'
      ? 'labs'
      : e.kind === 'Observation'
        ? 'observations'
        : e.kind === 'EHR visit'
          ? 'visits'
          : e.kind === 'Claim' || e.kind === 'Pharmacy'
            ? 'claims'
            : 'procedures';
/** Least number of records each tab shows for one member. */
const V3_MIN: Record<V3Tab, number> = { claims: 3, diagnoses: 2, labs: 3, observations: 3, procedures: 2, visits: 3 };
const v3Filled = new Map<string, Evt[]>();
/**
 * Version 3 demo records. The files hold a few records for some members and none for others, so the Member page tabs would look empty.
 * Every member gets enough routine records (tagged "other", so no measure reads them) to fill each tab up to a minimum.
 * They never change a measure result, and Versions 1 and 2 never see them.
 */
export function v3Filler(member: Member): Evt[] {
  const hit = v3Filled.get(member.id);
  if (hit) return hit;
  const have = new Map<V3Tab, number>();
  for (const e of member.events) have.set(v3TabOf(e), (have.get(v3TabOf(e)) ?? 0) + 1);
  const need = (t: V3Tab) => Math.max(0, V3_MIN[t] - (have.get(t) ?? 0));
  const h = (k: string) => unitHash(`${member.id}:v3:${k}`);
  const pick = <T,>(xs: T[], k: string, i = 0): T => xs[Math.floor(h(`${k}${i}`) * xs.length) % xs.length];
  const last = d(2026, 10, 14);
  /** A date in 2025 or 2026, never before the birth date and never after the newest file. */
  /** A member with no real record in 2026 (measures say "no records at all dated 2026") gets made-up records in 2025 only, so the tabs never contradict the measure reason. */
  const quiet2026 = !member.events.some((e) => e.date.getFullYear() === 2026) && member.dob.getFullYear() < 2026;
  const day = (k: string, i: number) => {
    const t = d(quiet2026 || h(`${k}${i}`) < 0.2 ? 2025 : 2026, 1 + Math.floor(h(`m${k}${i}`) * (i % 2 ? 8 : 9)), 3 + Math.floor(h(`d${k}${i}`) * 24));
    if (t < member.dob) {
      const span = Math.max(1, Math.round((last.getTime() - member.dob.getTime()) / 86_400_000));
      return new Date(member.dob.getFullYear(), member.dob.getMonth(), member.dob.getDate() + Math.min(span, 1 + Math.floor(h(`b${k}${i}`) * span)));
    }
    return t > last ? last : t;
  };
  const age = ageAtYearEnd(member.dob, MY);
  const band = age < 1 ? 'infant' : age < 18 ? 'child' : 'adult';
  const pcp = pick(['1000000111', '1000000137'], 'pcp');
  const out: Evt[] = [];

  const dxList = {
    infant: [['Z23', 'Encounter for immunization'], ['P59.9', 'Neonatal jaundice, unspecified'], ['K21.9', 'Gastro-esophageal reflux disease without esophagitis'], ['L22', 'Diaper dermatitis']],
    child: [['J06.9', 'Acute upper respiratory infection, unspecified'], ['J30.9', 'Allergic rhinitis, unspecified'], ['H66.90', 'Otitis media, unspecified'], ['L20.9', 'Atopic dermatitis, unspecified'], ['J45.909', 'Unspecified asthma, uncomplicated']],
    adult: [['I10', 'Essential (primary) hypertension'], ['E78.5', 'Hyperlipidemia, unspecified'], ['M54.50', 'Low back pain, unspecified'], ['K21.9', 'Gastro-esophageal reflux disease without esophagitis'], ['J45.909', 'Unspecified asthma, uncomplicated'], ['G47.00', 'Insomnia, unspecified'], ['M25.561', 'Pain in right knee']],
  }[band];
  for (let i = 0; i < need('diagnoses'); i++) {
    const [code, text] = dxList[(Math.floor(h('dx') * dxList.length) + i * 2 + i) % dxList.length];
    out.push(diag(day('dx', i), code, 'ICD-10', text, 'other'));
  }

  const labList = {
    infant: [['718-7', 'Hemoglobin [Mass/volume] in Blood', 15.2, 'g/dL', '13.5–19.5'], ['1975-2', 'Bilirubin.total [Mass/volume] in Serum or Plasma', 6.1, 'mg/dL', '0.3–12.0'], ['2345-7', 'Glucose [Mass/volume] in Serum or Plasma', 72, 'mg/dL', '60–100']],
    child: [['718-7', 'Hemoglobin [Mass/volume] in Blood', 13.1, 'g/dL', '11.5–15.5'], ['5671-3', 'Lead [Mass/volume] in Blood', 1.4, 'ug/dL', '0–3.5'], ['2345-7', 'Glucose [Mass/volume] in Serum or Plasma', 88, 'mg/dL', '70–99'], ['3016-3', 'Thyrotropin [Units/volume] in Serum or Plasma', 2.4, 'mIU/L', '0.4–4.5']],
    adult: [['2089-1', 'LDL Cholesterol [Mass/volume] in Serum or Plasma', 112, 'mg/dL', '0–100'], ['2160-0', 'Creatinine [Mass/volume] in Serum or Plasma', 0.9, 'mg/dL', '0.6–1.3'], ['2345-7', 'Glucose [Mass/volume] in Serum or Plasma', 94, 'mg/dL', '70–99'], ['3016-3', 'Thyrotropin [Units/volume] in Serum or Plasma', 2.1, 'mIU/L', '0.4–4.5'], ['718-7', 'Hemoglobin [Mass/volume] in Blood', 13.8, 'g/dL', '12.0–17.5'], ['2085-9', 'HDL Cholesterol [Mass/volume] in Serum or Plasma', 54, 'mg/dL', '40–100']],
  }[band];
  for (let i = 0; i < need('labs'); i++) {
    const [code, text, v, unit, range] = labList[(Math.floor(h('lab') * labList.length) + i) % labList.length];
    const value = Math.round((v as number) * (0.9 + h(`lv${i}`) * 0.25) * 10) / 10;
    const [lo, hi] = (range as string).split('–').map(Number);
    const flag = value > hi ? 'High' : value < lo ? 'Low' : 'Normal';
    out.push(lab(day('lab', i), code as string, text as string, 'other', value, { unit: unit as string, refRange: `${range} ${unit}`, flag }));
  }

  const obsList = {
    infant: [['29463-7', 'Body weight', 5.4, 'kg'], ['8302-2', 'Body height', 58, 'cm'], ['9843-4', 'Head circumference', 39.5, 'cm'], ['8867-4', 'Heart rate', 128, '/min']],
    child: [['29463-7', 'Body weight', 28, 'kg'], ['8302-2', 'Body height', 128, 'cm'], ['39156-5', 'Body mass index', 17.1, 'kg/m2'], ['8867-4', 'Heart rate', 88, '/min']],
    adult: [['8480-6', 'Systolic blood pressure', 124, 'mm[Hg]'], ['8462-4', 'Diastolic blood pressure', 78, 'mm[Hg]'], ['29463-7', 'Body weight', 78, 'kg'], ['39156-5', 'Body mass index', 26.4, 'kg/m2'], ['8867-4', 'Heart rate', 72, '/min']],
  }[band];
  for (let i = 0; i < need('observations'); i++) {
    const [code, text, v, unit] = obsList[(Math.floor(h('obs') * obsList.length) + i) % obsList.length];
    const value = Math.round((v as number) * (0.92 + h(`ov${i}`) * 0.16) * 10) / 10;
    out.push(obs(day('obs', i), code as string, text as string, 'other', { value, unit: unit as string }));
  }

  const procList = {
    infant: [['90460', 'Immunization administration, first component'], ['36416', 'Collection of capillary blood specimen'], ['92551', 'Screening test, pure tone, air only']],
    child: [['96110', 'Developmental screening, with scoring and documentation'], ['92551', 'Screening test, pure tone, air only'], ['36415', 'Collection of venous blood by venipuncture'], ['94010', 'Spirometry']],
    adult: [['36415', 'Collection of venous blood by venipuncture'], ['93000', 'Electrocardiogram, routine, with interpretation and report'], ['71046', 'Radiologic examination, chest, 2 views'], ['97110', 'Therapeutic exercises, each 15 minutes'], ['96372', 'Therapeutic injection, subcutaneous or intramuscular']],
  }[band];
  for (let i = 0; i < need('procedures'); i++) {
    const [code, text] = procList[(Math.floor(h('proc') * procList.length) + i) % procList.length];
    out.push(proc(day('proc', i), code, 'CPT', text, 'other', { provider: pcp }));
  }

  const visitList = [['99213', 'Office or other outpatient visit, established patient, low complexity'], ['99214', 'Office or other outpatient visit, established patient, moderate complexity'], ['99212', 'Office or other outpatient visit, established patient, straightforward'], ['99203', 'Office or other outpatient visit, new patient, low complexity']];
  for (let i = 0; i < need('visits'); i++) {
    const [code, text] = visitList[(Math.floor(h('vis') * visitList.length) + i) % visitList.length];
    out.push(visit(day('vis', i), code, text, 'other', { provider: pick(['1000000111', '1000000137'], 'vp', i) }));
  }

  const claimList = [['99213', 'Office or other outpatient visit, established patient, low complexity'], ['80061', 'Lipid panel'], ['85025', 'Complete blood count (CBC) with automated differential'], ['99214', 'Office or other outpatient visit, established patient, moderate complexity']];
  const rxList = {
    infant: [['65862-0004-75', 'Amoxicillin 400 mg/5 mL oral suspension']],
    child: [['65862-0004-75', 'Amoxicillin 400 mg/5 mL oral suspension'], ['00173-0682-20', 'Albuterol HFA 90 mcg inhaler']],
    adult: [['68180-0513-01', 'Lisinopril 10 mg tablet'], ['00071-0155-23', 'Atorvastatin 20 mg tablet'], ['62175-0118-37', 'Omeprazole 20 mg capsule']],
  }[band];
  const nClaims = need('claims');
  for (let i = 0; i < nClaims; i++) {
    if (i === nClaims - 1 && nClaims > 1 && !member.events.some((e) => e.kind === 'Pharmacy')) {
      const [ndc, text] = rxList[Math.floor(h('rx') * rxList.length) % rxList.length];
      out.push(rx(day('rx', i), ndc, text, 'other'));
    } else {
      const [code, text] = claimList[(Math.floor(h('clm') * claimList.length) + i) % claimList.length];
      out.push(claim(day('clm', i), code, 'CPT', text, 'other', { provider: pcp }));
    }
  }
  v3Filled.set(member.id, out);
  return out;
}

const v3Member = new Map<string, Member>();
function withV3Events(member: Member): Member {
  const p = V3_PATCH[member.id];
  if (!p || getVersion() !== 3) return member;
  let r = v3Member.get(member.id);
  if (!r) {
    r = {
      ...member,
      events: [...member.events, ...(p.events ?? [])],
      segments: p.isnp ? [...member.segments, { ...wholeYear, payer: 'SN2', medical: true, drug: true }] : member.segments,
      medicare: p.lti ? [...member.medicare, { ...wholeYear, hospice: false, lti: true, orec: '0', lis: false }] : member.medicare,
    };
    v3Member.set(member.id, r);
  }
  return r;
}

export function evaluate(member: Member, code: MeasureCode, year: number = MY): MeasureResult {
  const m = memberForYear(member, year);
  const res = evaluateCore(m, code, year);
  if (res.state !== 'Gap') return res;
  const def = measures.find((x) => x.code === code)!;
  const why = reviewReason(m, def, year);
  if (!why) return res;
  const steps = res.steps.map((st, i) => (i === res.steps.length - 1 ? { ...st, outcome: 'review' as const, detail: why } : st));
  return { ...res, state: 'Review', reason: why, steps };
}

export type Results = Record<MeasureCode, MeasureResult>;
const cache = new Map<string, Results>();

/** Which version of the results to show. 0 is the latest run. Each step back is one earlier run that brought new data (see runs.tsx): fewer members had closed their gap yet. */
let asOfStep = 0;
export const setAsOfStep = (n: number) => {
  asOfStep = n;
};
export const getAsOfStep = () => asOfStep;
/** Share of "Met" members that were still open, per step back. A member keeps the same place in the order for every measure and year, so an older run never shows a gap that a newer run did not. */
const CLOSED_PER_STEP = 0.025;
/** 0 up to 1, spread evenly, the same for the same text. */
function unitHash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}
function asOfRun(m: Member, code: MeasureCode, year: number, res: MeasureResult, step: number): MeasureResult {
  if (step === 0 || res.state !== 'Met') return res;
  if (unitHash(`${m.id}:${code}:${year}`) >= step * CLOSED_PER_STEP) return res;
  const reason = 'On the selected run this gap was still open. It closed in a later file, so the latest run shows it as met.';
  const steps = res.steps.map((st, i) => (i === res.steps.length - 1 ? { ...st, outcome: 'unmet' as const, detail: reason } : st));
  return { state: 'Gap', reason, steps };
}
/**
 * The oldest results version in which this member's result is already Met, for a result that was still a gap on older runs.
 * Higher step = older run. A member is a gap on every run whose step is above this number. null = never a gap in the run window.
 */
export const RUN_STEPS = 4;
export function closedStepOf(m: Member, code: MeasureCode, year: number = MY): number | null {
  if (evaluate(m, code, year).state !== 'Met') return null;
  const t = unitHash(`${m.id}:${code}:${year}`) / CLOSED_PER_STEP;
  return t >= RUN_STEPS ? null : Math.floor(t);
}
export function resultsFor(m: Member, year: number = MY): Results {
  const key = `${m.id}:${year}:${asOfStep}:${getVersion()}`;
  let r = cache.get(key);
  if (!r) {
    r = Object.fromEntries(measures.map((x) => [x.code, asOfRun(m, x.code, year, evaluate(m, x.code, year), asOfStep)])) as Results;
    cache.set(key, r);
  }
  return r;
}
export const openGaps = (m: Member) => measures.filter((x) => resultsFor(m)[x.code].state === 'Gap').length;

/** denominator = met + gap. Needs review members are in `eligible` but not in the rate until they are decided. eligible = met + gap + review + excluded. */
export interface Tally {
  eligible: number;
  excluded: number;
  notEligible: number;
  met: number;
  gap: number;
  review: number;
  denominator: number;
  rate: number;
}
export function tally(list: Member[], code: MeasureCode, year: number = MY): Tally {
  let met = 0,
    gap = 0,
    excluded = 0,
    notEligible = 0,
    review = 0;
  for (const m of list) {
    const s = resultsFor(m, year)[code].state;
    if (s === 'Met') met++;
    else if (s === 'Gap') gap++;
    else if (s === 'Excluded') excluded++;
    else if (s === 'Review') review++;
    else notEligible++;
  }
  const denominator = met + gap;
  return {
    eligible: denominator + excluded + review,
    excluded,
    notEligible,
    met,
    gap,
    review,
    denominator,
    rate: denominator ? (met / denominator) * 100 : 0,
  };
}

/* ------------------------------------------------------------------ groups used to split results */

/** Medicare only: low-income subsidy (LIS) and original reason for entitlement (OREC), both from medicare-status.csv. */
export function medicareSesOf(m: Member): string {
  if (productLineOfMember(m) !== 'Medicare') return NOT_MEDICARE;
  const row = m.medicare.find((x) => x.end >= MY_END) ?? m.medicare[m.medicare.length - 1];
  if (!row) return NOT_MEDICARE;
  return `${row.lis ? 'Low income' : 'Not low income'} · ${row.orec === '1' || row.orec === '3' ? 'disability' : 'age-based entitlement'}`;
}
export const NOT_MEDICARE = 'Not a Medicare member';

export interface GroupBy {
  key: string;
  label: string;
  of: (m: Member) => string;
}
export const spokenLanguageOf = (m: Member) => (m.spoken ? (languageNames[m.spoken] ?? m.spoken) : 'Not sent');
/** The provider the member saw most among providers marked as primary care. The spec has no PCP field, so this is worked out from the records. */
export function primaryCareOf(m: Member): { p: Provider; n: number } | null {
  const counts = new Map<string, number>();
  for (const e of m.events) {
    const p = providers.find((x) => x.npi === e.provider);
    if (p && p.type.includes('(PCP)')) counts.set(p.npi, (counts.get(p.npi) ?? 0) + 1);
  }
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return best ? { p: providers.find((x) => x.npi === best[0])!, n: best[1] } : null;
}
export const NO_PCP = 'No primary care provider on file';

/** Age range of each measure on Dec 31 (from the measure rules). */
export const ageBands = ageBandsOf(MY);
export type AgeStatus = 'Ages out next year' | 'Just aged in';
/** For one member and one measure: reached the top age of the measure this year (out next year), or reached the lowest age this year. Only for members the measure counts. */
export function ageStatusOf(m: Member, code: MeasureCode, year: number = MY): AgeStatus | null {
  const state = resultsFor(m, year)[code].state;
  if (state === 'Not eligible') return null;
  const age = ageAtYearEnd(m.dob, year);
  const [lo, hi] = ageBandsOf(year)[code];
  return age === hi ? 'Ages out next year' : age === lo ? 'Just aged in' : null;
}

/** The latest final HbA1c result of the year (the lowest in Version 3), for members the GSD measure counts. */
export function latestA1c(member: Member, year: number = MY): { value?: number; date: Date } | null {
  if (resultsFor(member, year).GSD.state === 'Not eligible') return null;
  const m = memberForYear(member, year);
  const all = m.events.filter((e) => e.tag === 'hba1c' && e.status === 'final' && e.date.getFullYear() === year).sort((a, b) => b.date.getTime() - a.date.getTime());
  /** Version 3: the measure uses the lowest result of the period. */
  const withValue = all.filter((e) => e.value !== undefined);
  const t = getVersion() === 3 && withValue.length ? withValue.reduce((a, b) => (b.value! < a.value! ? b : a)) : all[0];
  return t ? { value: t.value, date: t.date } : null;
}
export type A1cBand = 'Above 9%' | '8% to 9%' | 'Below 8%' | 'No result';
export const a1cBands: A1cBand[] = ['Above 9%', '8% to 9%', 'Below 8%', 'No result'];
export function a1cBandOf(m: Member, year: number = MY): A1cBand | null {
  if (resultsFor(m, year).GSD.state === 'Not eligible') return null;
  const t = latestA1c(m, year);
  if (!t || t.value === undefined) return 'No result';
  return t.value > 9 ? 'Above 9%' : t.value >= 8 ? '8% to 9%' : 'Below 8%';
}

export const groupings: GroupBy[] = [
  { key: 'product', label: 'Product line', of: productLineOfMember },
  { key: 'race', label: 'Race', of: raceGroupOf },
  { key: 'ethnicity', label: 'Ethnicity', of: ethnicityGroupOf },
  { key: 'language', label: 'Spoken language', of: spokenLanguageOf },
  {
    key: 'disability',
    label: 'Disability',
    of: (m) => m.disability ?? 'Not sent',
  },
  {
    key: 'ses',
    label: 'Medicare income and disability (SES)',
    of: medicareSesOf,
  },
  { key: 'team', label: 'Care team', of: (m) => careTeamOf(m).team },
  { key: 'manager', label: 'Care manager', of: (m) => careTeamOf(m).manager },
  { key: 'provider', label: 'Primary care provider', of: (m) => primaryCareOf(m)?.p.name ?? NO_PCP },
];

/* ------------------------------------------------------------------ tones */

export const stateTone: Record<MeasureState, StatusTone> = {
  Met: 'success',
  Gap: 'warning',
  Excluded: 'neutral',
  Review: 'info',
  'Not eligible': 'neutral',
};

/* ------------------------------------------------------------------ data files (what the client has sent) */

export type FileStatus = 'Accepted' | 'Accepted with warnings' | 'Failed' | 'Not received';

export interface DataFile {
  id: FileId;
  rows: number;
  status: FileStatus;
  receivedOn?: Date;
  /** Short plain-language note. */
  note: string;
  errors: number;
  warnings: number;
  /** Measures that read this file. */
  usedBy: MeasureCode[];
}

const countEv = (f: Evt['file']) => members.reduce((n, m) => n + m.events.filter((e) => e.file === f).reduce((a, e) => a + (e.lines ?? 1), 0), 0);
const rowCounts: Record<FileId, number> = {
  'member-gm': members.length,
  'member-en': members.reduce((n, m) => n + m.segments.length, 0),
  'member-RES': members.length,
  claim: Math.max(1, Math.round(countEv('claim-line') * 0.8)),
  'claim-line': countEv('claim-line'),
  'pharmacy-claim': countEv('pharmacy-claim-line'),
  'pharmacy-claim-line': countEv('pharmacy-claim-line'),
  pharm: countEv('pharm'),
  'pharm-c': countEv('pharm-c'),
  provider: providers.length,
  'medicare-status': members.reduce((n, m) => n + m.medicare.length, 0),
  'visit-e': countEv('visit-e'),
  diag: countEv('diag'),
  proc: countEv('proc'),
  obs: countEv('obs'),
  lab: countEv('lab'),
};

const usedBy = (id: FileId) => measures.filter((m) => m.files.includes(id)).map((m) => m.code);
const f = (id: FileId, status: FileStatus, note: string, errors = 0, warnings = 0, day = 12): DataFile => ({
  id,
  rows: status === 'Not received' ? 0 : rowCounts[id],
  status,
  errors,
  warnings,
  note,
  usedBy: usedBy(id),
  receivedOn: status === 'Not received' ? undefined : d(2026, 10, day),
});

const unknownRace = members.filter((m) => m.raceCodes[0] === 'UNK').length;
const preparing = members.reduce((n, m) => n + m.events.filter((e) => e.status === 'preparation').length, 0);

export const dataFiles: DataFile[] = [
  f('member-gm', 'Accepted', 'All checks passed.'),
  f('member-en', 'Accepted', 'All checks passed.'),
  f('member-RES', 'Accepted with warnings', `${unknownRace} members have unknown race and ethnicity (UNK).`, 0, unknownRace),
  f('claim', 'Accepted', 'All checks passed.', 0, 0, 14),
  f('claim-line', 'Accepted with warnings', '3 lines have no place of service.', 0, 3, 14),
  f('pharmacy-claim', 'Accepted', 'All checks passed.', 0, 0, 14),
  f('pharmacy-claim-line', 'Accepted', 'All checks passed.', 0, 0, 14),
  f('pharm', 'Not received', 'Optional for this release. Clinic dispensing records have not been sent.'),
  f('pharm-c', 'Failed', '2 rows have a vaccine code that is not a CVX code. The whole file was rejected.', 2, 0, 15),
  f('provider', 'Accepted', 'All checks passed.', 0, 0, 10),
  f('medicare-status', 'Accepted', 'All checks passed.', 0, 0, 12),
  f('visit-e', 'Accepted', 'All checks passed.', 0, 0, 15),
  f('diag', 'Accepted', 'All checks passed.', 0, 0, 15),
  f('proc', 'Accepted with warnings', `${preparing} procedure${preparing === 1 ? ' is' : 's are'} still in "preparation" status and will not count.`, 0, preparing, 15),
  f('obs', 'Accepted', 'All checks passed.', 0, 0, 15),
  f('lab', 'Accepted', 'All checks passed.', 0, 0, 15),
];
export const fileStatusTone: Record<FileStatus, StatusTone> = {
  Accepted: 'success',
  'Accepted with warnings': 'warning',
  Failed: 'danger',
  'Not received': 'neutral',
};

// ---- Used by the care-gap demo data (src/careGaps.tsx). These are NOT in the ingestion spec: made up, the same every time.
export const hashOf = (id: string) => [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
/** Newest file received (see the dashboard). Nothing can be "updated" after this. */
export const NEWEST_FILE = new Date(2026, 9, 15);
export const careManagers = ['Rita Gomez', 'Daniel Osei', 'Maya Chen', 'Paul Weber', 'Sofia Alvarez'];

/** Demo only: the spec has no care-team field. Every member gets one team and one primary care manager, the same every time. */
export const careTeams = ['Team Maple', 'Team Cedar', 'Team Birch'];
export const careTeamOf = (m: Member) => {
  const h = hashOf(m.id);
  return { team: careTeams[Math.floor(h / 7) % careTeams.length], manager: careManagers[h % careManagers.length] };
};
