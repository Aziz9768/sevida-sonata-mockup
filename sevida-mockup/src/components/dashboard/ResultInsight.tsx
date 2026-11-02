/**
 * Version 7 placeholder for the story "explanation and recommended action beside each result" (LPP-16073).
 * The words are EXAMPLE TEXT. Where they will come from (AI insights, or fixed text) is not decided yet, so every tile
 * says "Example text". To change the source later, replace exampleInsight() and drop the tag: the layout stays.
 * Drawn the QuickSight way: one tile for the explanation, one tile for the action (on the Overview, a table with two text columns).
 */
export interface InsightInput {
  /** Short measure name, for example "Breast cancer screening". */
  name: string;
  /** Met rate in percent. */
  rate: number;
  /** Members who have not met the measure. */
  gap: number;
  /** Total eligible population. */
  eligible: number;
}

export function exampleInsight(i: InsightInput): { explanation: string; action: string } {
  return {
    explanation: `${i.name} is ${i.rate.toFixed(1)}% met. ${i.gap.toLocaleString("en-US")} of ${i.eligible.toLocaleString("en-US")} eligible members have not met it yet.`,
    action: i.gap
      ? `Start with the ${i.gap.toLocaleString("en-US")} members who have not met it. Open the member list from the Not met bar and reach out to book their visit or test.`
      : "No open care gaps. Keep the nightly runs going and check again after the next run.",
  };
}
