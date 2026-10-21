// Demo data and rules for partner (SSO) sign-in. Everything is made up and lives in the browser.
// The rules follow the ticket (see README "Assumptions"). The design pages it points to were not available.
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { fmtDate, fmtDateTime } from './data';

/* ------------------------------------------------------------------ types */

export type GroupId = 'administrators' | 'quality' | 'supervisors' | 'viewers';
export interface SonataGroup { id: GroupId; name: string; purpose: string }
/** One partner group linked to one Sonata group. A partner group can have several links, and a Sonata group can be linked from several partner groups. */
export interface Link { partnerGroup: string; groupId: GroupId }
/** A company at the partner. Stored in Sonata as a sub-tenant. */
export interface Company { code: string; name: string; auto?: boolean }
/** Access worked out at the last sign-in. `via` are the partner groups that gave it. */
export interface PartnerAccess { groupId: GroupId; via: string[] }
/** A group an administrator added by hand. The partner's groups never remove it. */
export interface ByHand { groupId: GroupId; by: string; on: string }
export interface Person {
  id: string;
  name: string;
  email: string;
  /** Company code (sub-tenant), or null for someone not placed in a company. */
  company: string | null;
  status: 'Active' | 'Disabled';
  source: 'partner' | 'local';
  firstSeen: string;
  lastSignIn: string;
  /** False until an administrator opens the person's page. Shows a "New" label. */
  reviewed: boolean;
  /** Partner groups sent at the last sign-in. */
  partnerGroups: string[];
  partnerAccess: PartnerAccess[];
  byHand: ByHand[];
  /** Groups an administrator switched off for this person. */
  off: GroupId[];
}
export interface Activity { id: string; at: string; personId: string; text: string }
export interface SentEmail { id: string; at: string; to: { name: string; email: string }[]; subject: string; personId: string; lines: string[] }
export interface State { links: Link[]; companies: Company[]; people: Person[]; activity: Activity[]; emails: SentEmail[]; extraPartnerGroups: string[] }

export interface SignInPayload { name: string; email: string; company: string | null; groups: string[] }
export interface SignInResult {
  personId: string;
  isNew: boolean;
  blocked: boolean;
  companyLabel: string;
  newCompany: boolean;
  granted: PartnerAccess[];
  ended: GroupId[];
  keptByHand: GroupId[];
  noAccess: boolean;
  email: SentEmail | null;
  lines: string[];
}

/* ------------------------------------------------------------------ groups, partner, samples */

export const groups: SonataGroup[] = [
  { id: 'administrators', name: 'Administrators', purpose: 'Manage people, groups and the partner login.' },
  { id: 'quality', name: 'Quality analysts', purpose: 'Work with measure results and member lists for every company.' },
  { id: 'supervisors', name: 'Supervisors', purpose: 'Work with measure results and member lists for their own company.' },
  { id: 'viewers', name: 'Viewers', purpose: 'Look at results and members. Cannot change anything.' },
];
export const groupById = (id: GroupId) => groups.find((g) => g.id === id)!;
export const groupName = (id: GroupId) => groupById(id).name;

export const PARTNER = { customer: 'Northwind Health Partners', provider: 'Microsoft Entra ID' };

