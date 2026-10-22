// Care gaps: the work around a "Not met" measure result.
//
// Two separate things, never mixed up:
//   1. The MEASURE RESULT (Met, Not met, Excluded, Needs review). It comes only from the files (src/data.ts).
//   2. The GAP STATUS (Open, Closed). It is the work on a Not met result.
//   3. The EVIDENCE STATUS (Not requested, Requested, Received, Validated, Rejected). It is about the proof, and is kept apart from both.
//
// Nothing about the work is in the ingestion spec. Care managers, outreach, tasks, due dates and the starting status
// below are MADE UP (the same every time) so the screens can be shown. Changes made in the demo are kept in the browser
// for the visit. A gap can only be closed after the evidence has been validated by a reviewer AND the measure has been re-evaluated with it (see `checkClosure`).
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { StatusTone } from "sevida-ui";
import { useAuth } from "./auth";
import {
  DEMO_NOW,
  MY,
  MY_END,
  MY_START,
  NEWEST_FILE,
  careManagers,
  colTests,
  colWindowFor,
  rulesOfYear,
  dataFiles,
  done,
  fmtDate,
  fmtDateTime,
  hashOf,
  measures,
  memberById,
  providerName,
  resultsFor,
  stateLabel,
} from "./data";
import type {
  Evt,
  MeasureCode,
  MeasureDef,
  MeasureResult,
  Member,
  Tag,
} from "./data";

/* ------------------------------------------------------------------ statuses */

export type GapStatus = "Open" | "Closed";
export const gapStatuses: GapStatus[] = ["Open", "Closed"];
export const gapStatusTone: Record<GapStatus, StatusTone> = {
  Open: "danger",
  Closed: "success",
};

export type EvidenceStatus =
  "Not requested" | "Requested" | "Received" | "Validated" | "Rejected";
export const evidenceStatuses: EvidenceStatus[] = [
  "Not requested",
  "Requested",
  "Received",
  "Validated",
  "Rejected",
];
export const evidenceTone: Record<EvidenceStatus, StatusTone> = {
  "Not requested": "neutral",
  Requested: "info",
  Received: "primary",
  Validated: "success",
  Rejected: "danger",
};

/** What a reviewer decided about one piece of evidence. */
export type Validation = "Pending review" | "Validated" | "Rejected";
export const validationTone: Record<Validation, StatusTone> = {
  "Pending review": "warning",
  Validated: "success",
  Rejected: "danger",
};

/** One place that says what every status means. Shown in the (i) next to each status column. */
export const statusHelp = {
  result:
    "Measure result, worked out from the files: Met (criteria satisfied), Not met (an eligible member does not satisfy the criteria), Excluded (an exclusion applies), Needs review (evidence is missing, incomplete or conflicting, so it is not counted as a care gap).",
  gap: "Care gap status is the work on a Not met result: Open (found, not yet closed; the Follow-up and Evidence tabs show the work done so far), Closed (the evidence was validated and the measure was re-evaluated). A completed task or a manual change alone never closes a gap.",
  evidence:
    "Evidence status is about the proof, not the work. Not requested: nothing has been asked for. Requested: records have been asked for. Received: evidence is in Sonata and waiting for review. Validated: a reviewer accepted it. Rejected: a reviewer did not accept it (the reason is in Activity).",
};

/* ------------------------------------------------------------------ what counts as evidence, per measure */

export const MEASURE_VERSION = "HEDIS MY2026, simplified demo rules v0.4";

const day = (y: number, m: number, dd: number) => new Date(y, m - 1, dd);

export interface EvidenceKind {
  label: string;
  tag: Tag;
  from: Date;
  to: Date;
  windowText: string;
  needsValueBelow?: number;
}
export const evidenceKinds: Record<MeasureCode, EvidenceKind[]> = {
  WCV: [
    {
      label: "Well-care visit",
      tag: "well-care",
      from: MY_START,
      to: MY_END,
      windowText: `in ${MY}, with a primary care provider or OB/GYN`,
    },
  ],
  "BCS-E": [
    {
      label: "Mammogram",
      tag: "mammogram",
      from: day(MY - 2, 10, 1),
      to: MY_END,
      windowText: `on or after 10/01/${MY - 2}`,
    },
  ],
  "CCS-E": [
    {
      label: "Cervical cytology",
      tag: "cytology",
      from: day(MY - 2, 1, 1),
      to: MY_END,
      windowText: `in the last 3 years (since 01/01/${MY - 2})`,
    },
  ],
  "COL-E": colTests.map((t) => ({
    label: t.label,
    tag: t.tag,
    from: t.from(),
    to: MY_END,
    windowText: t.windowText,
  })),
  GSD: [
    {
      label: "HbA1c result (final)",
      tag: "hba1c",
      from: MY_START,
      to: MY_END,
      windowText: `final result in ${MY}, below 8%`,
      needsValueBelow: 8,
    },
  ],
};
/** A typical code for each kind of evidence, shown under the evidence name. Evidence recorded by staff has no code of its own, so this is the code such a record would carry. */
const TAG_CODE: Partial<Record<Tag, string>> = {
  "well-care": "99393 (CPT)",
  mammogram: "77067 (CPT)",
  cytology: "88142 (CPT)",
  hpv: "87624 (CPT)",
  colonoscopy: "45378 (CPT)",
  fit: "82274 (CPT)",
  "stool-dna": "81528 (CPT)",
  "ct-colonography": "74263 (CPT)",
  sigmoidoscopy: "45330 (CPT)",
  hba1c: "4548-4 (LOINC)",
};
const kindOf = (label: string) =>
  Object.values(evidenceKinds)
    .flat()
    .find((k) => k.label === label);
/** The technical code of a kind of evidence, for the small text under its name. */
export const evidenceCodeOf = (label: string): string | undefined => {
  const k = kindOf(label);
  return k ? TAG_CODE[k.tag] : undefined;
};
/** The name to show for a kind of evidence: the test or service itself, without the wording about its status. */
export const evidenceNameOf = (label: string): string =>
  kindOf(label)?.tag === "hba1c" ? "Hemoglobin A1c" : label;

