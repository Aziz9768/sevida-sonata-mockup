// Version 7 only: the primary care managers shown in the Lucid design (Primary Care Manager filter, Top 10 charts).
// The demo files name only two primary care providers, so Version 7 spreads the members over a longer sample list.
// Versions 4 to 6 keep the original providers. Every name and NPI here is made up.
import { NO_PCP, primaryCareOf } from "./data";
import type { Member } from "./data";

export interface Pcm {
  name: string;
  npi: string;
}

export const PCMS: Pcm[] = [
  { name: "James Mitchell", npi: "1234567893" },
  { name: "Sarah Chen", npi: "9876543210" },
  { name: "Michael Rodriguez", npi: "1112223334" },
  { name: "Patricia Williams", npi: "1445566771" },
  { name: "David Thompson", npi: "1556677882" },
  { name: "Jennifer Martinez", npi: "1667788993" },
  { name: "Robert Anderson", npi: "1778899004" },
  { name: "Lisa Johnson", npi: "1889900115" },
  { name: "Christopher Lee", npi: "1990011226" },
  { name: "Amanda Brown", npi: "1001122337" },
  { name: "Kevin Patel", npi: "1112233448" },
  { name: "Maria Gonzalez", npi: "1223344559" },
];

/** The label of a manager in a control: name and NPI, so a search by either one finds the manager. */
export const pcmLabel = (p: Pcm) => `${p.name} (NPI: ${p.npi})`;
export const pcmByName = (name: string) => PCMS.find((p) => p.name === name);

const hash = (text: string) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
};

/** The manager of one member. Members the files give no primary care provider stay without one. */
export const pcmOf = (m: Member): string => {
  if (!primaryCareOf(m)) return NO_PCP;
  // A weighted pick, so the Top 10 charts have a clear order (some managers carry more members than others).
  const x = hash(`pcm:${m.id}`);
  const weights = [14, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
  const total = weights.reduce((a, b) => a + b, 0);
  let acc = 0;
  for (let i = 0; i < PCMS.length; i++) {
    acc += weights[i] / total;
    if (x < acc) return PCMS[i].name;
  }
  return PCMS[PCMS.length - 1].name;
};
