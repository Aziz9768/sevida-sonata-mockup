import { useState } from "react";
import { Box, Stack, Typography, useTheme } from "@mui/material";
import { useChartWidth } from "./useChartWidth";
import { VisuallyHiddenTable } from "./VisuallyHiddenTable";
import { toneColor } from "./tones";
import type { ChartTone } from "./tones";

export interface LineSeries {
  name: string;
  /** One value per label. Use `null` where there is no value (the line stops there and starts again later). */
  values: (number | null)[];
  tone?: ChartTone;
  /** Dashed line, for example "4 3". Use it for an earlier year drawn next to the current one, so the lines differ by more than colour. */
  dash?: string;
}

export interface LineChartProps {
  /** Labels along the bottom, one per value (e.g. month names). Long lists are thinned out so the labels never touch. */
  labels: string[];
  series: LineSeries[];
  /** A dashed goal line (same unit as the values). */
  target?: number;
  /** Lowest and highest value shown. Defaults 0 and 100 (percentages). */
  min?: number;
  max?: number;
  /** Read out by screen readers. */
  label: string;
  height?: number;
  /** Unit written after the end-point value. Default "%". */
  unit?: string;
  /** Decimals in the written values and in the hover box. Default 0. */
  decimals?: number;
}

/** Fewest pixels between two bottom labels. */
const LABEL_GAP = 64;

/**
 * A simple line chart for a few series over time, with an optional goal line.
 * Move the mouse (or a finger) over it to read the exact value of every series at that point.
 * No axes library: just SVG in theme colours.
 */
