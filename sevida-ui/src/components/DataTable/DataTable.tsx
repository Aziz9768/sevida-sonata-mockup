import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Box,
  Checkbox,
  Drawer,
  Menu,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import PushPinIcon from "@mui/icons-material/PushPin";
import CloseIcon from "@mui/icons-material/Close";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import { EmptyState } from "../Feedback/EmptyState";
import { Button, IconButton } from "../Button/Button";
import { SelectField } from "../Form/fields";
import { Pagination } from "../Pagination/Pagination";
import { InfoTip } from "../Feedback/InfoTip";
import { useIsMobile } from "../../hooks/useIsMobile";
import { TableToolbar } from "./TableToolbar";
import { Rail, RailPanel, ColumnsPanel } from "./TableRail";
import type { RailTab } from "./TableRail";
import { FilterFields } from "./FilterFields";
import { isLocked, useColumnConfig } from "./useColumnConfig";
import {
  activeFilterKeys,
  applyFilters,
  applySearch,
  describeFilter,
  isFilterActive,
  requiredFilterKeys,
  usDate,
  withRequiredDefaults,
} from "./filters";
import { SavedViewsMenu } from "./SavedViewsMenu";
import { useSavedViews } from "./useSavedViews";
import type { SavedViewsOption } from "./useSavedViews";
import { sameColumns, sameJson } from "./savedViews";
import { exportAs, exportFormatLabel } from "./exportFile";
import type { ExportFormat } from "./exportFile";
import type { SavedView, SavedViewDraft } from "./savedViews";
import type { Column, FilterState, FilterValue, SortState } from "./types";

export type {
  Column,
  ColumnFilter,
  DatePreset,
  DateRangeValue,
  FilterState,
  FilterValue,
  SortDirection,
  SortState,
} from "./types";

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  /** Unique, stable id for each row (usually row.id). */
  getRowId: (row: T) => string;
  /** Describes the table for screen readers, e.g. "Members". */
  ariaLabel: string;

  // ---- toolbar: search, plus the Filters / Columns rail on the right edge
  /**
   * `true` (default) shows what applies: a search box (if any column has an `accessor`), the Filters tab
   * (if any column has a `filter`) and the Columns tab. Pass `false` for a bare table, or
   * `{ search: false }` etc. to switch single parts off.
   */
  toolbar?:
    boolean | { search?: boolean; filters?: boolean; columns?: boolean };
  /** Heading at the top left of the table, e.g. "Members". The number of rows is added for you: "Members (25)". */
  title?: ReactNode;
  /** Extra buttons on the right of the toolbar (Export, Add...). */
  toolbarActions?: ReactNode;
  /**
   * Adds an Export button with a menu: CSV, Excel or PDF of every row that matches the search and filters (not just the page you are on),
   * with the columns that are showing, in their order. Give the file name without the extension. Not available when the server pages the rows.
   */
  exportFile?: string;
  /** Which formats the Export menu offers. Default all three: `["csv", "xlsx", "pdf"]`. */
  exportFormats?: ExportFormat[];
  /** How many columns people may pin (keep in view while scrolling sideways). Default 3. */
  maxPinned?: number;
  searchPlaceholder?: string;
  /** Remembers which columns the user showed / hid / reordered, in this browser, under this name. Leave out to not remember. */
  storageKey?: string;
  /** Pass `search` + `onSearchChange` to control the search text yourself (e.g. when the server searches). */
  search?: string;
  onSearchChange?: (search: string) => void;
  /** Same for the chosen filters. */
  filters?: FilterState;
  onFiltersChange?: (filters: FilterState) => void;
  /**
   * Turns on saved views: an eye icon beside the search box where people save the current filters, columns and sort under a name,
   * switch between saved views, and choose which one opens by default. Give the table's name (views made on one table are not seen on another),
   * or `{ key, store }` to keep views somewhere other than this browser.
   */
  savedViews?: string | SavedViewsOption;

  // ---- sorting
  /** Start sorted by this column. */
  defaultSort?: SortState;
  /** Pass this (with `onSortChange`) to control sorting yourself, e.g. when the server sorts. */
  sort?: SortState | null;
  onSortChange?: (sort: SortState | null) => void;

  // ---- paging
  /** Show the Pagination footer. Default true. */
  paginated?: boolean;
  /** Rows per page. Default 10. */
  pageSize?: number;
  pageSizeOptions?: number[];
  /**
   * Server mode: pass `page`, `total` and `onPageChange` and give `rows` for the CURRENT page only.
   * Then YOU do the searching, filtering and sorting (use the `on...Change` callbacks).
   * Leave `onPageChange` out and the table searches, filters, sorts and pages the rows itself.
   */
  page?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;

  // ---- selection
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;

  // ---- row behaviour
  onRowClick?: (row: T) => void;
  /** The last column of each row (top-right of the card on phones). Use `<RowMenu />`, the three-dot menu, so every table looks the same. */
  rowActions?: (row: T) => ReactNode;
  /** Tint a row (and mark its left edge) when it matters more than the rest, for example a record tied to a care gap. Never rely on the colour alone: say why in a column too. */
  highlightRow?: (row: T) => boolean;

  // ---- states
  loading?: boolean;
  /** What to show when there are no rows at all. A default is provided. */
  emptyState?: ReactNode;
  /** Keep the heading visible while the body scrolls. Needs `maxHeight`. */
  stickyHeader?: boolean;
  maxHeight?: number | string;
}

