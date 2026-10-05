"use client";

import { useEffect, useRef } from "react";
import { useCartStore } from "@/store/cart";

/**
 * Keeps the client cart in sync with server-computed pricing.
 *
 * Mounted once in the root layout. Any change to `lines` or `couponCode`
 * re-prices the cart via POST /api/cart/price, debounced, and writes the
 * result back into the store. Signed-in users additionally mirror the lines
 * to their server-side cart.
 *
 * This is the single place the money shown anywhere in the UI comes from.
 */
export function CartSync({ isAuthenticated }: { isAuthenticated: boolean }) {
  const lines = useCartStore((s) => s.lines);
  const couponCode = useCartStore((s) => s.couponCode);
  const revision = useCartStore((s) => s.revision);
  const setCart = useCartStore((s) => s.setCart);

  const abortRef = useRef<AbortController | null>(null);
  const firstRun = useRef(true);

  useEffect(() => {
    // Skip the very first pass so a fresh page load does not fire a request
    // for an empty cart.
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/cart/price", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lines, couponCode }),
          signal: controller.signal,
        });
        if (!res.ok) return;
        const json = await res.json();
        if (json?.ok && json.data?.cart) setCart(json.data.cart);
      } catch {
        // Aborted or offline — the previous pricing stays on screen.
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
    // `revision` is the trigger; lines/couponCode are read inside.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision, couponCode]);

  // Mirror to the persisted server cart when signed in.
  useEffect(() => {
    if (!isAuthenticated) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lines, couponCode }),
          signal: controller.signal,
        });
      } catch {
        // Non-critical — the local cart still works.
      }
    }, 600);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision, isAuthenticated, couponCode]);

  return null;
}