export function LineChart({
  labels,
  series,
  target,
  min = 0,
  max = 100,
  label,
  height = 220,
  unit = "%",
  decimals = 0,
}: LineChartProps) {
  const theme = useTheme();
  const [ref, W] = useChartWidth();
  const [hover, setHover] = useState<number | null>(null);
  const padL = 34,
    padR = 44,
    padT = 12,
    padB = 26;
  const iw = W - padL - padR,
    ih = height - padT - padB;
  const n = labels.length;
  const x = (i: number) => padL + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) => padT + ih - ((v - min) / (max - min)) * ih;
  const ticks = [min, min + (max - min) / 2, max];
  const font = theme.typography.fontFamily;
  const fmt = (v: number) => v.toFixed(decimals);
  const step = Math.max(
    1,
    Math.ceil(LABEL_GAP / Math.max(1, iw / Math.max(1, n - 1))),
  );
  const showDots = n <= 24;
  const move = (clientX: number, left: number) => {
    if (n === 0) return;
    const px = clientX - left - padL;
    setHover(Math.max(0, Math.min(n - 1, Math.round((px / iw) * (n - 1)))));
  };
  const tipRight = hover !== null && x(hover) > W / 2;
  return (
    <Box ref={ref} sx={{ position: "relative" }}>
      <Box
        component="svg"
        aria-hidden
        width={W}
        height={height}
        viewBox={`0 0 ${W} ${height}`}
        onPointerMove={(e: React.PointerEvent<SVGSVGElement>) =>
          move(e.clientX, e.currentTarget.getBoundingClientRect().left)
        }
        onPointerLeave={() => setHover(null)}
        sx={{ display: "block", maxWidth: "100%", touchAction: "pan-y" }}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={padL}
              x2={W - padR}
              y1={y(t)}
              y2={y(t)}
              stroke={theme.palette.divider}
              strokeWidth={1}
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
        {labels.map((l, i) =>
          i === n - 1 || (i % step === 0 && n - 1 - i >= step) ? (
            <text
              key={l + i}
              x={x(i)}
              y={height - 8}
              textAnchor={
                i === 0 && n > 1
                  ? "start"
                  : i === n - 1 && n > 1
                    ? "end"
                    : "middle"
              }
              fontSize={11}
              fill={theme.palette.ink[500]}
              fontFamily={font}
            >
              {l}
            </text>
          ) : null,
        )}
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
              x={W - padR + 6}
              y={y(target) + 4}
              fontSize={11}
              fill={theme.palette.ink[700]}
              fontFamily={font}
            >
              Goal
            </text>
          </g>
        )}
        {hover !== null && (
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={padT}
            y2={padT + ih}
            stroke={theme.palette.ink[300]}
            strokeWidth={1}
          />
        )}
        {series.map((s) => {
          const color = toneColor(theme, s.tone ?? "primary");
          // Split into runs so a missing value breaks the line instead of drawing to zero.
          const runs: string[] = [];
          let cur: string[] = [];
          s.values.forEach((v, i) => {
            if (v === null) {
              if (cur.length) runs.push(cur.join(" "));
              cur = [];
            } else cur.push(`${x(i)},${y(v)}`);
          });
          if (cur.length) runs.push(cur.join(" "));
          let last = s.values.length - 1;
          while (last >= 0 && s.values[last] === null) last--;
          const lastV = last >= 0 ? (s.values[last] as number) : null;
          return (
            <g key={s.name}>
              {runs.map((pts, k) => (
                <polyline
                  key={k}
                  points={pts}
                  fill="none"
                  stroke={color}
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  strokeDasharray={s.dash}
                />
              ))}
              {showDots &&
                s.values.map((v, i) =>
                  v === null ? null : (
                    <circle
                      key={i}
                      cx={x(i)}
                      cy={y(v)}
                      r={i === last ? 4.5 : 2.5}
                      fill={color}
                    />
                  ),
                )}
              {!showDots && lastV !== null && (
                <circle cx={x(last)} cy={y(lastV)} r={4} fill={color} />
              )}
              {hover !== null &&
                s.values[hover] !== null &&
                s.values[hover] !== undefined && (
                  <circle
                    cx={x(hover)}
                    cy={y(s.values[hover] as number)}
                    r={5}
                    fill={color}
                    stroke={theme.palette.background.paper}
                    strokeWidth={2}
                  />
                )}
              {lastV !== null && (
                <text
                  x={x(last) + 8}
                  y={y(lastV) - 8}
                  fontSize={12}
                  fontWeight={700}
                  fill={theme.palette.ink[900]}
                  fontFamily={font}
                >
                  {fmt(lastV)}
                  {unit}
                </text>
              )}
            </g>
          );
        })}
      </Box>
      {hover !== null && (
        <Box
          role="presentation"
          sx={{
            position: "absolute",
            top: 4,
            ...(tipRight
              ? { right: W - x(hover) + 10 }
              : { left: x(hover) + 10 }),
            pointerEvents: "none",
            bgcolor: "background.paper",
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
            boxShadow: 2,
            px: 1.25,
            py: 0.75,
            minWidth: 110,
            zIndex: 1,
          }}
        >
          <Typography
            sx={{ fontSize: ".75rem", fontWeight: 700, color: "ink.900" }}
          >
            {labels[hover]}
          </Typography>
          {series.map((s) => (
            <Stack
              key={s.name}
              direction="row"
              alignItems="center"
              spacing={0.75}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  flex: "0 0 auto",
                  bgcolor: (t) => toneColor(t, s.tone ?? "primary"),
                }}
              />
              <Typography sx={{ fontSize: ".75rem", color: "ink.700" }}>
                {series.length > 1 ? `${s.name}: ` : ""}
                {s.values[hover] === null || s.values[hover] === undefined
                  ? "no value"
                  : `${fmt(s.values[hover] as number)}${unit}`}
              </Typography>
            </Stack>
          ))}
        </Box>
      )}
      <VisuallyHiddenTable
        caption={label}
        columns={["Period", ...series.map((s) => (s.name.trim().endsWith(unit) ? s.name : `${s.name} (${unit})`))]}
        rows={labels.map((l, i) => [
          l,
          ...series.map((s) =>
            s.values[i] === null || s.values[i] === undefined
              ? "–"
              : fmt(s.values[i] as number),
          ),
        ])}
      />
      {series.length > 1 && (
        <Stack direction="row" spacing={2} sx={{ mt: 0.5, flexWrap: "wrap" }}>
          {series.map((s) => (
            <Stack
              key={s.name}
              direction="row"
              alignItems="center"
              spacing={0.75}
            >
              <Box
                component="svg"
                aria-hidden
                width={22}
                height={10}
                sx={{ display: "block" }}
              >
                <line
                  x1={0}
                  x2={22}
                  y1={5}
                  y2={5}
                  stroke={toneColor(theme, s.tone ?? "primary")}
                  strokeWidth={2.5}
                  strokeDasharray={s.dash}
                  strokeLinecap="round"
                />
              </Box>
              <Typography variant="caption">{s.name}</Typography>
            </Stack>
          ))}
        </Stack>
      )}
    </Box>
  );
}
