"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Loader2, Truck } from "lucide-react";
import type { Route } from "next";

import { formatMoney, percent } from "@/lib/utils";
import { useCartStore } from "@/store/cart";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Primitives";
import { ProgressBar } from "@/components/motion/Telemetry";

export function CartDrawer() {
  const isOpen = useCartStore((s) => s.isDrawerOpen);
  const close = useCartStore((s) => s.closeDrawer);
  const cart = useCartStore((s) => s.cart);
  const isPricing = useCartStore((s) => s.isPricing);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const remove = useCartStore((s) => s.remove);

  // Lock scroll + trap Escape while open.
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, close]);

  const freeShippingPercent = percent(cart.subtotal - cart.discount, cart.freeShippingThreshold);

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-[60] bg-surface-deep/80 backdrop-blur-sm"
            onClick={close}
            aria-hidden
          />

          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.36, ease: [0.32, 0.72, 0, 1] }}
            className="fixed inset-y-0 right-0 z-[61] flex w-[min(94vw,440px)] flex-col border-l border-border-subtle bg-surface-base"
            role="dialog"
            aria-modal="true"
            aria-label="Shopping cart"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="h-4 w-4 text-tertiary" aria-hidden />
                <h2 className="font-headline-sm text-headline-sm text-text-primary">
                  Your Cart
                  <span className="ml-2 font-body-sm text-text-muted">
                    ({cart.itemCount} {cart.itemCount === 1 ? "item" : "items"})
                  </span>
                </h2>
              </div>
              <button
                onClick={close}
                className="font-label-tag text-label-tag uppercase tracking-widest text-text-muted transition-colors hover:text-text-primary"
              >
                Close
              </button>
            </div>

            {/* Free-shipping meter */}
            {cart.itemCount > 0 && cart.amountToFreeShipping > 0 ? (
              <div className="flex flex-col gap-2 border-b border-border-subtle bg-surface-card px-5 py-3">
                <div className="flex items-center gap-2 font-body-sm text-body-sm text-text-secondary">
                  <Truck className="h-3.5 w-3.5 shrink-0 text-tertiary" aria-hidden />
                  <span>
                    Add{" "}
                    <strong className="font-semibold text-text-primary">
                      {formatMoney(cart.amountToFreeShipping, { withCode: false })}
                    </strong>{" "}
                    for free delivery
                  </span>
                </div>
                <ProgressBar value={freeShippingPercent} tone="cyan" />
              </div>
            ) : null}

            {/* Lines */}
            <div className="flex-1 overflow-y-auto">
              {cart.lines.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    icon={<ShoppingBag className="h-6 w-6" aria-hidden />}
                    title="Your cart is empty"
                    description="Browse genuine accessories, tools and repair services from the counter."
                    action={
                      <ButtonLink href="/shop" onClick={close} variant="primary">
                        Start shopping
                      </ButtonLink>
                    }
                  />
                </div>
              ) : (
                <ul className="divide-y divide-border-subtle">
                  <AnimatePresence initial={false}>
                    {cart.lines.map((line) => (
                      <motion.li
                        key={line.productId}
                        layout
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="flex gap-4 p-5">
                          {/* Thumb */}
                          <Link
                            href={`/shop/${line.slug}` as Route}
                            onClick={close}
                            className="relative h-20 w-20 shrink-0 overflow-hidden border border-border-subtle bg-surface-deep"
                          >
                            {line.image ? (
                              <Image
                                src={line.image}
                                alt={line.name}
                                fill
                                sizes="80px"
                                className="object-cover"
                              />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center text-text-muted">
                                <ShoppingBag className="h-5 w-5" aria-hidden />
                              </span>
                            )}
                          </Link>

                          {/* Details */}
                          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                            <Link
                              href={`/shop/${line.slug}` as Route}
                              onClick={close}
                              className="line-clamp-2 font-body-md text-body-md text-text-primary transition-colors hover:text-tertiary"
                            >
                              {line.name}
                            </Link>
                            <span className="font-label-tag text-label-tag text-text-muted">
                              {line.sku}
                            </span>

                            {!line.isAvailable ? (
                              <span className="font-label-tag text-label-tag text-error">
                                OUT OF STOCK
                              </span>
                            ) : line.stockShortfall > 0 ? (
                              <span className="font-label-tag text-label-tag text-amber-300">
                                ONLY {line.stock} LEFT
                              </span>
                            ) : null}

                            <div className="mt-1 flex items-center justify-between gap-3">
                              {/* Stepper */}
                              <div className="flex items-center border border-border-subtle">
                                <button
                                  onClick={() => setQuantity(line.productId, line.quantity - 1)}
                                  className="flex h-8 w-8 items-center justify-center text-text-muted transition-colors hover:bg-surface-card-hover hover:text-text-primary"
                                  aria-label={`Decrease quantity of ${line.name}`}
                                >
                                  {line.quantity === 1 ? (
                                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                                  ) : (
                                    <Minus className="h-3.5 w-3.5" aria-hidden />
                                  )}
                                </button>
                                <span className="w-8 text-center font-label-button text-label-button tabular-nums text-text-primary">
                                  {line.quantity}
                                </span>
                                <button
                                  onClick={() => setQuantity(line.productId, line.quantity + 1)}
                                  disabled={line.stockShortfall > 0}
                                  className="flex h-8 w-8 items-center justify-center text-text-muted transition-colors hover:bg-surface-card-hover hover:text-text-primary disabled:opacity-40"
                                  aria-label={`Increase quantity of ${line.name}`}
                                >
                                  <Plus className="h-3.5 w-3.5" aria-hidden />
                                </button>
                              </div>

                              <span className="font-label-button text-label-button tabular-nums text-text-primary">
                                {formatMoney(line.lineTotal)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end px-5 pb-3">
                          <button
                            onClick={() => remove(line.productId)}
                            className="font-label-tag text-label-tag uppercase tracking-widest text-text-muted transition-colors hover:text-error"
                          >
                            Remove
                          </button>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>

            {/* Footer / totals */}
            {cart.lines.length > 0 ? (
              <div className="border-t border-border-subtle bg-surface-card p-5">
                <dl className="flex flex-col gap-2">
                  <Row label="Subtotal" value={formatMoney(cart.subtotal)} />
                  {cart.discount > 0 ? (
                    <Row
                      label={`Discount${cart.couponCode ? ` (${cart.couponCode})` : ""}`}
                      value={`− ${formatMoney(cart.discount)}`}
                      tone="cyan"
                    />
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
                    <dd className="font-label-metric text-[28px] tabular-nums text-text-primary">
                      {formatMoney(cart.total)}
                    </dd>
                  </div>
                </dl>

                <div className="mt-5 flex flex-col gap-2.5">
                  <ButtonLink
                    href="/checkout"
                    onClick={close}
                    fullWidth
                    trailing={isPricing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  >
                    Checkout
                  </ButtonLink>
                  <ButtonLink href="/cart" onClick={close} variant="secondary" fullWidth>
                    View full cart
                  </ButtonLink>
                </div>

                <p className="mt-4 text-center font-body-sm text-[12px] text-text-muted">
                  Cash on delivery, eSewa &amp; Khalti accepted
                </p>
              </div>
            ) : null}
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "cyan";
}) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="font-body-sm text-body-sm text-text-secondary">{label}</dt>
      <dd
        className={
          tone === "cyan"
            ? "font-label-button text-label-button tabular-nums text-tertiary"
            : "font-body-sm text-body-sm tabular-nums text-text-primary"
        }
      >
        {value}
      </dd>
    </div>
  );
}

/** Compact "added to cart" pulse shown on product cards. */
export function CartFlash({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show ? (
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center bg-tertiary text-surface-base"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
        </motion.span>
      ) : null}
    </AnimatePresence>
  );
}