export interface Sample { id: string; label: string; what: string; payload: SignInPayload }
/** People the partner could send. Each one shows a different rule. */
export const samples: Sample[] = [
  { id: 'priya', label: 'Priya Raman: new person, company admin', what: 'First time at Sonata. The partner sends CompanyAdmin, so she becomes an Administrator and the tenant administrators get an email.', payload: { name: 'Priya Raman', email: 'priya.raman@aynor.example', company: 'AYN', groups: ['CompanyAdmin', 'AllStaff'] } },
  { id: 'leo', label: 'Leo Okafor: new person, quality team', what: 'First time at Sonata, one linked group.', payload: { name: 'Leo Okafor', email: 'leo.okafor@brookside.example', company: 'BRK', groups: ['QualityTeam'] } },
  { id: 'marcus', label: 'Marcus Webb: partner stopped sending two groups', what: 'Already in Sonata. The partner no longer sends TeamLeads or QualityTeam, so the access they gave ends. Quality analysts was also added by hand, so that one stays.', payload: { name: 'Marcus Webb', email: 'marcus.webb@brookside.example', company: 'BRK', groups: ['AllStaff'] } },
  { id: 'nina', label: 'Nina Alvarez: company code Sonata has not seen', what: 'The company code DLT is new, so Sonata creates a sub-tenant for it and places Nina there.', payload: { name: 'Nina Alvarez', email: 'nina.alvarez@delta.example', company: 'DLT', groups: ['DataAnalysts', 'AllStaff'] } },
  { id: 'omar', label: 'Omar Haddad: no groups sent', what: 'First time at Sonata. The partner sends no groups, so he can sign in but has no access yet.', payload: { name: 'Omar Haddad', email: 'omar.haddad@aynor.example', company: 'AYN', groups: [] } },
  { id: 'tessa', label: 'Tessa Brandt: disabled person', what: 'An administrator disabled Tessa. The partner still signs her in, but Sonata turns her away.', payload: { name: 'Tessa Brandt', email: 'tessa.brandt@cedarvalley.example', company: 'CDR', groups: ['AllStaff', 'TeamLeads'] } },
];

/* ------------------------------------------------------------------ rules */

export function computeAccess(partnerGroups: string[], links: Link[]): PartnerAccess[] {
  const via = new Map<GroupId, string[]>();
  for (const l of links) if (partnerGroups.includes(l.partnerGroup)) via.set(l.groupId, [...(via.get(l.groupId) ?? []), l.partnerGroup]);
  return groups.filter((g) => via.has(g.id)).map((g) => ({ groupId: g.id, via: via.get(g.id)! }));
}

export interface AccessRow { groupId: GroupId; via: string[]; hand?: ByHand; off: boolean }
/** Every group the person has from either source, with its source and whether it is switched off. */
export function accessRows(p: Person): AccessRow[] {
  const rows: AccessRow[] = [];
  for (const g of groups) {
    const partner = p.partnerAccess.find((a) => a.groupId === g.id);
    const hand = p.byHand.find((h) => h.groupId === g.id);
    if (partner || hand) rows.push({ groupId: g.id, via: partner?.via ?? [], hand, off: p.off.includes(g.id) });
  }
  return rows;
}
/** The groups that count right now. A disabled person has none. */
export const effectiveGroups = (p: Person): GroupId[] => (p.status === 'Disabled' ? [] : accessRows(p).filter((r) => !r.off).map((r) => r.groupId));
export const isAdministrator = (p: Person | undefined) => !!p && effectiveGroups(p).includes('administrators');

export const knownPartnerGroups = (s: State) =>
  Array.from(new Set([...s.links.map((l) => l.partnerGroup), ...s.people.flatMap((p) => p.partnerGroups), ...s.extraPartnerGroups])).sort((a, b) => a.localeCompare(b));

export function companyLabel(s: State, code: string | null) {
  if (!code) return 'Not in a company';
  const c = s.companies.find((x) => x.code === code);
  return c?.name ? `${c.name} (${code})` : `${code} (name not set)`;
}
export const companyName = (s: State, code: string | null) => (code ? s.companies.find((x) => x.code === code)?.name || code : 'Not in a company');

export const fmtWhen = (iso: string) => fmtDateTime(new Date(iso));
export const fmtDay = (iso: string) => fmtDate(new Date(iso));

const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
let counter = 0;
const nid = (p: string) => `${p}-${Date.now().toString(36)}-${++counter}`;

/* ------------------------------------------------------------------ seed data */

const seedLinks: Link[] = [
  { partnerGroup: 'CompanyAdmin', groupId: 'administrators' },
  { partnerGroup: 'PlatformAdmin', groupId: 'administrators' },
  { partnerGroup: 'PlatformAdmin', groupId: 'quality' },
  { partnerGroup: 'QualityTeam', groupId: 'quality' },
  { partnerGroup: 'DataAnalysts', groupId: 'quality' },
  { partnerGroup: 'TeamLeads', groupId: 'supervisors' },
  { partnerGroup: 'AllStaff', groupId: 'viewers' },
];

