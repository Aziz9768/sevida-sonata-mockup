import type { KeyboardEvent } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { useChartWidth } from "./useChartWidth";
import { VisuallyHiddenTable } from "./VisuallyHiddenTable";
import { toneColor } from "./tones";
import type { ChartTone } from "./tones";

export interface BarDatum {
  label: string;
  value: number;
  tone?: ChartTone;
  /** Small second line under the label, e.g. "12 of 20". */
  note?: string;
}

export interface BarChartProps {
  data: BarDatum[];
  /** Dashed goal line (same unit as values). */
  target?: number;
  /** Highest value shown. Default 100 (percentages). */
  max?: number;
  /** Describes what the chart shows. Read out by screen readers, together with a hidden data table. */
  label: string;
  /** Name of the number, used in the hidden table header. Default "Rate (%)". */
  valueLabel?: string;
  height?: number;
  unit?: string;
  /** Makes every bar a button (mouse, touch and keyboard). Use it to open the list behind a bar. */
  onSelect?: (datum: BarDatum, index: number) => void;
  /** Verb for screen readers when bars are buttons, e.g. "View members". */
  selectLabel?: string;
}

/**
 * Vertical bars for a handful of categories, with the value written on every bar (no hover needed)
 * and an optional goal line. Screen readers get the same numbers as a table.
 */
export function BarChart({
  data,
  target,
  max = 100,
  label,
  valueLabel = "Rate (%)",
  height = 220,
  unit = "%",
  onSelect,
  selectLabel = "Open",
}: BarChartProps) {
  const theme = useTheme();
  const font = theme.typography.fontFamily;
  const [ref, W] = useChartWidth();
  const padL = 34,
    padR = 12,
    padT = 20;
  const slot = (W - padL - padR) / Math.max(1, data.length);
  // Long names (for example "Black or African American") wrap onto up to two lines instead of running into the next bar.
  const perLine = Math.max(6, Math.floor((slot - 6) / 6.4));
  const wrap = (text: string): string[] => {
    const words = text.split(" ");
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      if (cur && (cur + " " + w).length > perLine) {
        lines.push(cur);
        cur = w;
      } else cur = cur ? cur + " " + w : w;
    }
    if (cur) lines.push(cur);
    const out = lines.slice(0, 2);
    if (lines.length > 2)
      out[1] = out[1].slice(0, Math.max(1, perLine - 1)) + "…";
    return out.map((l) =>
      l.length > perLine ? l.slice(0, Math.max(1, perLine - 1)) + "…" : l,
    );
  };
  const wrapped = data.map((d) => wrap(d.label));
  const labelLines = Math.max(1, ...wrapped.map((l) => l.length));
  const hasNote = data.some((d) => d.note);
  const padB = 14 + labelLines * 14 + (hasNote ? 14 : 0);
  const ih = height - padT - padB;
  const bw = Math.min(64, slot * 0.55);
  const y = (v: number) =>
    padT + ih - (Math.max(0, Math.min(max, v)) / max) * ih;
  const ticks = [0, max / 2, max];
  return (
    <Box ref={ref} sx={{ position: "relative" }}>
      <Box
        component="svg"
        {...(onSelect
          ? { role: "group", "aria-label": label }
          : { "aria-hidden": true })}
        width={W}
        height={height}
        viewBox={`0 0 ${W} ${height}`}
        sx={{
          display: "block",
          maxWidth: "100%",
          "& .bar-hit": { cursor: "pointer", outline: "none" },
          "& .bar-hit:hover rect:nth-of-type(2), & .bar-hit:focus-visible rect:nth-of-type(2)":
            { opacity: 0.8 },
          "& .bar-hit:focus-visible rect:first-of-type": {
            stroke: theme.palette.secondary.main,
            strokeWidth: 2,
          },
        }}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={padL}
              x2={W - padR}
              y1={y(t)}
              y2={y(t)}
              stroke={theme.palette.divider}
            />
            <text
              x={padL - 6}
              y={y(t) + 4}
              textAnchor="end"
              fontSize={11}
              fill={theme.palette.ink[500]}
              fontFamily={font}
            >
              {Math.round(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = padL + slot * i + slot / 2;
          const color = toneColor(theme, d.tone ?? "primary");
          return (
            <g
              key={d.label}
              {...(onSelect
                ? {
                    role: "button",
                    tabIndex: 0,
                    "aria-label": `${d.label}: ${Math.round(d.value)}${unit}${d.note ? `, ${d.note}` : ""}. ${selectLabel}`,
                    onClick: () => onSelect(d, i),
                    onKeyDown: (e: KeyboardEvent) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect(d, i);
                      }
                    },
                    className: "bar-hit",
                  }
                : {})}
            >
              {onSelect && (
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
                y={y(d.value)}
                width={bw}
                height={Math.max(2, padT + ih - y(d.value))}
                rx={3}
                fill={color}
              />
              <text
                x={cx}
                y={y(d.value) - 6}
                textAnchor="middle"
                fontSize={12}
                fontWeight={700}
                fill={theme.palette.ink[900]}
                fontFamily={font}
              >
                {Math.round(d.value)}
                {unit}
              </text>
              <title>{`${d.label}: ${Math.round(d.value)}${unit}${d.note ? ` (${d.note})` : ""}`}</title>
              {wrapped[i].map((line, k) => (
                <text
                  key={k}
                  x={cx}
                  y={padT + ih + 18 + k * 14}
                  textAnchor="middle"
                  fontSize={12}
                  fill={theme.palette.ink[900]}
                  fontFamily={font}
                >
                  {line}
                </text>
              ))}
              {d.note && (
                <text
                  x={cx}
                  y={padT + ih + 18 + labelLines * 14}
                  textAnchor="middle"
                  fontSize={11}
                  fill={theme.palette.ink[500]}
                  fontFamily={font}
                >
                  {d.note}
                </text>
              )}
            </g>
          );
        })}
        {target !== undefined && (
          <g>
            <line
              x1={padL}
              x2={W - padR}
              y1={y(target)}
              y2={y(target)}
              stroke={theme.palette.ink[700]}
              strokeWidth={1.5}
              strokeDasharray="5 4"
            />
            <text
              x={W - padR}
              y={y(target) - 5}
              textAnchor="end"
              fontSize={11}
              fontWeight={700}
              fill={theme.palette.ink[700]}
              fontFamily={font}
            >
              Goal {target}
              {unit}
            </text>
          </g>
        )}
      </Box>
      <Typography component="span" sx={visuallyHidden}>
        {label}
      </Typography>
      {!onSelect && (
        <VisuallyHiddenTable
          caption={label}
          columns={["Group", valueLabel, "Detail"]}
          rows={data.map((d) => [
            d.label,
            String(Math.round(d.value)),
            d.note ?? "",
          ])}
        />
      )}
    </Box>
  );
}

const visuallyHidden = {
  position: "absolute",
  width: 1,
  height: 1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
} as const;
