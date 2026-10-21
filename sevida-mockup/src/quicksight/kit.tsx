import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Box, Slider, Typography } from "@mui/material";
import { InfoTip, StatusChip } from "sevida-ui";
import { qs } from "./qsTheme";

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
  Q22: "Can a trend point be marked as in progress (last 90 days)? The table marks it with an asterisk.",
  Q23: "Can a KPI turn red when it passes a threshold that comes from data (rejection threshold)?",
  Q24: "Do KPI tiles support a hover note that says where the number comes from?",
  Q25: "QuickSight combines different controls with AND. Choices inside one control are OR. Is that enough for the AND / OR need?",
  Q26: "Do we receive appointment data from Madigan? Without it there is no appointment status to filter on.",
  Q29: "Do all Madigan files arrive on the same schedule? Next expected assumes one file every night.",
  Q30: "Showing or hiding a tile by a filter value works only in free-form layout. Is free-form acceptable for the notice boxes?",
  Q28: "Can a control follow the viewer across sheets (cross-sheet control)? If not, a choice made on one sheet still filters the others and a note says so.",
  Q27: "Will Madigan send a member-to-PCP file with from and to dates? Today the provider comes from the claims.",
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
            {t}
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
  children,
}: {
  cols?: 3 | 6;
  /** The info icon QuickSight allows next to a control title. */
  info?: string;
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
      {info && (
        <Box sx={{ position: "absolute", top: 0, right: 0 }}>
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
        {label}
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
  review,
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
  /** A note for reviewers, not part of the dashboard: it goes away with the "Questions for developers" switch. */
  review?: boolean;
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
        bgcolor: t
          ? t.bg
          : tone === "highlight"
            ? qs.tone.info.bg
            : qs.color.primaryBackground,
        border: t ? `1px solid ${t.border}` : qs.tile.border,
        color: t ? t.text : undefined,
        borderRadius: `${qs.tile.radius}px`,
        p: `${qs.tile.padding}px`,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Notes fr={fr} ask={ask} />
      {!bare && title && (
        <Box sx={{ mb: 1.25, pr: 9 }}>
          <Typography
            component="h3"
            sx={{
              m: 0,
              fontSize: qs.type.visualTitle.size,
              fontWeight: qs.type.visualTitle.weight,
              lineHeight: 1.3,
            }}
          >
            {title}
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
}) {
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
}: {
  bars: QsBar[];
  max?: number;
  unit?: string;
  decimals?: number;
  height?: number;
  label: string;
  onSelect?: (b: QsBar) => void;
  empty?: string;
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
}: {
  bars: QsBar[];
  max?: number;
  benchmark?: number;
  benchmarkLabel?: string;
  label: string;
  empty?: string;
}) {
  const [ref, W] = useWidth();
  const rowH = 30,
    padT = benchmark === undefined ? 6 : 26,
    padB = 22,
    labelW = Math.min(170, Math.max(90, W * 0.32)),
    valueW = 118,
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
                  {cut(b.label)}
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
                    whiteSpace: "nowrap",
                    textAlign: c.align ?? "left",
                    userSelect: "none",
                  }}
                >
                  {c.header}
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
                style={onRowSelect ? { cursor: "pointer" } : undefined}
              >
                {cols.map((c, i) => (
                  <Box
                    component="td"
                    key={c.key}
                    sx={{
                      ...cell,
                      bgcolor:
                        ri % 2
                          ? qs.color.secondaryBackground
                          : qs.color.primaryBackground,
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
