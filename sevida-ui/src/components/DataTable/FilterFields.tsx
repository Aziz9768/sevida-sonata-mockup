import { useState } from "react";
import {
  Box,
  Checkbox,
  Chip,
  ListItemText,
  MenuItem,
  Slider,
  Stack,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { TextField, SelectField, DateField } from "../Form/fields";
import type { Option } from "../Form/fields";
import type {
  Column,
  DatePreset,
  DateRangeValue,
  FilterState,
  FilterValue,
} from "./types";

/**
 * Pick several values from a drop-down with an "All" row on top.
 * "All" ticked means every value is ticked too (stored as an empty list = no filter).
 * Clicking "All" while it is ticked un-ticks everything, so you can tick just the ones you want. If you close the list
 * without ticking anything, it goes back to All. Ticking every value again also goes back to All.
 * The chosen values show as small chips with an x, so one can be removed without opening the list.
 */
function MultiSelectFilter({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const [cleared, setCleared] = useState(false);
  const all =
    !cleared && (value.length === 0 || value.length === options.length);
  const labelOf = (v: string) => options.find((o) => o.value === v)?.label ?? v;
  return (
    <TextField
      select
      label={label}
      value={value}
      slotProps={{
        select: {
          multiple: true,
          displayEmpty: true,
          renderValue: (v: unknown) => {
            const picked = v as string[];
            if (cleared)
              return <span style={{ opacity: 0.6 }}>Pick one or more</span>;
            if (picked.length === 0 || picked.length === options.length)
              return "All";
            return (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {picked.map((x) => (
                  <Chip
                    key={x}
                    size="small"
                    label={labelOf(x)}
                    onMouseDown={(e) => e.stopPropagation()}
                    onDelete={() => {
                      const next = picked.filter((p) => p !== x);
                      onChange(next);
                    }}
                    deleteIcon={
                      <CloseIcon aria-label={`Remove ${labelOf(x)}`} />
                    }
                    sx={{
                      maxWidth: "100%",
                      fontWeight: 600,
                      fontSize: ".75rem",
                    }}
                  />
                ))}
              </Box>
            );
          },
          onClose: () => setCleared(false),
          MenuProps: { slotProps: { paper: { sx: { maxHeight: 320 } } } },
        },
      }}
      onChange={() => undefined}
    >
      <MenuItem
        value="__all__"
        onClick={() => {
          if (all) {
            // "All" is on: clear every tick so the person can tick only what they want
            setCleared(true);
          } else {
            setCleared(false);
            onChange([]);
          }
        }}
        sx={{ borderBottom: 1, borderColor: "divider" }}
      >
        <Checkbox size="small" checked={all} sx={{ p: 0.5, mr: 1 }} />
        <ListItemText
          primary="All"
          slotProps={{ primary: { sx: { fontWeight: 700 } } }}
        />
      </MenuItem>
      {options.map((o) => {
        const checked = all || value.includes(o.value);
        return (
          <MenuItem
            key={o.value}
            value={o.value}
            onClick={() => {
              const current = all ? options.map((x) => x.value) : value;
              const next = checked
                ? current.filter((x) => x !== o.value)
                : [...current, o.value];
              setCleared(false);
              // everything ticked, or the last one un-ticked, both mean "All" (no filter)
              onChange(
                next.length === options.length || next.length === 0 ? [] : next,
              );
            }}
          >
            <Checkbox size="small" checked={checked} sx={{ p: 0.5, mr: 1 }} />
            <ListItemText primary={o.label} />
          </MenuItem>
        );
      })}
    </TextField>
  );
}

/** A to Z by what the viewer reads, numbers in number order ("3-11" before "12-17"). `ordered` keeps the caller's order. */
export function sortOptions(options: Option[], ordered?: boolean): Option[] {
  if (ordered) return options;
  return [...options].sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: "base" }),
  );
}