/** What counts as evidence in another measurement year (windows move with the year; the HPV test is added where that year's rules allow it). */
export function evidenceKindsFor(
  code: MeasureCode,
  year: number,
): EvidenceKind[] {
  if (year === MY) return evidenceKinds[code];
  const ys = day(year, 1, 1);
  const ye = day(year, 12, 31);
  switch (code) {
    case "WCV":
      return [
        {
          label: "Well-care visit",
          tag: "well-care",
          from: ys,
          to: ye,
          windowText: `in ${year}, with a primary care provider or OB/GYN${rulesOfYear(year).telehealthCounts ? "" : ", not by telehealth"}`,
        },
      ];
    case "BCS-E":
      return [
        {
          label: "Mammogram",
          tag: "mammogram",
          from: day(year - 2, 10, 1),
          to: ye,
          windowText: `on or after 10/01/${year - 2}`,
        },
      ];
    case "CCS-E":
      return [
        {
          label: "Cervical cytology",
          tag: "cytology",
          from: day(year - 2, 1, 1),
          to: ye,
          windowText: `in the last 3 years (since 01/01/${year - 2})`,
        },
        ...(rulesOfYear(year).hpvPath
          ? [
              {
                label: "High-risk HPV test",
                tag: "hpv" as Tag,
                from: day(year - 4, 1, 1),
                to: ye,
                windowText: `in the last 5 years (since 01/01/${year - 4}), age 30 or older on the test date`,
              },
            ]
          : []),
      ];
    case "COL-E":
      return colTests.map((t) => ({
        label: t.label,
        tag: t.tag,
        from: t.from(year),
        to: ye,
        windowText: colWindowFor(t, year),
      }));
    case "GSD":
      return [
        {
          label: "HbA1c result (final)",
          tag: "hba1c",
          from: ys,
          to: ye,
          windowText: `final result in ${year}, below 8%`,
          needsValueBelow: 8,
        },
      ];
  }
}
export const measureVersionFor = (year: number) =>
  year === MY
    ? MEASURE_VERSION
    : `HEDIS MY${year}: NCQA-confirmed age ranges and changes, otherwise the 2026 simplified demo rules v0.4`;

/** Record tags that matter to each measure: the service itself, and the records that decide who is in it or excluded. */
export const relatedTags: Record<MeasureCode, Tag[]> = {
  WCV: ["well-care"],
  "BCS-E": ["mammogram", "mastectomy", "frailty", "dementia", "palliative"],
  "CCS-E": ["cytology", "hpv", "hysterectomy"],
  "COL-E": [
    "colonoscopy",
    "ct-colonography",
    "sigmoidoscopy",
    "stool-dna",
    "fit",
    "colorectal-cancer",
    "colectomy",
    "frailty",
    "dementia",
    "palliative",
  ],
  GSD: ["hba1c", "diabetes", "frailty", "dementia", "palliative"],
};
const serviceLabel: Record<MeasureCode, string> = {
  WCV: "well-care visit",
  "BCS-E": "mammogram",
  "CCS-E": "cervical screening",
  "COL-E": "colon cancer screening",
  GSD: "HbA1c test",
};

export const serviceName: Record<MeasureCode, string> = serviceLabel;

/** What was and was not checked about the criteria. Nothing here has been compared with the official NCQA MY 2026 specification. */
export const specCheck: Record<MeasureCode, { points: string[] }> = {
  WCV: {
    points: [
      "Age 3–21 and one well-care visit in the year, from the Sonata ingestion spec. Confirm the accepted code list (CPT, ICD-10, HCPCS) for MY 2026.",
    ],
  },
  "BCS-E": {
    points: [
      "Women age 42–74 and a mammogram since Oct 1 two years before the measurement year, from the Sonata ingestion spec. HEDIS age bands for this measure have changed in recent years: confirm the MY 2026 band.",
    ],
  },
  "CCS-E": {
    points: [
      "Women age 24–64 and cytology in the last 3 years, from the Sonata ingestion spec. HEDIS age bands for this measure have changed in recent years: confirm the MY 2026 band, and whether HPV testing is also accepted (this demo does not read it).",
    ],
  },
  "COL-E": {
    points: [
      "Age 46–75 and a colonoscopy or stool test, from the Sonata ingestion spec. The spec gives no look-back window per test: this demo uses colonoscopy 10 years, CT colonography and flexible sigmoidoscopy 5 years, stool DNA 3 years and FIT this year. Confirm those windows, the MY 2026 age band and any other accepted tests against the official specification.",
    ],
  },
  GSD: {
    points: [
      "Age 18–75 with diabetes and the most recent final HbA1c below 8%, from the Sonata ingestion spec. Confirm how diabetes is identified and which indicators MY 2026 reports.",
    ],
  },
};

/* ------------------------------------------------------------------ types for the work */

export interface Task {
  id: string;
  title: string;
  due: string;
  owner: string;
  done: boolean;
  doneOn?: string;
}
export type OutreachChannel =
  "Phone" | "Text message" | "Letter" | "Patient portal" | "In person";
export const outreachChannels: OutreachChannel[] = [
  "Phone",
  "Text message",
  "Letter",
  "Patient portal",
  "In person",
];
export type OutreachResult =
  | "Reached, agreed to schedule"
  | "Reached, declined"
  | "Reached, says it was done elsewhere"
  | "Left voicemail"
  | "No answer"
  | "Wrong number";
export const outreachResults: OutreachResult[] = [
  "Reached, agreed to schedule",
  "Reached, declined",
  "Reached, says it was done elsewhere",
  "Left voicemail",
  "No answer",
  "Wrong number",
];
export interface Outreach {
  id: string;
  when: string;
  channel: OutreachChannel;
  result: OutreachResult;
  notes: string;
  /** Day (YYYY-MM-DD) the care manager plans to try again. Optional. */
  followUp?: string;
  /** The care manager who made the contact. */
  by: string;
}
export type VisitStatus =
  "Requested" | "Scheduled" | "Completed" | "Cancelled" | "No show";
export const visitStatuses: VisitStatus[] = [
  "Requested",
  "Scheduled",
  "Completed",
  "Cancelled",
  "No show",
];
export interface Visit {
  id: string;
  kind: "Appointment" | "Referral";
  with: string;
  service: string;
  date: string;
  status: VisitStatus;
}
export interface DocRequest {
  id: string;
  from: string;
  what: string;
  requested: string;
  due: string;
  status: "Requested" | "Received";
}
export interface EvidenceRec {
  id: string;
  kind: string;
  /** Service date (YYYY-MM-DD). */
  date: string;
  source: string;
  provider: string;
  value?: number;
  note: string;
  recordedBy: string;
  recorded: string;
  /** Pending review until an authorized reviewer validates or rejects it. */
  validation: Validation;
  reviewedBy?: string;
  reviewedOn?: string;
  reviewNote?: string;
}
export type ActivityKind =
  | "Found"
  | "Assigned"
  | "Task"
  | "Outreach"
  | "Visit"
  | "Records"
  | "Status"
  | "Evidence"
  | "Review"
  | "Measure"
  | "Closed";
export interface Activity {
  id: string;
  when: string;
  by: string;
  kind: ActivityKind;
  text: string;
  /** Why the change was made. */
  reason: string;
}
/** The measure was run again with the validated evidence. A success is needed before a gap can close. */
export interface Reeval {
  on: string;
  by: string;
  evidenceId: string;
  ok: boolean;
  text: string;
}
export interface Closed {
  /** Date and time of the closure. */
  on: string;
  by: string;
  reason: string;
  evidenceId: string;
}

export interface Work {
  status: GapStatus;
  careManager: string;
  identified: string;
  tasks: Task[];
  outreach: Outreach[];
  visits: Visit[];
  docRequests: DocRequest[];
  evidence: EvidenceRec[];
  activity: Activity[];
  reeval?: Reeval;
  closed?: Closed;
}

/* ------------------------------------------------------------------ small helpers */

