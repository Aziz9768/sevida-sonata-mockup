// Plain-language explanations used all over the demo, so every short form and number is explained the same way.
import { Term } from 'sevida-ui';
import { DEMO_NOW, dataFiles, fmtDate } from './data';
import type { FileId, MeasureDef } from './data';
import { specFiles } from './spec';

export const tips = {
  counted: 'Members who are in this measure and were not excluded. The rate is worked out from them.',
  met: 'Counted members who did what the measure asks for, for example had a screening in the right time window.',
  notMet: 'Counted members who have not yet done what the measure asks for. These are the members to follow up with.',
  excluded: 'Members who are in the measure but are taken out of the rate for a reason the rules allow, such as hospice care or death.',
  rate: 'Met members divided by counted members.',
  partial: 'A file this measure reads was rejected or has not been sent. The rate may be too low until it arrives.',
  smallGroup: 'Fewer than 10 counted members. One member can move the rate by many points, so read it with care.',
  ses: 'Socioeconomic status. For Medicare members only: whether they get the low-income subsidy (LIS) and whether they first qualified because of disability (OREC).',
  ldm: 'Language Diversity of Membership. A required HEDIS report on which languages members speak and write.',
  ddm: 'Disability Diversity of Membership. A required HEDIS report on how many members have a disability.',
  hedis: 'Healthcare Effectiveness Data and Information Set. The set of quality measures most US health plans report every year, published by NCQA.',
  ecds: 'Electronic Clinical Data Systems. A HEDIS method that uses claims plus clinical data such as EHR records. Measure codes ending in -E use it.',
} as const;

export const Hedis = () => <Term tip={tips.hedis}>HEDIS</Term>;
export const Ecds = () => <Term tip={tips.ecds}>ECDS</Term>;

/** What a measure is, in two lines, for an (i) next to its name. */
export function measureTip(def: MeasureDef): string {
  return `${def.name} (${def.code}). Counts ${def.population.charAt(0).toLowerCase()}${def.population.slice(1)}. Met when: ${def.needs.charAt(0).toLowerCase()}${def.needs.slice(1)}`;
}

/** Plain name of a data file, e.g. "Member demographics". */
export const fileTitle = (id: FileId | string) => specFiles.find((s) => s.id === id)?.category ?? id;

const fmtLong = (x: Date) => fmtDate(x);

/** Plain name of a data file without the format hint in brackets, e.g. "Supplemental pharmacy dispensing". */
export const fileName = (id: FileId | string) => fileTitle(id).replace(/\s*\(.*\)$/, '');

/** When results were last calculated and when the newest file arrived. */
export function freshness() {
  const dates = dataFiles.map((f) => f.receivedOn).filter((x): x is Date => !!x);
  const last = new Date(Math.max(...dates.map((x) => x.getTime())));
  return { calculated: fmtLong(DEMO_NOW), latestFile: fmtLong(last) };
}
