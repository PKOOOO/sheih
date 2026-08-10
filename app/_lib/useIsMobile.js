"use client";
import { useSyncExternalStore } from "react";

// Single breakpoint for the whole app: phones and small tablets in portrait.
// Kept in JS (rather than CSS media queries) because every view is styled with
// inline style objects, which media queries cannot reach.
export const MOBILE_QUERY = "(max-width: 820px)";

function subscribe(onChange) {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

// Reactive on resize/rotation, and SSR-safe: the server snapshot is always
// `false`, so the desktop layout is what gets prerendered.
export function useIsMobile() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false,
  );
}