const iso = (x: Date) =>
  `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
const addDays = (x: Date, n: number) => new Date(x.getTime() + n * 86_400_000);
export const parseDay = (s: string) => {
  const [y, m, dd] = s.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, dd);
};
export const fmtDay = (s: string) => fmtDate(parseDay(s));
export const fmtWhen = (s: string) => fmtDateTime(new Date(s));
/** The demo's "now": the demo date with the real time of day, so new entries sort after the seeded ones. */
const stamp = () => {
  const t = new Date();
  return new Date(
    DEMO_NOW.getFullYear(),
    DEMO_NOW.getMonth(),
    DEMO_NOW.getDate(),
    t.getHours(),
    t.getMinutes(),
    t.getSeconds(),
  ).toISOString();
};
let counter = 0;
const nid = (p: string) => `${p}-${Date.now().toString(36)}-${++counter}`;
const at = (x: Date, h = 9) =>
  new Date(x.getFullYear(), x.getMonth(), x.getDate(), h, 0).toISOString();

export const gapKey = (memberId: string, code: MeasureCode) =>
  `${memberId}:${code}`;
const SYSTEM = "Sonata quality run";

/* ------------------------------------------------------------------ starting data (made up, the same every time) */

function seedWork(m: Member, code: MeasureCode): Work {
  const h = hashOf(`${m.id}${code}`);
  const identifiedDate = addDays(NEWEST_FILE, -(5 + (h % 80)));
  const manager = careManagers[hashOf(m.id) % careManagers.length];
  const n = h % 20;
  const planned =
    code === "COL-E"
      ? m.events.find(
          (e) => e.tag === "colonoscopy" && e.status === "preparation",
        )
      : undefined;
  /** How far the work has got. Closed ones need an old enough gap, so every date stays on or before the demo's today. */
  const age = h % 80;
  const stage: "open" | "outreach" | "records" | "closed" =
    !planned && age >= 20 && (h >> 6) % 14 === 0
      ? "closed"
      : planned
        ? "outreach"
        : n < 8
          ? "open"
          : n < 14
            ? "outreach"
            : "records";
  /** Records that were asked for: still waiting (0, 1), received (2) or received and rejected (3). */
  const path =
    age >= 9 ? [0, 0, 2, 2, 3][(Math.imul(h, 2654435761) >>> 24) % 5] : 0;
  const status: GapStatus = stage === "closed" ? "Closed" : "Open";
  const first = m.first;
  const svc = serviceLabel[code];
  const kinds = evidenceKinds[code];
  const provider = providerName(m.events.find((e) => e.provider)?.provider);
  const requestFrom =
    provider === "–" ? "the member's primary care office" : provider;
  const id = (s: string) => `${m.id}-${code}-${s}`;
  const activity: Activity[] = [
    {
      id: id("a1"),
      when: at(identifiedDate, 6),
      by: SYSTEM,
      kind: "Found",
      text: `Gap found when ${code} was calculated: ${resultsFor(m)[code].reason}.`,
      reason: "The measure result was Not met.",
    },
    {
      id: id("a2"),
      when: at(addDays(identifiedDate, 1), 9),
      by: "Supervisor",
      kind: "Assigned",
      text: `Assigned to ${manager}.`,
      reason: "New care gap for the care team.",
    },
  ];
  const w: Work = {
    status,
    careManager: manager,
    identified: iso(identifiedDate),
    tasks: [],
    outreach: [],
    visits: [],
    docRequests: [],
    evidence: [],
    activity,
  };

  if (stage === "open") {
    const due = addDays(identifiedDate, 14 + (h % 10));
    w.tasks.push({
      id: id("t1"),
      title: `Call ${first} to schedule a ${svc}`,
      due: iso(due),
      owner: manager,
      done: false,
    });
    activity.push({
      id: id("a3"),
      when: at(addDays(identifiedDate, 1), 10),
      by: manager,
      kind: "Task",
      text: `Task created: call ${first} to schedule a ${svc}.`,
      reason: "First step: reach the member.",
    });
  } else if (stage === "outreach") {
    const when = addDays(identifiedDate, 3);
    w.outreach.push({
      id: id("o1"),
      when: at(when, 11),
      channel: "Phone",
      result: "Left voicemail",
      notes: "Left a message with the clinic number.",
      followUp: iso(addDays(when, 7)),
      by: manager,
    });
    activity.push({
      id: id("a3"),
      when: at(when, 11),
      by: manager,
      kind: "Outreach",
      text: "Phone call: left voicemail.",
      reason: "Contact attempt to arrange the missing service.",
    });
    if (planned) {
      w.visits.push({
        id: id("v1"),
        kind: "Appointment",
        with:
          providerName(planned.provider) === "–"
            ? "Gastroenterology"
            : providerName(planned.provider),
        service: "Colonoscopy",
        date: iso(planned.date),
        status: "Scheduled",
      });
      activity.push({
        id: id("a4"),
        when: at(addDays(when, 1), 9),
        by: manager,
        kind: "Visit",
        text: `Colonoscopy scheduled for ${fmtDate(planned.date)}. It is recorded as "preparation" and does not count until it is done.`,
        reason: "The member agreed to a date.",
      });
      w.tasks.push({
        id: id("t1"),
        title: "Confirm the colonoscopy took place and request the report",
        due: iso(addDays(planned.date, 7)),
        owner: manager,
        done: false,
      });
    } else {
      if (h % 2 === 0) {
        const date = addDays(DEMO_NOW, 5 + (h % 45));
        w.visits.push({
          id: id("v1"),
          kind: "Appointment",
          with: requestFrom,
          service: svc,
          date: iso(date),
          status: "Scheduled",
        });
        activity.push({
          id: id("a4"),
          when: at(addDays(when, 1), 9),
          by: manager,
          kind: "Visit",
          text: `Appointment scheduled for ${fmtDate(date)}.`,
          reason: "The member agreed to a date.",
        });
      }
      w.tasks.push({
        id: id("t1"),
        title: `Follow up with ${first} about the ${svc}`,
        due: iso(addDays(identifiedDate, 21 + (h % 14))),
        owner: manager,
        done: false,
      });
    }
  } else if (stage === "records") {
    // The member says the service was done elsewhere, so the record was asked for.
    const when = addDays(identifiedDate, 3);
    const asked = addDays(when, 1);
    const due = addDays(identifiedDate, 17 + (h % 10));
    w.outreach.push({
      id: id("o1"),
      when: at(when, 11),
      channel: "Phone",
      result: "Reached, says it was done elsewhere",
      notes: `${first} says the ${svc} was done elsewhere.`,
      by: manager,
    });
    activity.push({
      id: id("a3"),
      when: at(when, 11),
      by: manager,
      kind: "Outreach",
      text: `Phone call: reached ${first}, who says the ${svc} was done elsewhere.`,
      reason: "Contact attempt to arrange the missing service.",
    });
    w.docRequests.push({
      id: id("d1"),
      from: requestFrom,
      what: `Record of the ${svc}`,
      requested: iso(asked),
      due: iso(due),
      status: path >= 2 ? "Received" : "Requested",
    });
    activity.push({
      id: id("a4"),
      when: at(asked, 9),
      by: manager,
      kind: "Records",
      text: `Records requested from ${requestFrom}: record of the ${svc} (due ${fmtDate(due)}).`,
      reason: `${first} says the service was done elsewhere; the record is needed to verify it.`,
    });
    if (path < 2) {
      w.tasks.push({
        id: id("t1"),
        title: `Review the records from ${requestFrom}`,
        due: iso(due),
        owner: manager,
        done: false,
      });
    } else {
      // The records came in: one qualifying record (path 2) or one that cannot count (path 3).
      const arrived = addDays(identifiedDate, 9);
      const bad = path === 3;
      const kind = bad ? kinds[kinds.length - 1] : kinds[0];
      const date = bad
        ? day(MY - 3, 6, 15)
        : addDays(identifiedDate, -(8 + (h % 20)));
      const rec: EvidenceRec = {
        id: id("e1"),
        kind: kind.label,
        date: iso(date),
        source: "Scanned medical record (supplemental)",
        provider: requestFrom,
        value: kind.needsValueBelow !== undefined ? 7.2 : undefined,
        note: `Sent by ${requestFrom}.`,
        recordedBy: manager,
        recorded: at(arrived, 10),
        validation: bad ? "Rejected" : "Pending review",
        reviewedBy: bad ? "Quality analyst" : undefined,
        reviewedOn: bad ? at(addDays(arrived, 2), 14) : undefined,
        reviewNote: bad
          ? "The service date is outside the measurement window, so it cannot count."
          : undefined,
      };
      w.evidence.push(rec);
      activity.push({
        id: id("a5"),
        when: rec.recorded,
        by: manager,
        kind: "Evidence",
        text: `Evidence recorded: ${rec.kind} dated ${fmtDate(date)} from ${rec.source}, ${requestFrom}. It has to be reviewed before the gap can close.`,
        reason: `Records received from ${requestFrom}.`,
      });
      if (bad)
        activity.push({
          id: id("a6"),
          when: rec.reviewedOn!,
          by: "Quality analyst",
          kind: "Review",
          text: `Evidence rejected: ${rec.kind} dated ${fmtDate(date)}.`,
          reason: rec.reviewNote!,
        });
      w.tasks.push({
        id: id("t1"),
        title: bad
          ? `Ask ${requestFrom} for the correct record`
          : "Have the evidence reviewed and validated",
        due: iso(addDays(arrived, 5)),
        owner: bad ? manager : "Quality analyst",
        done: false,
      });
    }
  }

  if (stage === "closed") {
    // A finished example: contact, records, evidence validated, measure re-evaluated, gap closed.
    const when = addDays(identifiedDate, 3);
    const asked = addDays(when, 1);
    const arrived = addDays(identifiedDate, 6);
    const reviewed = addDays(identifiedDate, 8);
    const closedOn = addDays(identifiedDate, 9);
    const kind = kinds[0];
    const date = addDays(identifiedDate, -(8 + (h % 20)));
    const rec: EvidenceRec = {
      id: id("e1"),
      kind: kind.label,
      date: iso(date),
      source: "Scanned medical record (supplemental)",
      provider: requestFrom,
      value: kind.needsValueBelow !== undefined ? 7.2 : undefined,
      note: `Sent by ${requestFrom}.`,
      recordedBy: manager,
      recorded: at(arrived, 10),
      validation: "Validated",
      reviewedBy: "Quality analyst",
      reviewedOn: at(reviewed, 14),
      reviewNote: "Source, provider and service date confirmed.",
    };
    w.outreach.push({
      id: id("o1"),
      when: at(when, 11),
      channel: "Phone",
      result: "Reached, says it was done elsewhere",
      notes: `${first} says the ${svc} was done elsewhere.`,
      by: manager,
    });
    w.docRequests.push({
      id: id("d1"),
      from: requestFrom,
      what: `Record of the ${svc}`,
      requested: iso(asked),
      due: iso(addDays(identifiedDate, 12)),
      status: "Received",
    });
    w.evidence.push(rec);
    w.tasks.push({
      id: id("t1"),
      title: `Review the records from ${requestFrom}`,
      due: iso(addDays(identifiedDate, 12)),
      owner: manager,
      done: true,
      doneOn: iso(reviewed),
    });
    const reeval: Reeval = {
      on: at(reviewed, 15),
      by: "Quality analyst",
      evidenceId: rec.id,
      ok: true,
      text: `Re-evaluated ${code} with ${rec.kind} dated ${fmtDate(date)}. Result with this evidence: Met.`,
    };
    w.reeval = reeval;
    w.closed = {
      on: at(closedOn, 9),
      by: "Quality analyst",
      reason: "Service done elsewhere; the record was obtained and validated",
      evidenceId: rec.id,
    };
    activity.push(
      {
        id: id("a3"),
        when: at(when, 11),
        by: manager,
        kind: "Outreach",
        text: `Phone call: reached ${first}, who says the ${svc} was done elsewhere.`,
        reason: "Contact attempt to arrange the missing service.",
      },
      {
        id: id("a4"),
        when: at(asked, 9),
        by: manager,
        kind: "Records",
        text: `Records requested from ${requestFrom}: record of the ${svc}.`,
        reason: `${first} says the service was done elsewhere; the record is needed to verify it.`,
      },
      {
        id: id("a5"),
        when: rec.recorded,
        by: manager,
        kind: "Evidence",
        text: `Evidence recorded: ${rec.kind} dated ${fmtDate(date)} from ${rec.source}, ${requestFrom}.`,
        reason: `Records received from ${requestFrom}.`,
      },
      {
        id: id("a6"),
        when: rec.reviewedOn!,
        by: "Quality analyst",
        kind: "Review",
        text: `Evidence validated: ${rec.kind} dated ${fmtDate(date)}.`,
        reason: rec.reviewNote!,
      },
      {
        id: id("a7"),
        when: reeval.on,
        by: reeval.by,
        kind: "Measure",
        text: reeval.text,
        reason: "Evidence was validated, so the measure was run again.",
      },
      {
        id: id("a8"),
        when: w.closed.on,
        by: "Quality analyst",
        kind: "Closed",
        text: `Gap closed: ${w.closed.reason}. Evidence: ${rec.kind} dated ${fmtDate(date)} from ${rec.source}. The measure result changes to Met at the next calculation run.`,
        reason: w.closed.reason,
      },
    );
  }
  return w;
}

/* ------------------------------------------------------------------ one gap, ready to show */

export type ActionKey =
  | "assign"
  | "task"
  | "outreach"
  | "visit"
  | "records"
  | "evidence"
  | "review"
  | "reeval"
  | "close"
  | "reopen";

export interface GapView {
  id: string;
  m: Member;
  def: MeasureDef;
  result: MeasureResult;
  work: Work;
  status: GapStatus;
  careManager: string;
  identified: Date;
  evidenceStatus: EvidenceStatus;
  /** The next scheduled appointment or referral. */
  next: { title: string; due: Date; visitId: string } | null;
  nextAppointment: Date | null;
  lastUpdated: Date;
}

/** Evidence status, from the records and requests (it is about the proof, not the work). */
const evidenceStatusOf = (w: Work): EvidenceStatus =>
  w.evidence.some((e) => e.validation === "Validated")
    ? "Validated"
    : w.evidence.some((e) => e.validation === "Pending review")
      ? "Received"
      : w.docRequests.some((r) => r.status === "Requested")
        ? "Requested"
        : w.evidence.some((e) => e.validation === "Rejected")
          ? "Rejected"
          : "Not requested";

function view(m: Member, code: MeasureCode, w: Work): GapView {
  const def = measures.find((x) => x.code === code)!;
  const upcoming = w.visits
    .filter((v) => v.status === "Scheduled" && parseDay(v.date) >= DEMO_NOW)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const latest = w.activity.reduce(
    (a, x) => (x.when > a ? x.when : a),
    w.identified,
  );
  return {
    id: gapKey(m.id, code),
    m,
    def,
    result: resultsFor(m)[code],
    work: w,
    status: w.status,
    careManager: w.careManager,
    identified: parseDay(w.identified),
    evidenceStatus: evidenceStatusOf(w),
    next:
      w.status === "Closed" || !upcoming
        ? null
        : {
            title: `${upcoming.kind === "Referral" ? "Referral to" : "Appointment with"} ${upcoming.with}: ${upcoming.service}`,
            due: parseDay(upcoming.date),
            visitId: upcoming.id,
          },
    nextAppointment: upcoming ? parseDay(upcoming.date) : null,
    lastUpdated: new Date(latest),
  };
}

/* ------------------------------------------------------------------ closing a gap */

export interface ClosureCheck {
  label: string;
  ok: boolean;
  detail: string;
}

/** Does this evidence meet the measure's criteria? (Used by the closing checks and by the re-evaluation.) */
export function criteriaTests(code: MeasureCode, e: EvidenceRec) {
  const kinds = evidenceKinds[code];
  const kind = kinds.find((k) => k.label === e.kind);
  const date = parseDay(e.date);
  return {
    kind: !!kind,
    window: !!kind && date >= kind.from && date <= kind.to,
    source: !!e.source && !!e.provider.trim(),
    value:
      !kind?.needsValueBelow ||
      (e.value !== undefined && e.value < kind.needsValueBelow),
  };
}
const score = (code: MeasureCode, e: EvidenceRec) =>
  Object.values(criteriaTests(code, e)).filter(Boolean).length;

export interface ClosureState {
  checks: ClosureCheck[];
  /** Everything is in place: the gap can be closed. */
  ok: boolean;
  /** At least one record has been validated, so the measure can be re-evaluated. */
  canReevaluate: boolean;
  /** The evidence that would be used (validated, best match). */
  evidence?: EvidenceRec;
  /** A re-evaluation with this evidence succeeded, after it was validated. */
  reevalOk: boolean;
  /** Plain-language reason closing is allowed or blocked. */
  why: string;
}

/**
 * A gap closes only when (1) evidence is recorded, (2) a reviewer validated it, (3) the validated evidence meets the measure's
 * criteria and (4) the measure was re-evaluated with it and came out Met. A done task or a manual status change is not evidence.
 */
export function checkClosure(g: GapView): ClosureState {
  const code = g.def.code;
  const kinds = evidenceKinds[code];
  const recs = g.work.evidence;
  const validated = recs.filter((e) => e.validation === "Validated");
  const pending = recs.filter((e) => e.validation === "Pending review");
  const rejected = recs.filter((e) => e.validation === "Rejected");
  const best = [...validated].sort(
    (a, b) => score(code, b) - score(code, a),
  )[0];
  const t = best ? criteriaTests(code, best) : undefined;
  const re = g.work.reeval;
  const reevalOk =
    !!best &&
    !!re &&
    re.ok &&
    re.evidenceId === best.id &&
    re.on >= (best.reviewedOn ?? "");
  const stale =
    !!best &&
    !!re &&
    re.evidenceId === best.id &&
    re.on < (best.reviewedOn ?? "");
  const checks: ClosureCheck[] = [
    {
      label: "Evidence has been recorded",
      ok: recs.length > 0,
      detail: recs.length
        ? `${recs.length} record${recs.length === 1 ? "" : "s"} recorded.`
        : "No evidence yet. A completed task is not evidence.",
    },
    {
      label: "A reviewer has validated the evidence",
      ok: validated.length > 0,
      detail:
        validated.length > 0
          ? `${validated.length} record${validated.length === 1 ? "" : "s"} validated.`
          : pending.length > 0
            ? `${pending.length} record${pending.length === 1 ? " is" : "s are"} waiting for review (Evidence tab).`
            : rejected.length > 0
              ? "Every record so far was rejected. Rejected evidence cannot be used."
              : "Nothing to review yet.",
    },
    {
      label: `It is the right kind of record for ${code}`,
      ok: !!t?.kind,
      detail: `Accepted: ${kinds.map((k) => k.label).join(" or ")}.`,
    },
    {
      label: "Its service date is inside the measurement period",
      ok: !!t?.window,
      detail: kinds.map((k) => `${k.label} ${k.windowText}`).join("; ") + ".",
    },
    {
      label: "The source and provider are recorded",
      ok: !!t?.source,
      detail: "Where it came from and who provided it.",
    },
  ];
  if (kinds.some((k) => k.needsValueBelow))
    checks.push({
      label: "The result meets the criteria",
      ok: !!t?.value,
      detail: "HbA1c must be below 8%.",
    });
  checks.push(
    {
      label: "The member still qualifies for the measure",
      ok: g.result.state === "Gap",
      detail: "No exclusion applies and the member is still in the measure.",
    },
    {
      label: "The measure was re-evaluated with the validated evidence",
      ok: reevalOk,
      detail: reevalOk
        ? `${re!.text} Run ${fmtWhen(re!.on)} by ${re!.by}.`
        : !best
          ? "Needs validated evidence first."
          : stale
            ? "The evidence was reviewed after the last re-evaluation. Run it again."
            : re && re.evidenceId === best.id && !re.ok
              ? `Last re-evaluation did not come out Met: ${re.text}`
              : "Not run yet. Choose Re-evaluate measure.",
    },
  );
  const ok = checks.every((c) => c.ok);
  const failed = checks.find((c) => !c.ok);
  return {
    checks,
    ok,
    canReevaluate: validated.length > 0,
    evidence: best,
    reevalOk,
    why: ok
      ? "Closing is allowed: the evidence is validated, it meets the criteria, and the re-evaluated measure is Met."
      : `Closing is blocked because this is not true yet: ${failed ? failed.label.charAt(0).toLowerCase() + failed.label.slice(1) : "a check is missing"}.${failed?.detail ? ` ${failed.detail}` : ""}`,
  };
}

/** The one action to highlight, from the state of the gap. */
export function recommendedAction(g: GapView): {
  key: ActionKey;
  label: string;
  why: string;
} {
  const w = g.work;
  if (g.status === "Closed")
    return {
      key: "reopen",
      label: "No action needed",
      why: "The gap is closed. Reopen it only if new information changes this.",
    };
  const c = checkClosure(g);
  if (c.ok)
    return {
      key: "close",
      label: "Close the gap",
      why: "The evidence is validated and the measure was re-evaluated as Met.",
    };
  const waiting = w.evidence.some((e) => e.validation === "Pending review");
  if (c.canReevaluate && !c.reevalOk) {
    if (c.checks.slice(0, -1).every((x) => x.ok))
      return {
        key: "reeval",
        label: "Re-evaluate the measure",
        why: "The evidence is validated. Run the measure again to confirm it comes out Met.",
      };
    if (!waiting)
      return {
        key: "records",
        label: "Ask for a record that meets the criteria",
        why: "The validated evidence does not meet the criteria, so it cannot close the gap.",
      };
  }
  if (waiting)
    return {
      key: "review",
      label: "Review the evidence received",
      why: "Evidence has arrived and is waiting for a reviewer to validate or reject it.",
    };
  if (g.evidenceStatus === "Requested")
    return {
      key: "evidence",
      label: "Record the evidence when it arrives",
      why: "Records were requested and have not come in yet.",
    };
  if (g.evidenceStatus === "Rejected")
    return {
      key: "records",
      label: "Request a corrected record",
      why: "The evidence was rejected. A record that meets the criteria is needed.",
    };
  if (!w.visits.some((v) => v.status !== "Cancelled"))
    return {
      key: "visit",
      label: `Schedule an appointment for ${g.m.first}`,
      why: "No appointment or referral is set up yet, and the service is still missing.",
    };
  return {
    key: "visit",
    label: `Follow up on ${g.m.first}'s appointment or referral`,
    why: "Work is under way. Keep the appointment or referral up to date, then record the evidence when it arrives.",
  };
}

