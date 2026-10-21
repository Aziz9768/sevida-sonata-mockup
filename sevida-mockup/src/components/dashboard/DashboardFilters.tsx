import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Box, Stack, Typography } from "@mui/material";
import {
  AutocompleteField,
  Button,
  Card,
  DateField,
  SelectField,
  TextField,
} from "sevida-ui";
import { YEARS } from "../../data";
import { activeFilterCount, emptyFilters } from "../../dashboardData";
import type { DashFilters, FacetOptions } from "../../dashboardData";
import {
  ALL,
  LABEL,
  YES_NO,
  measureOptions,
  optionsOf,
  resultOptions,
} from "../../sharedFilters";

/** A name with two boxes under it (From, To). */
function RangeField({
  label,
  children,
  wide,
}: {
  label: string;
  children: ReactNode;
  /** Two columns wide, so a date box shows the whole date. */
  wide?: boolean;
}) {
  return (
    <Box sx={wide ? { gridColumn: { sm: "span 2" } } : undefined}>
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
      <Stack direction="row" spacing={1}>
        {children}
      </Stack>
    </Box>
  );
}

/** A single-choice filter always starts with All. */
const withAll = (xs: string[]) => [{ value: "", label: ALL }, ...optionsOf(xs)];

/**
 * The filters above a dashboard. Names, values and order follow the Members list (see sharedFilters.ts).
 * Like the Members list, nothing changes until Apply is pressed. Clear filters applies at once and keeps the year.
 * Several values in one filter mean "any of them"; different filters all have to match.
 * The measurement period is not a filter: it is always Jan 1 to Dec 31 of the year picked here.
 */