function person(p: Omit<Person, 'partnerAccess' | 'byHand' | 'off' | 'reviewed' | 'source'> & Partial<Pick<Person, 'byHand' | 'off' | 'reviewed' | 'source'>>): Person {
  return { source: 'partner', reviewed: true, byHand: [], off: [], ...p, partnerAccess: computeAccess(p.partnerGroups, seedLinks) };
}

function seed(): State {
  const people: Person[] = [
    { id: 'p-admin', name: 'Admin', email: 'admin@sonata.example', company: null, status: 'Active', source: 'local', firstSeen: '2026-06-01T09:00:00', lastSignIn: new Date().toISOString(), reviewed: true, partnerGroups: [], partnerAccess: [], byHand: [{ groupId: 'administrators', by: 'Sonata setup', on: '2026-06-01T09:00:00' }], off: [] },
    person({ id: 'p-dana', name: 'Dana Lee', email: 'dana.lee@aynor.example', company: 'AYN', status: 'Active', firstSeen: '2026-08-03T10:20:00', lastSignIn: '2026-10-14T09:12:00', partnerGroups: ['CompanyAdmin', 'AllStaff'] }),
    person({ id: 'p-samir', name: 'Samir Patel', email: 'samir.patel@northwind.example', company: null, status: 'Active', firstSeen: '2026-07-21T08:05:00', lastSignIn: '2026-10-15T08:40:00', partnerGroups: ['PlatformAdmin', 'AllStaff'] }),
    person({ id: 'p-marcus', name: 'Marcus Webb', email: 'marcus.webb@brookside.example', company: 'BRK', status: 'Active', firstSeen: '2026-08-19T13:30:00', lastSignIn: '2026-10-13T16:02:00', partnerGroups: ['TeamLeads', 'QualityTeam', 'AllStaff'], byHand: [{ groupId: 'quality', by: 'Dana Lee', on: '2026-09-02T11:15:00' }] }),
    person({ id: 'p-aisha', name: 'Aisha Khan', email: 'aisha.khan@brookside.example', company: 'BRK', status: 'Active', firstSeen: '2026-08-19T13:41:00', lastSignIn: '2026-10-14T14:25:00', partnerGroups: ['QualityTeam', 'DataAnalysts', 'AllStaff'] }),
    person({ id: 'p-tom', name: 'Tom Becker', email: 'tom.becker@cedarvalley.example', company: 'CDR', status: 'Active', firstSeen: '2026-09-10T09:55:00', lastSignIn: '2026-10-12T10:10:00', partnerGroups: ['AllStaff'] }),
    person({ id: 'p-tessa', name: 'Tessa Brandt', email: 'tessa.brandt@cedarvalley.example', company: 'CDR', status: 'Disabled', firstSeen: '2026-08-30T15:00:00', lastSignIn: '2026-09-29T12:45:00', partnerGroups: ['AllStaff', 'TeamLeads'] }),
    person({ id: 'p-julia', name: 'Julia Moreno', email: 'julia.moreno@aynor.example', company: 'AYN', status: 'Active', firstSeen: '2026-09-25T11:00:00', lastSignIn: '2026-10-14T11:30:00', partnerGroups: ['DataAnalysts'], off: ['quality'] }),
    person({ id: 'p-hiro', name: 'Hiro Tanaka', email: 'hiro.tanaka@cedarvalley.example', company: 'CDR', status: 'Active', firstSeen: '2026-10-01T10:00:00', lastSignIn: '2026-10-14T08:20:00', partnerGroups: ['TeamLeads', 'AllStaff'], reviewed: false }),
  ];
  const admins = [people[0], people[1], people[2]].map((p) => ({ name: p.name, email: p.email }));
  const hiro = people[8];
  return {
    links: seedLinks,
    companies: [
      { code: 'AYN', name: 'Aynor Clinic' },
      { code: 'BRK', name: 'Brookside Care' },
      { code: 'CDR', name: 'Cedar Valley Health' },
    ],
    people,
    extraPartnerGroups: [],
    activity: [
      { id: 'a1', at: '2026-10-15T08:40:00', personId: 'p-samir', text: 'Signed in. Partner sent PlatformAdmin, AllStaff.' },
      { id: 'a2', at: '2026-10-14T14:25:00', personId: 'p-aisha', text: 'Signed in. Partner sent QualityTeam, DataAnalysts, AllStaff.' },
      { id: 'a3', at: '2026-10-14T08:20:00', personId: 'p-hiro', text: 'Signed in. Partner sent TeamLeads, AllStaff.' },
      { id: 'a4', at: '2026-10-01T10:05:00', personId: 'p-hiro', text: 'Email sent to Dana Lee, Samir Patel and Admin: new person.' },
      { id: 'a5', at: '2026-10-01T10:00:00', personId: 'p-hiro', text: 'First sign-in through the partner. Company: Cedar Valley Health (CDR). Access: Supervisors (from TeamLeads), Viewers (from AllStaff).' },
      { id: 'a6', at: '2026-09-29T14:00:00', personId: 'p-tessa', text: 'Disabled by Dana Lee.' },
      { id: 'a7', at: '2026-09-26T09:30:00', personId: 'p-julia', text: 'Quality analysts switched off by Dana Lee.' },
      { id: 'a8', at: '2026-09-02T11:15:00', personId: 'p-marcus', text: 'Added to Quality analysts by hand by Dana Lee.' },
    ],
    emails: [
      {
        id: 'e1', at: '2026-10-01T10:05:00', to: admins, subject: 'New person signed in to Sonata: Hiro Tanaka', personId: 'p-hiro',
        lines: emailLines(hiro, 'Cedar Valley Health (CDR)', computeAccess(hiro.partnerGroups, seedLinks), false),
      },
    ],
  };
}