/** What to show as "Next action" and its due date: the open task, unless the evidence is the thing to act on. */
export function nextActionOf(g: GapView): {
  label: string;
  due: Date | null;
  overdue: boolean;
} {
  if (g.status === "Closed")
    return { label: "None: closed", due: null, overdue: false };
  const rec = recommendedAction(g);
  const evidenceDriven =
    rec.key === "close" ||
    rec.key === "reeval" ||
    rec.key === "review" ||
    (rec.key === "records" && g.evidenceStatus === "Rejected");
  if (g.next && !evidenceDriven)
    return {
      label: g.next.title,
      due: g.next.due,
      overdue: g.next.due < DEMO_NOW,
    };
  return { label: rec.label, due: null, overdue: false };
}

/* ------------------------------------------------------------------ how a record affected the measures */

export interface Impact {
  code: MeasureCode;
  def: MeasureDef;
  outcome: "decided" | "not counted" | "context" | "counted";
  text: string;
}

/** For one record: what it did to each measure it relates to. Worked out with the same rules as the results. */
export function impactsOf(m: Member, e: Evt, year: number = MY): Impact[] {
  const out: Impact[] = [];
  for (const def of measures) {
    if (!relatedTags[def.code].includes(e.tag)) continue;
    const res = resultsFor(m, year)[def.code];
    const kind = evidenceKindsFor(def.code, year).find((k) => k.tag === e.tag);
    if (res.evidence === e) {
      out.push({
        code: def.code,
        def,
        outcome: "decided",
        text: `This record decided the result: ${stateLabel[res.state]}. ${res.reason}.`,
      });
      continue;
    }
    if (!kind) {
      out.push({
        code: def.code,
        def,
        outcome: "context",
        text:
          res.state === "Not eligible"
            ? "Read when checking this member, but the member is not in this measure."
            : e.tag === "diabetes"
              ? "Shows the member has diabetes, so this measure applies."
              : e.tag === "palliative"
                ? `Palliative care in ${year} excludes the member from this measure.`
                : e.tag === "colorectal-cancer" || e.tag === "colectomy"
                  ? "Colorectal cancer or a total colectomy excludes the member from this measure."
                  : "Read when checking exclusions (frailty, advanced illness, surgery).",
      });
      continue;
    }
    if (e.tag === "hba1c" && e.status !== "final") {
      out.push({
        code: def.code,
        def,
        outcome: "not counted",
        text: `Did not count: a ${e.status} result is ignored. Only final results count.`,
      });
      continue;
    }
    if (!done(e)) {
      out.push({
        code: def.code,
        def,
        outcome: "not counted",
        text: `Did not count: the status "${e.status}" does not count as done.`,
      });
      continue;
    }
    if (
      e.tag === "well-care" &&
      e.telehealth &&
      !rulesOfYear(year).telehealthCounts
    ) {
      out.push({
        code: def.code,
        def,
        outcome: "not counted",
        text: `Did not count: a well-care visit held by telehealth does not count from MY 2025.`,
      });
      continue;
    }
    if (e.date < kind.from || e.date > kind.to) {
      out.push({
        code: def.code,
        def,
        outcome: "not counted",
        text: `Did not count: dated ${fmtDate(e.date)}. It must be ${kind.windowText}.`,
      });
      continue;
    }
    out.push({
      code: def.code,
      def,
      outcome: "counted",
      text:
        res.state === "Met"
          ? "Qualifies. Another record was used first because the measure stops at the first match."
          : res.state === "Not eligible"
            ? "Qualifies, but the member is not in this measure."
            : "Is inside the window, but the measure is not met (see the result).",
    });
  }
  return out;
}

