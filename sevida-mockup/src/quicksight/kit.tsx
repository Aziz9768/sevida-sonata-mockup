import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Box, Slider, Typography } from "@mui/material";
import { InfoTip, StatusChip, titleCase } from "sevida-ui";
import { qs } from "./qsTheme";
import { getVersion } from "../version";

/* ------------------------------------------------------------------ notes layer (mockup only, not part of QuickSight) */

/** Switches for the review notes drawn on tiles: which requirement a tile answers, and which question for the QuickSight developers it depends on. */
export const NotesContext = createContext({ fr: true, ask: true });

/** The questions in the audit, in short. Shown when you hover an "Ask" tag. */
export const QUESTIONS: Record<string, string> = {
  Q1: "Is there an Apply button for the controls?",
  Q2: "Can some visuals ignore the controls (the Whole population box)?",
  Q3: "Can a KPI tile start a click action, or must it be a clickable column chart?",
  Q4: "Can a single-choice dropdown have an All value?",
  Q5: "Does the dashboard export list the applied filters?",
  Q6: "Can one chart be exported as an image?",
  Q7: "Can viewers show or hide table columns?",
  Q8: "Can the trend switch granularity and compare with last year from controls?",
  Q9: "Can Last updated and Next update come from data?",
  Q10: "One sheet per measure, or one sheet with a Measure control?",
  Q11: "How do long axis names and a second label line behave?",
  Q12: "Is a bar of about 20 controls acceptable?",
  Q13: "Can a member name open the Sonata member page by link?",
  Q14: "How many rows can the table hold and export?",
  Q15: "Is Source Sans Pro the font we can set for the whole dashboard?",
  Q16: "Can the dashboard show different members to different roles (row-level security)? The checklist says the rule is unknown.",
  Q17: "Can the date range of the trend be limited by the granularity?",
  Q18: "Do text boxes support text colour and a highlight colour?",
  Q19: "Where does the benchmark value come from (a data field or a fixed number), and can a bar chart draw it as a dashed line?",
  Q20: "What is an artifact, and how is it different from a file or a row? Until Madigan says, the cards show rows.",
  Q21: "Can hovering Last updated show the source files? A hover tooltip is not a QuickSight option on a text box, so the files are listed in the box.",
  Q35: "Version 9 puts Timeframe and Top N inside their chart tiles and the suggested focus in a collapsible box. In QuickSight a control normally lives in the controls bar, and a text box cannot collapse. Can a control sit on top of its visual (free-form layout), and can a text box collapse? If not, the controls go back to the controls bar and the focus text stays open.",
  Q22: "Can a trend point be marked as in progress (last 90 days)? The table marks it with an asterisk.",
  Q23: "Can a KPI turn red when it passes a threshold that comes from data (rejection threshold)?",
  Q24: "Do KPI tiles support a hover note that says where the number comes from?",
  Q25: "QuickSight combines different controls with AND. Choices inside one control are OR. Is that enough for the AND / OR need?",
  Q26: "Do we receive appointment data from Madigan? Without it there is no appointment status to filter on.",
  Q29: "Do all Madigan files arrive on the same schedule? Next expected assumes one file every night.",
  Q30: "Showing or hiding a tile by a filter value works only in free-form layout. Is free-form acceptable for the notice boxes?",
  Q28: "Can a control follow the viewer across sheets (cross-sheet control)? If not, a choice made on one sheet still filters the others and a note says so.",
  Q27: "Will Madigan send a member-to-PCP file with from and to dates? Today the provider comes from the claims.",
  Q31: "Can a KPI tile or a table cell show a symbol AND a word (for example ✔ Meets benchmark) from a calculated field, so status never depends on colour alone?",
  Q32: "Can the embed hide its own Filter button and filter pane, so the only filters are the controls bar?",
  Q33: "Can a controls bar choice be kept in the page address, so Copy link keeps the filters (parameters passed to the embed)?",
  Q34: "Can a table show all its rows at full height (no scroll bar inside the tile), or must it page? Below how many rows?",
};

function Notes({ fr, ask }: { fr?: string; ask?: string[] }) {
  const n = useContext(NotesContext);
  if ((!fr || !n.fr) && (!ask?.length || !n.ask)) return null;
  return (
    <Box
      sx={{
        position: "absolute",
        top: -11,
        right: 8,
        display: "flex",
        gap: 0.5,
        zIndex: 1,
      }}
    >
      {n.fr && fr && (
        <StatusChip
          tone="neutral"
          label={`FR-${fr}`}
          tip="Requirement this tile answers"
        />
      )}
      {n.ask &&
        ask?.map((q) => (
          <StatusChip
            key={q}
            tone="warning"
            label={`Ask ${q}`}
            tip={QUESTIONS[q] ?? q}
          />
        ))}
    </Box>
  );
}

/* ------------------------------------------------------------------ frame: toolbar, sheet tabs, sheet */

/** What QuickSight draws around every dashboard. The toolbar and the tab strip are QuickSight's own, so only colours follow our theme. */
export function QsFrame({
  tabs,
  active,
  onTab,
  onReset,
  children,
}: {
  tabs: string[];
  active: string;
  onTab: (t: string) => void;
  onReset: () => void;
  children: ReactNode;
}) {
  return (
    <Box
      sx={{
        fontFamily: qs.font,
        color: qs.color.primaryForeground,
        border: qs.tile.border,
        borderRadius: `${qs.tile.radius}px`,
        overflow: "hidden",
        bgcolor: qs.color.secondaryBackground,
        "&& *": { fontFamily: "inherit" },
        // Control titles are Normal weight (guide 03). The field labels of the component library default to 500.
        "& .MuiFormLabel-root": { fontWeight: 400 },
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 2,
          px: 2,
          py: 0.75,
          bgcolor: qs.color.primaryBackground,
          borderBottom: qs.tile.border,
          fontSize: 13,
        }}
      >
        <Box
          component="button"
          type="button"
          onClick={onReset}
          title="QuickSight's own Reset: goes back to the default choices"
          sx={toolbarBtn}
        >
          Reset
        </Box>
        <ExportMenu />
        {["Bookmarks", "Share"].map((t) => (
          <Box
            key={t}
            component="span"
            title="QuickSight's own toolbar. We cannot style it."
            sx={{ ...toolbarBtn, color: qs.color.mutedText, cursor: "default" }}
          >
            {t}
          </Box>
        ))}
      </Box>
      <Box
        role="tablist"
        sx={{
          display: "flex",
          gap: 3,
          px: 2,
          bgcolor: qs.color.primaryBackground,
          borderBottom: qs.tile.border,
          overflowX: "auto",
        }}
      >
        {tabs.map((t) => (
          <Box
            key={t}
            role="tab"
            aria-selected={t === active}
            tabIndex={0}
            onClick={() => onTab(t)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onTab(t)}
            sx={{
              py: 1.25,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: t === active ? 700 : 400,
              borderBottom: `3px solid ${t === active ? qs.color.accent : "transparent"}`,
              color:
                t === active ? qs.color.accent : qs.color.secondaryForeground,
              whiteSpace: "nowrap",
            }}
          >
            {titleCase(t)}
          </Box>
        ))}
      </Box>
      {children}
    </Box>
  );
}
/** QuickSight's own Export menu: the whole dashboard goes to PDF. One chart to an image is not offered (Q6). Tables export to CSV from their own menu. */
function ExportMenu() {
  const [open, setOpen] = useState(false);
  return (
    <Box sx={{ position: "relative" }}>
      <Box
        component="button"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        onBlur={(e: React.FocusEvent) => {
          if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node))
            setOpen(false);
        }}
        sx={toolbarBtn}
      >
        Export
      </Box>
      {open && (
        <Box
          role="menu"
          sx={{
            position: "absolute",
            right: 0,
            top: "100%",
            mt: 0.5,
            zIndex: 20,
            minWidth: 250,
            bgcolor: qs.color.primaryBackground,
            border: qs.tile.border,
            borderRadius: "4px",
            py: 0.5,
            fontSize: 13,
          }}
        >
          <Box
            component="button"
            type="button"
            role="menuitem"
            onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
            onClick={() => {
              setOpen(false);
              window.print();
            }}
            sx={{ ...menuItem, color: qs.color.primaryForeground }}
          >
            Export to PDF (whole dashboard)
          </Box>
          <Box
            role="menuitem"
            aria-disabled="true"
            title="Q6: one chart as an image is not offered"
            sx={{ ...menuItem, color: qs.color.mutedText, cursor: "default" }}
          >
            Export to image: not available
          </Box>
          <Box
            sx={{
              px: 1.5,
              py: 0.75,
              color: qs.color.mutedText,
              borderTop: qs.tile.border,
              mt: 0.5,
            }}
          >
            A table exports to CSV from the link under it. In this mockup the
            PDF uses the browser print window.
          </Box>
        </Box>
      )}
    </Box>
  );
}
const menuItem = {
  display: "block",
  width: "100%",
  textAlign: "left",
  background: "none",
  border: 0,
  px: 1.5,
  py: 0.75,
  cursor: "pointer",
  fontSize: 13,
} as const;
const toolbarBtn = {
  background: "none",
  border: 0,
  p: 0,
  color: qs.color.accent,
  cursor: "pointer",
  fontSize: 13,
} as const;

