// Nightly runs for the demo (FR-105, 108, 206, 209, 510, 705, NFR-08). Everything here is made up, the same every time.
// The real list comes from the pipeline's run log. A run that brought new data is one "version" of the results:
// choosing an older run shows the results as they were then (fewer gaps closed yet, see asOfRun in data.ts).
import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import {
  DEMO_NOW,
  dataFiles,
  fmtDate,
  hashOf,
  members,
  measures,
  getAsOfStep,
  setAsOfStep,
  tally,
} from "./data";
import type { DataFile, FileStatus, MeasureCode } from "./data";
import { fileTitle } from "./copy";
import { reasonFix } from "./dashboardData";

export type RunStatus =
  | "Completed"
  | "Completed with warnings"
  | "No new files"
  | "Failed";

export interface RunFile {
  id: string;
  title: string;
  status: FileStatus;
  rows: number;
  note: string;
  receivedOn?: Date;
}
export interface RunMeasure {
  code: MeasureCode;
  name: string;
  /** Members the measure looked at (eligible, 2026). */
  members: number;
  seconds: number;
  status: "Completed" | "Skipped, no new data" | "Not run";
}
export interface RunProblem {
  reason: string;
  count: number;
  fix: string;
}
export interface Run {
  id: string;
  /** When the run started (every night at 2:00 AM). */
  at: Date;
  end: Date;
  status: RunStatus;
  /** Date of the newest file the results are built from. */
  dataAsOf: Date;
  /** Which version of the results this run shows. 0 = latest. A run with no new files shows the same version as the run before it. */
  step: number;
  /** A failed run publishes no results, so it cannot be chosen. */
  selectable: boolean;
  /** The run whose results this one repeats (no new files). */
  sameAs?: Date;
  /** Set when an administrator started this run again for a failed night: the start time of that night's run. */
  rerunOf?: Date;
  files: RunFile[];
  filesTotal: number;
  rowsIn: number;
  rowsRejected: number;
  problems: RunProblem[];
  measures: RunMeasure[];
  note: string;
}

const nightly = (day: number) => new Date(2026, 9, day, 2, 0);
const FILES_TOTAL = dataFiles.length;

/** Problem reasons by file, so the run page can group them (same words as the Admin problems table). */
const reasonOfFile: Record<string, string> = {
  "member-RES": "Unknown value",
  "claim-line": "Missing required field",
  proc: "Planned, not done",
  "pharm-c": "Code not recognised",
  "member-en": "Code not recognised",
};

interface Plan {
  day: number;
  status: RunStatus;
  /** Version number: goes up with every run that brought new data. */
  step: number;
  asOfDay: number;
  /** Files change from the latest load in these ways. */
  files: (f: DataFile) => RunFile | null;
  note: string;
  sameAsDay?: number;
}

const toFile = (f: DataFile, step: number, over?: Partial<RunFile>): RunFile => ({
  id: f.id,
  title: fileTitle(f.id),
  status: f.status,
  rows:
    f.status === "Not received" ? 0 : Math.round(f.rows * (1 - 0.012 * step)),
  note: f.note,
  receivedOn: f.receivedOn,
  ...over,
});
const clean = (f: DataFile, step: number): RunFile | null =>
  f.status === "Not received"
    ? null
    : toFile(f, step, {
        status: "Accepted",
        note: "All checks passed.",
      });