/** The records that matter to one measure, newest first. */
export const supportingEvents = (m: Member, code: MeasureCode) =>
  m.events
    .filter((e) => relatedTags[code].includes(e.tag))
    .sort((a, b) => b.date.getTime() - a.date.getTime());

/** The latest record of the right kind, even if it is too old or does not count. */
export function lastQualifying(
  m: Member,
  code: MeasureCode,
  year: number = MY,
): Evt | undefined {
  const tags = evidenceKindsFor(code, year).map((k) => k.tag);
  return m.events
    .filter((e) => tags.includes(e.tag))
    .sort((a, b) => b.date.getTime() - a.date.getTime())[0];
}

/** The same id the Claims and clinical data table uses for a row, so a link can open that record. */
export const recordKey = (e: Evt) =>
  `${e.date.toISOString()}-${e.file}-${e.code}-${e.status}`;

/**
 * Codes that look related to a measure but are not mapped to it (so they were not counted). Which of these the measure
 * should accept is for the data team to decide: they are shown so a care manager can raise them.
 */
export const unmappedCodes: Record<MeasureCode, string[]> = {
  WCV: [],
  "BCS-E": ["Z12.31"],
  "CCS-E": ["Z01.419"],
  "COL-E": ["Z12.11"],
  GSD: ["83036", "3044F"],
};
export const unmappedEvents = (m: Member, code: MeasureCode) =>
  m.events.filter(
    (e) => e.tag === "other" && unmappedCodes[code].includes(e.code),
  );

