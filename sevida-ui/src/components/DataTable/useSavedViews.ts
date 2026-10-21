import { useCallback, useMemo, useState } from "react";
import { localSavedViewsStore } from "./savedViews";
import type { SavedView, SavedViewDraft, SavedViewsStore } from "./savedViews";

export interface SavedViewsOption {
  /** Names this table's views. Views made for one key are not seen on another. */
  key: string;
  /** Where views are kept. Default: this browser. */
  store?: SavedViewsStore;
}

/** The list of views, which one is on, and which one opens by default, with the actions to change them. */
export function useSavedViews(option: string | SavedViewsOption | undefined) {
  const key = typeof option === "string" ? option : option?.key;
  const store =
    (typeof option === "object" ? option.store : undefined) ??
    localSavedViewsStore;
  const enabled = !!key;

  const [views, setViews] = useState<SavedView[]>(() =>
    key ? store.list(key) : [],
  );
  const [defaultId, setDefaultIdState] = useState<string | null>(() =>
    key ? store.getDefaultId(key) : null,
  );
  const defaultView = useMemo(
    () => views.find((v) => v.id === defaultId) ?? null,
    [views, defaultId],
  );
  const [activeId, setActiveId] = useState<string | null>(
    defaultView?.id ?? null,
  );
  const active = useMemo(
    () => views.find((v) => v.id === activeId) ?? null,
    [views, activeId],
  );

  const refresh = useCallback(
    () => key && setViews(store.list(key)),
    [key, store],
  );

  /** Save a view (new, or over an existing one). The view you save is the one that opens next time. */
  const save = (name: string, draft: SavedViewDraft, id?: string) => {
    if (!key) return null;
    const saved = store.save(key, { id, name, ...draft });
    store.setDefaultId(key, saved.id);
    setDefaultIdState(saved.id);
    setActiveId(saved.id);
    refresh();
    return saved;
  };
  const rename = (id: string, name: string) => {
    if (!key) return;
    store.rename(key, id, name);
    refresh();
  };
  const remove = (id: string) => {
    if (!key) return;
    store.remove(key, id);
    if (defaultId === id) setDefaultIdState(null);
    if (activeId === id) setActiveId(null);
    refresh();
  };
  const setDefault = (id: string | null) => {
    if (!key) return;
    store.setDefaultId(key, id);
    setDefaultIdState(id);
  };

  return {
    enabled,
    views,
    active,
    activeId,
    setActiveId,
    defaultId,
    defaultView,
    save,
    rename,
    remove,
    setDefault,
  };
}
export type SavedViewsApi = ReturnType<typeof useSavedViews>;
