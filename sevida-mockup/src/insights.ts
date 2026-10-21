// Numbers the dashboard and measure pages are built from. Everything here is worked out from the demo members and the demo file statuses.
import { CURRENT_YEAR, DEMO_NOW, NOT_MEDICARE, dataFiles, groupings, members, tally } from './data';
import type { DataFile, FileId, MeasureCode, MeasureDef } from './data';

/** Files a measure reads that are not usable right now. */
export function dataProblems(def: MeasureDef): DataFile[] {
  return dataFiles.filter((f) => def.files.includes(f.id) && (f.status === 'Failed' || f.status === 'Not received'));
}

export const fileIssues = () => dataFiles.filter((f) => f.status === 'Failed' || f.status === 'Not received');

/** Groups with fewer counted members than this are drawn grey and flagged: one member moves their rate a lot. */
export const SMALL_GROUP = 10;

export function groupRates(code: MeasureCode, groupKey: string, year: number = CURRENT_YEAR) {
  const g = groupings.find((x) => x.key === groupKey) ?? groupings[0];
  const names = Array.from(new Set(members.map(g.of))).filter((n) => n !== NOT_MEDICARE);
  return names
    .map((name) => ({ group: name, t: tally(members.filter((m) => g.of(m) === name), code, year) }))
    .filter((r) => r.t.denominator > 0)
    .sort((a, b) => b.t.denominator - a.t.denominator);
}

/** How many members fall in each group, biggest first. Small tail groups are folded into "Others" when `top` is given. */
export function membershipMix(groupKey: string, top = 5) {
  const g = groupings.find((x) => x.key === groupKey) ?? groupings[0];
  const counts = new Map<string, number>();
  for (const m of members) {
    const k = g.of(m);
    if (k === NOT_MEDICARE) continue;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const all = [...counts.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  if (all.length <= top) return all;
  const head = all.slice(0, top - 1);
  return [...head, { label: 'Others', value: all.slice(top - 1).reduce((n, x) => n + x.value, 0) }];
}

/** Link to a measure's member list, optionally already filtered (by status or by a group such as Product line = Commercial). */
export function membersUrl(code: MeasureCode, f: { status?: 'Met' | 'Gap' | 'Excluded' | 'Review'; by?: string; group?: string; year?: number } = {}) {
  const q = new URLSearchParams({ tab: 'members' });
  if (f.year && f.year !== CURRENT_YEAR) q.set('year', String(f.year));
  if (f.status) q.set('status', f.status);
  if (f.by && f.group) {
    q.set('by', f.by);
    q.set('group', f.group);
  }
  return `/measures/${code}?${q.toString()}`;
}

/* ---------------------------------------------------------------- data run (demo numbers worked out from the demo files) */

/** How many days before the file arrived its newest record dates from. Claims arrive weeks after the care. */
const LAG_DAYS: Partial<Record<FileId, number>> = {
  'member-gm': 0, 'member-en': 0, 'member-RES': 0, 'medicare-status': 0, provider: 7,
  claim: 30, 'claim-line': 30, 'pharmacy-claim': 14, 'pharmacy-claim-line': 14,
  'visit-e': 1, diag: 1, proc: 1, obs: 1, lab: 2,
};

/** The newest date a file's data covers, and how far behind today that is. Nothing for a file that is not usable. */
export function freshnessOf(f: DataFile): { through: Date; daysBehind: number } | null {
  if (!f.receivedOn || f.status === 'Failed' || f.status === 'Not received') return null;
  const through = new Date(f.receivedOn.getTime() - (LAG_DAYS[f.id] ?? 0) * 86400000);
  return { through, daysBehind: Math.round((DEMO_NOW.getTime() - through.getTime()) / 86400000) };
}

/** The four steps of the last run: files in, checked, converted, measures calculated. */
export function runStats() {
  const received = dataFiles.filter((f) => f.status !== 'Not received');
  const rowsChecked = received.reduce((n, f) => n + f.rows, 0);
  const rowsRejected = received.filter((f) => f.status === 'Failed').reduce((n, f) => n + f.rows, 0);
  return {
    filesReceived: received.length,
    filesTotal: dataFiles.length,
    rowsChecked,
    rowsRejected,
    fhirResources: rowsChecked - rowsRejected,
    members: members.length,
  };
}

export interface FileMessage { id: string; file: FileId; kind: 'Rejected' | 'Warning' | 'Not received'; rows: number | null; problem: string; example: string }

const EXAMPLES: Partial<Record<FileId, string>> = {
  'pharm-c': 'Vaccine code "XX-99" is not a CVX code',
  'claim-line': 'Place of service is empty',
  'member-RES': 'Race = UNK, Ethnicity = UNK',
  proc: 'Status = "preparation"',
};

/** Everything the checks found, one row per file and kind of problem. */
export function fileMessages(): FileMessage[] {
  return dataFiles.flatMap((f): FileMessage[] => {
    if (f.status === 'Failed') return [{ id: `${f.id}-r`, file: f.id, kind: 'Rejected', rows: f.errors, problem: f.note, example: EXAMPLES[f.id] ?? '–' }];
    if (f.status === 'Not received') return [{ id: `${f.id}-n`, file: f.id, kind: 'Not received', rows: null, problem: f.note, example: '–' }];
    if (f.warnings > 0) return [{ id: `${f.id}-w`, file: f.id, kind: 'Warning', rows: f.warnings, problem: f.note, example: EXAMPLES[f.id] ?? '–' }];
    return [];
  });
}