/** The services a measure accepts, in the files, whose own status says they were not done or not final. */
export const conflictsWith = (e: Evt) =>
  !done(e) ||
  (e.tag === "hba1c" && (e.status !== "final" || e.value === undefined));

/** The newest relevant record: from the files, or evidence recorded in Sonata, whichever is later. */
export type LastRecord =
  | { origin: "file"; e: Evt; date: Date }
  | { origin: "recorded"; rec: EvidenceRec; date: Date };
export function lastRelevant(g: GapView): LastRecord | undefined {
  const file = lastQualifying(g.m, g.def.code);
  const recs = g.work.evidence
    .filter((r) => r.validation !== "Rejected")
    .sort((a, b) => b.date.localeCompare(a.date));
  const rec = recs[0];
  const fileDate = file?.date;
  const recDate = rec ? parseDay(rec.date) : undefined;
  if (file && (!recDate || fileDate! >= recDate))
    return { origin: "file", e: file, date: file.date };
  if (rec) return { origin: "recorded", rec, date: recDate! };
  return undefined;
}

/** When the file a record arrived in was last received. */
export const arrivedOn = (e: Evt): Date | undefined =>
  dataFiles.find((f) => f.id === e.file)?.receivedOn;

/* ------------------------------------------------------------------ the store (browser only) */

