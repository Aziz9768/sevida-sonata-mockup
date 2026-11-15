import { useMemo } from "react";
import type { ReactNode } from "react";
import { Autocomplete, Box, Chip, InputAdornment, TextField as MuiTextField, Typography } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { AutocompleteField, InfoTip, tokens } from "sevida-ui";
import { QsTile } from "../quicksight/kit";
import { closedColor, openColor } from "../quicksight/kitV12";
import { qs } from "../quicksight/qsTheme";
import { ALL } from "../sharedFilters";
import { getVersion } from "../version";
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

/** The Primary Care Manager filter. Version 12 is a plain pick list that also takes typing. Version 13 is the search box below. */
export function PcmFilter({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  if (getVersion() >= 13) return <PcmSearchField value={value} onChange={onChange} />;
  return (
    <Box sx={whiteAll}>
      <AutocompleteField multiple label="Primary Care Manager" placeholder={ALL} options={pcmOptionsV12()} value={value} onChange={onChange} />
    </Box>
  );
}

/**
 * Version 13, Sam: the Primary Care Manager filter did not look like a search. It now shows a magnifier, the hint "Search PCM name or NPI", an "All" choice at the
 * top of the list (it clears the choice), a grey "All" tag while nothing is chosen, and a clear (x) button. Pick several managers if you like.
 * It is the same type-to-search list as the sevida-ui AutocompleteField, with the search icon added.
 */
const PCM_ALL = "__all__";
export function PcmSearchField({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const options = useMemo(() => [{ value: PCM_ALL, label: "All" }, ...pcmOptionsV12()], []);
  const byValue = (v: string) => options.find((o) => o.value === v) ?? { value: v, label: v };
  return (
    <Autocomplete
      multiple
      disableCloseOnSelect
      limitTags={1}
      options={options}
      value={value.map(byValue)}
      onChange={(_, v) => onChange(v.some((o) => o.value === PCM_ALL) ? [] : v.map((o) => o.value))}
      isOptionEqualToValue={(a, b) => a.value === b.value}
      renderOption={(props, o) => (
        <li {...props} key={o.value} style={{ ...props.style, fontWeight: o.value === PCM_ALL ? 700 : undefined }}>
          {o.label}
        </li>
      )}
      sx={{ "& .MuiAutocomplete-clearIndicator": { visibility: "visible" }, "& .MuiInputBase-root": { background: qs.color.primaryBackground } }}
      renderInput={(params) => (
        <MuiTextField
          {...params}
          label="Primary Care Manager"
          placeholder="Search PCM name or NPI"
          InputLabelProps={{ ...params.InputLabelProps, shrink: true }}
          inputProps={{ ...params.inputProps, "aria-label": "Search Primary Care Manager by name or NPI" }}
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <>
                <InputAdornment position="start" sx={{ mr: 0.5 }}>
                  <SearchIcon fontSize="small" />
                </InputAdornment>
                {value.length === 0 && <Chip size="small" label="All" sx={{ mr: 0.5 }} />}
                {params.InputProps.startAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}

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

/** A header box shows its facts side by side: the label on top, the value below, a thin line between facts. A fact moves to the next row only when the box is too narrow. */
export const facts = {
  display: "flex",
  flexWrap: "wrap",
  rowGap: 1,
  "& > div": { whiteSpace: "nowrap", pr: 3 },
  "& > div + div": { borderLeft: qs.tile.border, pl: 3 },
} as const;
export const Fact = ({ label, value }: { label: string; value: string }) => (
  <div>
    <b style={{ display: "block" }}>{label}</b>
    {value}
  </div>
);

/* ------------------------------------------------------------------ KPI tile */

export type Tone = "good" | "bad" | "neutral";
export type Dir = "up" | "down" | "flat";
/** The colour of a tile by what it counts. */
export const GROUP = {
  population: { color: qs.meaning.main, text: qs.meaning.main },
  excluded: { color: qs.meaning.neutral, text: qs.color.secondaryForeground },
  met: { color: qs.meaning.met, text: qs.meaning.met },
  notMet: { color: qs.tone.danger.border, text: qs.tone.danger.border },
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
  extra,
}: {
  /** Version 15: lines under the big number (GSD: why the open gaps are open). */
  extra?: ReactNode;
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
  // Version 13: one light green and one soft red everywhere. The tile stripe uses the chart colours and the numbers and Better / Worse words
  // use the design system's dark green and dark red text, so they stay readable on white. Version 12 keeps the strong green and red.
  const v13 = getVersion() >= 13 && (group === "met" || group === "notMet");
  const g = v13 ? { color: group === "met" ? closedColor() : openColor(), text: group === "met" ? tokens.status.success.dark : tokens.status.danger.dark } : GROUP[group];
  // Version 15 (Sam): Better / Worse arrow, number and word are bold, with a bigger arrow, in the same light green and red as the left border
  // of the tile, as Sam suggested. The light green is only 2 to 1 on white: to confirm with Sam.
  const v15 = getVersion() >= 15;
  const ink = v15
    ? tone === "good"
      ? closedColor()
      : tone === "bad"
        ? openColor()
        : qs.color.secondaryForeground
    : tone === "good" ? (getVersion() >= 13 ? tokens.status.success.dark : qs.meaning.met) : tone === "bad" ? (getVersion() >= 13 ? tokens.status.danger.dark : qs.tone.danger.text) : qs.color.secondaryForeground;
  const word = tone === "good" ? "Better" : tone === "bad" ? "Worse" : "No change";
  const arrow = dir === "up" ? "▲" : dir === "down" ? "▼" : "▬";
  return (
    <QsTile cols={cols} bare>
      <Box aria-hidden="true" sx={{ position: "absolute", left: 0, top: 12, bottom: 12, width: 5, background: g.color, borderRadius: "0 3px 3px 0" }} />
      <Typography sx={{ fontSize: qs.type.visualTitle.size, fontWeight: 700 }}>{title}</Typography>
      <Typography sx={{ fontSize: qs.type.subtitle.size, color: qs.color.mutedText, lineHeight: 1.3, minHeight: aboutMin, whiteSpace: "pre-line" }}>{about}</Typography>
      <Typography sx={{ fontSize: qs.type.kpi.size, fontWeight: qs.type.kpi.weight, lineHeight: 1.25, mt: 0.5, color: g.text }}>{value}</Typography>
      {extra}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.75, flexWrap: "wrap" }}>
        <Typography sx={{ fontSize: qs.type.body.size, color: qs.color.secondaryForeground }}>Prior Month: {prior}</Typography>
        {change !== null && (
          <Typography
            sx={{ fontSize: qs.type.body.size, fontWeight: 700, color: ink, display: "inline-flex", alignItems: "center", gap: 0.5 }}
            title={`${word}: ${change} against the prior month`}
          >
            <span aria-hidden="true" style={{ fontSize: v15 ? 15 : 10 }}>
              {arrow}
            </span>
            {change}
            <Box component="span" sx={{ fontWeight: v15 ? 700 : 400 }}>
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
