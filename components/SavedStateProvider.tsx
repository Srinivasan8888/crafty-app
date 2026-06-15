"use client";

// Shared client-side cache of the signed-in user's saved set, fetched once from
// GET /api/saves. SaveButton reads this so every heart renders with its true
// saved state on load (the fix for empty-hearts-on-revisit and the silent
// un-save that followed). Lives in the root layout, so it persists across
// client navigations and only fetches on a full page load.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type SavedState = {
  loaded: boolean;
  isSaved: (key: string) => boolean;
  setSaved: (key: string, value: boolean) => void;
};

const SavedContext = createContext<SavedState | null>(null);

export function SavedStateProvider({ children }: { children: React.ReactNode }) {
  const [set, setSet] = useState<Set<string>>(() => new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/saves", { headers: { Accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : { saved: [] }))
      .then((d: { saved?: string[] }) => {
        if (cancelled) return;
        setSet(new Set(d.saved ?? []));
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isSaved = useCallback((key: string) => set.has(key), [set]);

  const setSaved = useCallback((key: string, value: boolean) => {
    setSet((prev) => {
      if (value === prev.has(key)) return prev;
      const next = new Set(prev);
      if (value) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  return (
    <SavedContext.Provider value={{ loaded, isSaved, setSaved }}>
      {children}
    </SavedContext.Provider>
  );
}

export function useSavedState(): SavedState | null {
  return useContext(SavedContext);
}
