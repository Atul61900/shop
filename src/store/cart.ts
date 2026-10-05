"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * Client cart state.
 *
 * Guests: lines persist to localStorage and prices are fetched from
 * /api/cart/price so the displayed money is always server-computed.
 *
 * Signed-in users: the same lines are mirrored to the server (POST /api/cart)
 * so their cart follows them across devices.
 *
 * The store deliberately holds only ids + quantities — never prices.
 */

export type CartLineInput = { productId: string; quantity: number };

export type PricedLine = {
  productId: string;
  slug: string;
  name: string;
  sku: string;
  image: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  compareAtPrice: number | null;
  stock: number;
  stockShortfall: number;
  isAvailable: boolean;
  isActive: boolean;
};

export type PricedCart = {
  lines: PricedLine[];
  itemCount: number;
  subtotal: number;
  savings: number;
  shippingFee: number;
  discount: number;
  total: number;
  freeShippingThreshold: number;
  amountToFreeShipping: number;
  couponCode: string | null;
  couponError: string | null;
};

const EMPTY_CART: PricedCart = {
  lines: [],
  itemCount: 0,
  subtotal: 0,
  savings: 0,
  shippingFee: 0,
  discount: 0,
  total: 0,
  freeShippingThreshold: 0,
  amountToFreeShipping: 0,
  couponCode: null,
  couponError: null,
};

type CartState = {
  lines: CartLineInput[];
  cart: PricedCart;
  couponCode: string | null;
  isDrawerOpen: boolean;
  isPricing: boolean;
  /** Increments whenever lines change — drives the server repricing effect. */
  revision: number;

  add: (productId: string, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  setCart: (cart: PricedCart) => void;
  setCoupon: (code: string | null) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      cart: EMPTY_CART,
      couponCode: null,
      isDrawerOpen: false,
      isPricing: false,
      revision: 0,

      add: (productId, quantity = 1) =>
        set((state) => {
          const existing = state.lines.find((l) => l.productId === productId);
          const lines = existing
            ? state.lines.map((l) =>
                l.productId === productId
                  ? { ...l, quantity: Math.min(99, l.quantity + quantity) }
                  : l,
              )
            : [...state.lines, { productId, quantity: Math.min(99, quantity) }];
          return { lines, revision: state.revision + 1 };
        }),

      setQuantity: (productId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return {
              lines: state.lines.filter((l) => l.productId !== productId),
              revision: state.revision + 1,
            };
          }
          return {
            lines: state.lines.map((l) =>
              l.productId === productId
                ? { ...l, quantity: Math.min(99, quantity) }
                : l,
            ),
            revision: state.revision + 1,
          };
        }),

      remove: (productId) =>
        set((state) => ({
          lines: state.lines.filter((l) => l.productId !== productId),
          revision: state.revision + 1,
        })),

      clear: () => set((state) => ({ lines: [], revision: state.revision + 1 })),

      setCart: (cart) => set({ cart }),
      setCoupon: (couponCode) => set((state) => ({ couponCode, revision: state.revision + 1 })),
      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),
      toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),
    }),
    {
      name: "kmrc_cart_v1",
      storage: createJSONStorage(() => localStorage),
      // Only the request lines and coupon survive a reload — money and UI
      // flags are always re-derived from the server.
      partialize: (state) => ({
        lines: state.lines,
        couponCode: state.couponCode,
      }),
    },
  ),
);

/** Total units in the badge, preferring the server count. */
export function useCartCount() {
  return useCartStore((s) =>
    s.cart.itemCount > 0
      ? s.cart.itemCount
      : s.lines.reduce((sum, l) => sum + l.quantity, 0),
  );
}