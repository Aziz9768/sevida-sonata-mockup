import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { Box, Typography } from "@mui/material";
import { tokens } from "sevida-ui";
import { QsLegend, niceMax } from "./kit";
import { getVersion } from "../version";
import { qs } from "./qsTheme";

/**
 * Version 12 charts (Balsamiq board, Analytics - Quality Measures).
 * Every chart draws Closed and Open gaps and writes both the count and the % of the group. They are new, opt-in components:
 * the charts of Versions 1 to 11 in kit.tsx are not touched.
 */

function useWidth(): [RefObject<HTMLDivElement | null>, number] {
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

const n0 = (n: number) => n.toLocaleString("en-US");
const pct = (n: number, d: number) => (d ? `${((n / d) * 100).toFixed(2)}%` : "0.00%");
/**
 * Version 12: Closed is the app's green and Open is its red (Versions 1 to 11 keep blue and orange).
 * Version 13 (Sam found the full-strength tones too heavy): Closed uses the design system's lighter "chip" green (the fill of the Closed tag).
 * The system's chip red (#EF5350) was still strong, so Open uses a softer red, #E57373 (the same step of the red scale as the chip green is of the green scale).
 * It is not a design-system token yet: to confirm with the design system owner. Dark text sits on both. These are functions, so each version reads its own colours.
 */
const v13 = () => getVersion() >= 13;
export const closedColor = (): string => (v13() ? tokens.status.success.chip : qs.meaning.met);
export const openColor = (): string => (v13() ? "#E57373" : qs.tone.danger.border);
const onBar = (): string => (v13() ? tokens.ink[900] : "#FFFFFF");
/** Legend text of the board: "Closed Gaps Count & %". */
export const CLOSED_LEGEND = "Closed Gaps Count & %";
export const OPEN_LEGEND = "Open Gaps Count & %";
const cut = (s: string, max: number) => (s.length > max ? `${s.slice(0, Math.max(1, max - 1))}…` : s);

export interface QsRateRow {
  label: string;
  closed: number;
  open: number;
}

/** Stacked columns, Closed under Open, on a Rate axis of 0 to 100%. Count and % are written in each segment, and again in the tooltip. */
export function QsRateColumns({
  rows,
  label,
  xTitle,
  height = 340,
  empty = "Nobody is eligible for these filters",
}: {
  rows: QsRateRow[];
  label: string;
  xTitle: string;
  height?: number;
  empty?: string;
}) {
  const [ref, W] = useWidth();
  const padL = 52, padR = 10, padT = 10;
  const n = rows.length;
  const slot = (W - padL - padR) / Math.max(1, n);
  const tilt = slot < 70;
  const padB = (tilt ? 78 : 50) + 18;
  const ih = height - padT - padB;
  const bw = Math.min(88, slot * 0.7);
  const y = (p: number) => padT + ih - (p / 100) * ih;
  return (
    <Box ref={ref} aria-label={label} role="group">
      <QsLegend
        items={[
          { label: CLOSED_LEGEND, color: closedColor() },
          { label: OPEN_LEGEND, color: openColor() },
        ]}
      />
      {n === 0 ? (
        <Typography sx={{ fontSize: 13, color: qs.color.mutedText, py: 4, textAlign: "center" }}>{empty}</Typography>
      ) : (
        <svg width={W} height={height} style={{ display: "block", maxWidth: "100%" }}>
          {[0, 20, 40, 60, 80, 100].map((t) => (
            <g key={t}>
              <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke={qs.color.border} />
              <text x={padL - 6} y={y(t) + 4} textAnchor="end" fontSize={11} fill={qs.color.mutedText}>
                {t}
              </text>
            </g>
          ))}
          <text transform={`translate(12 ${padT + ih / 2}) rotate(-90)`} textAnchor="middle" fontSize={11} fill={qs.color.secondaryForeground}>
            Rate
          </text>
          {rows.map((r, i) => {
            const total = r.closed + r.open;
            const cx = padL + slot * i + slot / 2;
            const hC = total ? (r.closed / total) * ih : 0;
            const hO = ih - hC;
            const seg = (h: number, v: number, top: number, fg: string, fill: string) =>
              v > 0 && (
                <g>
                  <rect x={cx - bw / 2} y={top} width={bw} height={h} fill={fill} stroke={qs.color.primaryBackground} strokeWidth={1} />
                  {h >= 34 && bw >= 44 ? (
                    <text textAnchor="middle" fontSize={11} fontWeight={700} fill={fg}>
                      <tspan x={cx} y={top + h / 2 - 2}>
                        {n0(v)}
                      </tspan>
                      <tspan x={cx} y={top + h / 2 + 12} fontWeight={400}>
                        {pct(v, total)}
                      </tspan>
                    </text>
                  ) : h >= 16 && bw >= 44 ? (
                    <text x={cx} y={top + h / 2 + 4} textAnchor="middle" fontSize={10} fontWeight={700} fill={fg}>
                      {n0(v)} · {pct(v, total)}
                    </text>
                  ) : null}
                </g>
              );
            const tip = `${r.label}: Closed ${n0(r.closed)} (${pct(r.closed, total)}), Open ${n0(r.open)} (${pct(r.open, total)})`;
            return (
              <g key={r.label}>
                <title>{tip}</title>
                <rect x={cx - slot / 2} y={padT} width={slot} height={ih} fill="transparent" />
                {seg(hC, r.closed, y(0) - hC, onBar(), closedColor())}
                {seg(hO, r.open, y(0) - hC - hO, onBar(), openColor())}
                <text
                  x={cx}
                  y={y(0) + 16}
                  textAnchor={tilt ? "end" : "middle"}
                  fontSize={11}
                  fill={qs.color.secondaryForeground}
                  transform={tilt ? `rotate(-35 ${cx} ${y(0) + 16})` : undefined}
                >
                  {cut(r.label, tilt ? 24 : Math.max(8, Math.floor(slot / 6.2)))}
                </text>
              </g>
            );
          })}
          <text x={padL + (W - padL - padR) / 2} y={height - 4} textAnchor="middle" fontSize={11} fill={qs.color.secondaryForeground}>
            {xTitle}
          </text>
        </svg>
      )}
    </Box>
  );
}

export interface QsRateLineSeries {
  name: string;
  color: string;
  dashed?: boolean;
  /** Closed Gaps count for each x position, null when the period has not happened yet. */
  counts: (number | null)[];
  /** Closed Gaps rate, 0 to 100, for each x position. */
  rates: (number | null)[];
}

/** Two lines (last year, this year to date) on a Rate axis of 0 to 100%, with the count and % at each point. */
export function QsRateLines({
  labels,
  series,
  label,
  xTitle,
  height = 360,
}: {
  labels: string[];
  series: QsRateLineSeries[];
  label: string;
  xTitle: string;
  height?: number;
}) {
  const [ref, W] = useWidth();
  const padL = 52, padR = 24, padT = 34, padB = 54;
  const ih = height - padT - padB;
  const slot = (W - padL - padR) / Math.max(1, labels.length);
  const x = (i: number) => padL + slot * i + slot / 2;
  const y = (v: number) => padT + ih - (Math.min(100, Math.max(0, v)) / 100) * ih;
  return (
    <Box ref={ref} aria-label={label} role="group">
      <QsLegend items={series.map((s) => ({ label: `${s.name} Closed Gaps Count & %`, color: s.color, line: true }))} />
      <svg width={W} height={height} style={{ display: "block", maxWidth: "100%" }}>
        {[0, 20, 40, 60, 80, 100].map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke={qs.color.border} />
            <text x={padL - 6} y={y(t) + 4} textAnchor="end" fontSize={11} fill={qs.color.mutedText}>
              {t}
            </text>
          </g>
        ))}
        <text transform={`translate(12 ${padT + ih / 2}) rotate(-90)`} textAnchor="middle" fontSize={11} fill={qs.color.secondaryForeground}>
          Rate
        </text>
        {labels.map((l, i) => (
          <text key={l} x={x(i)} y={y(0) + 16} textAnchor="middle" fontSize={11} fill={qs.color.secondaryForeground}>
            {l}
          </text>
        ))}
        {series.map((s, si) => {
          const pts = s.rates.map((v, i) => (v === null ? null : { i, v, c: s.counts[i] })).filter((p): p is { i: number; v: number; c: number | null } => p !== null);
          const above = si === series.length - 1;
          return (
            <g key={s.name}>
              <polyline
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeDasharray={s.dashed ? "6 4" : undefined}
                points={pts.map((p) => `${x(p.i)},${y(p.v)}`).join(" ")}
              />
              {pts.map((p) => (
                <g key={p.i}>
                  <title>{`${s.name} ${labels[p.i]}: ${p.c === null ? "" : `${n0(p.c)}, `}${p.v.toFixed(2)}%`}</title>
                  <circle cx={x(p.i)} cy={y(p.v)} r={4} fill={s.color} stroke={qs.color.primaryBackground} strokeWidth={2} />
                  {slot >= 44 && (
                    <text textAnchor="middle" fontSize={10} fill={qs.color.primaryForeground}>
                      <tspan x={x(p.i)} y={y(p.v) + (above ? -22 : 18)} fontWeight={700}>
                        {p.c === null ? "" : n0(p.c)}
                      </tspan>
                      <tspan x={x(p.i)} y={y(p.v) + (above ? -10 : 30)}>
                        {p.v.toFixed(2)}%
                      </tspan>
                    </text>
                  )}
                </g>
              ))}
            </g>
          );
        })}
        <text x={padL + (W - padL - padR) / 2} y={height - 6} textAnchor="middle" fontSize={11} fill={qs.color.secondaryForeground}>
          {xTitle}
        </text>
      </svg>
    </Box>
  );
}