/* ------------------------------------------------------------------ controls bar (12-column grid, a control is at most 6 columns) */

export function QsControlsBar({
  children,
  fr,
  ask,
}: {
  children: ReactNode;
  fr?: string;
  ask?: string[];
}) {
  const [open, setOpen] = useState(true);
  return (
    <Box
      sx={{
        position: "relative",
        bgcolor: qs.color.secondaryBackground,
        borderBottom: qs.tile.border,
        px: 2,
        pt: 1,
        pb: open ? 2 : 1,
      }}
    >
      <Notes fr={fr} ask={ask} />
      <Box
        component="button"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        sx={{
          background: "none",
          border: 0,
          p: 0,
          cursor: "pointer",
          color: qs.color.secondaryForeground,
          fontSize: 13,
          fontWeight: 700,
          mb: open ? 1 : 0,
        }}
      >
        {open ? "▾" : "▸"} Controls
      </Box>
      {open && (
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
              md: `repeat(${qs.controlColumns}, minmax(0, 1fr))`,
            },
            alignItems: "start",
          }}
        >
          {children}
        </Box>
      )}
    </Box>
  );
}

/** One control in the controls bar. `cols` is 3 by default (four per row) and 6 at most. */
export function QsControl({
  cols = 3,
  info,
  showInfo,
  children,
}: {
  cols?: 3 | 6;
  /** The info icon QuickSight allows next to a control title. */
  info?: string;
  /** Version 8: the Lucid chart keeps the info icon on the Member Details filters (Population, Tricare ID, Member Name) only. */
  showInfo?: boolean;
  children: ReactNode;
}) {
  return (
    <Box
      sx={{
        gridColumn: { md: `span ${cols}` },
        minWidth: 0,
        position: "relative",
      }}
    >
      {children}
      {/* Version 8: no info icon on a control. The Quick Sight guide shows only a name, a show-title switch and a title size for a control. */}
      {info && (getVersion() < 8 || showInfo) && (
        <Box sx={{ position: "absolute", top: 0, right: 0, zIndex: 2 }}>
          <InfoTip label={`About ${info.slice(0, 20)}`}>{info}</InfoTip>
        </Box>
      )}
    </Box>
  );
}

/** Slider control (numeric range), for Age. */
export function QsRangeSlider({
  label,
  min,
  max,
  from,
  to,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  from: number | null;
  to: number | null;
  /** null = no limit on that side. */
  onChange: (from: number | null, to: number | null) => void;
}) {
  const lo = from ?? min;
  const hi = to ?? max;
  return (
    <Box>
      <Typography
        sx={{
          fontSize: 14,
          fontWeight: 400,
          color: qs.color.secondaryForeground,
        }}
      >
        {titleCase(label)}
      </Typography>
      <Typography sx={{ fontSize: 13, color: qs.color.mutedText }}>
        {lo} to {hi}
      </Typography>
      <Slider
        size="small"
        min={min}
        max={max}
        value={[lo, hi]}
        onChange={(_, v) => {
          const [a, b] = v as number[];
          onChange(a <= min ? null : a, b >= max ? null : b);
        }}
        getAriaLabel={(i) => `${label} ${i === 0 ? "from" : "to"}`}
        sx={{ color: qs.color.accent, mx: 0.5, width: "calc(100% - 8px)" }}
      />
    </Box>
  );
}

/* ------------------------------------------------------------------ sheet: 36-column grid of tiles */

export function QsSheet({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: "grid",
        gap: `${qs.gap}px`,
        p: `${qs.gap}px`,
        gridTemplateColumns: {
          xs: "1fr",
          md: `repeat(${qs.columns}, minmax(0, 1fr))`,
        },
        alignItems: "stretch",
      }}
    >
      {children}
    </Box>
  );
}

