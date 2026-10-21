// Checks an uploaded CSV against the spec tab of its file type. Runs in the browser; nothing is sent anywhere.
import type { SpecField, SpecFile } from './spec';

export interface Issue {
  severity: 'Error' | 'Warning';
  /** Row number in the file (the header is row 1). 0 = about the whole file. */
  row: number;
  column: string;
  problem: string;
  value: string;
}
export interface CheckResult { rows: number; columns: number; issues: Issue[]; errors: number; warnings: number }

/** Small CSV reader: comma-delimited, double quotes, doubled quotes inside quotes, CR/LF. */
export function parseCsv(text: string): string[][] {
  const t = text.replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"') {
        if (t[i + 1] === '"') { cell += '"'; i++; } else q = false;
      } else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((x) => x !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x !== '')) rows.push(row);
  return rows;
}

const validDate = (v: string) => {
  if (!/^\d{8}$/.test(v)) return false;
  const y = +v.slice(0, 4), m = +v.slice(4, 6), d = +v.slice(6, 8);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
};
const isDateField = (f: SpecField) => f.format === 'YYYYMMDD';
const placeholders = new Set(['null', 'na', 'n/a', 'none', 'nan']);

export function checkCsv(spec: SpecFile, text: string): CheckResult {
  const issues: Issue[] = [];
  const add = (severity: Issue['severity'], row: number, column: string, problem: string, value = '') => issues.push({ severity, row, column, problem, value });
  const rows = parseCsv(text);
  if (rows.length === 0) {
    add('Error', 0, '', 'The file is empty.');
    return { rows: 0, columns: 0, issues, errors: 1, warnings: 0 };
  }
  const header = rows[0].map((h) => h.trim());
  const data = rows.slice(1);
  const names = spec.fields.map((f) => f.name);
  const index = new Map<string, number>();
  header.forEach((h, i) => index.set(h, i));

  // header
  for (const f of spec.fields) if (!index.has(f.name) && f.required === 'Yes') add('Error', 1, f.name, 'Required column is missing.');
  const skipped = spec.fields.filter((f) => !index.has(f.name) && f.required !== 'Yes');
  if (skipped.length > 0) add('Warning', 1, '', `${skipped.length} optional or conditional column${skipped.length > 1 ? 's are' : ' is'} not in the file (${skipped.slice(0, 3).map((f) => f.name).join(', ')}${skipped.length > 3 ? ', …' : ''}).`);
  for (const h of header) if (h && !names.includes(h)) add('Warning', 1, h, 'This column is not in the spec and will be ignored.');
  const present = names.filter((n) => index.has(n));
  const orderOk = present.every((n, i) => header.filter((h) => names.includes(h))[i] === n);
  if (!orderOk) add('Warning', 1, '', 'Columns are not in the order listed in the spec.');

  const seen = new Map<string, number>();
  const idColumn = spec.id === 'member-gm' ? 'Member ID' : spec.id === 'claim' || spec.id === 'pharmacy-claim' ? 'Claim ID' : spec.id === 'provider' ? 'Provider ID' : null;

  data.forEach((r, k) => {
    const row = k + 2;
    if (r.length !== header.length) add('Error', row, '', `Row has ${r.length} values but the header has ${header.length} columns.`);
    const get = (name: string) => (index.has(name) ? (r[index.get(name)!] ?? '').trim() : '');
    for (const f of spec.fields) {
      if (!index.has(f.name)) continue;
      const v = get(f.name);
      if (v === '') {
        if (f.required === 'Yes') add('Error', row, f.name, 'Required value is empty.');
        else if (f.required === 'Conditional') {
          const m = /Required when ([^.]+?) is sent/i.exec(f.explanation);
          if (m && get(m[1].trim()) !== '') add('Error', row, f.name, `Required because ${m[1].trim()} is sent.`);
        }
        continue;
      }
      if (placeholders.has(v.toLowerCase())) add('Warning', row, f.name, 'Leave the field empty instead of sending a placeholder.', v);
      if (isDateField(f) && !validDate(v)) add('Error', row, f.name, 'Date must be a real date written as YYYYMMDD.', v);
      else if (f.values.length > 0 && !f.open && !f.values.some((x) => x.code === v)) add('Error', row, f.name, `Not an accepted code. Allowed: ${f.values.slice(0, 6).map((x) => x.code).join(', ')}${f.values.length > 6 ? ', …' : ''}`, v);
      if (f.name.endsWith('NPI') && !/^\d{10}$/.test(v)) add('Error', row, f.name, 'NPI must be 10 digits.', v);
    }
    if (idColumn && index.has(idColumn)) {
      const id = get(idColumn);
      if (id) {
        if (seen.has(id)) add('Error', row, idColumn, `Duplicate ${idColumn} (first seen on row ${seen.get(id)}).`, id);
        else seen.set(id, row);
      }
    }
    // a few rules written in the spec's "Rules" section
    const pair = (a: string, b: string, text: string) => {
      const x = get(a), y = get(b);
      if (validDate(x) && validDate(y) && x > y) add('Error', row, b, text, y);
    };
    if (spec.id === 'claim') {
      pair('Statement From Date', 'Statement To Date', 'Statement To Date is before Statement From Date.');
      pair('Admission Date', 'Discharge Date', 'Discharge Date is before Admission Date.');
      if (get('Claim Type') === 'I' && get('Type of Bill') === '') add('Error', row, 'Type of Bill', 'Required on institutional claims (Claim Type = I).');
    }
    if (spec.id === 'member-en') pair('Start Date', 'Disenrollment Date', 'Disenrollment Date is before Start Date.');
    if (spec.id === 'medicare-status') pair('Start Date', 'End Date', 'End Date is before Start Date.');
    if (spec.id === 'claim-line') pair('Service From Date', 'Service To Date', 'Service To Date is before Service From Date.');
  });

  const errors = issues.filter((i) => i.severity === 'Error').length;
  return { rows: data.length, columns: header.length, issues, errors, warnings: issues.length - errors };
}

/** Takes the spec's own sample file and breaks it on purpose, so the demo has something to catch. */
export function sampleWithMistakes(spec: SpecFile): string {
  const rows = parseCsv(spec.sampleCsv);
  if (rows.length < 3) return spec.sampleCsv;
  const col = (pred: (f: SpecField) => boolean, from = 0) => spec.fields.findIndex((f, i) => i >= from && pred(f));
  const q = (c: string) => (/[",]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c);
  const coded = col((f) => f.values.length > 1 && !f.open && f.required === 'Yes');
  const dated = col((f) => f.format === 'YYYYMMDD' && f.required === 'Yes');
  const reqd = col((f, ) => f.required === 'Yes' && f.values.length === 0 && f.format !== 'YYYYMMDD', 1);
  if (coded >= 0) rows[1][coded] = 'ZZ';
  if (dated >= 0) rows[2][dated] = '2026-13-45';
  if (reqd >= 0 && rows[3]) rows[3][reqd] = '';
  if (rows.length > 4) rows.push([...rows[4]]); // a repeated row (duplicate ID for files that need unique IDs)
  rows[0].push('Notes');
  rows.slice(1).forEach((r) => r.push(''));
  return rows.map((r) => r.map(q).join(',')).join('\n');
}