function emailLines(p: Person, company: string, access: PartnerAccess[], newCompany: boolean): string[] {
  return [
    `${p.name} (${p.email}) signed in to Sonata for the first time, through ${PARTNER.customer}.`,
    `Company: ${company}.${newCompany ? ' This company code was new, so Sonata created a sub-tenant for it.' : ''}`,
    access.length
      ? `Access from the partner's groups: ${access.map((a) => `${groupName(a.groupId)} (from ${list(a.via)})`).join('; ')}.`
      : 'No access yet. The partner did not send a group that is linked to a Sonata group.',
    'Open the person’s page to check their access. You can disable the person, or switch off one group.',
  ];
}

/* ------------------------------------------------------------------ partner sign-in */

export function applyPartnerSignIn(state: State, payload: SignInPayload, now: Date): { state: State; result: SignInResult } {
  const at = now.toISOString();
  const activity = [...state.activity];
  const log = (personId: string, text: string) => activity.unshift({ id: nid('a'), at, personId, text });
  const existing = state.people.find((p) => p.email.toLowerCase() === payload.email.toLowerCase());
  const blank: SignInResult = { personId: existing?.id ?? '', isNew: false, blocked: false, companyLabel: '', newCompany: false, granted: [], ended: [], keptByHand: [], noAccess: false, email: null, lines: [] };

  if (existing?.status === 'Disabled') {
    log(existing.id, 'Sign-in turned away: this person is disabled. The partner sent a valid sign-in.');
    return { state: { ...state, activity }, result: { ...blank, blocked: true, companyLabel: companyLabel(state, existing.company), lines: ['The partner confirmed who this is, but Sonata turned the sign-in away because an administrator disabled this person.'] } };
  }

  const code = payload.company?.trim().toUpperCase() || null;
  let companies = state.companies;
  let newCompany = false;
  if (code && !companies.some((c) => c.code === code)) {
    companies = [...companies, { code, name: '', auto: true }];
    newCompany = true;
  }
  const interim: State = { ...state, companies };
  const label = companyLabel(interim, code);
  const access = computeAccess(payload.groups, state.links);
  const sent = payload.groups.length ? payload.groups.join(', ') : 'no groups';
  const lines: string[] = [];

  if (!existing) {
    const id = `p-${payload.email.split('@')[0].replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
    const p: Person = { id, name: payload.name, email: payload.email, company: code, status: 'Active', source: 'partner', firstSeen: at, lastSignIn: at, reviewed: false, partnerGroups: payload.groups, partnerAccess: access, byHand: [], off: [] };
    const admins = state.people.filter((x) => isAdministrator(x));
    const email: SentEmail = { id: nid('e'), at, to: admins.map((a) => ({ name: a.name, email: a.email })), subject: `New person signed in to Sonata: ${p.name}`, personId: id, lines: emailLines(p, label, access, newCompany) };
    if (newCompany) log(id, `New sub-tenant created from company code ${code}. Its name is not set yet.`);
    log(id, `First sign-in through the partner. Partner sent ${sent}. Company: ${label}. Access: ${access.length ? access.map((a) => `${groupName(a.groupId)} (from ${list(a.via)})`).join(', ') : 'none yet'}.`);
    if (admins.length) log(id, `Email sent to ${list(admins.map((a) => a.name))}: new person.`);
    lines.push(`Created ${p.name} and placed them in ${label}${newCompany ? ' (new sub-tenant)' : ''}.`);
    lines.push(access.length ? `Access worked out from the groups sent: ${access.map((a) => groupName(a.groupId)).join(', ')}.` : 'The partner sent no group that is linked to a Sonata group, so they have no access yet.');
    lines.push(admins.length ? `Emailed ${list(admins.map((a) => a.name))} with a link to ${p.name}’s page.` : 'There are no tenant administrators to email.');
    return {
      state: { ...state, companies, people: [...state.people, p], activity, emails: [email, ...state.emails] },
      result: { ...blank, personId: id, isNew: true, companyLabel: label, newCompany, granted: access, noAccess: access.length === 0, email, lines },
    };
  }

  const before = existing.partnerAccess.map((a) => a.groupId);
  const after = access.map((a) => a.groupId);
  const ended = before.filter((g) => !after.includes(g));
  const gained = access.filter((a) => !before.includes(a.groupId));
  const keptByHand = ended.filter((g) => existing.byHand.some((h) => h.groupId === g));
  const lost = ended.filter((g) => !keptByHand.includes(g));
  const stopped = existing.partnerGroups.filter((g) => !payload.groups.includes(g));
  if (newCompany) log(existing.id, `New sub-tenant created from company code ${code}. Its name is not set yet.`);
  if (existing.company !== code) log(existing.id, `Moved to ${label}.`);
  log(existing.id, `Signed in. Partner sent ${sent}.`);
  if (stopped.length) log(existing.id, `Partner stopped sending ${list(stopped)}.`);
  if (lost.length) log(existing.id, `Access ended: ${list(lost.map(groupName))}.`);
  if (keptByHand.length) log(existing.id, `${list(keptByHand.map(groupName))} stays because an administrator added it by hand.`);
  if (gained.length) log(existing.id, `Access added: ${list(gained.map((a) => `${groupName(a.groupId)} (from ${list(a.via)})`))}.`);
  lines.push(`Recognised ${existing.name}. Groups were worked out again from what the partner sent.`);
  if (stopped.length) lines.push(`The partner stopped sending ${list(stopped)}.`);
  if (lost.length) lines.push(`Access ended: ${list(lost.map(groupName))}.`);
  if (keptByHand.length) lines.push(`${list(keptByHand.map(groupName))} stays, because it was added by hand.`);
  if (gained.length) lines.push(`Access added: ${list(gained.map((a) => groupName(a.groupId)))}.`);
  if (!stopped.length && !gained.length) lines.push('Nothing changed in their access.');
  const people = state.people.map((p) => (p.id === existing.id ? { ...p, company: code, lastSignIn: at, partnerGroups: payload.groups, partnerAccess: access } : p));
  return { state: { ...state, companies, people, activity }, result: { ...blank, personId: existing.id, companyLabel: label, newCompany, granted: access, ended: lost, keptByHand, noAccess: false, lines } };
}

/* ------------------------------------------------------------------ store */

const KEY = 'sonata-demo-access-v1';
function read(): State {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as State;
  } catch {
    /* start from the sample data */
  }
  return seed();
}
function write(s: State) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* the demo still works for this visit */
  }
}

interface AccessValue {
  state: State;
  personById: (id: string | undefined) => Person | undefined;
  partnerSignIn: (payload: SignInPayload) => SignInResult;
  setStatus: (id: string, status: Person['status'], by: string) => void;
  setOff: (id: string, groupId: GroupId, off: boolean, by: string) => void;
  addByHand: (id: string, groupId: GroupId, by: string) => void;
  removeByHand: (id: string, groupId: GroupId, by: string) => void;
  addLink: (partnerGroup: string, groupId: GroupId) => void;
  removeLink: (partnerGroup: string, groupId: GroupId) => void;
  renameCompany: (code: string, name: string) => void;
  markReviewed: (id: string) => void;
  reset: () => void;
}
const Ctx = createContext<AccessValue | null>(null);

export function AccessProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(read);
  const ref = useRef(state);
  const commit = useCallback((next: State) => {
    ref.current = next;
    write(next);
    setState(next);
  }, []);

  const value = useMemo<AccessValue>(() => {
    const log = (s: State, personId: string, text: string): Activity[] => [{ id: nid('a'), at: new Date().toISOString(), personId, text }, ...s.activity];
    const patch = (id: string, fn: (p: Person) => Person) => commit({ ...ref.current, people: ref.current.people.map((p) => (p.id === id ? fn(p) : p)) });
    return {
      state: ref.current,
      personById: (id) => ref.current.people.find((p) => p.id === id),
      partnerSignIn: (payload) => {
        const { state: next, result } = applyPartnerSignIn(ref.current, payload, new Date());
        commit(next);
        return result;
      },
      setStatus: (id, status, by) => {
        const s = ref.current;
        commit({ ...s, people: s.people.map((p) => (p.id === id ? { ...p, status } : p)), activity: log(s, id, `${status === 'Disabled' ? 'Disabled' : 'Enabled again'} by ${by}.`) });
      },
      setOff: (id, groupId, off, by) => {
        const s = ref.current;
        commit({ ...s, people: s.people.map((p) => (p.id === id ? { ...p, off: off ? Array.from(new Set([...p.off, groupId])) : p.off.filter((g) => g !== groupId) } : p)), activity: log(s, id, `${groupName(groupId)} switched ${off ? 'off' : 'on'} by ${by}.`) });
      },
      addByHand: (id, groupId, by) => {
        const s = ref.current;
        commit({ ...s, people: s.people.map((p) => (p.id === id ? { ...p, byHand: [...p.byHand, { groupId, by, on: new Date().toISOString() }] } : p)), activity: log(s, id, `Added to ${groupName(groupId)} by hand by ${by}.`) });
      },
      removeByHand: (id, groupId, by) => {
        const s = ref.current;
        commit({ ...s, people: s.people.map((p) => (p.id === id ? { ...p, byHand: p.byHand.filter((h) => h.groupId !== groupId) } : p)), activity: log(s, id, `Hand-added access to ${groupName(groupId)} removed by ${by}.`) });
      },
      addLink: (partnerGroup, groupId) => {
        const s = ref.current;
        if (s.links.some((l) => l.partnerGroup === partnerGroup && l.groupId === groupId)) return;
        commit({ ...s, links: [...s.links, { partnerGroup, groupId }], extraPartnerGroups: Array.from(new Set([...s.extraPartnerGroups, partnerGroup])) });
      },
      removeLink: (partnerGroup, groupId) => commit({ ...ref.current, links: ref.current.links.filter((l) => !(l.partnerGroup === partnerGroup && l.groupId === groupId)) }),
      renameCompany: (code, name) => commit({ ...ref.current, companies: ref.current.companies.map((c) => (c.code === code ? { ...c, name: name.trim() } : c)) }),
      markReviewed: (id) => {
        if (ref.current.people.find((p) => p.id === id)?.reviewed !== false) return;
        patch(id, (p) => ({ ...p, reviewed: true }));
      },
      reset: () => commit(seed()),
    };
    // `state` is listed so consumers re-render when anything changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commit, state]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAccess(): AccessValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAccess must be used inside AccessProvider');
  return v;
}