function compare(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1; // empty values always last
  if (b == null) return -1;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function hideSx<T>(c: Column<T>) {
  return c.hideBelow
    ? { display: { xs: "none", [c.hideBelow]: "table-cell" } }
    : {};
}

function cellContent<T>(col: Column<T>, row: T): ReactNode {
  if (col.render) return col.render(row);
  const v = col.accessor?.(row);
  if (v == null || v === "") return "–";
  if (v instanceof Date) return usDate(v);
  if (Array.isArray(v)) return v.length ? v.join(", ") : "–";
  return String(v);
}

/**
 * A list of records. Wide screens get a normal table; phones get one card per record, so
 * nothing ever needs sideways scrolling. Search, filters, a column chooser, sorting, paging
 * and row selection are built in.
 * (For ONE record's fields, use DetailGrid instead; a table is for many records.)
 */
export function DataTable<T>({
  columns: allColumnDefs,
  rows,
  getRowId,
  ariaLabel,
  toolbar = true,
  title,
  toolbarActions,
  exportFile,
  exportFormats: exportFormatsProp,
  maxPinned = 3,
  searchPlaceholder,
  storageKey,
  search: searchProp,
  onSearchChange,
  filters: filtersProp,
  onFiltersChange,
  savedViews,
  defaultSort,
  sort: sortProp,
  onSortChange,
  paginated = true,
  pageSize: pageSizeProp = 10,
  pageSizeOptions,
  page: pageProp,
  total: totalProp,
  onPageChange,
  onPageSizeChange,
  selectable = false,
  selectedIds,
  onSelectionChange,
  onRowClick,
  highlightRow,
  rowActions,
  loading = false,
  emptyState,
  stickyHeader = false,
  maxHeight,
}: DataTableProps<T>) {
  const isMobile = useIsMobile();
  const serverMode = onPageChange !== undefined;

  // ---- which columns are shown, and in what order
  const config = useColumnConfig(allColumnDefs, storageKey, maxPinned);
  const columns = config.visible;

  // ---- sort state (own, unless the caller controls it)
  const [ownSort, setOwnSort] = useState<SortState | null>(defaultSort ?? null);
  const sortControlled = onSortChange !== undefined;
  const sort = sortControlled ? (sortProp ?? null) : ownSort;
  const setSort = (s: SortState | null) =>
    sortControlled ? onSortChange?.(s) : setOwnSort(s);

  // ---- page state
  const [ownPage, setOwnPage] = useState(1);
  const [ownPageSize, setOwnPageSize] = useState(pageSizeProp);
  const pageSize = serverMode ? pageSizeProp : ownPageSize;
  const page = serverMode ? (pageProp ?? 1) : ownPage;
  const goToFirstPage = () => (serverMode ? onPageChange?.(1) : setOwnPage(1));

  // ---- search + filter state
  const [ownSearch, setOwnSearch] = useState("");
  const search = searchProp ?? ownSearch;
  const changeSearch = (s: string) => {
    setOwnSearch(s);
    onSearchChange?.(s);
    goToFirstPage();
  };
  const [ownFilters, setOwnFilters] = useState<FilterState>({});
  const filters = filtersProp ?? ownFilters;
  const changeFilters = (next: FilterState) => {
    setOwnFilters(next);
    onFiltersChange?.(next);
    goToFirstPage();
  };
  const changeOneFilter = (key: string, value: FilterValue | undefined) => {
    const next = { ...filters };
    if (value === undefined) delete next[key];
    else next[key] = value;
    changeFilters(next);
  };
  // A required select filter (such as a Measurement year) always has a value, so it never counts as "a filter is on".
  const requiredKeys = useMemo(
    () => requiredFilterKeys(allColumnDefs),
    [allColumnDefs],
  );
  const appliedFilters = useMemo(
    () => withRequiredDefaults(allColumnDefs, filters),
    [allColumnDefs, filters],
  );
  // ---- saved views: the filters + columns + sort that people can name, keep and reopen
  const sv = useSavedViews(savedViews);
  const onlyActive = (f: FilterState): FilterState =>
    Object.fromEntries(Object.entries(f).filter(([, v]) => isFilterActive(v)));
  const currentView: SavedViewDraft = {
    filters: onlyActive(appliedFilters),
    columns: {
      order: config.all.map((c) => c.key),
      hidden: [...config.hiddenKeys].filter((k) =>
        allColumnDefs.some((c) => c.key === k && !isLocked(c)),
      ),
      pinned: [...config.pinnedKeys],
    },
    sort,
  };
  const builtInColumns = {
    order: allColumnDefs.map((c) => c.key),
    hidden: config.defaultHidden,
    pinned: config.defaultPinned,
  };
  const baseline: SavedViewDraft = sv.active
    ? {
        filters: onlyActive(
          withRequiredDefaults(allColumnDefs, sv.active.filters),
        ),
        columns: sv.active.columns,
        sort: sv.active.sort,
      }
    : {
        filters: onlyActive(withRequiredDefaults(allColumnDefs, {})),
        columns: builtInColumns,
        sort: defaultSort ?? null,
      };
  const viewDirty =
    !sameJson(currentView.filters, baseline.filters) ||
    !sameColumns(currentView.columns, baseline.columns) ||
    !sameJson(currentView.sort, baseline.sort);
  const applyView = (v: SavedView) => {
    sv.setActiveId(v.id);
    changeFilters(v.filters);
    config.apply(v.columns);
    setSort(v.sort);
  };
  const applyBuiltIn = () => {
    sv.setActiveId(null);
    changeFilters({});
    config.reset();
    setSort(defaultSort ?? null);
  };
  // The view marked "opens by default" is put on once, when the table first shows.
  useEffect(() => {
    if (sv.defaultView) applyView(sv.defaultView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtersActive =
    activeFilterKeys(filters).filter((k) => !requiredKeys.includes(k)).length >
      0 || search.trim() !== "";

  // ---- the rows to show: search -> filters -> sort -> page (all skipped in server mode)
  const processed = useMemo(() => {
    if (serverMode) return rows;
    let out = applySearch(rows, allColumnDefs, search);
    out = applyFilters(out, allColumnDefs, appliedFilters);
    if (!sortControlled && sort) {
      const col = allColumnDefs.find((c) => c.key === sort.key);
      if (col?.accessor) {
        const dir = sort.direction === "asc" ? 1 : -1;
        out = [...out].sort(
          (a, b) => dir * compare(col.accessor!(a), col.accessor!(b)),
        );
      }
    }
    return out;
  }, [
    rows,
    allColumnDefs,
    search,
    appliedFilters,
    sort,
    serverMode,
    sortControlled,
  ]);

  const [exportAnchor, setExportAnchor] = useState<HTMLElement | null>(null);
  const [exporting, setExporting] = useState(false);
  const runExport = async (format: ExportFormat) => {
    setExportAnchor(null);
    setExporting(true);
    try {
      const cols = columns.filter((c) => c.accessor);
      const body = processed.map((row) =>
        cols.map((c) => {
          const v = c.accessor!(row);
          return Array.isArray(v) ? v.join("; ") : v;
        }),
      );
      const used = [
        ...(search.trim() ? [`Search: ${search.trim()}`] : []),
        ...activeFilterKeys(appliedFilters).flatMap((k) => {
          const col = allColumnDefs.find((c) => c.key === k);
          return col ? [describeFilter(col, appliedFilters[k])] : [];
        }),
      ];
      const heading =
        typeof title === "string" || typeof title === "number"
          ? String(title)
          : String(exportFile);
      await exportAs(
        format,
        {
          title: heading,
          lines: [
            `${processed.length} rows · exported ${usDate(new Date())}`,
            ...(used.length ? [`Filters: ${used.join("; ")}`] : []),
          ],
          sheets: [{ name: heading, head: cols.map((c) => c.header), body }],
        },
        String(exportFile),
      );
    } finally {
      setExporting(false);
    }
  };
  const exportFormats = exportFormatsProp ?? ["csv", "xlsx", "pdf"];
  const exportButton =
    exportFile && !serverMode ? (
      <>
        <Tooltip title={exporting ? "Exporting…" : "Export"}>
          <span>
            <IconButton
              aria-label={exporting ? "Exporting…" : "Export"}
              onClick={(e) =>
                exportFormats.length === 1
                  ? void runExport(exportFormats[0])
                  : setExportAnchor(e.currentTarget)
              }
              disabled={processed.length === 0 || exporting}
              aria-haspopup={exportFormats.length > 1 ? "menu" : undefined}
              sx={{
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                color: "primary.main",
              }}
            >
              <FileDownloadOutlinedIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Menu
          anchorEl={exportAnchor}
          open={!!exportAnchor}
          onClose={() => setExportAnchor(null)}
        >
          {exportFormats.map((f) => (
            <MenuItem key={f} onClick={() => void runExport(f)}>
              {exportFormatLabel[f]}
            </MenuItem>
          ))}
        </Menu>
      </>
    ) : null;

  const total = serverMode ? (totalProp ?? rows.length) : processed.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const visible =
    !paginated || serverMode
      ? processed
      : processed.slice((safePage - 1) * pageSize, safePage * pageSize);

  const changePage = (p: number) =>
    serverMode ? onPageChange?.(p) : setOwnPage(p);
  const changePageSize = (n: number) => {
    if (serverMode) onPageSizeChange?.(n);
    else {
      setOwnPageSize(n);
      setOwnPage(1);
    }
  };

  // ---- selection
  const selected = useMemo(() => new Set(selectedIds ?? []), [selectedIds]);
  const visibleIds = visible.map(getRowId);
  const allSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const someSelected =
    visibleIds.some((id) => selected.has(id)) && !allSelected;
  const toggleAll = () => {
    const next = new Set(selected);
    if (allSelected) visibleIds.forEach((id) => next.delete(id));
    else visibleIds.forEach((id) => next.add(id));
    onSelectionChange?.([...next]);
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange?.([...next]);
  };

  const requestSort = (col: Column<T>) => {
    if (!col.sortable) return;
    if (sort?.key !== col.key) setSort({ key: col.key, direction: "asc" });
    else if (sort.direction === "asc")
      setSort({ key: col.key, direction: "desc" });
    else setSort(null);
    goToFirstPage();
  };

  // ---- toolbar, rail and sheet
  const tb = toolbar === false ? null : toolbar === true ? {} : toolbar;
  const showSearch =
    !!tb &&
    tb.search !== false &&
    allColumnDefs.some((c) => c.accessor && c.searchable !== false);
  const showFilters =
    !!tb &&
    tb.filters !== false &&
    allColumnDefs.some((c) => c.filter && (c.filterAccessor ?? c.accessor));
  const showColumns = !!tb && tb.columns !== false && allColumnDefs.length > 1;
  const sortableColumns = allColumnDefs.filter((c) => c.sortable && c.accessor);
  const activeKeys = activeFilterKeys(filters).filter(
    (k) => !requiredKeys.includes(k),
  );
  const showRail = !isMobile && (showFilters || showColumns);
  const showSheet = isMobile && (showFilters || sortableColumns.length > 0);

  // "Clear all" goes back to the view that opens by default (or to no filters when there is none), not to a bare table.
  const clearFilters = () => {
    const back = sv.enabled ? sv.defaultView : null;
    if (sv.enabled) sv.setActiveId(back?.id ?? null);
    changeFilters(back ? back.filters : {});
  };
  const clearAll = () => {
    setOwnSearch("");
    onSearchChange?.("");
    clearFilters();
  };

  const [railTab, setRailTab] = useState<RailTab | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // The Filters panel works on a draft: nothing changes in the table until Apply is pressed.
  const [draft, setDraft] = useState<FilterState | null>(null);
  const panelFilters = draft ?? appliedFilters;
  const changePanelFilter = (key: string, value: FilterValue | undefined) => {
    const next = { ...panelFilters };
    if (value === undefined) delete next[key];
    else next[key] = value;
    setDraft(next);
  };
  const draftDirty =
    draft !== null &&
    !sameJson(
      onlyActive(withRequiredDefaults(allColumnDefs, draft)),
      onlyActive(appliedFilters),
    );
  const applyDraft = () => {
    if (draft) changeFilters(draft);
    setDraft(null);
  };
  // new filters from outside the panel (a chip removed, a view opened, Clear all) replace the draft
  useEffect(() => setDraft(null), [filters]);
  // closing the panel without Apply drops the draft
  useEffect(() => {
    if (railTab !== "filters" && !sheetOpen) setDraft(null);
  }, [railTab, sheetOpen]);
  const railPanelRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);

  // Close the side panel when the user clicks anywhere else. Open menus (a drop-down inside the panel)
  // render outside it, so they do not count as "elsewhere".
  useEffect(() => {
    if (!railTab) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        railPanelRef.current?.contains(target) ||
        railRef.current?.contains(target)
      )
        return;
      if (target instanceof Element && target.closest(".MuiModal-root")) return;
      setRailTab(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [railTab]);
  useEffect(() => {
    if (!railTab) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setRailTab(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [railTab]);

  // ---- column widths (drag the edge of a heading) and pinned-column offsets
  const [widths, setWidths] = useState<Record<string, number>>({});
  const resizing = useRef<{
    key: string;
    startX: number;
    startWidth: number;
  } | null>(null);
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const r = resizing.current;
      if (!r) return;
      const next = Math.max(64, r.startWidth + (e.clientX - r.startX));
      setWidths((w) => ({ ...w, [r.key]: next }));
    };
    const onUp = () => (resizing.current = null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);
  const widthSx = (c: Column<T>) => {
    const w = widths[c.key];
    return w
      ? {
          width: w,
          minWidth: w,
          maxWidth: w,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap" as const,
        }
      : { width: c.width };
  };

  const headRefs = useRef<Record<string, HTMLElement | null>>({});
  const [offsets, setOffsets] = useState<Record<string, number>>({});
  const pinnedVisible = columns.filter((c) =>
    config.pinnedKeys.includes(c.key),
  );
  const hasPins = pinnedVisible.length > 0;
  useLayoutEffect(() => {
    const next: Record<string, number> = {};
    let left = headRefs.current["__select"]?.offsetWidth ?? 0;
    for (const c of pinnedVisible) {
      next[c.key] = left;
      left += headRefs.current[c.key]?.offsetWidth ?? 0;
    }
    setOffsets((prev) =>
      JSON.stringify(prev) === JSON.stringify(next) ? prev : next,
    );
  });
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);

  const mobileLabel = !showFilters
    ? "Sort"
    : sort
      ? "Sort & Filter"
      : "Filters";
  const toolbarNode = tb &&
    (showSearch || toolbarActions || title || showSheet) && (
      <TableToolbar
        title={title}
        total={total}
        showSearch={showSearch}
        search={search}
        onSearchChange={changeSearch}
        searchDebounceMs={serverMode ? 300 : 0}
        searchPlaceholder={searchPlaceholder}
        columns={allColumnDefs}
        filters={filters}
        activeFilterKeys={activeKeys}
        onRemoveFilter={(k) => changeOneFilter(k, undefined)}
        onClearFilters={clearFilters}
        mobileSheetButton={
          showSheet
            ? { label: mobileLabel, onClick: () => setSheetOpen(true) }
            : undefined
        }
        actions={
          exportButton ? (
            <>
              {exportButton}
              {toolbarActions}
            </>
          ) : (
            toolbarActions
          )
        }
        savedViews={
          sv.enabled ? (
            <SavedViewsMenu
              api={sv}
              dirty={viewDirty}
              onApplyDefault={applyBuiltIn}
              onApplyView={applyView}
              onSave={(name, id) => sv.save(name, currentView, id)}
            />
          ) : undefined
        }
      />
    );

  const empty =
    filtersActive && total === 0 ? (
      <EmptyState
        title="No results match"
        description="Try a different search or remove a filter."
        action={
          <Button variant="secondary" onClick={clearAll}>
            Clear search and filters
          </Button>
        }
      />
    ) : (
      (emptyState ?? (
        <EmptyState
          title="No results"
          description="There is nothing to show here yet."
        />
      ))
    );

  const footer = paginated && total > 0 && (
    <Pagination
      page={safePage}
      pageSize={pageSize}
      total={total}
      onPageChange={changePage}
      onPageSizeChange={
        serverMode && !onPageSizeChange ? undefined : changePageSize
      }
      pageSizeOptions={pageSizeOptions}
    />
  );

  // ============================ PHONE: card list + Sort & Filter sheet
  if (isMobile) {
    const primaryCol = columns.find((c) => c.primary) ?? columns[0];
    const detailCols = columns.filter(
      (c) => c !== primaryCol && !c.hideOnMobile,
    );
    return (
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
        {toolbarNode}
        <Box aria-label={ariaLabel} role="list">
          {loading ? (
            <Stack spacing={1.5} sx={{ p: 1.5 }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} variant="rounded" height={88} />
              ))}
            </Stack>
          ) : visible.length === 0 ? (
            empty
          ) : (
            visible.map((row, i) => {
              const id = getRowId(row);
              const isSel = selected.has(id);
              return (
                <Box
                  key={id}
                  role="listitem"
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  sx={{
                    p: 1.5,
                    bgcolor:
                      isSel || highlightRow?.(row)
                        ? "tint.primary"
                        : "background.paper",
                    borderLeft: highlightRow?.(row) ? 3 : 0,
                    borderLeftColor: "secondary.main",
                    borderBottom: i === visible.length - 1 ? 0 : 1,
                    borderColor: "divider",
                    cursor: onRowClick ? "pointer" : "default",
                  }}
                >
                  <Stack direction="row" alignItems="flex-start" spacing={1}>
                    {selectable && (
                      <Checkbox
                        checked={isSel}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleOne(id)}
                        slotProps={{
                          input: {
                            "aria-label": `Select ${String(primaryCol.accessor?.(row) ?? id)}`,
                          },
                        }}
                        sx={{ mt: -0.5, ml: -0.5 }}
                      />
                    )}
                    <Box
                      sx={{
                        flex: 1,
                        minWidth: 0,
                        fontWeight: 700,
                        fontSize: "1rem",
                        color: "primary.main",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {cellContent(primaryCol, row)}
                    </Box>
                    {rowActions && (
                      <Box onClick={(e) => e.stopPropagation()}>
                        {rowActions(row)}
                      </Box>
                    )}
                  </Stack>
                  {detailCols.length > 0 && (
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: 1.25,
                        mt: 1.25,
                      }}
                    >
                      {detailCols.map((c) => (
                        <Box key={c.key} sx={{ minWidth: 0 }}>
                          <Typography
                            sx={{
                              fontSize: ".75rem",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: ".04em",
                              color: "ink.500",
                            }}
                          >
                            {c.header}
                          </Typography>
                          <Box
                            sx={{
                              fontSize: ".8125rem",
                              lineHeight: 1.4,
                              overflowWrap: "anywhere",
                            }}
                          >
                            {cellContent(c, row)}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              );
            })
          )}
        </Box>
        {footer}

        {showSheet && (
          <Drawer
            anchor="bottom"
            open={sheetOpen}
            onClose={() => setSheetOpen(false)}
            slotProps={{
              paper: {
                sx: {
                  display: "flex",
                  flexDirection: "column",
                  maxHeight: "85vh",
                  borderTopLeftRadius: 12,
                  borderTopRightRadius: 12,
                },
              },
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ p: 2, pb: 1.5, flex: "0 0 auto" }}
            >
              <Typography
                component="h2"
                sx={{
                  fontWeight: 700,
                  fontSize: "1rem",
                  color: "primary.main",
                }}
              >
                {showFilters ? "Sort & Filter" : "Sort"}
              </Typography>
              <IconButton
                aria-label="Close"
                onClick={() => setSheetOpen(false)}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
            <Box
              sx={{
                flex: "1 1 auto",
                minHeight: 0,
                overflow: "auto",
                px: 2,
                pb: 1,
              }}
            >
              <Stack spacing={2}>
                {sortableColumns.length > 0 && (
                  <Stack direction="row" spacing={1.25}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <SelectField
                        label="Sort by"
                        size="small"
                        placeholder="No sort"
                        value={sort?.key ?? ""}
                        onChange={(key) => {
                          setSort(
                            key
                              ? { key, direction: sort?.direction ?? "asc" }
                              : null,
                          );
                          goToFirstPage();
                        }}
                        options={[
                          { value: "", label: "No sort" },
                          ...sortableColumns.map((c) => ({
                            value: c.key,
                            label: c.header,
                          })),
                        ]}
                      />
                    </Box>
                    <Box sx={{ width: 120 }}>
                      <SelectField
                        label="Direction"
                        size="small"
                        disabled={!sort}
                        value={sort?.direction ?? "asc"}
                        onChange={(d) =>
                          sort &&
                          setSort({
                            key: sort.key,
                            direction: d as "asc" | "desc",
                          })
                        }
                        options={[
                          { value: "asc", label: "Asc" },
                          { value: "desc", label: "Desc" },
                        ]}
                      />
                    </Box>
                  </Stack>
                )}
                {showFilters && (
                  <FilterFields
                    columns={allColumnDefs}
                    filters={panelFilters}
                    onChange={changePanelFilter}
                  />
                )}
              </Stack>
            </Box>
            <Stack
              direction="row"
              spacing={1.25}
              sx={{
                flex: "0 0 auto",
                p: 2,
                pt: 1.5,
                borderTop: 1,
                borderColor: "divider",
                bgcolor: "background.paper",
              }}
            >
              <Button
                variant="secondary"
                fullWidth
                onClick={() => {
                  clearFilters();
                  setSort(null);
                }}
              >
                Clear all
              </Button>
              <Button
                fullWidth
                onClick={() => {
                  applyDraft();
                  setSheetOpen(false);
                }}
              >
                Apply
              </Button>
            </Stack>
          </Drawer>
        )}
      </Paper>
    );
  }

  // ============================ DESKTOP / TABLET: table + rail
  const stickyLeft = (key: string): object =>
    config.pinnedKeys.includes(key)
      ? { position: "sticky", left: offsets[key] ?? 0 }
      : {};
  const lastPinnedKey = pinnedVisible[pinnedVisible.length - 1]?.key;
  const pinShadow = "2px 0 4px rgba(30,30,60,0.12)";
  const colSpan = columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0);

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
      {toolbarNode}
      <Box
        sx={{
          display: "flex",
          position: "relative",
          minHeight: railTab === "filters" ? 580 : railTab ? 440 : undefined,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <TableContainer sx={{ maxHeight, overflowX: "auto" }}>
            <Table
              stickyHeader={stickyHeader}
              aria-label={ariaLabel}
              size="small"
            >
              <TableHead>
                <TableRow>
                  {selectable && (
                    <TableCell
                      ref={(el: HTMLElement | null) => {
                        headRefs.current["__select"] = el;
                      }}
                      padding="checkbox"
                      sx={{
                        bgcolor: "primary.dark",
                        ...(hasPins && {
                          position: "sticky",
                          left: 0,
                          zIndex: 3,
                        }),
                      }}
                    >
                      <Checkbox
                        checked={allSelected}
                        indeterminate={someSelected}
                        onChange={toggleAll}
                        slotProps={{
                          input: {
                            "aria-label": "Select all rows on this page",
                          },
                        }}
                        sx={{
                          color: "onPrimary.textMuted",
                          "&.Mui-checked, &.MuiCheckbox-indeterminate": {
                            color: "onPrimary.text",
                          },
                        }}
                      />
                    </TableCell>
                  )}
                  {columns.map((c) => {
                    const active = sort?.key === c.key;
                    const isPinned = config.pinnedKeys.includes(c.key);
                    return (
                      <TableCell
                        key={c.key}
                        ref={(el: HTMLElement | null) => {
                          headRefs.current[c.key] = el;
                        }}
                        align={c.align}
                        aria-sort={
                          active
                            ? sort!.direction === "asc"
                              ? "ascending"
                              : "descending"
                            : undefined
                        }
                        onDragOver={(e) => {
                          if (dragKey) {
                            e.preventDefault();
                            setOverKey(c.key);
                          }
                        }}
                        onDrop={() => {
                          if (dragKey) config.moveBefore(dragKey, c.key);
                          setDragKey(null);
                          setOverKey(null);
                        }}
                        sx={{
                          position: "relative",
                          bgcolor: "primary.dark",
                          color: "onPrimary.text",
                          whiteSpace: "nowrap",
                          userSelect: "none",
                          borderRight: 1,
                          borderColor: "onPrimary.divider",
                          ...widthSx(c),
                          ...hideSx(c),
                          ...stickyLeft(c.key),
                          zIndex: isPinned ? 3 : 1,
                          boxShadow:
                            c.key === lastPinnedKey ? pinShadow : undefined,
                          ...(overKey === c.key &&
                            dragKey !== c.key && {
                              boxShadow: "inset 3px 0 0 #fff",
                            }),
                          opacity: dragKey === c.key ? 0.6 : 1,
                        }}
                      >
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={0.5}
                        >
                          <Box
                            draggable
                            aria-hidden
                            onDragStart={() => setDragKey(c.key)}
                            onDragEnd={() => {
                              setDragKey(null);
                              setOverKey(null);
                            }}
                            sx={{
                              display: "flex",
                              cursor: "grab",
                              color: "onPrimary.textSubtle",
                              "&:hover": { color: "onPrimary.text" },
                            }}
                          >
                            <DragIndicatorIcon sx={{ fontSize: 15 }} />
                          </Box>
                          <Box
                            component="span"
                            role={c.sortable ? "button" : undefined}
                            tabIndex={c.sortable ? 0 : undefined}
                            onClick={() => requestSort(c)}
                            onKeyDown={(e) => {
                              if (
                                c.sortable &&
                                (e.key === "Enter" || e.key === " ")
                              ) {
                                e.preventDefault();
                                requestSort(c);
                              }
                            }}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.25,
                              flex: 1,
                              minWidth: 0,
                              cursor: c.sortable ? "pointer" : "default",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              "&:focus-visible": {
                                outline: "2px solid #fff",
                                outlineOffset: 2,
                              },
                            }}
                          >
                            {c.header}
                            {active &&
                              (sort!.direction === "asc" ? (
                                <ArrowUpwardIcon sx={{ fontSize: 13 }} />
                              ) : (
                                <ArrowDownwardIcon sx={{ fontSize: 13 }} />
                              ))}
                          </Box>
                          {c.help && (
                            <InfoTip
                              onDark
                              size={14}
                              label={`About ${c.header}`}
                            >
                              {c.help}
                            </InfoTip>
                          )}
                          {isPinned && (
                            <PushPinIcon
                              aria-label="Pinned"
                              sx={{
                                fontSize: 13,
                                color: "onPrimary.textSubtle",
                                flex: "0 0 auto",
                              }}
                            />
                          )}
                        </Stack>
                        {/* drag the right edge to resize; double-click to reset */}
                        <Box
                          aria-hidden
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const th = headRefs.current[c.key];
                            resizing.current = {
                              key: c.key,
                              startX: e.clientX,
                              startWidth: th?.offsetWidth ?? 120,
                            };
                          }}
                          onDoubleClick={() =>
                            setWidths((w) => {
                              const n = { ...w };
                              delete n[c.key];
                              return n;
                            })
                          }
                          sx={{
                            position: "absolute",
                            right: 0,
                            top: 0,
                            bottom: 0,
                            width: 6,
                            cursor: "col-resize",
                            "&:hover": { bgcolor: "onPrimary.activeFill" },
                          }}
                        />
                      </TableCell>
                    );
                  })}
                  {rowActions && (
                    <TableCell
                      align="right"
                      sx={{
                        bgcolor: "primary.dark",
                        color: "onPrimary.text",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Actions
                    </TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  Array.from({ length: Math.min(pageSize, 5) }).map((_, r) => (
                    <TableRow key={r}>
                      {selectable && <TableCell padding="checkbox" />}
                      {columns.map((c) => (
                        <TableCell key={c.key} sx={hideSx(c)}>
                          <Skeleton width="70%" />
                        </TableCell>
                      ))}
                      {rowActions && <TableCell />}
                    </TableRow>
                  ))
                ) : visible.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={colSpan} sx={{ borderBottom: 0 }}>
                      {empty}
                    </TableCell>
                  </TableRow>
                ) : (
                  visible.map((row) => {
                    const id = getRowId(row);
                    const isSel = selected.has(id);
                    const hl = !!highlightRow?.(row);
                    const pinBg =
                      isSel || hl ? "tint.primary" : "background.paper";
                    return (
                      <TableRow
                        key={id}
                        hover
                        selected={isSel}
                        onClick={onRowClick ? () => onRowClick(row) : undefined}
                        sx={{
                          cursor: onRowClick ? "pointer" : "default",
                          "&:last-child td": { borderBottom: 0 },
                          "&:hover .pinned-cell": { bgcolor: "surfaceAlt" },
                          ...(hl
                            ? {
                                bgcolor: "tint.primary",
                                "& > td:first-of-type": {
                                  boxShadow: (t) =>
                                    `inset 3px 0 0 ${t.palette.secondary.main}`,
                                },
                              }
                            : {}),
                        }}
                      >
                        {selectable && (
                          <TableCell
                            padding="checkbox"
                            className={hasPins ? "pinned-cell" : undefined}
                            sx={
                              hasPins
                                ? {
                                    position: "sticky",
                                    left: 0,
                                    zIndex: 2,
                                    bgcolor: pinBg,
                                  }
                                : undefined
                            }
                          >
                            <Checkbox
                              checked={isSel}
                              onClick={(e) => e.stopPropagation()}
                              onChange={() => toggleOne(id)}
                              slotProps={{
                                input: { "aria-label": `Select row ${id}` },
                              }}
                            />
                          </TableCell>
                        )}
                        {columns.map((c) => {
                          const isPinned = config.pinnedKeys.includes(c.key);
                          return (
                            <TableCell
                              key={c.key}
                              align={c.align}
                              className={isPinned ? "pinned-cell" : undefined}
                              sx={{
                                ...(c.nowrap && { whiteSpace: "nowrap" }),
                                ...widthSx(c),
                                ...hideSx(c),
                                ...(isPinned && {
                                  ...stickyLeft(c.key),
                                  zIndex: 2,
                                  bgcolor: pinBg,
                                }),
                                boxShadow:
                                  c.key === lastPinnedKey
                                    ? pinShadow
                                    : undefined,
                              }}
                            >
                              {cellContent(c, row)}
                            </TableCell>
                          );
                        })}
                        {rowActions && (
                          <TableCell
                            align="right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {rowActions(row)}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {railTab && (
          <RailPanel
            title={railTab === "columns" ? "Columns" : "Filters"}
            onClose={() => setRailTab(null)}
            panelRef={railPanelRef}
            subheader={
              railTab === "filters" ? (
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Box
                    component="button"
                    type="button"
                    onClick={clearFilters}
                    disabled={activeKeys.length === 0 && !draftDirty}
                    sx={{
                      border: 0,
                      bgcolor: "transparent",
                      font: "inherit",
                      fontSize: ".8125rem",
                      fontWeight: 700,
                      color: "secondary.main",
                      cursor: "pointer",
                      p: 0,
                      "&:disabled": { color: "ink.300", cursor: "default" },
                    }}
                  >
                    Clear filters
                  </Box>
                  {/* Apply sits at the top, next to Clear, so it is always in view (a button at the bottom of a long table is out of sight). */}
                  <Button
                    size="small"
                    disabled={!draftDirty}
                    onClick={applyDraft}
                  >
                    Apply
                  </Button>
                </Stack>
              ) : undefined
            }
          >
            {railTab === "columns" ? (
              <ColumnsPanel
                columns={config.all}
                hiddenKeys={config.hiddenKeys}
                pinnedKeys={config.pinnedKeys}
                maxPinned={maxPinned}
                onToggleHidden={config.toggleHidden}
                onTogglePin={config.togglePin}
                onReset={() => {
                  config.reset();
                  setWidths({});
                }}
              />
            ) : (
              <FilterFields
                columns={allColumnDefs}
                filters={panelFilters}
                onChange={changePanelFilter}
              />
            )}
          </RailPanel>
        )}

        {showRail && (
          <Rail
            tab={railTab}
            onTabChange={setRailTab}
            showColumns={showColumns}
            showFilters={showFilters}
            activeFilterCount={activeKeys.length}
            railRef={railRef}
          />
        )}
      </Box>
      {footer && (
        <Box sx={{ display: "flex", borderTop: 1, borderColor: "divider" }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>{footer}</Box>
          {showRail && (
            <Box
              sx={{
                width: 40,
                flex: "0 0 auto",
                bgcolor: "surfaceAlt",
                borderLeft: 1,
                borderColor: "divider",
              }}
            />
          )}
        </Box>
      )}
    </Paper>
  );
}