const plans: Plan[] = [
  {
    day: 16,
    status: "Completed with warnings",
    step: 0,
    asOfDay: 15,
    files: (f) => (f.status === "Not received" ? null : toFile(f, 0)),
    note: "pharm-c.csv was rejected as a whole. The other files were used.",
  },
  {
    day: 15,
    status: "No new files",
    step: 1,
    asOfDay: 13,
    sameAsDay: 14,
    files: () => null,
    note: "No file arrived since the 10/14 run, so nothing was recalculated. The results are the ones of the 10/14 run.",
  },
  {
    day: 14,
    status: "Completed",
    step: 1,
    asOfDay: 13,
    files: (f) => clean(f, 1),
    note: "All files passed their checks.",
  },
  {
    day: 13,
    status: "Failed",
    step: 2,
    asOfDay: 11,
    files: (f) =>
      f.status === "Not received"
        ? null
        : f.id === "member-en"
          ? toFile(f, 2, {
              status: "Failed",
              note: "3 rows have a plan code that is not in the list. The whole file was rejected.",
            })
          : toFile(f, 2, { status: "Accepted", note: "Not processed. The run stopped." }),
    note: "member-en.csv was rejected. Every measure needs enrollment, so the run stopped before any measure was calculated. No results were published.",
  },
  {
    day: 12,
    status: "Completed with warnings",
    step: 2,
    asOfDay: 11,
    files: (f) =>
      f.id === "pharm-c" ? clean(f, 2) : f.status === "Not received" ? null : toFile(f, 2),
    note: "Three files have notes. Every file was used.",
  },
  {
    day: 11,
    status: "Completed",
    step: 3,
    asOfDay: 10,
    files: (f) => clean(f, 3),
    note: "All files passed their checks.",
  },
  {
    day: 10,
    status: "Completed",
    step: 4,
    asOfDay: 9,
    files: (f) => clean(f, 4),
    note: "All files passed their checks.",
  },
];

/** The results version of a run. Failed runs publish nothing: they show what the run before them published. */
const version = (p: Plan) => p.step;

function build(p: Plan): Run {
  const at = nightly(p.day);
  const files = dataFiles
    .map((f) => p.files(f))
    .filter((f): f is RunFile => !!f);
  const rowsIn = files.reduce((n, f) => n + f.rows, 0);
  const failed = files.filter((f) => f.status === "Failed");
  const rowsRejected = failed.reduce((n, f) => n + f.rows, 0);
  const problems: RunProblem[] = files
    .filter((f) => f.status === "Failed" || f.status === "Accepted with warnings")
    .map((f) => {
      const reason = reasonOfFile[f.id] ?? "Missing required field";
      return { reason, count: f.rows, fix: reasonFix[reason] ?? "" };
    });
  const minutes =
    p.status === "Failed" ? 4 : p.status === "No new files" ? 1 : 28 + (hashOf(String(p.day)) % 19);
  const measureRows: RunMeasure[] = measures.map((m) => {
    const status: RunMeasure["status"] =
      p.status === "Failed"
        ? "Not run"
        : p.status === "No new files"
          ? "Skipped, no new data"
          : "Completed";
    const prev = getAsOfStep();
    setAsOfStep(version(p));
    const n = tally(members, m.code).eligible;
    setAsOfStep(prev);
    return {
      code: m.code,
      name: m.name,
      members: status === "Not run" ? 0 : n,
      seconds:
        status === "Completed" ? 20 + (hashOf(`${p.day}${m.code}`) % 70) : 0,
      status,
    };
  });
  return {
    id: `run-${p.day}`,
    at,
    end: new Date(at.getTime() + minutes * 60000),
    status: p.status,
    dataAsOf: new Date(2026, 9, p.asOfDay),
    step: version(p),
    selectable: p.status !== "Failed",
    sameAs: p.sameAsDay ? nightly(p.sameAsDay) : undefined,
    files,
    filesTotal: FILES_TOTAL,
    rowsIn,
    rowsRejected,
    problems,
    measures: measureRows,
    note: p.note,
  };
}

let cached: Run[] | null = null;
/** Newest first. */
export const allRuns = (): Run[] => (cached ??= plans.map(build));

/**
 * A failed night started again (FR-111). It reads the files that are in the drop now (the newest version of the results), so it ends the way
 * the latest good run did, and it becomes the newest run. The real run would take as long as a nightly run; the demo is instant.
 */