/** Horizontal stacked bars (one per primary care manager). The count and % of the manager's members are written in each segment: "320 - 88.89%". */
export function QsRateBars({
  rows,
  first,
  label,
  empty = "No manager has an eligible member for these controls",
  dividerAt,
}: {
  rows: QsRateRow[];
  /** Row numbers that start a separate group (Unassigned, Below x Members): a dashed line is drawn above them. */
  dividerAt?: number[];
  /** The segment drawn first (at the left), and listed first in the legend. */
  first: "open" | "closed";
  label: string;
  empty?: string;
}) {
  const [ref, W] = useWidth();
  const CH = 6.2;
  const widest = Math.max(0, ...rows.map((r) => r.label.length)) * CH + 10;
  const labelW = Math.round(Math.min(W * 0.42, Math.max(90, widest)));
  const wrapAt = Math.max(10, Math.floor((labelW - 6) / CH));
  const padL = labelW + 6, padR = 14, padT = 4, padB = 26;
  const wrap = (s: string) => {
    const out: string[] = [];
    let cur = "";
    for (const w of s.split(" ")) {
      if (cur && (cur + " " + w).length > wrapAt) {
        out.push(cur);
        cur = w;
      } else cur = cur ? `${cur} ${w}` : w;
    }
    if (cur) out.push(cur);
    return out.slice(0, 2);
  };
  const rowH = 40;
  const height = padT + rows.length * rowH + padB;
  const max = niceMax(Math.max(1, ...rows.map((r) => r.open + r.closed)));
  const x = (v: number) => padL + (v / (max || 1)) * (W - padL - padR);
  const order: ("open" | "closed")[] = first === "open" ? ["open", "closed"] : ["closed", "open"];
  const color = { open: openColor(), closed: closedColor() };
  const fg = { open: onBar(), closed: onBar() };
  const legend = { open: { label: OPEN_LEGEND, color: openColor() }, closed: { label: CLOSED_LEGEND, color: closedColor() } };
  return (
    <Box ref={ref} aria-label={label} role="group">
      <QsLegend items={order.map((k) => legend[k])} />
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
          {rows.map((r, i) => {
            const top = padT + i * rowH;
            const total = r.open + r.closed;
            let start = 0;
            const lines = wrap(r.label);
            return (
              <g key={r.label}>
                {dividerAt?.includes(i) && <line x1={0} x2={W} y1={top} y2={top} stroke={qs.color.border} strokeDasharray="4 3" />}
                <title>{`${r.label}: Open ${n0(r.open)} (${pct(r.open, total)}), Closed ${n0(r.closed)} (${pct(r.closed, total)})`}</title>
                <rect x={0} y={top} width={W} height={rowH} fill="transparent" />
                <text fontSize={12} fill={qs.color.secondaryForeground} textAnchor="end">
                  {lines.map((l, k) => (
                    <tspan key={k} x={labelW} y={top + rowH / 2 + 4 - ((lines.length - 1) * 7) + k * 14}>
                      {l}
                    </tspan>
                  ))}
                </text>
                {order.map((k) => {
                  const v = r[k];
                  const x0 = x(start);
                  const w = x(start + v) - x0;
                  start += v;
                  if (v <= 0) return null;
                  return (
                    <g key={k}>
                      <rect x={x0} y={top + 6} width={Math.max(1, w)} height={rowH - 12} fill={color[k]} stroke={qs.color.primaryBackground} strokeWidth={1} />
                      {w >= 84 ? (
                        <text x={x0 + w / 2} y={top + rowH / 2 + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill={fg[k]}>
                          {n0(v)} - {pct(v, total)}
                        </text>
                      ) : w >= 26 ? (
                        <text x={x0 + w / 2} y={top + rowH / 2 + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill={fg[k]}>
                          {n0(v)}
                        </text>
                      ) : null}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      )}
    </Box>
  );
}

export interface QsMeasureBar {
  label: string;
  value: number;
  /** The text written above the bar: "380 of 700, 54.29%". */
  text: string;
}

/** One column for each measure (Overview charts): a rate on a 0 to 100 axis, or an open-gap count on its own axis. */
export function QsMeasureBars({
  rows,
  label,
  yTitle,
  xTitle = "Measure",
  max,
  color,
  ticks,
  height = 320,
  onSelect,
}: {
  /** Click (or Enter on) a bar to open that measure's tab. */
  onSelect?: (label: string) => void;
  rows: QsMeasureBar[];
  label: string;
  yTitle: string;
  xTitle?: string;
  /** The top of the axis. */
  max: number;
  color: string;
  ticks: number[];
  height?: number;
}) {
  const [ref, W] = useWidth();
  const padL = 56, padR = 10, padT = 30, padB = 52;
  const ih = height - padT - padB;
  const slot = (W - padL - padR) / Math.max(1, rows.length);
  const bw = Math.min(72, slot * 0.6);
  const y = (v: number) => padT + ih - (Math.min(max, v) / (max || 1)) * ih;
  return (
    <Box ref={ref} aria-label={label} role="group">
      <svg width={W} height={height} style={{ display: "block", maxWidth: "100%" }}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke={qs.color.border} />
            <text x={padL - 6} y={y(t) + 4} textAnchor="end" fontSize={11} fill={qs.color.mutedText}>
              {n0(t)}
            </text>
          </g>
        ))}
        <text transform={`translate(12 ${padT + ih / 2}) rotate(-90)`} textAnchor="middle" fontSize={11} fill={qs.color.secondaryForeground}>
          {yTitle}
        </text>
        {rows.map((r, i) => {
          const cx = padL + slot * i + slot / 2;
          const top = y(r.value);
          return (
            <g
              key={r.label}
              {...(onSelect
                ? {
                    role: "button",
                    tabIndex: 0,
                    "aria-label": `${r.label}: ${r.text}. Open the ${r.label} tab`,
                    style: { cursor: "pointer", outline: "none" },
                    onClick: () => onSelect(r.label),
                    onKeyDown: (e: React.KeyboardEvent) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect(r.label);
                      }
                    },
                  }
                : {})}
            >
              <title>{`${r.label}: ${r.text}${onSelect ? " (click to open the tab)" : ""}`}</title>
              <rect x={cx - slot / 2} y={padT} width={slot} height={ih} fill="transparent" />
              <rect x={cx - bw / 2} y={top} width={bw} height={Math.max(0, y(0) - top)} fill={color} />
              <text textAnchor="middle" fontSize={11} fill={qs.color.primaryForeground}>
                <tspan x={cx} y={top - 16} fontWeight={700}>
                  {r.text.split(", ")[0]}
                </tspan>
                <tspan x={cx} y={top - 4}>
                  {r.text.split(", ")[1] ?? ""}
                </tspan>
              </text>
              <text x={cx} y={y(0) + 16} textAnchor="middle" fontSize={12} fill={qs.color.secondaryForeground}>
                {r.label}
              </text>
            </g>
          );
        })}
        <text x={padL + (W - padL - padR) / 2} y={height - 6} textAnchor="middle" fontSize={11} fill={qs.color.secondaryForeground}>
          {xTitle}
        </text>
      </svg>
    </Box>
  );
}
