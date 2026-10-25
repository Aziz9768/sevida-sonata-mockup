import { useMemo, useRef, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import {
  Card,
  DataTable,
  DateField,
  LineChart,
  SelectField,
  SwitchField,
} from "sevida-ui";
import type { Column, LineSeries } from "sevida-ui";
import { fmtDate, measures } from "../../data";
import { getVersion } from "../../version";
import type { Member, MeasureCode } from "../../data";
import {
  compareSeries,
  defaultRange,
  granularityOptions,
  maxRangeDays,
  trendRows,
  trendSeries,
} from "../../dashboardData";
import type { Granularity, TrendMetric, TrendRow } from "../../dashboardData";
import { ChartImageButton } from "./ChartImageButton";

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fromIso = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const DAY = 86_400_000;
const limitText: Record<Granularity, string> = {
  daily: "6 months",
  weekly: "2 years",
  monthly: "3 years",
  quarterly: "10 years",
  annual: "10 years",
};

/**
 * Version 3: the date range is picked from a short list that depends on the granularity (for example 9 or 18 weeks, 12, 18 or 36 months,
 * 4, 8 or 12 quarters). It always ends on the last run date.
 */
export interface RangePreset {
  value: string;
  label: string;
  /** Length in the unit of the granularity. 0 = everything the demo has. */
  n: number;
}
export const rangePresets: Record<Granularity, RangePreset[]> = {
  daily: [
    { value: "30", label: "30 days", n: 30 },
    { value: "60", label: "60 days", n: 60 },
    { value: "90", label: "90 days", n: 90 },
  ],
  weekly: [
    { value: "9", label: "9 weeks", n: 9 },
    { value: "18", label: "18 weeks", n: 18 },
  ],
  monthly: [
    { value: "12", label: "12 months", n: 12 },
    { value: "18", label: "18 months", n: 18 },
    { value: "36", label: "36 months", n: 36 },
  ],
  quarterly: [
    { value: "4", label: "4 quarters", n: 4 },
    { value: "8", label: "8 quarters", n: 8 },
    { value: "12", label: "12 quarters", n: 12 },
  ],
  annual: [{ value: "0", label: "All years", n: 0 }],
};
const defaultPreset: Record<Granularity, string> = {
  daily: "90",
  weekly: "18",
  monthly: "12",
  quarterly: "4",
  annual: "0",
};
export function presetRange(g: Granularity, value: string): { from: Date; to: Date } {
  const end = defaultRange("annual").to;
  const n = rangePresets[g].find((x) => x.value === value)?.n ?? 0;
  if (!n) return defaultRange("annual");
  if (g === "daily") return { from: new Date(end.getFullYear(), end.getMonth(), end.getDate() - n + 1), to: end };
  if (g === "weekly") return { from: new Date(end.getFullYear(), end.getMonth(), end.getDate() - n * 7 + 1), to: end };
  const months = g === "quarterly" ? n * 3 : n;
  return { from: new Date(end.getFullYear(), end.getMonth() - months, end.getDate() + 1), to: end };
}

/** Granularity, range and compare choices shared by the single trend and the five small ones on the Overview. */
export function useTrendControls() {
  const v3 = getVersion() === 3;
  const [g, setG] = useState<Granularity>("monthly");
  const [preset, setPresetValue] = useState(defaultPreset.monthly);
  const [range, setRange] = useState(v3 ? presetRange("monthly", defaultPreset.monthly) : defaultRange("monthly"));
  const [which, setWhich] = useState<TrendMetric>("met");
  const [compare, setCompare] = useState(false);
  const canCompare = g === "monthly" || g === "quarterly";
  const comparing = compare && canCompare;
  const pickG = (next: Granularity) => {
    setG(next);
    if (v3) {
      setPresetValue(defaultPreset[next]);
      setRange(presetRange(next, defaultPreset[next]));
    } else setRange(defaultRange(next));
  };
  const setPreset = (value: string) => {
    setPresetValue(value);
    setRange(presetRange(g, value));
  };
  // Keep the range inside the longest allowed for the granularity. The end that was not edited moves.
  const setFrom = (from: Date) => {
    if (from > range.to) return;
    const to =
      (range.to.getTime() - from.getTime()) / DAY > maxRangeDays[g]
        ? new Date(from.getTime() + maxRangeDays[g] * DAY)
        : range.to;
    setRange({ from, to });
  };
  const setTo = (to: Date) => {
    if (to < range.from) return;
    const from =
      (to.getTime() - range.from.getTime()) / DAY > maxRangeDays[g]
        ? new Date(to.getTime() - maxRangeDays[g] * DAY)
        : range.from;
    setRange({ from, to });
  };
  return {
    g,
    range,
    which,
    compare,
    comparing,
    canCompare,
    preset,
    setPreset,
    pickG,
    setFrom,
    setTo,
    setWhich,
    setCompare,
  };
}
export type TrendControlState = ReturnType<typeof useTrendControls>;

/** The trend settings. They sit in the one filter row at the top of the dashboard and change the trend chart only. */
export function TrendFields({ c }: { c: TrendControlState }) {
  return (
    <Box
      sx={{
        display: "grid",
        gap: 2,
        gridTemplateColumns: {
          xs: "1fr",
          sm: "repeat(2, minmax(0, 1fr))",
          md: "repeat(3, minmax(0, 1fr))",
          lg: "repeat(5, minmax(0, 1fr))",
        },
        alignItems: "start",
      }}
    >
      <SelectField
        label="Show by"
        value={c.g}
        onChange={(v) => c.pickG(v as Granularity)}
        options={granularityOptions}
      />
      <SelectField
        label="Show"
        value={c.which}
        onChange={(v) => c.setWhich(v as TrendMetric)}
        options={[
          { value: "met", label: "Met %" },
          { value: "notmet", label: "Not met %" },
        ]}
      />
      <DateField
        label="From"
        value={iso(c.range.from)}
        disabled={c.comparing}
        onChange={(e) => e.target.value && c.setFrom(fromIso(e.target.value))}
        helperText={`Longest range: ${limitText[c.g]}`}
      />
      <DateField
        label="To"
        value={iso(c.range.to)}
        disabled={c.comparing}
        onChange={(e) => e.target.value && c.setTo(fromIso(e.target.value))}
      />
      <Box
        title={
          c.canCompare
            ? "Draws each year as its own line, month by month or quarter by quarter. The demo has 2025 and 2026."
            : "Available for Monthly and Quarterly only."
        }
        sx={{ pt: { sm: 3.25 } }}
      >
        <SwitchField
          label="Compare with last year"
          checked={c.comparing}
          disabled={!c.canCompare}
          onChange={c.setCompare}
        />
      </Box>
    </Box>
  );
}

/** Lowest and highest value for the chart so a small change is still visible. */
function scaleOf(values: (number | null)[]) {
  const v = values.filter((x): x is number => x !== null);
  if (!v.length) return { min: 0, max: 100 };
  let lo = Math.max(0, Math.floor((Math.min(...v) - 5) / 10) * 10);
  let hi = Math.min(100, Math.ceil((Math.max(...v) + 5) / 10) * 10);
  if (hi - lo < 20) {
    lo = Math.max(0, hi - 20);
    hi = lo + 20;
  }
  return { min: lo, max: hi };
}

/** One trend chart for one measure and the controls state. */
export function TrendChart({
  code,
  list,
  c,
  height = 240,
}: {
  code: MeasureCode;
  list: Member[];
  c: TrendControlState;
  height?: number;
}) {
  const name = measures.find((m) => m.code === code)!.short;
  const view = useMemo(() => {
    if (c.comparing) {
      const cmp = compareSeries(
        code,
        list,
        c.g as "monthly" | "quarterly",
        c.which,
      );
      const series: LineSeries[] = cmp.series.map((s, i) => ({
        name: String(s.year),
        values: s.values,
        tone: i === 0 ? "primary" : "neutral",
        dash: i === 0 ? undefined : "4 3",
      }));
      return { labels: cmp.labels, series };
    }
    const t = trendSeries(code, list, c.g, c.range, c.which);
    return {
      labels: t.labels,
      series: [
        {
          name: c.which === "met" ? "Met %" : "Not met %",
          values: t.values,
          tone: "primary",
        } as LineSeries,
      ],
    };
  }, [code, list, c.g, c.range, c.which, c.comparing]);
  const { min, max } = scaleOf(view.series.flatMap((s) => s.values));
  if (!view.labels.length)
    return (
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        No data in this range.
      </Typography>
    );
  return (
    <LineChart
      labels={view.labels}
      series={view.series}
      min={min}
      max={max}
      decimals={1}
      height={height}
      label={`${c.which === "met" ? "Met" : "Not met"} percent of ${name} over time`}
    />
  );
}

const rateFmt = (v: number | null) => (v === null ? "–" : `${v.toFixed(1)}%`);

/** The numbers behind the chart, period by period (or year by year when comparing). */
function TrendTable({
  code,
  list,
  c,
}: {
  code: MeasureCode;
  list: Member[];
  c: TrendControlState;
}) {
  const rows = useMemo(
    () => trendRows(code, list, c.g, c.range),
    [code, list, c.g, c.range],
  );
  const metric = c.which === "met" ? "Met %" : "Not met %";
  const shown = (r: TrendRow) =>
    r.rate === null ? null : c.which === "met" ? r.rate : 100 - r.rate;
  const columns: Column<TrendRow>[] = [
    {
      key: "start",
      header: "Period start",
      accessor: (r) => r.start.getTime(),
      render: (r) => fmtDate(r.start),
      nowrap: true,
    },
    {
      key: "end",
      header: "Period end",
      accessor: (r) => r.end.getTime(),
      render: (r) => fmtDate(r.end),
      nowrap: true,
    },
    {
      key: "met",
      header: "Met",
      accessor: (r) => r.met,
      align: "right",
      help: "Eligible members who had met by the end of the period.",
    },
    {
      key: "counted",
      header: "Eligible",
      accessor: (r) => r.counted,
      align: "right",
      help: "Eligible members for that measurement year.",
    },
    {
      key: "rate",
      header: metric,
      accessor: (r) => shown(r) ?? -1,
      render: (r) => rateFmt(shown(r)),
      align: "right",
    },
  ];
  return (
    <DataTable
      ariaLabel="Trend numbers"
      columns={columns}
      rows={rows}
      getRowId={(r) => r.id}
      toolbar={false}
      pageSize={8}
      pageSizeOptions={[8, 16, 32]}
      defaultSort={{ key: "end", direction: "desc" }}
    />
  );
}

/** The trend: its own controls on top, then the numbers on the left and the line chart on the right. */
export function TrendCard({
  code,
  list,
}: {
  code: MeasureCode;
  list: Member[];
}) {
  const c = useTrendControls();
  const chartBox = useRef<HTMLDivElement>(null);
  return (
    <Card
      title="Trend over time"
      action={
        <ChartImageButton
          target={chartBox}
          title="Trend over time"
          fileName={`${code}-trend`}
        />
      }
      hint="Starts again each January 1"
      tooltip="Each point is the rate as it stood at the end of a day, week, month, quarter or year, rebuilt from the dates of the evidence. A new measurement year starts again from zero. The controls here change this trend only. The filters at the top also apply."
    >
      <Stack spacing={2}>
        <TrendFields c={c} />
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: {
              xs: "1fr",
              xl: "minmax(0, 5fr) minmax(0, 6fr)",
            },
            alignItems: "start",
          }}
        >
          <Box sx={{ order: { xs: 2, xl: 1 }, minWidth: 0 }}>
            {c.comparing ? (
              <CompareTable
                code={code}
                list={list}
                g={c.g as "monthly" | "quarterly"}
                which={c.which}
              />
            ) : (
              <TrendTable code={code} list={list} c={c} />
            )}
          </Box>
          <Box ref={chartBox} sx={{ order: { xs: 1, xl: 2 }, minWidth: 0 }}>
            <TrendChart code={code} list={list} c={c} />
          </Box>
        </Box>
      </Stack>
    </Card>
  );
}

