import type { FilterState, SortState } from "./types";

/**
 * A saved view of a table: the chosen filters plus the column setup (order, hidden, pinned) and the sort.
 * Search text, page and column widths are NOT part of a view: they change all the time and nobody
 * means to freeze them.
 */
export interface SavedView {
  id: string;
  name: string;
  /** The filters as they were when saved, including required ones such as a Measurement year. */
  filters: FilterState;
  columns: { order: string[]; hidden: string[]; pinned: string[] };
  sort: SortState | null;
  updatedAt: number;
}

/** What a view is made of before it has an id and a date. */
export type SavedViewDraft = Pick<SavedView, "filters" | "columns" | "sort">;

/**
 * Where views are kept. The built-in store keeps them in this browser (private to the person using it).
 * To keep them on a server later, pass another store with the same five functions.
 * Views are kept per table `key`, because a view made for one table means nothing on another.
 */
export interface SavedViewsStore {
  list: (key: string) => SavedView[];
  /** Create (no `id`) or update (`id`) a view. Returns the saved view. */
  save: (
    key: string,
    view: { id?: string; name: string } & SavedViewDraft,
  ) => SavedView;
  rename: (key: string, id: string, name: string) => void;
  remove: (key: string, id: string) => void;
  /** The view that opens by itself when the table loads. `null` means the built-in Default (no filters, original columns). */
  getDefaultId: (key: string) => string | null;
  setDefaultId: (key: string, id: string | null) => void;
}

const PREFIX = "sevida-ui:views:";
const listKey = (key: string) => `${PREFIX}${key}:list`;
const defaultKey = (key: string) => `${PREFIX}${key}:default`;

function readAll(key: string): SavedView[] {
  try {
    const raw = window.localStorage.getItem(listKey(key));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return []; // private window or blocked storage: act as if there are no views
  }
}
function writeAll(key: string, views: SavedView[]) {
  try {
    window.localStorage.setItem(listKey(key), JSON.stringify(views));
  } catch {
    /* saving quietly does nothing when storage is blocked */
  }
}

export const localSavedViewsStore: SavedViewsStore = {
  list: (key) => readAll(key).sort((a, b) => a.name.localeCompare(b.name)),
  save: (key, view) => {
    const views = readAll(key);
    const id = view.id ?? `v${Date.now()}`;
    const record: SavedView = {
      id,
      name: view.name,
      filters: view.filters,
      columns: view.columns,
      sort: view.sort,
      updatedAt: Date.now(),
    };
    const i = views.findIndex((v) => v.id === id);
    if (i >= 0) views[i] = record;
    else views.push(record);
    writeAll(key, views);
    return record;
  },
  rename: (key, id, name) => {
    const views = readAll(key);
    const i = views.findIndex((v) => v.id === id);
    if (i >= 0) {
      views[i] = { ...views[i], name, updatedAt: Date.now() };
      writeAll(key, views);
    }
  },
  remove: (key, id) => {
    writeAll(
      key,
      readAll(key).filter((v) => v.id !== id),
    );
    if (localSavedViewsStore.getDefaultId(key) === id)
      localSavedViewsStore.setDefaultId(key, null);
  },
  getDefaultId: (key) => {
    try {
      return window.localStorage.getItem(defaultKey(key));
    } catch {
      return null;
    }
  },
  setDefaultId: (key, id) => {
    try {
      if (id === null) window.localStorage.removeItem(defaultKey(key));
      else window.localStorage.setItem(defaultKey(key), id);
    } catch {
      /* ignore */
    }
  },
};

/** Same value, whatever the order the keys were written in. */
function stable(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(stable);
  if (v && typeof v === "object")
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, x]) => [k, stable(x)]),
    );
  return v;
}
export const sameJson = (a: unknown, b: unknown) =>
  JSON.stringify(stable(a)) === JSON.stringify(stable(b));

/** True when two column setups are the same (hidden is compared without regard to order). */
export function sameColumns(
  a: SavedView["columns"],
  b: SavedView["columns"],
): boolean {
  const sorted = (x: string[]) => [...x].sort();
  return (
    sameJson(a.order, b.order) &&
    sameJson(sorted(a.hidden), sorted(b.hidden)) &&
    sameJson(a.pinned, b.pinned)
  );
}