/** One labelled field for every column that has a `filter`. Used by the Filters panel and the phone sheet. */
export function FilterFields<T>({
  columns,
  filters,
  onChange,
}: {
  columns: Column<T>[];
  filters: FilterState;
  onChange: (key: string, value: FilterValue | undefined) => void;
}) {
  // A required filter (Measurement year) always has a value, so it stays on top. A `filterPinned` filter comes next. The rest are A to Z by the label people read.
  const labelOf = (c: Column<T>) => c.filterLabel ?? c.header;
  const isRequired = (c: Column<T>) =>
    (c.filter as { required?: boolean }).required === true;
  const filterable = columns
    .filter((c) => c.filter && (c.filterAccessor ?? c.accessor))
    .sort(
      (x, y) =>
        Number(isRequired(y)) - Number(isRequired(x)) ||
        Number(y.filterPinned === true) - Number(x.filterPinned === true) ||
        labelOf(x).localeCompare(labelOf(y), undefined, {
          numeric: true,
          sensitivity: "base",
        }),
    );
  if (filterable.length === 0) {
    return (
      <Typography sx={{ fontSize: ".8125rem", color: "ink.500" }}>
        No filters are set up for this table.
      </Typography>
    );
  }
  return (
    <Stack spacing={2}>
      {filterable.map((c) => {
        const f = c.filter!;
        const label = c.filterLabel ?? c.header;
        const value = filters[c.key];
        switch (f.type) {
          case "text":
            return (
              <TextField
                key={c.key}
                label={label}
                size="small"
                value={(value as string) ?? ""}
                onChange={(e) => onChange(c.key, e.target.value)}
                placeholder="Contains…"
              />
            );
          case "select":
            return (
              <SelectField
                key={c.key}
                label={label}
                size="small"
                placeholder="All"
                value={
                  (value as string) ??
                  (f.required ? (f.options[0]?.value ?? "") : "")
                }
                onChange={(v) => onChange(c.key, v)}
                options={
                  f.required
                    ? f.options
                    : [
                        { value: "", label: "All" },
                        ...sortOptions(f.options, f.ordered),
                      ]
                }
              />
            );
          case "multiselect":
            return (
              <MultiSelectFilter
                key={c.key}
                label={label}
                options={sortOptions(f.options, f.ordered)}
                value={(value as string[]) ?? []}
                onChange={(v) => onChange(c.key, v)}
              />
            );
          case "dateRange": {
            const range = (value as DateRangeValue | undefined) ?? {};
            const presets = f.presets ?? [];
            const isOn = (x: DatePreset) =>
              x.blank
                ? !!range.blank
                : !range.blank &&
                  !!(range.from || range.to) &&
                  range.from === x.from &&
                  range.to === x.to;
            return (
              <Box key={c.key}>
                <Typography
                  sx={{
                    fontSize: ".8125rem",
                    fontWeight: 600,
                    color: "text.secondary",
                    mb: 0.625,
                  }}
                >
                  {label}
                </Typography>
                {presets.length > 0 && (
                  <Stack
                    direction="row"
                    useFlexGap
                    spacing={0.75}
                    sx={{ flexWrap: "wrap", mb: 1 }}
                    role="group"
                    aria-label={`${label} quick picks`}
                  >
                    {presets.map((x) => {
                      const on = isOn(x);
                      return (
                        <Chip
                          key={x.label}
                          size="small"
                          clickable
                          label={x.label}
                          aria-pressed={on}
                          color={on ? "primary" : "default"}
                          variant={on ? "filled" : "outlined"}
                          onClick={() =>
                            onChange(
                              c.key,
                              on
                                ? undefined
                                : x.blank
                                  ? { blank: true }
                                  : { from: x.from, to: x.to },
                            )
                          }
                          sx={{ fontWeight: 600, fontSize: ".75rem" }}
                        />
                      );
                    })}
                  </Stack>
                )}
                <Stack direction="row" spacing={1}>
                  <DateField
                    slotProps={{ htmlInput: { "aria-label": `${label} from` } }}
                    size="small"
                    value={range.from ?? ""}
                    onChange={(e) =>
                      onChange(c.key, { from: e.target.value, to: range.to })
                    }
                  />
                  <DateField
                    slotProps={{ htmlInput: { "aria-label": `${label} to` } }}
                    size="small"
                    value={range.to ?? ""}
                    onChange={(e) =>
                      onChange(c.key, { from: range.from, to: e.target.value })
                    }
                  />
                </Stack>
              </Box>
            );
          }
          case "numberRange": {
            const range = (value as DateRangeValue | undefined) ?? {};
            const lo = f.min;
            const hi = f.max;
            const sliderOn = lo !== undefined && hi !== undefined;
            const num = (s: string | undefined, d: number) =>
              s === undefined || s === "" || isNaN(Number(s))
                ? d
                : Math.min(hi ?? d, Math.max(lo ?? d, Number(s)));
            return (
              <Box key={c.key}>
                <Typography
                  sx={{
                    fontSize: ".8125rem",
                    fontWeight: 600,
                    color: "text.secondary",
                    mb: 0.625,
                  }}
                >
                  {label}
                </Typography>
                {sliderOn && (
                  <Box sx={{ px: 1.25, mb: 0.5 }}>
                    <Slider
                      size="small"
                      min={lo}
                      max={hi}
                      value={[num(range.from, lo), num(range.to, hi)]}
                      onChange={(_, v) => {
                        const [a, z] = v as number[];
                        // Both handles at the ends = no filter
                        onChange(c.key, {
                          ...range,
                          from: a === lo ? "" : String(a),
                          to: z === hi ? "" : String(z),
                        });
                      }}
                      valueLabelDisplay="auto"
                      getAriaLabel={(i) =>
                        i === 0 ? `${label} from (slider)` : `${label} to (slider)`
                      }
                    />
                  </Box>
                )}
                <Stack direction="row" spacing={1}>
                  <TextField
                    type="number"
                    size="small"
                    placeholder="From"
                    slotProps={{
                      htmlInput: { "aria-label": `${label} from`, min: 0 },
                    }}
                    value={range.from ?? ""}
                    onChange={(e) =>
                      onChange(c.key, { ...range, from: e.target.value })
                    }
                  />
                  <TextField
                    type="number"
                    size="small"
                    placeholder="To"
                    slotProps={{
                      htmlInput: { "aria-label": `${label} to`, min: 0 },
                    }}
                    value={range.to ?? ""}
                    onChange={(e) =>
                      onChange(c.key, { ...range, to: e.target.value })
                    }
                  />
                </Stack>
              </Box>
            );
          }
        }
      })}
    </Stack>
  );
}
