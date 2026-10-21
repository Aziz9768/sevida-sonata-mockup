import { useCallback, useEffect, useMemo, useState } from "react";
import type { Column } from "./types";

interface Saved {
  order: string[];
  hidden: string[];
  pinned: string[];
}

const PREFIX = "sevida-ui:table:";

function load(key?: string): Saved | null {
  if (!key) return null;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<Saved>;
    return {
      order: v.order ?? [],
      hidden: v.hidden ?? [],
      pinned: v.pinned ?? [],
    };
  } catch {
    return null; // private window, blocked storage...: just use the defaults
  }
}

function save(key: string | undefined, value: Saved | null) {
  if (!key) return;
  try {
    if (value) window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    else window.localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

export const isLocked = <T>(c: Column<T>) => c.alwaysVisible || c.primary;

/**
 * Which columns are shown, in what order, and which are pinned (kept in view while scrolling sideways).
 * Starts from each column's `defaultHidden`, then follows what the user chose in the Columns panel
 * or by dragging a column heading. If `storageKey` is given the choice is remembered in this browser.
 * New columns added later in code appear automatically.
 */
export function useColumnConfig<T>(
  columns: Column<T>[],
  storageKey?: string,
  maxPinned = 3,
) {
  const [saved, setSaved] = useState<Saved | null>(() => load(storageKey));

  const defaultHidden = useMemo(
    () =>
      columns.filter((c) => c.defaultHidden && !isLocked(c)).map((c) => c.key),
    [columns],
  );

  const defaultPinned = useMemo(
    () =>
      columns
        .filter((c) => c.defaultPinned)
        .map((c) => c.key)
        .slice(0, maxPinned),
    [columns, maxPinned],
  );

  /** Every column in the user's order (hidden ones included). */
  const all = useMemo(() => {
    const byKey = new Map(columns.map((c) => [c.key, c]));
    const order = saved ? saved.order.filter((k) => byKey.has(k)) : [];
    const rest = columns.map((c) => c.key).filter((k) => !order.includes(k));
    return [...order, ...rest].map((k) => byKey.get(k)!);
  }, [columns, saved]);

  const hiddenKeys = useMemo(
    () => new Set(saved ? saved.hidden : defaultHidden),
    [saved, defaultHidden],
  );
  const pinnedKeys = useMemo(
    () =>
      (saved ? saved.pinned : defaultPinned).filter((k) =>
        all.some((c) => c.key === k),
      ),
    [saved, all, defaultPinned],
  );

  /** The columns to draw: pinned ones first, then the rest. */
  const visible = useMemo(() => {
    const shown = all.filter((c) => isLocked(c) || !hiddenKeys.has(c.key));
    return [
      ...shown.filter((c) => pinnedKeys.includes(c.key)),
      ...shown.filter((c) => !pinnedKeys.includes(c.key)),
    ];
  }, [all, hiddenKeys, pinnedKeys]);

  const commit = useCallback(
    (next: Saved | null) => {
      setSaved(next);
      save(storageKey, next);
    },
    [storageKey],
  );

  const snapshot = (): Saved => ({
    order: all.map((c) => c.key),
    hidden: [...hiddenKeys],
    pinned: pinnedKeys,
  });

  const toggleHidden = (key: string) => {
    const hidden = new Set(hiddenKeys);
    if (hidden.has(key)) hidden.delete(key);
    else hidden.add(key);
    commit({ ...snapshot(), hidden: [...hidden] });
  };

  const togglePin = (key: string) => {
    if (pinnedKeys.includes(key))
      commit({ ...snapshot(), pinned: pinnedKeys.filter((k) => k !== key) });
    else if (pinnedKeys.length < maxPinned)
      commit({ ...snapshot(), pinned: [...pinnedKeys, key] });
  };

  /** Drag-and-drop: put `dragKey` where `overKey` is. */
  const moveBefore = (dragKey: string, overKey: string) => {
    if (dragKey === overKey) return;
    const order = all.map((c) => c.key).filter((k) => k !== dragKey);
    order.splice(order.indexOf(overKey), 0, dragKey);
    commit({ ...snapshot(), order });
  };

  const reset = () => commit(null);

  /** Put a whole column setup in place at once (used when a saved view is applied). */
  const apply = (next: Saved) =>
    commit({
      order: next.order,
      hidden: next.hidden,
      pinned: next.pinned.slice(0, maxPinned),
    });

  // If the saved choice was made for an older version of the table, drop keys that no longer exist.
  useEffect(() => {
    if (!saved) return;
    const keys = new Set(columns.map((c) => c.key));
    if ([...saved.hidden, ...saved.pinned].some((k) => !keys.has(k))) {
      commit({
        order: saved.order.filter((k) => keys.has(k)),
        hidden: saved.hidden.filter((k) => keys.has(k)),
        pinned: saved.pinned.filter((k) => keys.has(k)),
      });
    }
  }, [columns, saved, commit]);

  return {
    all,
    visible,
    hiddenKeys,
    pinnedKeys,
    maxPinned,
    toggleHidden,
    togglePin,
    moveBefore,
    reset,
    apply,
    defaultHidden,
    defaultPinned,
    customised: saved !== null,
  };
}