export function DashboardFilters({
  filters,
  onApply,
  options,
}: {
  /** The filters in use now. */
  filters: DashFilters;
  onApply: (next: DashFilters) => void;
  options: FacetOptions;
}) {
  const [draft, setDraft] = useState(filters);
  // Filters changed from outside (Clear filters) replace the draft.
  useEffect(() => setDraft(filters), [filters]);
  const set = <K extends keyof DashFilters>(key: K, value: DashFilters[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const n = activeFilterCount(filters);
  const dirty = JSON.stringify(draft) !== JSON.stringify(filters);
  const apply = () => dirty && onApply(draft);
  return (
    <Card
      title="Filters"
      tooltip="Filters change the Results, the charts, the trend and the member list. Pick your filters, then press Apply. The Whole population box does not change. The measurement period is always the whole calendar year, January 1 to December 31."
      hint={n ? `${n} applied` : undefined}
      action={
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            variant="tertiary"
            size="small"
            disabled={n === 0 && activeFilterCount(draft) === 0}
            onClick={() => onApply(emptyFilters(filters.year))}
          >
            Clear filters
          </Button>
          <Button size="small" disabled={!dirty} onClick={apply}>
            Apply
          </Button>
        </Stack>
      }
    >
      <Box
        onKeyDown={(e) => {
          if (
            e.key === "Enter" &&
            (e.target as HTMLElement).tagName === "INPUT"
          )
            apply();
        }}
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(5, minmax(0, 1fr))",
          },
          alignItems: "start",
        }}
      >
        <SelectField
          label={LABEL.year}
          value={String(draft.year)}
          onChange={(v) => set("year", Number(v))}
          options={YEARS.map((y) => ({ value: String(y), label: String(y) }))}
        />
        <TextField
          label={LABEL.member}
          placeholder="ID or name"
          value={draft.memberId}
          onChange={(e) => set("memberId", e.target.value)}
        />
        <SelectField
          label={LABEL.result}
          value={draft.status}
          onChange={(v) => set("status", v as DashFilters["status"])}
          options={[{ value: "", label: ALL }, ...resultOptions]}
        />
        <RangeField wide label={LABEL.dob}>
          <DateField
            slotProps={{ htmlInput: { "aria-label": `${LABEL.dob} from` } }}
            value={draft.dobFrom}
            onChange={(e) => set("dobFrom", e.target.value)}
          />
          <DateField
            slotProps={{ htmlInput: { "aria-label": `${LABEL.dob} to` } }}
            value={draft.dobTo}
            onChange={(e) => set("dobTo", e.target.value)}
          />
        </RangeField>
        <RangeField label={LABEL.age}>
          <TextField
            type="number"
            placeholder="From"
            slotProps={{
              htmlInput: { "aria-label": `${LABEL.age} from`, min: 0 },
            }}
            value={draft.ageFrom}
            onChange={(e) => set("ageFrom", e.target.value)}
          />
          <TextField
            type="number"
            placeholder="To"
            slotProps={{
              htmlInput: { "aria-label": `${LABEL.age} to`, min: 0 },
            }}
            value={draft.ageTo}
            onChange={(e) => set("ageTo", e.target.value)}
          />
        </RangeField>
        <SelectField
          label={LABEL.sex}
          value={draft.sex}
          onChange={(v) => set("sex", v)}
          options={withAll(options.sex)}
        />
        <SelectField
          label={LABEL.openGaps}
          value={draft.openGaps}
          onChange={(v) => set("openGaps", v)}
          options={withAll(options.openGaps)}
        />
        <SelectField
          label={LABEL.multiGap}
          value={draft.multiGap}
          onChange={(v) => set("multiGap", v as DashFilters["multiGap"])}
          options={withAll(YES_NO)}
        />
        <AutocompleteField
          multiple
          label={LABEL.ageGroup}
          placeholder={ALL}
          options={optionsOf(options.ageGroup)}
          value={draft.ageGroup}
          onChange={(v) => set("ageGroup", v)}
        />
        <AutocompleteField
          multiple
          label={LABEL.race}
          placeholder={ALL}
          options={optionsOf(options.race)}
          value={draft.race}
          onChange={(v) => set("race", v)}
        />
        <AutocompleteField
          multiple
          label={LABEL.ethnicity}
          placeholder={ALL}
          options={optionsOf(options.ethnicity)}
          value={draft.ethnicity}
          onChange={(v) => set("ethnicity", v)}
        />
        <AutocompleteField
          multiple
          label={LABEL.provider}
          placeholder={ALL}
          options={optionsOf(options.provider)}
          value={draft.provider}
          onChange={(v) => set("provider", v)}
        />
        <AutocompleteField
          multiple
          label={LABEL.excluded}
          placeholder={ALL}
          options={measureOptions}
          value={draft.excluded}
          onChange={(v) => set("excluded", v)}
        />
        <RangeField wide label={LABEL.evDate}>
          <DateField
            slotProps={{ htmlInput: { "aria-label": `${LABEL.evDate} from` } }}
            value={draft.evFrom}
            onChange={(e) => set("evFrom", e.target.value)}
          />
          <DateField
            slotProps={{ htmlInput: { "aria-label": `${LABEL.evDate} to` } }}
            value={draft.evTo}
            onChange={(e) => set("evTo", e.target.value)}
          />
        </RangeField>
        <AutocompleteField
          multiple
          label={LABEL.evSystem}
          placeholder={ALL}
          options={optionsOf(options.evSystem)}
          value={draft.evSystem}
          onChange={(v) => set("evSystem", v)}
        />
        <SelectField
          label={LABEL.a1c}
          value={draft.a1c}
          onChange={(v) => set("a1c", v)}
          options={withAll(options.a1c)}
        />
        <SelectField
          label={LABEL.state}
          value={draft.state}
          onChange={(v) => set("state", v)}
          options={withAll(options.state)}
        />
        <SelectField
          label={LABEL.county}
          value={draft.county}
          onChange={(v) => set("county", v)}
          options={withAll(options.county)}
        />
        <SelectField
          label={LABEL.military}
          value={draft.military}
          onChange={(v) => set("military", v)}
          options={withAll(options.military)}
        />
      </Box>
    </Card>
  );
}