export function buildRerun(source: Run, seq: number): Run {
  const t = new Date();
  const at = new Date(
    DEMO_NOW.getFullYear(),
    DEMO_NOW.getMonth(),
    DEMO_NOW.getDate(),
    Math.max(t.getHours(), 18),
    t.getMinutes(),
    seq,
  );
  const base = allRuns().find((r) => r.selectable)!;
  const files = dataFiles
    .map((f) => clean(f, 0))
    .filter((f): f is RunFile => !!f);
  const minutes = 31;
  return {
    id: `rerun-${seq}`,
    at,
    end: new Date(at.getTime() + minutes * 60000),
    status: "Completed",
    dataAsOf: base.dataAsOf,
    step: 0,
    selectable: true,
    rerunOf: source.at,
    files,
    filesTotal: FILES_TOTAL,
    rowsIn: files.reduce((n, f) => n + f.rows, 0),
    rowsRejected: 0,
    problems: [],
    measures: base.measures.map((m) => ({
      ...m,
      status: "Completed" as const,
      seconds: m.seconds || 30,
    })),
    note: `Started again by hand for the night of ${fmtRunTime(source.at)}, which failed. It used the files that are in the drop now. All files passed their checks.`,
  };
}

export const fmtRunTime = (x: Date) =>
  `${fmtDate(x)}, ${x.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
export const runLabel = (r: Run, latest: Run) =>
  `${fmtRunTime(r.at)}${r.rerunOf ? " (re-run)" : ""}${r.id === latest.id ? " (latest)" : ""}`;

/* ------------------------------------------------------------------ the chosen run */

const KEY = "sonata-demo-run";
const readId = (): string | null => {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
};

interface RunValue {
  runs: Run[];
  /** Runs that published results: the ones you can choose. */
  choices: Run[];
  latest: Run;
  run: Run;
  isLatest: boolean;
  setRunId: (id: string) => void;
  /** A failed run that has not been started again yet. */
  canRerun: (r: Run) => boolean;
  /** Start a failed night again. The new run becomes the newest and is shown. */
  rerun: (r: Run) => Run;
}
const Ctx = createContext<RunValue | null>(null);

const RERUN_KEY = "sonata-demo-reruns";
/** The failed nights started again in this visit, by the id of the failed run. */
const readReruns = (): string[] => {
  try {
    return JSON.parse(sessionStorage.getItem(RERUN_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
};

export function RunProvider({ children }: { children: ReactNode }) {
  const [reruns, setReruns] = useState<string[]>(readReruns);
  const base = allRuns();
  const runs = useMemo(
    () => [
      ...reruns
        .map((id, i) => buildRerun(base.find((r) => r.id === id)!, i + 1))
        .reverse(),
      ...base,
    ],
    [reruns, base],
  );
  const choices = runs.filter((r) => r.selectable);
  const latest = choices[0];
  const [id, setId] = useState<string>(() => {
    const saved = readId();
    return choices.some((r) => r.id === saved) ? saved! : latest.id;
  });
  const setRunId = useCallback((next: string) => {
    setId(next);
    try {
      sessionStorage.setItem(KEY, next);
    } catch {
      /* the demo still works for this visit */
    }
  }, []);
  const canRerun = useCallback(
    (r: Run) =>
      r.status === "Failed" && !r.rerunOf && !reruns.includes(r.id),
    [reruns],
  );
  const rerun = useCallback(
    (r: Run) => {
      const next = [...reruns, r.id];
      setReruns(next);
      try {
        sessionStorage.setItem(RERUN_KEY, JSON.stringify(next));
      } catch {
        /* the demo still works for this visit */
      }
      const made = buildRerun(r, next.length);
      setRunId(made.id);
      return made;
    },
    [reruns, setRunId],
  );
  const run = choices.find((r) => r.id === id) ?? latest;
  // Every number on screen follows the chosen run. Set before the pages below render.
  setAsOfStep(run.step);
  const value = useMemo<RunValue>(
    () => ({
      runs,
      choices,
      latest,
      run,
      isLatest: run.id === latest.id,
      setRunId,
      canRerun,
      rerun,
    }),
    [runs, choices, latest, run, setRunId, canRerun, rerun],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRun(): RunValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useRun must be used inside <RunProvider>");
  return v;
}

/** Remounts everything below when another run is chosen, so no page keeps numbers from the run before. */
export function RunKeyed({ children }: { children: ReactNode }) {
  const { run } = useRun();
  return <Fragment key={run.id}>{children}</Fragment>;
}
