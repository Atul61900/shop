"use client";

import { useSyncExternalStore } from "react";

/**
 * True only after the component has hydrated on the client.
 *
 * Server-side cart state is always empty (localStorage does not exist there),
 * so cart-dependent pages would flash an "empty" state before hydration fills
 * in the real cart. Gating on this hook renders a neutral skeleton instead —
 * no misleading content, no layout shift.
 */
export function useMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

function subscribe() {
  return () => {
    // No teardown — mounted stays true for the lifetime of the page.
  };
}