/** When comparing, one row per month or quarter and one column per year. */
function CompareTable({
  code,
  list,
  g,
  which,
}: {
  code: MeasureCode;
  list: Member[];
  g: "monthly" | "quarterly";
  which: TrendMetric;
}) {
  const cmp = useMemo(
    () => compareSeries(code, list, g, which),
    [code, list, g, which],
  );
  const rows = cmp.labels.map((l, i) => ({
    id: l,
    label: l,
    values: cmp.series.map((s) => s.values[i]),
  }));
  const columns: Column<(typeof rows)[number]>[] = [
    {
      key: "label",
      header: g === "monthly" ? "Month" : "Quarter",
      accessor: (r) => r.label,
    },
    ...cmp.series.map((s, k) => ({
      key: `y${s.year}`,
      header: `${s.year} ${which === "met" ? "Met %" : "Not met %"}`,
      accessor: (r: (typeof rows)[number]) => r.values[k] ?? -1,
      render: (r: (typeof rows)[number]) => rateFmt(r.values[k]),
      align: "right" as const,
    })),
  ];
  return (
    <DataTable
      ariaLabel="Trend comparison"
      columns={columns}
      rows={rows}
      getRowId={(r) => r.id}
      toolbar={false}
      paginated={false}
    />
  );
}
