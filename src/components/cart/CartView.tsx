"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  ArrowRight,
  Truck,
  Tag,
  X,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import type { Route } from "next";

import { cn, formatMoney, percent } from "@/lib/utils";
import { useMounted } from "@/lib/use-mounted";
import { useCartStore } from "@/store/cart";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState, Badge } from "@/components/ui/Primitives";
import { ProgressBar } from "@/components/motion/Telemetry";
import { useToast } from "@/components/ui/Toast";
import { LineSkeleton } from "@/components/shop/Skeletons";

export function CartView() {
  const mounted = useMounted();
  const cart = useCartStore((s) => s.cart);
  const lines = useCartStore((s) => s.lines);
  const isPricing = useCartStore((s) => s.isPricing);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const remove = useCartStore((s) => s.remove);
  const clear = useCartStore((s) => s.clear);
  const setCoupon = useCartStore((s) => s.setCoupon);

  const [couponInput, setCouponInput] = useState("");
  const toast = useToast();

  const hasBlocked = cart.lines.some((l) => !l.isAvailable || !l.isActive);
  const freeShippingPercent = percent(cart.subtotal - cart.discount, cart.freeShippingThreshold);

  function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCoupon(code);
    setCouponInput("");
    // CartSync re-prices automatically; the result surfaces as a toast.
    toast.info("Applying code", code);
  }

  // Before hydration the server cart is empty by definition — show a skeleton
  // rather than a misleading "empty" state that would flash away.
  if (!mounted) {
    return <LineSkeleton rows={4} />;
  }

  // The list below renders priced rows, but pricing lags the local lines by a
  // request. Show a skeleton while prices are in flight rather than an empty
  // list that contradicts the header badge.
  if (lines.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag className="h-6 w-6" aria-hidden />}
        title="Your cart is empty"
        description="Browse genuine accessories and repair tools. Everything you add is reserved against live stock."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink href="/shop">Start shopping</ButtonLink>
            <ButtonLink href="/services" variant="secondary">
              Repair services
            </ButtonLink>
          </div>
        }
      />
    );
  }

  if (cart.lines.length === 0) {
    return <LineSkeleton rows={Math.min(lines.length + 1, 5)} />;
  }

  return (
    <div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
      {/* ---- Lines ---- */}
      <div className="flex flex-col gap-4 lg:col-span-8">
        {/* Free shipping meter */}
        <div className="border border-border-subtle bg-surface-card p-5">
          {cart.amountToFreeShipping > 0 ? (
            <>
              <div className="flex items-center gap-2.5">
                <Truck className="h-4 w-4 shrink-0 text-tertiary" aria-hidden />
                <p className="font-body-md text-body-md text-text-secondary">
                  Add{" "}
                  <strong className="font-semibold text-text-primary">
                    {formatMoney(cart.amountToFreeShipping)}
                  </strong>{" "}
                  more for free delivery inside Kathmandu
                </p>
              </div>
              <ProgressBar value={freeShippingPercent} tone="cyan" className="mt-3" />
            </>
          ) : (
            <div className="flex items-center gap-2.5">
              <Badge tone="green" dot>
                Free delivery unlocked
              </Badge>
              <span className="font-body-sm text-body-sm text-text-muted">
                Your order ships free.
              </span>
            </div>
          )}
        </div>

        {hasBlocked ? (
          <div className="flex items-start gap-3 border border-amber-500/40 bg-amber-500/5 p-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
            <p className="font-body-sm text-body-sm text-text-primary">
              Some items are no longer available. Remove them to continue to checkout.
            </p>
          </div>
        ) : null}

        <ul className="border border-border-subtle bg-surface-card">
          <AnimatePresence initial={false}>
            {cart.lines.map((line) => (
              <motion.li
                key={line.productId}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden border-b border-border-subtle last:border-b-0"
              >
                <div className="flex flex-col gap-4 p-5 sm:flex-row">
                  <Link
                    href={`/shop/${line.slug}` as Route}
                    className="relative h-28 w-28 shrink-0 overflow-hidden border border-border-subtle bg-surface-deep"
                  >
                    {line.image ? (
                      <Image
                        src={line.image}
                        alt={line.name}
                        fill
                        sizes="112px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-text-muted">
                        <ShoppingBag className="h-5 w-5" aria-hidden />
                      </span>
                    )}
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <Link
                          href={`/shop/${line.slug}` as Route}
                          className="font-headline-sm text-[17px] leading-snug text-text-primary transition-colors hover:text-tertiary"
                        >
                          {line.name}
                        </Link>
                        <span className="mt-1 block font-label-tag text-label-tag text-text-muted">
                          {line.sku}
                        </span>
                      </div>
                      <button
                        onClick={() => remove(line.productId)}
                        aria-label={`Remove ${line.name} from cart`}
                        className="shrink-0 p-1.5 text-text-muted transition-colors hover:text-error"
                      >
                        <X className="h-4 w-4" aria-hidden />
                      </button>
                    </div>

                    {!line.isAvailable ? (
                      <Badge tone="red">Out of stock — remove to continue</Badge>
                    ) : line.stockShortfall > 0 ? (
                      <Badge tone="amber">
                        Only {line.stock} left — reduce quantity to {line.stock}
                      </Badge>
                    ) : null}

                    <div className="mt-auto flex flex-wrap items-center justify-between gap-4 pt-2">
                      <div className="flex items-center border border-border-subtle">
                        <button
                          onClick={() => setQuantity(line.productId, line.quantity - 1)}
                          className="flex h-10 w-10 items-center justify-center text-text-muted transition-colors hover:bg-surface-card-hover hover:text-text-primary"
                          aria-label={`Decrease quantity of ${line.name}`}
                        >
                          {line.quantity === 1 ? (
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          ) : (
                            <Minus className="h-3.5 w-3.5" aria-hidden />
                          )}
                        </button>
                        <span className="w-10 text-center font-label-button text-label-button tabular-nums text-text-primary">
                          {line.quantity}
                        </span>
                        <button
                          onClick={() => setQuantity(line.productId, line.quantity + 1)}
                          disabled={line.stockShortfall > 0}
                          className="flex h-10 w-10 items-center justify-center text-text-muted transition-colors hover:bg-surface-card-hover hover:text-text-primary disabled:opacity-40"
                          aria-label={`Increase quantity of ${line.name}`}
                        >
                          <Plus className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </div>

                      <div className="flex items-baseline gap-3">
                        {line.compareAtPrice && line.compareAtPrice > line.unitPrice ? (
                          <span className="font-body-sm text-body-sm text-text-muted line-through">
                            {formatMoney(line.compareAtPrice * line.quantity)}
                          </span>
                        ) : null}
                        <span className="font-label-button text-label-button tabular-nums text-text-primary">
                          {formatMoney(line.lineTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        <div className="flex justify-between">
          <ButtonLink href="/shop" variant="ghost" size="sm">
            Continue shopping
          </ButtonLink>
          <button
            onClick={() => {
              clear();
              toast.info("Cart cleared");
            }}
            className="font-label-tag text-label-tag uppercase tracking-widest text-text-muted transition-colors hover:text-error"
          >
            Empty cart
          </button>
        </div>
      </div>

      {/* ---- Summary ---- */}
      <aside className="lg:col-span-4">
        <div className="sticky top-28 border border-border-subtle bg-surface-card">
          <div className="border-b border-border-subtle p-6">
            <h2 className="font-headline-sm text-headline-sm text-text-primary">
              Order summary
            </h2>
          </div>

          {/* Coupon */}
          <div className="border-b border-border-subtle p-6">
            <div className="flex items-center gap-2 font-label-tag text-label-tag uppercase tracking-widest text-text-muted">
              <Tag className="h-3.5 w-3.5" aria-hidden />
              Promo code
            </div>
            {cart.couponCode ? (
              <div className="mt-3 flex items-center justify-between border border-tertiary/30 bg-tertiary/5 px-4 py-3">
                <span className="font-label-button text-label-button text-tertiary">
                  {cart.couponCode}
                </span>
                <button
                  onClick={() => setCoupon(null)}
                  className="font-label-tag text-label-tag uppercase text-text-muted hover:text-error"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="mt-3 flex">
                <label htmlFor="coupon" className="sr-only">
                  Promo code
                </label>
                <input
                  id="coupon"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyCoupon();
                    }
                  }}
                  placeholder="KMRC10"
                  className="min-w-0 flex-1 border border-r-0 border-border-subtle bg-surface-deep px-4 py-3 font-label-tag text-label-tag uppercase text-text-primary placeholder:text-text-muted focus:border-border-active focus:outline-none"
                />
                <Button variant="secondary" onClick={applyCoupon}>
                  Apply
                </Button>
              </div>
            )}

            {cart.couponError ? (
              <p className="mt-2 font-body-sm text-[12px] text-error">{cart.couponError}</p>
            ) : null}
            {!cart.couponCode ? (
              <p className="mt-2 font-body-sm text-[12px] text-text-muted">
                Try <code className="text-tertiary">KMRC10</code> or{" "}
                <code className="text-tertiary">CONNECT5</code>
              </p>
            ) : null}
          </div>

          {/* Totals */}
          <dl className="flex flex-col gap-3 p-6">
            <Row label="Subtotal" value={formatMoney(cart.subtotal)} />
            {cart.discount > 0 ? (
              <Row label="Discount" value={`− ${formatMoney(cart.discount)}`} tone="cyan" />
            ) : null}
            <Row
              label="Delivery"
              value={cart.shippingFee === 0 ? "FREE" : formatMoney(cart.shippingFee)}
              tone={cart.shippingFee === 0 ? "cyan" : undefined}
            />
            <div className="my-1 h-px bg-border-subtle" />
            <div className="flex items-baseline justify-between">
              <dt className="font-label-tag text-label-tag uppercase tracking-widest text-text-muted">
                Total
              </dt>
              <dd className="font-label-metric text-[30px] tabular-nums text-text-primary">
                {formatMoney(cart.total)}
              </dd>
            </div>
          </dl>

          <div className="flex flex-col gap-3 border-t border-border-subtle p-6">
            <ButtonLink
              href="/checkout"
              fullWidth
              disabled={hasBlocked || isPricing}
              trailing={isPricing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            >
              Proceed to checkout
            </ButtonLink>
<p className="text-center font-body-sm text-[12px] text-text-muted">
              Cash on delivery & eSewa accepted
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "cyan" }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="font-body-sm text-body-sm text-text-secondary">{label}</dt>
      <dd
        className={cn(
          "font-label-button text-label-button tabular-nums",
          tone === "cyan" ? "text-tertiary" : "text-text-primary",
        )}
      >
        {value}
      </dd>
    </div>
  );
}