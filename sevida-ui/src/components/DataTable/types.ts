import type { ReactNode } from "react";
import type { Option } from "../Form/fields";

export type SortDirection = "asc" | "desc";
export interface SortState {
  key: string;
  direction: SortDirection;
}

/** How a column can be filtered in the Filters panel. */
export type ColumnFilter =
  | { type: "text" } //                                  free text: "contains"
  | { type: "select"; options: Option[]; required?: boolean; ordered?: boolean } // pick one value (or All). With `required` there is no All: the filter always has a value and starts as the first option (for example a Measurement year). Options are listed A to Z by label, except for a `required` filter or when `ordered` is set, which keep your order
  | { type: "multiselect"; options: Option[]; ordered?: boolean } // pick several values. Options are listed A to Z by label; set `ordered` to keep your own order when the values have a natural one (age groups, stages, size bands)
  | { type: "dateRange"; presets?: DatePreset[] } //    From / To dates (needs accessor returning a Date or "YYYY-MM-DD"). `presets` adds quick-pick buttons above the dates
  | { type: "numberRange"; min?: number; max?: number }; // From / To numbers, such as age (needs accessor returning a number). Give `min` and `max` to add a two-handle slider above the From / To boxes; both stay in step. A slider left at both ends means no filter

/** A quick-pick button on a dateRange filter. It fills From and To (give the dates as "YYYY-MM-DD"), or, with `blank`, keeps only rows that have no date. */
export interface DatePreset {
  label: string;
  from?: string;
  to?: string;
  /** Keep only rows with no date (for example "No appointment"). */
  blank?: boolean;
}
export interface DateRangeValue {
  from?: string; // "YYYY-MM-DD", or a number as text for a numberRange
  to?: string;
  /** Set by a `blank` preset: only rows with no date. */
  blank?: boolean;
}
export type FilterValue = string | string[] | DateRangeValue;
/** The chosen filters, keyed by column `key`. */
export type FilterState = Record<string, FilterValue>;

export interface Column<T> {
  /** Unique id for the column. */
  key: string;
  /** Column heading. Also the label on phone cards, in the Filters panel and in the Columns panel. */
  header: string;
  /** Plain-language explanation of this column. Shows an (i) next to the heading. Use it for short forms and calculated numbers. */
  help?: string;
  /** Gets the plain value of this column for a row. Used for sorting, search, filters and, if no `render`, for display. A list of text (for a row that can have several values, such as gap names) works with a `multiselect` filter: the row stays if ANY of its values is picked. */
  accessor?: (row: T) => string | number | Date | string[] | null | undefined;
  /** Custom cell content (a StatusChip, a link...). Overrides what `accessor` would show. */
  render?: (row: T) => ReactNode;
  /** Allow clicking the heading to sort. Needs `accessor`. */
  sortable?: boolean;
  align?: "left" | "right" | "center";
  width?: number | string;
  /** Phone cards: use this column as the card's title. If none is marked, the first column is used. */
  primary?: boolean;
  /** Phone cards: leave this column out. */
  hideOnMobile?: boolean;
  /**
   * Table view only: hide this column on screens narrower than this ('md' = 900px, 'lg' = 1200px).
   * Use it for the least important columns so a tablet never needs sideways scrolling.
   * (Hidden columns are still shown on phone cards unless `hideOnMobile` is set.)
   */
  hideBelow?: "md" | "lg";
  /** Never wrap this column's text onto a second line (IDs, dates, phone numbers). */
  nowrap?: boolean;

  // ---- search, filters, column chooser
  /** Add this column to the Filters panel. See `ColumnFilter` for the kinds. */
  filter?: ColumnFilter;
  /**
   * Filter on a different value than the one shown. Example: the Age column shows a number but filters on the date of birth with a `dateRange`. Defaults to `accessor`.
   * The second argument is the whole set of chosen filters, for a filter that depends on another one
   * (example: "Open care gaps" counts only the measures picked in the Measure filter).
   */
  filterAccessor?: (
    row: T,
    filters: FilterState,
  ) => string | number | Date | string[] | null | undefined;
  /** Keep this filter right under the required one (Measurement year), ahead of the A to Z list. Use it for the one or two filters people reach for first (for example Measure). */
  filterPinned?: boolean;
  /** Name shown in the Filters panel and on the filter chip when it should differ from `header` (for example "Date of birth" for the Age column). */
  filterLabel?: string;
  /** Include this column in the search box. Default true for any column with an `accessor`; set false to leave it out. */
  searchable?: boolean;
  /** Heading this column sits under in the Columns panel (for example "Demographics", "Care Gaps"). When any column has one, the panel lists the columns without a group first, then each group with its columns A to Z. The table itself keeps the order of the `columns` array. */
  group?: string;
  /** Start hidden. The user can switch it on in the Columns panel. */
  defaultHidden?: boolean;
  /** Start pinned (kept in view while scrolling sideways). The user can unpin it. At most `maxPinned` columns start pinned. */
  defaultPinned?: boolean;
  /** The user cannot hide this column. The `primary` column is always like this. */
  alwaysVisible?: boolean;
}
