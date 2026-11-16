// Version 16 only: richer sample places and clinics for the made-up members. Everything here is sample data.
// Before Version 16 every member lived in one of about six places and almost everyone had the same clinic, so the State, County and
// Clinic columns and filters had little to show. From Version 16 the clinic follows the member's primary care manager and the place follows
// the clinic's region, with the county that matches the city. The stored values on the member are not changed: these helpers choose at call time.
import { NO_PCP, countyOf, hashOf, primaryCareOf, stateName } from "./data";
import type { Member } from "./data";
import { PCMS, pcmOf } from "./v7Data";
import { getVersion } from "./version";

interface Place {
  city: string;
  state: string;
  county: string;
  zip3: string;
}
const P = (city: string, state: string, county: string, zip3: string): Place => ({ city, state, county, zip3 });

/** Five sample clinics. Each serves a region, so a member's place matches the clinic of the member's primary care manager. */
const CLINICS: { name: string; places: Place[] }[] = [
  {
    name: "Sample Springfield Family Clinic",
    places: [P("Springfield", "IL", "Sangamon County", "627"), P("Springfield", "IL", "Sangamon County", "627"), P("Chatham", "IL", "Sangamon County", "627"), P("Decatur", "IL", "Macon County", "625")],
  },
  {
    name: "Sample Peoria Health Center",
    places: [P("Peoria", "IL", "Peoria County", "616"), P("Peoria", "IL", "Peoria County", "616"), P("Bloomington", "IL", "McLean County", "617"), P("Champaign", "IL", "Champaign County", "618")],
  },
  {
    name: "Sample Wabash Valley Medical Group",
    places: [P("Terre Haute", "IN", "Vigo County", "478"), P("Terre Haute", "IN", "Vigo County", "478"), P("Evansville", "IN", "Vanderburgh County", "477"), P("Indianapolis", "IN", "Marion County", "462")],
  },
  {
    name: "Sample Gateway Primary Care",
    places: [P("St. Louis", "MO", "St. Louis City", "631"), P("St. Louis", "MO", "St. Louis City", "631"), P("Columbia", "MO", "Boone County", "652")],
  },
  {
    name: "Sample Quad Cities Clinic",
    places: [P("Davenport", "IA", "Scott County", "528"), P("Davenport", "IA", "Scott County", "528"), P("Des Moines", "IA", "Polk County", "503")],
  },
];
/** Every place used, for the State and County filters. */
const ALL_PLACES = CLINICS.flatMap((c) => c.places);

const v16 = () => getVersion() >= 16;

/**
 * The primary care manager of a member as a person with a name and an NPI. From Version 16 it is the same manager the dashboards and the member
 * header show (see pcmOf); before that it is the provider from the member's file, as it always was.
 */
export function pcmPerson(m: Member): { name: string; npi: string } | undefined {
  if (!v16()) return primaryCareOf(m)?.p;
  const name = pcmOf(m);
  return name === NO_PCP ? undefined : PCMS.find((p) => p.name === name);
}

/** The clinic of a member's primary care manager: manager 1 to clinic 1, and so on around the five. Members with no manager have no clinic. */
function clinicIndex(m: Member): number {
  const i = PCMS.findIndex((p) => p.name === pcmOf(m));
  return i < 0 ? -1 : i % CLINICS.length;
}

export function clinicOf(m: Member): string {
  if (!v16()) return primaryCareOf(m)?.p.org ?? "–";
  if (pcmOf(m) === NO_PCP) return "–";
  const i = clinicIndex(m);
  return i < 0 ? "–" : CLINICS[i].name;
}

/** The place of a member in Version 16 (the clinic's region), or the stored one before. */
function placeOf(m: Member): Place {
  const i = pcmOf(m) === NO_PCP ? -1 : clinicIndex(m);
  const list = i < 0 ? ALL_PLACES : CLINICS[i].places;
  return list[hashOf(`${m.id}-place`) % list.length];
}
export const cityOf = (m: Member) => (v16() ? placeOf(m).city : m.city);
export const stateCodeOf = (m: Member) => (v16() ? placeOf(m).state : m.state);
export const stateNameOf = (m: Member) => (v16() ? stateName(placeOf(m).state) : stateName(m.state));
export const countyOfMember = (m: Member) => (v16() ? placeOf(m).county : countyOf(m));
export const zipOf = (m: Member) => (v16() ? `${placeOf(m).zip3}${m.zip.slice(3)}` : m.zip);

/** The values of the State and County filters. */
export const stateOptions = (stored: string[]) => (v16() ? Array.from(new Set(ALL_PLACES.map((p) => stateName(p.state)))).sort() : stored);
export const countyOptions = (stored: string[]) => (v16() ? Array.from(new Set(ALL_PLACES.map((p) => p.county))).sort() : stored);