const KEY = "sonata-demo-gaps-v2";
type Touched = Record<string, Work>;
const read = (): Touched => {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? "{}") as Touched;
  } catch {
    return {};
  }
};
const write = (t: Touched) => {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(t));
  } catch {
    /* the demo still works for this visit without storage */
  }
};

export interface NewTask {
  title: string;
  due: string;
  owner: string;
  reason?: string;
}
export interface NewOutreach {
  channel: OutreachChannel;
  result: OutreachResult;
  notes: string;
  /** Day of the contact (YYYY-MM-DD). Today if left out. */
  day?: string;
  followUp?: string;
  /** Care manager who made the contact. The signed-in person if left out. */
  by?: string;
}
export interface NewVisit {
  kind: "Appointment" | "Referral";
  with: string;
  service: string;
  date: string;
  status: VisitStatus;
}
export interface NewDoc {
  from: string;
  what: string;
  due: string;
  reason?: string;
}
export interface NewEvidence {
  kind: string;
  date: string;
  source: string;
  provider: string;
  value?: number;
  note: string;
}

interface GapsValue {
  /** Every Not met measure for a member, in the usual measure order (closed ones included). */
  gapsOf: (m: Member) => GapView[];
  /** Not met measures whose gap is not closed. */
  openOf: (m: Member) => GapView[];
  get: (m: Member, code: MeasureCode) => GapView | null;
  assign: (id: string, who: string, reason?: string) => void;
  addTask: (id: string, t: NewTask) => void;
  completeTask: (id: string, taskId: string) => void;
  addOutreach: (id: string, o: NewOutreach) => void;
  addVisit: (id: string, v: NewVisit) => void;
  setVisitStatus: (id: string, visitId: string, s: VisitStatus) => void;
  requestRecords: (id: string, d: NewDoc) => void;
  recordEvidence: (id: string, e: NewEvidence) => void;
  /** A reviewer validates or rejects one piece of evidence. A reason is kept for both. */
  reviewEvidence: (
    id: string,
    evidenceId: string,
    decision: "Validated" | "Rejected",
    reason: string,
  ) => void;
  /** Run the measure again with the validated evidence. Returns whether it came out Met. */
  reevaluate: (id: string) => boolean;
  close: (id: string, reason: string) => boolean;
  reopen: (id: string, why: string) => void;
  reset: () => void;
}
const Ctx = createContext<GapsValue | null>(null);

const seeds = new Map<string, Work>();
const seedOf = (m: Member, code: MeasureCode) => {
  const k = gapKey(m.id, code);
  let w = seeds.get(k);
  if (!w) {
    w = seedWork(m, code);
    seeds.set(k, w);
  }
  return w;
};

