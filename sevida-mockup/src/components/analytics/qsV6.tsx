// Version 6 Analytics: only what the QuickSight style guide allows. Shared words and small helpers.
import { qs } from "../../quicksight/qsTheme";
import { QsFmt } from "../../quicksight/kit";
import { SMALL_N, STATUS_WORDS } from "../../analyticsRegistry";
import type { DashDef, Status } from "../../analyticsRegistry";

/** One set of words. The tile notes, the control (i) icons and the Help sheet all use these, so a person reads the same thing everywhere. Plain words first, the HEDIS term second. */
export const QS_TIPS: Record<string, { term: string; plain: string; hedis?: string }> = {
  eligible: {
    term: "Eligible Members (n)",
    plain: "Members who belong in this measure this year.",
    hedis: "HEDIS calls them the Initial Population or the Total Eligible Population.",
  },
  met: {
    term: "Met",
    plain: "Had the test, visit or result the measure asks for.",
    hedis: "HEDIS: Numerator compliant.",
  },
  notMet: {
    term: "Not Met",
    plain: "Have not had it yet. Each one is an open care gap.",
    hedis: "HEDIS: Numerator non-compliant.",
  },
  excluded: {
    term: "Excluded",
    plain: "Left out on purpose, for example hospice. Not in the percentage.",
    hedis: "HEDIS: Excluded Population.",
  },
  benchmark: {
    term: "Benchmark",
    plain: "The goal we compare with. Near means within 5 points of it. The values here are demo values.",
    hedis: "In real life: a national percentile from NCQA or the plan's own target.",
  },
  small: {
    term: "Small Group",
    plain: `Fewer than ${SMALL_N} members. One member moves the percentage by many points, so read it with care.`,
  },
  period: {
    term: "Measurement Year",
    plain: "The calendar year the numbers are about, January 1 to December 31 (year to date for the current year).",
    hedis: "HEDIS: Measurement Year.",
  },
  gap: {
    term: "Gap Status",
    plain: "Closed means met. Open means not met yet.",
  },
};

/** Status as a symbol AND a word. QuickSight cannot draw a chip, so it is coloured text with a symbol in front. */
export const STATUS_MARK: Record<Status, string> = {
  meets: "✔",
  near: "!",
  misses: "✖",
};
export const statusText = (s: Status) => `${STATUS_MARK[s]} ${STATUS_WORDS[s]}`;
export const statusColor = (s: Status) =>
  s === "meets" ? qs.meaning.met : qs.meaning.gapText;
export function StatusText({ status }: { status: Status }) {
  return <QsFmt color={statusColor(status)}>{statusText(status)}</QsFmt>;
}

export const directionText = (def: DashDef) =>
  def.higherIsBetter ? "▲ Higher is better" : "▼ Lower is better";

/** "▲ Up 2.1 pts, better". The arrow and the word say it, the colour only helps. */
export function changeText(change: number, better: boolean | null, suffix = "") {
  if (better === null) return `No change${suffix}`;
  return `${change > 0 ? "▲ Up" : "▼ Down"} ${Math.abs(change).toFixed(1)} pts, ${better ? "better" : "worse"}${suffix}`;
}
export function ChangeText({
  change,
  better,
  suffix,
}: {
  change: number;
  better: boolean | null;
  suffix?: string;
}) {
  const t = changeText(change, better, suffix);
  return better === null ? (
    <span>{t}</span>
  ) : (
    <QsFmt color={better ? qs.meaning.met : qs.meaning.gapText}>{t}</QsFmt>
  );
}
