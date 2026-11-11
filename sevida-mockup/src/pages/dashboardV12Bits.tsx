import type { ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import { InfoTip } from "sevida-ui";
import { QsTile } from "../quicksight/kit";
import { qs } from "../quicksight/qsTheme";
import { NO_PCP } from "../data";
import type { MeasureState } from "../data";
import { PCMS, pcmByName } from "../v7Data";

/**
 * Version 12 (Balsamiq board, Analytics - Quality Measures): the pieces the Overview and the measure page share.
 * Version 11 and older keep their own pages (MeasureLucidPage, AnalyticsOverviewV10Page). Nothing here is used by them.
 */

export const n0 = (n: number) => n.toLocaleString("en-US");
export const pct2 = (n: number) => `${n.toFixed(2)}%`;
export const share = (n: number, d: number) => (d ? (n / d) * 100 : 0);

/** "1st Nov, 2026 @ 2:30 PM CST", the way the board writes the run dates. */
export const runStamp = (x: Date) => {
  const d = x.getDate();
  const th = d % 10 === 1 && d !== 11 ? "st" : d % 10 === 2 && d !== 12 ? "nd" : d % 10 === 3 && d !== 13 ? "rd" : "th";
  const h = x.getHours();
  return `${d}${th} ${x.toLocaleString("en-US", { month: "short" })}, ${x.getFullYear()} @ ${h % 12 || 12}:${String(x.getMinutes()).padStart(2, "0")} ${h < 12 ? "AM" : "PM"} CST`;
};

/** A manager the way the board writes it: "James Mitchell - NPI: 1234567893" (no "Dr."). Members without a manager read Unassigned. */
export const pcmText = (name: string) => {
  if (name === NO_PCP) return "Unassigned";
  const p = pcmByName(name);
  return p ? `${p.name} - NPI: ${p.npi}` : name;
};
/** The options of the Primary Care Manager filter. Typing part of a name or an NPI finds the manager. Unassigned is the last choice. */
export const pcmOptionsV12 = () => [
  ...[...PCMS].sort((a, b) => a.name.localeCompare(b.name)).map((p) => ({ value: p.name, label: `${p.name} - NPI: ${p.npi}` })),
  { value: NO_PCP, label: "Unassigned" },
];

/** The five states a member can have for a measure, grouped the way the Population filters use them. */
export const STATES_ELIGIBLE: MeasureState[] = ["Met", "Gap"];

export function Ctl({ children }: { children: ReactNode }) {
  return <Box sx={{ minWidth: 0, position: "relative" }}>{children}</Box>;
}

export const controlsBox = (columns: number) => ({
  display: "grid",
  gap: 2,
  alignItems: "start",
  px: 2,
  py: 2,
  bgcolor: qs.color.secondaryBackground,
  borderBottom: qs.tile.border,
  gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", md: `repeat(${columns}, minmax(0, 1fr))` },
});

export const whiteAll = {
  "& input::placeholder": { color: qs.color.primaryForeground, opacity: 1 },
  "& .MuiInputBase-root": { background: qs.color.primaryBackground },
};

export const boxSx = {
  border: qs.tile.border,
  borderRadius: `${qs.tile.radius}px`,
  bgcolor: qs.color.primaryBackground,
  p: `${qs.tile.padding}px`,
};

/* ------------------------------------------------------------------ KPI tile */

export type Tone = "good" | "bad" | "neutral";
export type Dir = "up" | "down" | "flat";
/** The colour of a tile by what it counts. */
export const GROUP = {
  population: { color: qs.meaning.main, text: qs.meaning.main },
  excluded: { color: qs.meaning.neutral, text: qs.color.secondaryForeground },
  met: { color: qs.meaning.met, text: qs.meaning.met },
  notMet: { color: qs.meaning.gap, text: qs.meaning.gapText },
} as const;
export type Group = keyof typeof GROUP;

/** This run against the last run of the prior completed calendar month. A count changes in %, a rate changes in points. */
export function changeOf(c: number, p: number, kind: "count" | "rate", upIsGood: boolean) {
  if (kind === "count" && !p) return { text: null as string | null, tone: "neutral" as Tone, dir: "flat" as Dir };
  const diff = kind === "count" ? ((c - p) / p) * 100 : c - p;
  const flat = Math.abs(diff) < 0.005;
  const tone: Tone = flat ? "neutral" : diff > 0 === upIsGood ? "good" : "bad";
  return {
    text: kind === "rate" ? `${Math.abs(diff).toFixed(2)} points` : pct2(Math.abs(diff)),
    tone,
    dir: (flat ? "flat" : diff > 0 ? "up" : "down") as Dir,
  };
}

export function KpiTile({
  group,
  title,
  about,
  value,
  prior,
  change,
  dir,
  tone,
  footer,
  cols = 12,
  aboutMin = 48,
}: {
  group: Group;
  title: string;
  about: string;
  value: string;
  prior: string;
  change: string | null;
  dir: Dir;
  tone: Tone;
  footer: string;
  cols?: number;
  /** Room for the description, so tiles in one row line up. */
  aboutMin?: number;
}) {
  const g = GROUP[group];
  const ink = tone === "good" ? qs.meaning.met : tone === "bad" ? qs.tone.danger.text : qs.color.secondaryForeground;
  const word = tone === "good" ? "Better" : tone === "bad" ? "Worse" : "No change";
  const arrow = dir === "up" ? "▲" : dir === "down" ? "▼" : "▬";
  return (
    <QsTile cols={cols} bare>
      <Box aria-hidden="true" sx={{ position: "absolute", left: 0, top: 12, bottom: 12, width: 5, background: g.color, borderRadius: "0 3px 3px 0" }} />
      <Typography sx={{ fontSize: qs.type.visualTitle.size, fontWeight: 700 }}>{title}</Typography>
      <Typography sx={{ fontSize: qs.type.subtitle.size, color: qs.color.mutedText, lineHeight: 1.3, minHeight: aboutMin, whiteSpace: "pre-line" }}>{about}</Typography>
      <Typography sx={{ fontSize: qs.type.kpi.size, fontWeight: qs.type.kpi.weight, lineHeight: 1.25, mt: 0.5, color: g.text }}>{value}</Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.75, flexWrap: "wrap" }}>
        <Typography sx={{ fontSize: qs.type.body.size, color: qs.color.secondaryForeground }}>Prior Month: {prior}</Typography>
        {change !== null && (
          <Typography
            sx={{ fontSize: qs.type.body.size, fontWeight: 700, color: ink, display: "inline-flex", alignItems: "center", gap: 0.5 }}
            title={`${word}: ${change} against the prior month`}
          >
            <span aria-hidden="true" style={{ fontSize: 10 }}>
              {arrow}
            </span>
            {change}
            <Box component="span" sx={{ fontWeight: 400 }}>
              {word}
            </Box>
          </Typography>
        )}
      </Box>
      <Typography sx={{ fontSize: qs.type.small.size, color: qs.color.mutedText, lineHeight: 1.3, mt: 0.75 }}>{footer}</Typography>
    </QsTile>
  );
}

/** A small "i" next to a control title is not on the board, so a control only has its label. This is the tooltip used on chart titles. */
export const Tip = ({ children }: { children: string }) => <InfoTip label={`About ${children.slice(0, 20)}`}>{children}</InfoTip>;