export function GapsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const who = user?.name ?? "Admin";
  const [touched, setTouched] = useState<Touched>(read);

  const workOf = useCallback(
    (m: Member, code: MeasureCode) =>
      touched[gapKey(m.id, code)] ?? seedOf(m, code),
    [touched],
  );

  const get = useCallback(
    (m: Member, code: MeasureCode): GapView | null =>
      resultsFor(m)[code].state === "Gap"
        ? view(m, code, workOf(m, code))
        : null,
    [workOf],
  );
  const gapsOf = useCallback(
    (m: Member) =>
      measures
        .map((x) => get(m, x.code))
        .filter((g): g is GapView => g !== null),
    [get],
  );
  const openOf = useCallback(
    (m: Member) => gapsOf(m).filter((g) => g.status !== "Closed"),
    [gapsOf],
  );

  /** Change one gap: `fn` gets the current work and returns the new work. */
  const change = useCallback((id: string, fn: (w: Work) => Work) => {
    const [memberId, code] = id.split(":");
    const m = memberFor(memberId);
    if (!m) return;
    setTouched((prev) => {
      const next = {
        ...prev,
        [id]: fn(prev[id] ?? seedOf(m, code as MeasureCode)),
      };
      write(next);
      return next;
    });
  }, []);
  const log = (
    w: Work,
    kind: ActivityKind,
    text: string,
    reason: string,
  ): Work => ({
    ...w,
    activity: [
      ...w.activity,
      { id: nid("a"), when: stamp(), by: who, kind, text, reason },
    ],
  });
  const gapFor = (id: string) => {
    const [memberId, code] = id.split(":");
    const m = memberFor(memberId);
    return m ? get(m, code as MeasureCode) : null;
  };

  const value = useMemo<GapsValue>(
    () => ({
      gapsOf,
      openOf,
      get,
      assign: (id, name, reason) =>
        change(id, (w) =>
          w.careManager === name
            ? w
            : log(
                { ...w, careManager: name },
                "Assigned",
                `Reassigned from ${w.careManager} to ${name}.`,
                reason || "Reassigned by the team.",
              ),
        ),
      addTask: (id, t) =>
        change(id, (w) =>
          log(
            { ...w, tasks: [...w.tasks, { id: nid("t"), ...t, done: false }] },
            "Task",
            `Task created: ${t.title} (due ${fmtDay(t.due)}, ${t.owner}).`,
            t.reason || "Follow-up work on this gap.",
          ),
        ),
      completeTask: (id, taskId) =>
        change(id, (w) => {
          const t = w.tasks.find((x) => x.id === taskId);
          if (!t || t.done) return w;
          return log(
            {
              ...w,
              tasks: w.tasks.map((x) =>
                x.id === taskId
                  ? { ...x, done: true, doneOn: iso(DEMO_NOW) }
                  : x,
              ),
            },
            "Task",
            `Task completed: ${t.title}. The gap status did not change.`,
            "Work done. Only validated evidence and a re-evaluated measure close a gap.",
          );
        }),
      addOutreach: (id, o) =>
        change(id, (w) => {
          const rec: Outreach = {
            id: nid("o"),
            when:
              o.day && o.day !== iso(DEMO_NOW)
                ? at(parseDay(o.day), 11)
                : stamp(),
            channel: o.channel,
            result: o.result,
            notes: o.notes,
            followUp: o.followUp || undefined,
            by: o.by ?? who,
          };
          return log(
            { ...w, outreach: [...w.outreach, rec] },
            "Outreach",
            `${o.channel}: ${o.result.charAt(0).toLowerCase()}${o.result.slice(1)}.${o.notes ? ` ${o.notes}` : ""}${o.followUp ? ` Follow-up on ${fmtDay(o.followUp)}.` : ""}`,
            "Contact attempt to arrange the missing service or the record.",
          );
        }),
      addVisit: (id, v) =>
        change(id, (w) =>
          log(
            { ...w, visits: [...w.visits, { id: nid("v"), ...v }] },
            "Visit",
            `${v.kind} ${v.status.toLowerCase()}: ${v.service} with ${v.with} on ${fmtDay(v.date)}.`,
            "Arrange the missing service.",
          ),
        ),
      setVisitStatus: (id, visitId, s) =>
        change(id, (w) => {
          const v = w.visits.find((x) => x.id === visitId);
          if (!v || v.status === s) return w;
          return log(
            {
              ...w,
              visits: w.visits.map((x) =>
                x.id === visitId ? { ...x, status: s } : x,
              ),
            },
            "Visit",
            `${v.kind} for ${v.service} marked ${s.toLowerCase()}.`,
            "Outcome of the visit. It does not close the gap: the evidence must be recorded and validated.",
          );
        }),
      requestRecords: (id, d) =>
        change(id, (w) =>
          log(
            {
              ...w,
              docRequests: [
                ...w.docRequests,
                {
                  id: nid("d"),
                  from: d.from,
                  what: d.what,
                  requested: iso(DEMO_NOW),
                  due: d.due,
                  status: "Requested",
                },
              ],
            },
            "Records",
            `Records requested from ${d.from}: ${d.what} (due ${fmtDay(d.due)}).`,
            d.reason || "The record is needed to verify the service.",
          ),
        ),
      recordEvidence: (id, e) =>
        change(id, (w) => {
          const rec: EvidenceRec = {
            id: nid("e"),
            ...e,
            recordedBy: who,
            recorded: stamp(),
            validation: "Pending review",
          };
          const requested = w.docRequests.findIndex(
            (r) => r.status === "Requested",
          );
          const docRequests = w.docRequests.map((r, i) =>
            i === requested ? { ...r, status: "Received" as const } : r,
          );
          return log(
            { ...w, evidence: [...w.evidence, rec], docRequests },
            "Evidence",
            `Evidence recorded: ${e.kind} dated ${fmtDay(e.date)} from ${e.source}${e.provider ? `, ${e.provider}` : ""}. It has to be reviewed before the gap can close.`,
            e.note || "Evidence received.",
          );
        }),
      reviewEvidence: (id, evidenceId, decision, reason) =>
        change(id, (w) => {
          const rec = w.evidence.find((x) => x.id === evidenceId);
          if (!rec || rec.validation !== "Pending review") return w;
          const text = `Evidence ${decision.toLowerCase()}: ${rec.kind} dated ${fmtDay(rec.date)}.`;
          return log(
            {
              ...w,
              evidence: w.evidence.map((x) =>
                x.id === evidenceId
                  ? {
                      ...x,
                      validation: decision,
                      reviewedBy: who,
                      reviewedOn: stamp(),
                      reviewNote: reason,
                    }
                  : x,
              ),
            },
            "Review",
            text,
            reason ||
              (decision === "Validated"
                ? "Source, provider and service date confirmed."
                : "Not accepted."),
          );
        }),
      reevaluate: (id) => {
        const g = gapFor(id);
        if (!g || g.status === "Closed") return false;
        const c = checkClosure(g);
        if (!c.evidence) return false;
        const e = c.evidence;
        const t = criteriaTests(g.def.code, e);
        const ok = Object.values(t).every(Boolean) && g.result.state === "Gap";
        const failed = [
          !t.kind && "wrong kind of record",
          !t.window && "service date outside the measurement period",
          !t.source && "source or provider missing",
          !t.value && "result does not meet the criteria",
        ].filter(Boolean);
        const text = ok
          ? `Re-evaluated ${g.def.code} with ${e.kind} dated ${fmtDay(e.date)}. Result with this evidence: Met.`
          : `Re-evaluated ${g.def.code} with ${e.kind} dated ${fmtDay(e.date)}. Result with this evidence: Not met (${failed.join(", ") || "member no longer qualifies"}).`;
        change(id, (w) =>
          log(
            {
              ...w,
              reeval: { on: stamp(), by: who, evidenceId: e.id, ok, text },
            },
            "Measure",
            text,
            "Validated evidence was added, so the measure was run again before any closure.",
          ),
        );
        return ok;
      },
      close: (id, reason) => {
        const g = gapFor(id);
        if (!g) return false;
        const check = checkClosure(g);
        if (!check.ok || !check.evidence) return false;
        const e = check.evidence;
        const on = stamp();
        change(id, (w) =>
          log(
            {
              ...w,
              status: "Closed",
              closed: { on, by: who, reason, evidenceId: e.id },
              tasks: w.tasks.map((t) =>
                t.done ? t : { ...t, done: true, doneOn: iso(DEMO_NOW) },
              ),
            },
            "Closed",
            `Gap closed. Evidence: ${e.kind} dated ${fmtDay(e.date)} from ${e.source}. The measure result changes to Met at the next calculation run.`,
            reason,
          ),
        );
        return true;
      },
      reopen: (id, why) =>
        change(id, (w) =>
          w.status !== "Closed"
            ? w
            : log(
                {
                  ...w,
                  status: "Open",
                  closed: undefined,
                  reeval: undefined,
                },
                "Status",
                "Gap reopened. Status changed from Closed to Open. The earlier re-evaluation no longer counts.",
                why,
              ),
        ),
      reset: () => {
        write({});
        setTouched({});
      },
    }),
    // `log` and `who` are read from the latest render; the actions only need to refresh when the data or the person changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gapsOf, openOf, get, change, who],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGaps() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useGaps must be used inside GapsProvider");
  return v;
}

/* ------------------------------------------------------------------ member lookup without importing the page layer */

const memberFor = memberById;

/* ------------------------------------------------------------------ numbers for a member's header (all from the results and the work) */

export interface MemberSummary {
  /** Not met and the gap is not closed. */
  open: number;
  pending: number;
  closed: number;
  met: number;
  excluded: number;
  review: number;
  /** Measures the member is counted in for the rate: met + not met. */
  scored: number;
  /** Measures the member is in at all (everything except "Not in this measure"). */
  inMeasures: number;
}
export function summaryOf(
  m: Member,
  gaps: GapView[],
  year: number = MY,
): MemberSummary {
  const r = resultsFor(m, year);
  const states = measures.map((x) => r[x.code].state);
  const count = (s: string) => states.filter((x) => x === s).length;
  const open = gaps.filter((g) => g.status !== "Closed");
  return {
    open: open.length,
    pending: open.filter(
      (g) =>
        g.evidenceStatus === "Requested" || g.evidenceStatus === "Received",
    ).length,
    closed: gaps.filter((g) => g.status === "Closed").length,
    met: count("Met"),
    excluded: count("Excluded"),
    review: count("Review"),
    scored: count("Met") + count("Gap"),
    inMeasures: states.filter((x) => x !== "Not eligible").length,
  };
}

/** When a member's data was last refreshed. Made up per member (the spec has no such date): never after the newest file. */
export const dataRefreshedOf = (m: Member): Date =>
  addDays(NEWEST_FILE, -(hashOf(`${m.id}u`) % 9));