/** A tile. `cols` is its width on the 36-column grid, `rows` how many rows it spans. */
export function QsTile({
  cols,
  rows,
  title,
  subtitle,
  fr,
  ask,
  tone,
  bare,
  plain,
  review,
  action,
  children,
}: {
  cols: number;
  rows?: number;
  title?: string;
  subtitle?: ReactNode;
  fr?: string;
  ask?: string[];
  /** A coloured tile, set per tile (QuickSight allows a background and border colour on each tile). */
  tone?: "danger" | "warning" | "info" | "highlight";
  /** No title row (text boxes and KPI tiles carry their own). */
  bare?: boolean;
  /** A text box as Quick Sight draws it: text on the sheet, with no card, border or padding (the text box has no format settings). */
  plain?: boolean;
  /** A note for reviewers, not part of the dashboard: it goes away with the "Questions for developers" switch. */
  review?: boolean;
  /** Version 9: a control that belongs to this visual (for example Timeframe), drawn at the right of the title row. */
  action?: ReactNode;
  children: ReactNode;
}) {
  const n = useContext(NotesContext);
  if (review && !n.ask) return null;
  const t = tone && tone !== "highlight" ? qs.tone[tone] : null;
  return (
    <Box
      sx={{
        gridColumn: { xs: "auto", md: `span ${cols}` },
        gridRow: rows ? { md: `span ${rows}` } : undefined,
        position: "relative",
        minWidth: 0,
        bgcolor: plain
          ? "transparent"
          : t
            ? t.bg
            : tone === "highlight"
              ? qs.tone.info.bg
              : qs.color.primaryBackground,
        border: plain ? "none" : t ? `1px solid ${t.border}` : qs.tile.border,
        color: t ? t.text : undefined,
        borderRadius: `${qs.tile.radius}px`,
        p: plain ? "2px 4px" : `${qs.tile.padding}px`,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Notes fr={fr} ask={ask} />
      {!bare && title && (
        <Box sx={{ mb: 1.25, pr: 9, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
          <Box sx={{ flex: "1 1 320px", minWidth: 0 }}>
            <Typography
              component="h3"
              sx={{
                m: 0,
                fontSize: qs.type.visualTitle.size,
                fontWeight: qs.type.visualTitle.weight,
                lineHeight: 1.3,
              }}
            >
              {titleCase(title)}
            </Typography>
            {subtitle && (
              <Typography
                sx={{
                  fontSize: qs.type.subtitle.size,
                  color: t ? "inherit" : qs.color.mutedText,
                  mt: 0.25,
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
          {action && <Box sx={{ flex: "0 0 auto", width: 170 }}>{action}</Box>}
        </Box>
      )}
      <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
    </Box>
  );
}

/* ------------------------------------------------------------------ visuals */

/** KPI visual, classic layout: title, one big value, an optional second line. */
export function QsKpi({
  cols,
  label,
  value,
  sub,
  tip,
  fr,
  ask,
  highlight,
  color,
  changes,
  compare,
  qs8,
}: {
  cols: number;
  label: string;
  value: string;
  sub?: string;
  tip?: string;
  fr?: string;
  ask?: string[];
  highlight?: boolean;
  color?: string;
  /** Version 7 (Lucid design): "vs previous" lines under the number. Tone good or bad colours the change, and the arrow and sign say the same in words. */
  changes?: { prefix: string; before: string; change: string; tone: "good" | "bad" | "neutral" }[];
  /** Version 7: small bars that compare the current figure with an earlier one. Each shows its number and percent. */
  compare?: { label: string; value: number; shown: string; note?: string }[];
  /** Version 8: drawn as Quick Sight draws it. One KPI visual with one comparison, and a separate bar chart visual under it. */
  qs8?: boolean;
}) {
  const bars = compare ?? [];
  const barMax = Math.max(1, ...bars.map((b) => b.value));
  const barColors = [qs.meaning.main, qs.color.accent, qs.meaning.neutral];
  return (
    <QsTile
      cols={cols}
      bare
      fr={fr}
      ask={ask}
      tone={highlight ? "highlight" : undefined}
    >
      <Typography
        sx={{
          fontSize: qs.type.visualTitle.size,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          pr: 0,
        }}
      >
        {label}
      </Typography>
      {tip && (
        <Typography
          sx={{
            fontSize: qs.type.subtitle.size,
            color: qs.color.mutedText,
            lineHeight: 1.3,
            pr: 2,
          }}
        >
          {tip}
        </Typography>
      )}
      <Typography
        sx={{
          fontSize: qs.type.kpi.size,
          fontWeight: qs.type.kpi.weight,
          lineHeight: 1.25,
          color: color ?? "inherit",
        }}
      >
        {value}
      </Typography>
      {sub && (
        <Typography
          sx={{ fontSize: qs.type.subtitle.size, color: qs.color.mutedText }}
        >
          {sub}
        </Typography>
      )}
      {(qs8 ? changes?.slice(0, 1) : changes)?.map((c) => (
        <Typography
          key={c.prefix}
          sx={{ fontSize: qs.type.subtitle.size, color: qs.color.mutedText }}
        >
          {c.prefix} {c.before}{" "}
          <Box
            component="span"
            sx={{
              fontWeight: 700,
              color:
                c.tone === "good"
                  ? qs.meaning.met
                  : c.tone === "bad"
                    ? qs.tone.danger.text
                    : qs.color.secondaryForeground,
            }}
          >
            ({c.change})
          </Box>
        </Typography>
      ))}
      {bars.length > 0 && qs8 && (
        // A separate bar chart visual, laid over the KPI: category names at the left, a data label to the right of each bar.
        <Box
          sx={{ mt: 1, pt: 1, borderTop: `1px dashed ${qs.color.border}`, display: "grid", gap: 0.75 }}
          role="img"
          aria-label={`${label}: ${bars.map((b) => `${b.label} ${b.shown}${b.note ? ` ${b.note}` : ""}`).join(", ")}`}
        >
          {bars.map((b, i) => (
            <Box key={b.label} sx={{ display: "grid", gridTemplateColumns: "minmax(78px, 42%) minmax(0, 1fr)", alignItems: "center", gap: 1 }}>
              <Typography sx={{ fontSize: qs.type.small.size, color: qs.color.secondaryForeground, lineHeight: 1.25, textAlign: "right" }}>
                {b.label}
                {b.note && (
                  <Box component="span" sx={{ display: "block", color: qs.color.mutedText }}>
                    {b.note}
                  </Box>
                )}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0 }}>
                <Box
                  sx={{
                    width: `${Math.max(3, (b.value / barMax) * 62)}%`,
                    height: 16,
                    flex: "none",
                    background: barColors[i % barColors.length],
                  }}
                />
                <Typography sx={{ fontSize: qs.type.small.size, whiteSpace: "nowrap" }}>{b.shown}</Typography>
              </Box>
            </Box>
          ))}
        </Box>
      )}
      {bars.length > 0 && !qs8 && (
        <Box sx={{ mt: 1, display: "grid", gap: 0.5 }} role="img" aria-label={`${label}: ${bars.map((b) => `${b.label} ${b.shown}`).join(", ")}`}>
          {bars.map((b, i) => (
            <Box
              key={b.label}
              sx={{
                display: "grid",
                gridTemplateColumns: "64px minmax(0, 1fr)",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Typography sx={{ fontSize: qs.type.small.size, color: qs.color.secondaryForeground }}>
                {b.label}
              </Typography>
              <Box
                sx={{
                  width: `${Math.max(4, (b.value / barMax) * 100)}%`,
                  minWidth: "fit-content",
                  background: barColors[i % barColors.length],
                  color: qs.color.accentForeground,
                  fontSize: qs.type.small.size,
                  px: 0.75,
                  py: 0.25,
                  whiteSpace: "nowrap",
                }}
              >
                {b.shown}
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </QsTile>
  );
}

export interface QsBar {
  label: string;
  value: number;
  /** Shown in the tooltip, not under the name (QuickSight has one line under a bar). */
  detail?: string;
  /** Fixed colour for this value (QuickSight allows a colour per value). */
  color?: string;
}

function useWidth(): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(480);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(Math.max(200, el.clientWidth)));
    ro.observe(el);
    setW(Math.max(200, el.clientWidth));
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/**
 * Column chart: square bars, one colour (or a fixed colour per value), data labels with the number formats of the guide,
 * dashed reference line, tooltip on each bar. A click on a bar can filter another visual.
 */
export function QsColumnChart({
  bars,
  max = 100,
  unit = "%",
  decimals = 1,
  height = 220,
  label,
  onSelect,
  empty = "No data",
  reference,
}: {
  bars: QsBar[];
  max?: number;
  unit?: string;
  decimals?: number;
  height?: number;
  label: string;
  onSelect?: (b: QsBar) => void;
  empty?: string;
  /** A dashed reference line across the bars (for example the benchmark). */
  reference?: { value: number; label: string };
}) {
  const [ref, W] = useWidth();
  const padL = 36,
    padR = 8,
    padT = 22,
    padB = 30;
  const slot = (W - padL - padR) / Math.max(1, bars.length);
  const bw = Math.min(56, slot * 0.6);
  const ih = height - padT - padB;
  const y = (v: number) =>
    padT + ih - (Math.max(0, Math.min(max, v)) / max) * ih;
  const perChar = 6.2;
  const cut = (t: string) => {
    const n = Math.max(4, Math.floor((slot - 4) / perChar));
    return t.length > n ? t.slice(0, n - 1) + "…" : t;
  };
  const fmt = (v: number) =>
    `${v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${unit}`;
  return (
    <Box ref={ref} aria-label={label} role="group">
      {bars.length === 0 ? (
        <Typography
          sx={{
            fontSize: 13,
            color: qs.color.mutedText,
            py: 4,
            textAlign: "center",
          }}
        >
          {empty}
        </Typography>
      ) : (
        <svg
          width={W}
          height={height}
          style={{ display: "block", maxWidth: "100%" }}
        >
          {[0, max / 2, max].map((t) => (
            <g key={t}>
              <line
                x1={padL}
                x2={W - padR}
                y1={y(t)}
                y2={y(t)}
                stroke={qs.color.border}
              />
              <text
                x={padL - 6}
                y={y(t) + 4}
                textAnchor="end"
                fontSize={11}
                fill={qs.color.mutedText}
              >
                {Math.round(t)}
              </text>
            </g>
          ))}
          {bars.map((b, i) => {
            const cx = padL + slot * i + slot / 2;
            const tip = `${b.label}: ${fmt(b.value)}${b.detail ? ` (${b.detail})` : ""}`;
            const interactive = !!onSelect;
            return (
              <g
                key={b.label}
                {...(interactive
                  ? {
                      role: "button",
                      tabIndex: 0,
                      "aria-label": tip,
                      style: { cursor: "pointer" },
                      onClick: () => onSelect!(b),
                      onKeyDown: (e: React.KeyboardEvent) =>
                        (e.key === "Enter" || e.key === " ") && onSelect!(b),
                    }
                  : {})}
              >
                <title>{tip}</title>
                {interactive && (
                  <rect
                    x={cx - slot / 2}
                    y={padT}
                    width={slot}
                    height={ih + padB}
                    fill="transparent"
                  />
                )}
                <rect
                  x={cx - bw / 2}
                  y={y(b.value)}
                  width={bw}
                  height={Math.max(1, padT + ih - y(b.value))}
                  fill={b.color ?? qs.meaning.main}
                />
                <text
                  x={cx}
                  y={y(b.value) - 6}
                  textAnchor="middle"
                  fontSize={12}
                  fontWeight={700}
                  fill={qs.color.primaryForeground}
                  {...(reference ? { stroke: "#fff", strokeWidth: 3, paintOrder: "stroke" } : {})}
                >
                  {fmt(b.value)}
                </text>
                <text
                  x={cx}
                  y={height - 10}
                  textAnchor="middle"
                  fontSize={12}
                  fill={qs.color.secondaryForeground}
                >
                  {cut(b.label)}
                </text>
              </g>
            );
          })}
          {reference && (
            <g>
              <title>{`${reference.label}: ${fmt(reference.value)}`}</title>
              <line
                x1={padL}
                x2={W - padR}
                y1={y(reference.value)}
                y2={y(reference.value)}
                stroke={qs.color.primaryForeground}
                strokeWidth={1.5}
                strokeDasharray="4 3"
              />
              {reference.label && (
              <text
                x={W - padR}
                y={y(reference.value) - 4}
                textAnchor="end"
                fontSize={11}
                fontWeight={700}
                fill={qs.color.primaryForeground}
              >
                {reference.label} {fmt(reference.value)}
              </text>
              )}
            </g>
          )}
        </svg>
      )}
    </Box>
  );
}

/**
 * Horizontal bar chart: names on the left, square bars, the value of each bar in a column on the right,
 * and an optional dashed reference line (the benchmark) with its value above the bars. Hover a bar for the counts.
 */
export function QsBarChart({
  bars,
  max = 100,
  benchmark,
  benchmarkLabel = "Benchmark",
  label,
  empty = "No data",
  labelWidth,
  valueWidth,
  wrap,
}: {
  bars: QsBar[];
  max?: number;
  benchmark?: number;
  benchmarkLabel?: string;
  label: string;
  empty?: string;
  /** Room for the names on the left, in px, when they are long. */
  labelWidth?: number;
  /** Room for the value and its note on the right, in px. */
  valueWidth?: number;
  /** Show the whole name: widen the name column to fit the longest name (up to 42% of the width) and wrap what is still too long onto 2 or 3 lines. Nothing is cut with "…". */
  wrap?: boolean;
}) {
  const [ref, W] = useWidth();
  const CH = 6.4; // average width of one character at 12 px
  const widest = Math.max(0, ...bars.map((b) => b.label.length)) * CH + 10;
  const wrapLabelW = Math.round(Math.min(W * 0.42, Math.max(56, widest)));
  const wrapAt = Math.max(6, Math.floor((wrapLabelW - 6) / CH));
  const lines = (t: string): string[] => {
    const out: string[] = [];
    let cur = "";
    for (const w of t.split(" ")) {
      if (cur && (cur + " " + w).length > wrapAt) {
        out.push(cur);
        cur = w;
      } else cur = cur ? cur + " " + w : w;
    }
    if (cur) out.push(cur);
    return out;
  };
  const maxLines = wrap ? Math.min(3, Math.max(1, ...bars.map((b) => lines(b.label).length))) : 1;
  const rowH = maxLines > 1 ? 14 * maxLines + 14 : 30,
    padT = benchmark === undefined ? 6 : 26,
    padB = 22,
    labelW = wrap ? wrapLabelW : (labelWidth ?? Math.min(170, Math.max(90, W * 0.32))),
    valueW = valueWidth ?? 118,
    gap = 8;
  const plotW = Math.max(60, W - labelW - valueW - gap * 2);
  const x0 = labelW + gap;
  const x = (v: number) => x0 + (Math.max(0, Math.min(max, v)) / max) * plotW;
  const H = padT + bars.length * rowH + padB;
  const cut = (t: string) => {
    const n = Math.max(6, Math.floor((labelW - 4) / 6.2));
    return t.length > n ? t.slice(0, n - 1) + "…" : t;
  };
  const fmt = (v: number) => `${v.toFixed(1)}%`;
  return (
    <Box ref={ref} aria-label={label} role="group">
      {bars.length === 0 ? (
        <Typography
          sx={{
            fontSize: 13,
            color: qs.color.mutedText,
            py: 4,
            textAlign: "center",
          }}
        >
          {empty}
        </Typography>
      ) : (
        <svg
          width={W}
          height={H}
          style={{ display: "block", maxWidth: "100%" }}
        >
          {[0, max / 2, max].map((t) => (
            <g key={t}>
              <line
                x1={x(t)}
                x2={x(t)}
                y1={padT}
                y2={padT + bars.length * rowH}
                stroke={qs.color.border}
              />
              <text
                x={x(t)}
                y={H - 6}
                textAnchor="middle"
                fontSize={11}
                fill={qs.color.mutedText}
              >
                {Math.round(t)}
              </text>
            </g>
          ))}
          {bars.map((b, i) => {
            const y = padT + i * rowH;
            const tip = `${b.label}: ${fmt(b.value)}${b.detail ? ` (${b.detail})` : ""}`;
            return (
              <g key={b.label}>
                <title>{tip}</title>
                <text
                  x={labelW}
                  y={y + rowH / 2 + 4}
                  textAnchor="end"
                  fontSize={12}
                  fill={qs.color.secondaryForeground}
                >
                  {wrap
                    ? lines(b.label)
                        .slice(0, 3)
                        .map((ln, k, all) => (
                          <tspan
                            key={k}
                            x={labelW}
                            dy={k === 0 ? -((all.length - 1) * 6.5) : 13}
                          >
                            {ln}
                          </tspan>
                        ))
                    : cut(b.label)}
                </text>
                <rect
                  x={x0}
                  y={y + 5}
                  width={Math.max(1, x(b.value) - x0)}
                  height={rowH - 10}
                  fill={b.color ?? qs.meaning.main}
                />
                <text
                  x={W - valueW + gap}
                  y={y + rowH / 2 + 4}
                  fontSize={12}
                  fontWeight={700}
                  fill={qs.color.primaryForeground}
                >
                  {fmt(b.value)}
                  {b.detail && (
                    <tspan
                      fontWeight={400}
                      fill={qs.color.mutedText}
                      dx={6}
                      fontSize={11}
                    >
                      {b.detail}
                    </tspan>
                  )}
                </text>
              </g>
            );
          })}
          {benchmark !== undefined && (
            <g>
              <title>{`${benchmarkLabel}: ${fmt(benchmark)}`}</title>
              <line
                x1={x(benchmark)}
                x2={x(benchmark)}
                y1={padT - 4}
                y2={padT + bars.length * rowH}
                stroke={qs.color.primaryForeground}
                strokeWidth={1.5}
                strokeDasharray="4 3"
              />
              <text
                x={x(benchmark)}
                y={12}
                textAnchor="middle"
                fontSize={11}
                fontWeight={700}
                fill={qs.color.primaryForeground}
              >
                {benchmarkLabel} {fmt(benchmark)}
              </text>
            </g>
          )}
        </svg>
      )}
    </Box>
  );
}

/* ------------------------------------------------------------------ table visual */

export interface QsCol<T> {
  key: string;
  header: string;
  /** Plain value used for sorting. */
  value: (r: T) => string | number;
  /** What is drawn in the cell. Plain value by default. Conditional formatting goes here (colour the text). */
  render?: (r: T) => ReactNode;
  align?: "left" | "right";
  nowrap?: boolean;
}

/** Table visual: bold header, alternate row colour, first column pinned, click a header to sort, scrolls inside the tile. */
/** Counts get a comma separator and no decimals (guide 06). */
const plain = (v: string | number) =>
  typeof v === "number" && Number.isInteger(v) ? v.toLocaleString("en-US") : v;

/** QuickSight's own visual menu (the three dots on every tile). Here it only offers Export to CSV. Not styleable. */
function VisualMenu({ onCsv }: { onCsv: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Box
      sx={{ position: "relative", display: "flex", justifyContent: "flex-end" }}
      onBlur={(e: React.FocusEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <Box
        component="button"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Visual menu"
        title="QuickSight's own visual menu. We cannot style it."
        onClick={() => setOpen(!open)}
        sx={{ ...toolbarBtn, color: qs.color.mutedText, fontSize: 16, px: 0.5 }}
      >
        ⋯
      </Box>
      {open && (
        <Box
          role="menu"
          sx={{
            position: "absolute",
            right: 0,
            top: "100%",
            zIndex: 20,
            minWidth: 160,
            bgcolor: qs.color.primaryBackground,
            border: qs.tile.border,
            borderRadius: "4px",
            py: 0.5,
          }}
        >
          <Box
            component="button"
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onCsv();
            }}
            sx={{ ...menuItem, color: qs.color.primaryForeground }}
          >
            Export to CSV
          </Box>
        </Box>
      )}
    </Box>
  );
}

export function QsTable<T>({
  cols,
  rows,
  rowKey,
  maxHeight = 360,
  label,
  defaultSort,
  exportFile,
  onRowSelect,
  wrapHeaders,
  selectedKey,
}: {
  cols: QsCol<T>[];
  rows: T[];
  rowKey: (r: T) => string;
  maxHeight?: number;
  label: string;
  defaultSort?: { key: string; dir: "asc" | "desc" };
  /** File name for "Export to CSV" in the visual menu (QuickSight exports every visual to CSV). */
  exportFile?: string;
  /** A click on a row is a click action from a data point (the only kind of click action the guide allows). */
  onRowSelect?: (r: T) => void;
  /** Let column headings wrap onto two lines so a wide table fits without a sideways scroll bar. */
  wrapHeaders?: boolean;
  /** The row that is selected (Version 7: the member whose explanation shows below). It is tinted and announced as selected. */
  selectedKey?: string;
}) {
  const [sort, setSort] = useState(defaultSort);
  const sorted = (() => {
    if (!sort) return rows;
    const c = cols.find((x) => x.key === sort.key);
    if (!c) return rows;
    const k = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = c.value(a);
      const y = c.value(b);
      return (
        k *
        (typeof x === "number" && typeof y === "number"
          ? x - y
          : String(x).localeCompare(String(y)))
      );
    });
  })();
  const exportCsv = () => {
    const text = (r: T, c: QsCol<T>) => {
      const x = c.render ? c.render(r) : undefined;
      return String(
        typeof x === "string" || typeof x === "number" ? x : c.value(r),
      );
    };
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = [cols.map((c) => esc(c.header)).join(",")]
      .concat(sorted.map((r) => cols.map((c) => esc(text(r, c))).join(",")))
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `${exportFile}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const cell = {
    px: 1.25,
    py: 0.75,
    fontSize: qs.type.body.size,
    borderBottom: qs.tile.border,
    textAlign: "left" as const,
    verticalAlign: "top" as const,
  };
  return (
    <>
      {exportFile && <VisualMenu onCsv={exportCsv} />}
      <Box
        sx={{
          maxHeight,
          overflow: "auto",
          border: qs.tile.border,
          borderRadius: "4px",
        }}
      >
        <Box
          component="table"
          aria-label={label}
          sx={{ borderCollapse: "separate", borderSpacing: 0, width: "100%" }}
        >
          <thead>
            <tr>
              {cols.map((c, i) => (
                <Box
                  component="th"
                  key={c.key}
                  scope="col"
                  aria-sort={
                    sort?.key === c.key
                      ? sort.dir === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                  onClick={() =>
                    setSort(
                      sort?.key === c.key && sort.dir === "asc"
                        ? { key: c.key, dir: "desc" }
                        : { key: c.key, dir: "asc" },
                    )
                  }
                  sx={{
                    ...cell,
                    position: "sticky",
                    top: 0,
                    left: i === 0 ? 0 : undefined,
                    zIndex: i === 0 ? 3 : 2,
                    bgcolor: qs.color.secondaryBackground,
                    fontWeight: 700,
                    cursor: "pointer",
                    whiteSpace: wrapHeaders ? "normal" : "nowrap",
                    textAlign: c.align ?? "left",
                    userSelect: "none",
                  }}
                >
                  {titleCase(c.header)}
                  {sort?.key === c.key
                    ? sort.dir === "asc"
                      ? " ▲"
                      : " ▼"
                    : ""}
                </Box>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, ri) => (
              <tr
                key={rowKey(r)}
                onClick={onRowSelect ? () => onRowSelect(r) : undefined}
                onKeyDown={
                  onRowSelect
                    ? (e) => {
                        if (e.key === "Enter") onRowSelect(r);
                      }
                    : undefined
                }
                tabIndex={onRowSelect ? 0 : undefined}
                aria-selected={selectedKey !== undefined ? rowKey(r) === selectedKey : undefined}
                style={onRowSelect ? { cursor: "pointer" } : undefined}
              >
                {cols.map((c, i) => (
                  <Box
                    component="td"
                    key={c.key}
                    sx={{
                      ...cell,
                      bgcolor:
                        selectedKey !== undefined && rowKey(r) === selectedKey
                          ? qs.tone.info.bg
                          : ri % 2
                            ? qs.color.secondaryBackground
                            : qs.color.primaryBackground,
                      fontWeight: selectedKey !== undefined && rowKey(r) === selectedKey ? 700 : undefined,
                      position: i === 0 ? "sticky" : undefined,
                      left: i === 0 ? 0 : undefined,
                      textAlign: c.align ?? "left",
                      whiteSpace: c.nowrap ? "nowrap" : undefined,
                    }}
                  >
                    {c.render ? c.render(r) : plain(c.value(r))}
                  </Box>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <Box
                  component="td"
                  colSpan={cols.length}
                  sx={{ ...cell, color: qs.color.mutedText }}
                >
                  No data
                </Box>
              </tr>
            )}
          </tbody>
        </Box>
      </Box>
    </>
  );
}

/** Text box: rich text with bold and bullet lists only. */
export function QsText({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        fontSize: qs.type.body.size,
        lineHeight: 1.5,
        "& ul": { m: 0, pl: 2.5 },
        "& p": { m: 0, mb: 1 },
        "& p:last-child": { mb: 0 },
      }}
    >
      {children}
    </Box>
  );
}

/** Conditional formatting on a cell: coloured, bold text (QuickSight has no chips). */
export function QsFmt({
  color,
  children,
}: {
  color: string;
  children: ReactNode;
}) {
  return <span style={{ color, fontWeight: 700 }}>{children}</span>;
}

/* ============================================================ Version 7: Open and Closed gap charts (Lucid design) */

/** Open gaps and closed gaps. Closed is the blue and open the orange, two colours that stay apart for people with red-green colour blindness. Every segment also carries its number, and the legend names both. */
export const QS_OPEN = qs.meaning.gap;
export const QS_CLOSED = qs.color.accent;
const onOpen = qs.color.primaryForeground;
const onClosed = qs.color.accentForeground;

/** Words wrapped to at most `lines` lines of `maxChars` characters. The last line is never cut with "…". */
function wrapWords(text: string, maxChars: number, lines = 3): string[] {
  const out: string[] = [];
  let cur = "";
  for (const w of text.split(" ")) {
    if (cur && (cur + " " + w).length > maxChars) {
      out.push(cur);
      cur = w;
    } else cur = cur ? cur + " " + w : w;
  }
  if (cur) out.push(cur);
  if (out.length > lines) {
    const head = out.slice(0, lines - 1);
    return [...head, out.slice(lines - 1).join(" ")];
  }
  return out;
}

/** The top of an axis that has four equal steps of a round size (for example 0, 20, 40, 60, 80). */
const niceMax = (v: number) => {
  const need = Math.max(1, v) / 4;
  const pow = Math.pow(10, Math.floor(Math.log10(need)));
  for (const m of [1, 2, 3, 4, 5, 6, 8, 10]) if (m * pow >= need) return Math.max(4, 4 * m * pow);
  return 40 * pow;
};

export function QsLegend({ items }: { items: { label: string; color: string; line?: boolean }[] }) {
  return (
    <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 1 }} aria-label="Legend" role="group">
      {items.map((i) => (
        <Box key={i.label} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Box
            sx={
              i.line
                ? { width: 16, height: 0, borderTop: `3px solid ${i.color}` }
                : { width: 12, height: 12, background: i.color }
            }
          />
          <Typography sx={{ fontSize: qs.type.subtitle.size, color: qs.color.secondaryForeground }}>{i.label}</Typography>
        </Box>
      ))}
    </Box>
  );
}

export interface QsGapTrendRow {
  label: string;
  closed: number;
  open: number;
  /** Compliance rate, 0 to 100, or null when nobody is counted. */
  rate: number | null;
  /** True for the last, unfinished month. */
  partial?: boolean;
}

/**
 * Stacked columns of closed and open gaps for each period, with the compliance rate as a line (right-hand axis, 0 to 100%).
 * The number of members and the percent of the period sit inside each segment when there is room. Hover a period for all four figures.
 */
export function QsGapTrend({
  rows,
  height = 420,
  label,
  qs8,
  xTitle = "Month",
}: {
  rows: QsGapTrendRow[];
  height?: number;
  label: string;
  qs8?: boolean;
  /** Version 8 (Lucid chart): the name under the x axis ("Month"). The y axis reads "Member Count (count)". */
  xTitle?: string;
}) {
  const [ref, W] = useWidth();
  const padL = 46, padR = 46, padT = 14, padB = qs8 ? 56 : 44;
  const n = rows.length;
  const slot = (W - padL - padR) / Math.max(1, n);
  const bw = Math.min(56, slot * 0.72);
  const ih = height - padT - padB;
  const max = niceMax(Math.max(1, ...rows.map((r) => r.closed + r.open)));
  const y = (v: number) => padT + ih - (v / max) * ih;
  const yr = (v: number) => padT + ih - (v / 100) * ih;
  const every = Math.max(1, Math.ceil((qs8 ? 58 : 40) / Math.max(1, slot)));
  const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1)}%` : "0.0%");
  const line = rows
    .map((r, i) => (r.rate === null ? null : `${padL + slot * i + slot / 2},${yr(r.rate)}`))
    .filter(Boolean)
    .join(" ");
  const lastIdx = (() => {
    for (let i = rows.length - 1; i >= 0; i--) if (rows[i].rate !== null) return i;
    return -1;
  })();
  return (
    <Box ref={ref} aria-label={label} role="group">
      <QsLegend
        items={[
          { label: "Open Gaps", color: QS_OPEN },
          { label: "Closed Gaps", color: QS_CLOSED },
          { label: "Compliance Rate", color: qs.meaning.main, line: true },
        ]}
      />
      {n === 0 ? (
        <Typography sx={{ fontSize: 13, color: qs.color.mutedText, py: 4, textAlign: "center" }}>No data</Typography>
      ) : (
        <svg width={W} height={height} style={{ display: "block", maxWidth: "100%" }}>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t}>
              <line x1={padL} x2={W - padR} y1={y(max * t)} y2={y(max * t)} stroke={qs.color.border} />
              <text x={padL - 6} y={y(max * t) + 4} textAnchor="end" fontSize={11} fill={qs.color.mutedText}>
                {Math.round(max * t)}
              </text>
              <text x={W - padR + 6} y={yr(100 * t) + 4} textAnchor="start" fontSize={11} fill={qs.color.mutedText}>
                {Math.round(100 * t)}%
              </text>
            </g>
          ))}
          <text x={12} y={padT + ih / 2} fontSize={11} fill={qs.color.mutedText} transform={`rotate(-90 12 ${padT + ih / 2})`} textAnchor="middle">
            {qs8 ? "Member Count (count)" : "Members"}
          </text>
          {qs8 && (
            <text x={padL + (W - padL - padR) / 2} y={height - 6} fontSize={11} fill={qs.color.mutedText} textAnchor="middle">
              {xTitle}
            </text>
          )}
          {rows.map((r, i) => {
            const cx = padL + slot * i + slot / 2;
            const total = r.closed + r.open;
            const hC = (r.closed / max) * ih;
            const hO = (r.open / max) * ih;
            const tip = `${r.label}${r.partial ? " (month to date)" : ""}: Closed ${r.closed} (${pct(r.closed, total)}), Open ${r.open} (${pct(r.open, total)}), Compliance rate ${r.rate === null ? "none" : r.rate.toFixed(1) + "%"}`;
            const seg = (h: number, v: number, top: number, fg: string, atTop = false) => {
              // Version 8 follows the Lucid chart: the count and the percent sit in each segment (Quick Sight may show one value per label).
              const can = bw >= 30 && h >= 30;
              const one = bw >= 22 && h >= 14;
              if (!v || !(can || one)) return null;
              // The open segment is labelled near its top, so the compliance line and its value do not sit on the number.
              const ty = atTop && can ? top + 16 : top + h / 2 + (can ? -2 : 4);
              return (
                <text x={cx} y={ty} textAnchor="middle" fontSize={11} fontWeight={700} fill={fg}>
                  <tspan x={cx}>{v}</tspan>
                  {can && (
                    <tspan x={cx} dy={13} fontWeight={400}>
                      {pct(v, total)}
                    </tspan>
                  )}
                </text>
              );
            };
            return (
              <g key={`${r.label}-${i}`}>
                <title>{tip}</title>
                <rect x={cx - slot / 2} y={padT} width={slot} height={ih + padB} fill="transparent" />
                {r.closed > 0 && <rect x={cx - bw / 2} y={y(0) - hC} width={bw} height={hC} fill={QS_CLOSED} stroke={qs.color.primaryBackground} strokeWidth={1} />}
                {r.open > 0 && <rect x={cx - bw / 2} y={y(0) - hC - hO} width={bw} height={hO} fill={QS_OPEN} stroke={qs.color.primaryBackground} strokeWidth={1} />}
                {seg(hC, r.closed, y(0) - hC, onClosed)}
                {seg(hO, r.open, y(0) - hC - hO, onOpen, true)}
                {i % every === 0 && (
                  <text x={cx} y={height - (qs8 ? 30 : 24)} textAnchor="middle" fontSize={11} fill={qs.color.secondaryForeground}>
                    {r.label}
                    {r.partial ? " *" : ""}
                  </text>
                )}
              </g>
            );
          })}
          <polyline points={line} fill="none" stroke={qs.meaning.main} strokeWidth={2} />
          {rows.map((r, i) =>
            r.rate === null ? null : (
              <circle key={i} cx={padL + slot * i + slot / 2} cy={yr(r.rate)} r={3.5} fill={qs.meaning.main} stroke={qs.color.primaryBackground} strokeWidth={2} />
            ),
          )}
          {qs8
            ? rows.map((r, i) =>
                r.rate === null ? null : (
                  // Version 8: the line is labelled on every point, above it. A combo chart has no Line ends label.
                  <text key={i} x={padL + slot * i + slot / 2} y={yr(r.rate) - 9} textAnchor="middle" fontSize={10} fill={qs.color.primaryForeground}>
                    {r.rate.toFixed(0)}%
                  </text>
                ),
              )
            : lastIdx >= 0 &&
              rows[lastIdx].rate !== null && (
                <text
                  x={padL + slot * lastIdx + slot / 2}
                  y={yr(rows[lastIdx].rate!) - 9}
                  textAnchor="middle"
                  fontSize={12}
                  fontWeight={700}
                  fill={qs.color.primaryForeground}
                  stroke="#fff"
                  strokeWidth={3}
                  paintOrder="stroke"
                >
                  {rows[lastIdx].rate!.toFixed(1)}%
                </text>
              )}
          {!qs8 && (
            <text x={padL} y={height - 4} fontSize={11} fill={qs.color.mutedText}>
              {rows.some((r) => r.partial) ? "Each bar is the month end. * Month to date." : "Each bar is the end of the period."}
            </text>
          )}
        </svg>
      )}
    </Box>
  );
}

export interface QsGapRow {
  label: string;
  open: number;
  closed: number;
  /** Text in the right-hand column, for example "72.0% closed". */
  note?: string;
}

/**
 * Horizontal stacked bars of open and closed gaps, one row per name. `first` is the segment drawn next to the names, so a chart that ranks
 * by open gaps starts with open. Names wrap onto up to three lines and are never cut. Each segment carries its number when it is wide enough.
 */
export function QsGapBars({
  rows,
  first = "open",
  label,
  empty = "Nobody is eligible for these filters",
  noteWidth = 0,
  totals,
}: {
  rows: QsGapRow[];
  first?: "open" | "closed";
  label: string;
  empty?: string;
  noteWidth?: number;
  /** Version 8: the Show totals label at the end of each bar (a bar chart cannot hold a text column, so the note is in the tooltip only). */
  totals?: boolean;
}) {
  const [ref, W] = useWidth();
  const CH = 6.4;
  const widest = Math.max(0, ...rows.map((r) => r.label.length)) * CH + 10;
  const labelW = Math.round(Math.min(W * 0.4, Math.max(70, widest)));
  const wrapAt = Math.max(8, Math.floor((labelW - 6) / CH));
  const padL = labelW + 6, padR = 12 + (totals ? 34 : noteWidth), padT = 4, padB = 26;
  const lineH = 14;
  const laid = rows.map((r) => ({ r, lines: wrapWords(r.label, wrapAt) }));
  const rowH = (l: string[]) => Math.max(30, l.length * lineH + 12);
  let acc = padT;
  const tops = laid.map(({ lines }) => {
    const t = acc;
    acc += rowH(lines);
    return t;
  });
  const height = acc + padB;
  const max = niceMax(Math.max(1, ...rows.map((r) => r.open + r.closed)));
  const x = (v: number) => padL + (v / (max || 1)) * (W - padL - padR);
  const order: ("open" | "closed")[] = first === "open" ? ["open", "closed"] : ["closed", "open"];
  const color = { open: QS_OPEN, closed: QS_CLOSED };
  const fg = { open: onOpen, closed: onClosed };
  return (
    <Box ref={ref} aria-label={label} role="group">
      <QsLegend items={[{ label: "Open Gaps", color: QS_OPEN }, { label: "Closed Gaps", color: QS_CLOSED }]} />
      {rows.length === 0 ? (
        <Typography sx={{ fontSize: 13, color: qs.color.mutedText, py: 4, textAlign: "center" }}>{empty}</Typography>
      ) : (
        <svg width={W} height={height} style={{ display: "block", maxWidth: "100%" }}>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t}>
              <line x1={x(max * t)} x2={x(max * t)} y1={padT} y2={height - padB} stroke={qs.color.border} />
              <text x={x(max * t)} y={height - 10} textAnchor="middle" fontSize={11} fill={qs.color.mutedText}>
                {Math.round(max * t)}
              </text>
            </g>
          ))}
          {laid.map(({ r, lines }, i) => {
            const top = tops[i];
            const h = rowH(lines);
            const by = top + 6;
            const bh = h - 12;
            let start = 0;
            const tip = `${r.label}: Open ${r.open}, Closed ${r.closed}${r.note ? `, ${r.note}` : ""}`;
            return (
              <g key={r.label}>
                <title>{tip}</title>
                <rect x={0} y={top} width={W} height={h} fill="transparent" />
                <text fontSize={12} fill={qs.color.secondaryForeground} textAnchor="end">
                  {lines.map((l, k) => (
                    <tspan key={k} x={labelW} y={top + h / 2 + 4 - ((lines.length - 1) * lineH) / 2 + k * lineH}>
                      {l}
                    </tspan>
                  ))}
                </text>
                {order.map((k) => {
                  const v = r[k];
                  const x0 = x(start);
                  const w = x(start + v) - x0;
                  start += v;
                  return v > 0 ? (
                    <g key={k}>
                      <rect x={x0} y={by} width={Math.max(1, w)} height={bh} fill={color[k]} stroke={qs.color.primaryBackground} strokeWidth={1} />
                      {w >= 22 && (
                        <text x={x0 + w / 2} y={by + bh / 2 + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill={fg[k]}>
                          {v}
                        </text>
                      )}
                    </g>
                  ) : null;
                })}
                {totals ? (
                  <text x={x(r.open + r.closed) + 6} y={top + h / 2 + 4} fontSize={12} fontWeight={700} fill={qs.color.primaryForeground}>
                    {r.open + r.closed}
                  </text>
                ) : (
                  r.note && (
                    <text x={W - padR + 8} y={top + h / 2 + 4} fontSize={12} fill={qs.color.secondaryForeground}>
                      {r.note}
                    </text>
                  )
                )}
              </g>
            );
          })}
        </svg>
      )}
    </Box>
  );
}

/**
 * Version 8 (Lucid chart): vertical clustered columns, Open (red) beside Closed (green) for each group, y axis "Member Count (count)".
 * Long names are cut with "…" and the full name, open and closed counts are in the tooltip. Labels tilt so nine columns of width still read.
 */
export function QsGapColumns({
  rows,
  label,
  height = 330,
  empty = "Nobody is eligible for these filters",
}: {
  rows: QsGapRow[];
  label: string;
  height?: number;
  empty?: string;
}) {
  const [ref, W] = useWidth();
  const padL = 44, padR = 8, padT = 10, padB = 64;
  const n = rows.length;
  const slot = (W - padL - padR) / Math.max(1, n);
  const gw = Math.min(40, slot * 0.82);
  const bw = Math.max(3, gw / 2 - 1);
  const ih = height - padT - padB;
  const max = niceMax(Math.max(1, ...rows.map((r) => Math.max(r.open, r.closed))));
  const y = (v: number) => padT + ih - (v / max) * ih;
  const cut = (t: string) => (t.length > 11 ? `${t.slice(0, 10)}…` : t);
  return (
    <Box ref={ref} aria-label={label} role="group">
      <QsLegend items={[{ label: "Open Gaps", color: QS_OPEN }, { label: "Closed Gaps", color: QS_CLOSED }]} />
      {n === 0 ? (
        <Typography sx={{ fontSize: 13, color: qs.color.mutedText, py: 4, textAlign: "center" }}>{empty}</Typography>
      ) : (
        <svg width={W} height={height} style={{ display: "block", maxWidth: "100%" }}>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t}>
              <line x1={padL} x2={W - padR} y1={y(max * t)} y2={y(max * t)} stroke={qs.color.border} />
              <text x={padL - 6} y={y(max * t) + 4} textAnchor="end" fontSize={11} fill={qs.color.mutedText}>
                {Math.round(max * t)}
              </text>
            </g>
          ))}
          <text x={11} y={padT + ih / 2} fontSize={11} fill={qs.color.mutedText} transform={`rotate(-90 11 ${padT + ih / 2})`} textAnchor="middle">
            Member Count (count)
          </text>
          {rows.map((r) => {
            const i = rows.indexOf(r);
            const cx = padL + slot * i + slot / 2;
            const x0 = cx - gw / 2;
            const tip = `${r.label}: Open ${r.open}, Closed ${r.closed}${r.note ? `, ${r.note}` : ""}`;
            const lab = (v: number, x: number) => (
              <text x={x} y={y(v) - 3} textAnchor="middle" fontSize={10} fill={qs.color.primaryForeground}>
                {bw >= 9 ? v : ""}
              </text>
            );
            return (
              <g key={`${r.label}-${i}`}>
                <title>{tip}</title>
                <rect x={cx - slot / 2} y={padT} width={slot} height={ih + padB} fill="transparent" />
                <rect x={x0} y={y(r.open)} width={bw} height={Math.max(0, y(0) - y(r.open))} fill={QS_OPEN} />
                <rect x={x0 + bw + 2} y={y(r.closed)} width={bw} height={Math.max(0, y(0) - y(r.closed))} fill={QS_CLOSED} />
                {lab(r.open, x0 + bw / 2)}
                {lab(r.closed, x0 + bw + 2 + bw / 2)}
                <text
                  x={cx}
                  y={padT + ih + 14}
                  fontSize={11}
                  fill={qs.color.secondaryForeground}
                  textAnchor="end"
                  transform={`rotate(-35 ${cx} ${padT + ih + 14})`}
                >
                  {cut(r.label)}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </Box>
  );
}

/** A donut: each slice is one group's share. Names, numbers and percents sit in a list beside it, so nothing depends on colour. */
export function QsDonut({
  slices,
  label,
  empty = "Nobody is eligible for these filters",
  qs8,
}: {
  slices: { label: string; value: number; detail?: string }[];
  label: string;
  empty?: string;
  /** Version 8: data labels on the ring and a legend of names, as Quick Sight draws a donut. The detail is in the tooltip only. */
  qs8?: boolean;
}) {
  const total = slices.reduce((a, s) => a + s.value, 0);
  // One hue, darkest for the biggest slice (a share chart does not need a colour per group).
  const steps = [qs.meaning.main, qs.color.accent, "#7C8FD6", "#B5C0EA", "#D9DFF4"];
  const R = 70, r = 42, C = qs8 ? 120 : 90;
  let a0 = -Math.PI / 2;
  const mids: number[] = [];
  if (qs8) {
    let m0 = -Math.PI / 2;
    for (const s of slices) {
      const m1 = m0 + (s.value / (total || 1)) * Math.PI * 2;
      mids.push((m0 + m1) / 2);
      m0 = m1;
    }
  }
  const arc = (v: number) => {
    const a1 = a0 + (v / total) * Math.PI * 2;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const p = (a: number, rad: number) => `${C + rad * Math.cos(a)},${C + rad * Math.sin(a)}`;
    const d =
      v === total
        ? `M ${C},${C - R} A ${R},${R} 0 1 1 ${C - 0.01},${C - R} L ${C - 0.01},${C - r} A ${r},${r} 0 1 0 ${C},${C - r} Z`
        : `M ${p(a0, R)} A ${R},${R} 0 ${large} 1 ${p(a1, R)} L ${p(a1, r)} A ${r},${r} 0 ${large} 0 ${p(a0, r)} Z`;
    a0 = a1;
    return d;
  };
  return (
    <Box aria-label={label} role="group">
      {slices.length === 0 || total === 0 ? (
        <Typography sx={{ fontSize: 13, color: qs.color.mutedText, py: 4, textAlign: "center" }}>{empty}</Typography>
      ) : (
        <Box sx={{ display: "flex", gap: 3, alignItems: "center", flexWrap: "wrap", ...(qs8 ? { flexDirection: "column", alignItems: "stretch", gap: 1 } : {}) }}>
          <svg width={qs8 ? 240 : 180} height={qs8 ? 240 : 180} role="img" aria-label={label} style={qs8 ? { margin: "0 auto", maxWidth: "100%" } : undefined}>
            {slices.map((s, i) => (
              <path key={s.label} d={arc(s.value)} fill={steps[i % steps.length]} stroke={qs.color.primaryBackground} strokeWidth={2}>
                <title>{`${s.label}: ${s.value} (${((s.value / total) * 100).toFixed(1)}%)${s.detail ? `, ${s.detail}` : ""}`}</title>
              </path>
            ))}
            <text x={C} y={C - 2} textAnchor="middle" fontSize={20} fontWeight={700} fill={qs.color.primaryForeground}>
              {total}
            </text>
            <text x={C} y={C + 14} textAnchor="middle" fontSize={11} fill={qs.color.mutedText}>
              members
            </text>
            {qs8 &&
              slices.map((s, i) => {
                const a = mids[i];
                const lx = C + (R + 10) * Math.cos(a);
                const ly = C + (R + 10) * Math.sin(a);
                const right = Math.cos(a) >= 0;
                return (
                  <text key={s.label} x={lx} y={ly + 4} textAnchor={right ? "start" : "end"} fontSize={11} fill={qs.color.primaryForeground}>
                    {s.value} ({((s.value / total) * 100).toFixed(1)}%)
                  </text>
                );
              })}
          </svg>
          {qs8 && <QsLegend items={slices.map((s, i) => ({ label: s.label, color: steps[i % steps.length] }))} />}
          <Box sx={{ display: qs8 ? "none" : "grid", gap: 0.75, minWidth: 0 }}>
            {slices.map((s, i) => (
              <Box key={s.label} sx={{ display: "flex", gap: 1, alignItems: "baseline" }}>
                <Box sx={{ width: 12, height: 12, flex: "none", background: steps[i % steps.length], alignSelf: "center" }} />
                <Typography sx={{ fontSize: qs.type.body.size }}>
                  <b>{s.label}</b> {s.value} ({((s.value / total) * 100).toFixed(1)}%)
                  {s.detail ? <Box component="span" sx={{ color: qs.color.mutedText }}> · {s.detail}</Box> : null}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}
