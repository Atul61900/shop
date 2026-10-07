"use client";

import { useEffect, useRef, useState } from "react";
import { useCartStore } from "@/store/cart";
import { useToast } from "@/components/ui/Toast";

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
  const setPricing = useCartStore((s) => s.setPricing);
  const removeMany = useCartStore((s) => s.removeMany);
  const toast = useToast();

  const abortRef = useRef<AbortController | null>(null);
  const firstRun = useRef(true);
  // Bumped to force a re-price outside the normal revision flow (mount with
  // items, tab refocus with a divergence). Guarantees the priced cart
  // converges even if a fetch failed, was aborted, or raced a rehydration.
  const [syncTick, setSyncTick] = useState(0);

  useEffect(() => {
    const onFocus = () => {
      const state = useCartStore.getState();
      if (state.lines.length > 0) {
        const pricedIds = new Set(state.cart.lines.map((l) => l.productId));
        const missing = state.lines.some((l) => !pricedIds.has(l.productId));
        if (missing || state.cart.lines.length === 0) setSyncTick((t) => t + 1);
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  useEffect(() => {
    // On a fresh load the priced cart is empty by definition (only lines and
    // the coupon survive a reload). Skip the request solely when there is
    // nothing to price — otherwise the header, drawer and cart page disagree
    // until the next cart change.
    if (firstRun.current) {
      firstRun.current = false;
      if (lines.length === 0 && !couponCode) return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setPricing(true);
    const sent = lines;
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/cart/price", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lines: sent, couponCode }),
          signal: controller.signal,
        });
        if (!res.ok) return;
        const json = await res.json();
        if (!json?.ok || !json.data?.cart) return;
        setCart(json.data.cart);

        // The server drops lines whose product no longer exists (deleted in
        // the admin panel). Prune those ids locally, or the badge counts
        // ghosts that no surface can render or remove.
        const alive = new Set<string>(
          (json.data.cart.lines as { productId: string }[]).map((l) => l.productId),
        );
        const dead = sent.map((l) => l.productId).filter((id) => !alive.has(id));
        if (dead.length > 0) {
          removeMany(dead);
          toast.info(
            dead.length === 1 ? "Item removed" : "Items removed",
            "No longer available — taken out of your cart.",
          );
        }
      } catch {
        // Aborted or offline — the previous pricing stays on screen.
      } finally {
        // Read fresh state: a newer pass may already be pricing.
        if (!abortRef.current || abortRef.current === controller) {
          setPricing(false);
        }
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
      // A cleared pass must not leave the checkout buttons stuck loading.
      setPricing(false);
    };
    // `revision` is the trigger; lines/couponCode are read inside.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision, couponCode, syncTick]);

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