import type {
  Column,
  ColumnFilter,
  DateRangeValue,
  FilterState,
  FilterValue,
} from "./types";

/** "YYYY-MM-DD" for a Date (local time) or an ISO-like string; undefined if it is neither. */
/** A date as MM/DD/YYYY (US). Takes a Date or a YYYY-MM-DD text; anything else comes back unchanged. */
export function usDate(raw: unknown): string {
  if (raw instanceof Date) {
    return `${String(raw.getMonth() + 1).padStart(2, "0")}/${String(raw.getDate()).padStart(2, "0")}/${raw.getFullYear()}`;
  }
  const m =
    typeof raw === "string" ? /^(\d{4})-(\d{2})-(\d{2})/.exec(raw) : null;
  return m ? `${m[2]}/${m[3]}/${m[1]}` : String(raw ?? "");
}

export function toISODate(raw: unknown): string | undefined {
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    const m = String(raw.getMonth() + 1).padStart(2, "0");
    const d = String(raw.getDate()).padStart(2, "0");
    return `${raw.getFullYear()}-${m}-${d}`;
  }
  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}/.test(raw))
    return raw.slice(0, 10);
  return undefined;
}

export function isFilterActive(value: FilterValue | undefined): boolean {
  if (value === undefined) return false;
  if (typeof value === "string") return value !== "";
  if (Array.isArray(value)) return value.length > 0;
  return !!(value.from || value.to || value.blank);
}

export function activeFilterKeys(filters: FilterState): string[] {
  return Object.keys(filters).filter((k) => isFilterActive(filters[k]));
}

function matches(
  filter: ColumnFilter,
  value: FilterValue,
  raw: unknown,
): boolean {
  switch (filter.type) {
    case "text":
      return (
        raw != null &&
        String(raw).toLowerCase().includes(String(value).trim().toLowerCase())
      );
    case "select":
      return raw != null && String(raw) === value;
    case "multiselect":
      if (Array.isArray(raw))
        return raw.some((r) => (value as string[]).includes(String(r)));
      return raw != null && (value as string[]).includes(String(raw));
    case "dateRange": {
      const iso = toISODate(raw);
      const { from, to, blank } = value as DateRangeValue;
      if (blank) return !iso;
      if (!iso) return false;
      return (!from || iso >= from) && (!to || iso <= to);
    }
    case "numberRange": {
      const n = Number(raw);
      if (raw == null || raw === "" || isNaN(n)) return false;
      const { from, to } = value as DateRangeValue;
      return (
        (from === undefined || from === "" || n >= Number(from)) &&
        (to === undefined || to === "" || n <= Number(to))
      );
    }
  }
}

/** The filters with each `required` select filled in (the first option when nothing is picked), so a required filter always has a value. */
export function withRequiredDefaults<T>(
  columns: Column<T>[],
  filters: FilterState,
): FilterState {
  let out = filters;
  for (const c of columns) {
    const f = c.filter;
    if (
      f &&
      f.type === "select" &&
      f.required &&
      f.options.length > 0 &&
      !isFilterActive(filters[c.key])
    )
      out = { ...out, [c.key]: f.options[0].value };
  }
  return out;
}

/** Column keys of required select filters. They always have a value, so they are not counted or shown as removable chips. */
export function requiredFilterKeys<T>(columns: Column<T>[]): string[] {
  return columns
    .filter((c) => c.filter && c.filter.type === "select" && c.filter.required)
    .map((c) => c.key);
}

/** Keeps rows that satisfy EVERY active filter. */
export function applyFilters<T>(
  rows: T[],
  columns: Column<T>[],
  filters: FilterState,
): T[] {
  const active = columns.filter(
    (c) =>
      c.filter &&
      (c.filterAccessor ?? c.accessor) &&
      isFilterActive(filters[c.key]),
  );
  if (active.length === 0) return rows;
  return rows.filter((row) =>
    active.every((c) =>
      matches(
        c.filter!,
        filters[c.key],
        c.filterAccessor ? c.filterAccessor(row, filters) : c.accessor!(row),
      ),
    ),
  );
}

/** Keeps rows where every word typed in the search box appears in at least one searchable column. */
export function applySearch<T>(
  rows: T[],
  columns: Column<T>[],
  query: string,
): T[] {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return rows;
  const cols = columns.filter((c) => c.accessor && c.searchable !== false);
  return rows.filter((row) => {
    const haystack = cols
      .map((c) => {
        const v = c.accessor!(row);
        if (v == null) return "";
        return v instanceof Date
          ? `${usDate(v)} ${toISODate(v) ?? ""}`
          : String(v);
      })
      .join(" | ")
      .toLowerCase();
    return tokens.every((t) => haystack.includes(t));
  });
}

/** Text for an active-filter chip, e.g. "Status: Active" or "Last contact: 10/01/2026 → 10/15/2026". */
export function describeFilter<T>(
  column: Column<T>,
  value: FilterValue,
): string {
  const f = column.filter!;
  const name = column.filterLabel ?? column.header;
  switch (f.type) {
    case "text":
      return `${name}: “${value as string}”`;
    case "select":
      return `${name}: ${f.options.find((o) => o.value === value)?.label ?? value}`;
    case "multiselect": {
      const labels = (value as string[]).map(
        (v) => f.options.find((o) => o.value === v)?.label ?? v,
      );
      return `${name}: ${labels.length > 2 ? `${labels.slice(0, 2).join(", ")} +${labels.length - 2}` : labels.join(", ")}`;
    }
    case "dateRange": {
      const { from, to, blank } = value as DateRangeValue;
      const preset = f.presets?.find((x) =>
        blank ? x.blank : !x.blank && x.from === from && x.to === to,
      );
      if (preset) return `${name}: ${preset.label}`;
      if (blank) return `${name}: none`;
      return `${name}: ${from ? usDate(from) : "…"} → ${to ? usDate(to) : "…"}`;
    }
    case "numberRange": {
      const { from, to } = value as DateRangeValue;
      return from && to
        ? `${name}: ${from} to ${to}`
        : from
          ? `${name}: ${from} or more`
          : `${name}: up to ${to}`;
    }
  }
}
