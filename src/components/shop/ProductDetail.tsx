"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import {
  Check,
  Minus,
  Plus,
  ShoppingBag,
  ShieldCheck,
  Truck,
  PackageX,
  CheckCircle2,
  Loader2,
  MessageSquarePlus,
} from "lucide-react";

import { cn, formatDate, formatMoney } from "@/lib/utils";
import { siteConfig } from "@/lib/config";
import type { SerializedProduct } from "@/lib/cart";
import { useCartStore } from "@/store/cart";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Rating } from "@/components/ui/Rating";
import { Badge } from "@/components/ui/Primitives";
import { useToast } from "@/components/ui/Toast";

type Review = {
  id: string;
  authorName: string;
  rating: number;
  title: string | null;
  body: string;
  isVerifiedBuyer: boolean;
  createdAt: string;
};

export function ProductDetail({
  product,
  reviews,
  ratingBreakdown,
}: {
  product: SerializedProduct;
  reviews: Review[];
  ratingBreakdown: { stars: number; count: number; percent: number }[];
}) {
  const [imageIndex, setImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [tab, setTab] = useState<"specs" | "reviews" | "warranty">("specs");

  const add = useCartStore((s) => s.add);
  const openDrawer = useCartStore((s) => s.openDrawer);
  const toast = useToast();

  const gallery = product.images.length > 0 ? product.images : [""];
  const soldOut = product.stock <= 0;
  const maxQty = Math.min(product.stock, 99);

  async function handleAdd(buyNow = false) {
    if (soldOut) {
      toast.error("Out of stock", "Message us and we will tell you when it returns.");
      return;
    }

    setAdding(true);
    await new Promise((r) => setTimeout(r, 260));
    add(product.id, quantity);
    setAdding(false);

    if (buyNow) {
      toast.success("Added to cart", "Taking you to checkout…");
      openDrawer();
      return;
    }
    toast.success("Added to cart", `${quantity} × ${product.name}`);
    openDrawer();
  }

  const specEntries = Object.entries(product.specs);

  return (
    <>
      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-2">
        {/* ---- Gallery ---- */}
        <div className="flex flex-col gap-3">
          <div className="relative aspect-square overflow-hidden border border-border-subtle bg-surface-card">
            {gallery[imageIndex] ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={imageIndex}
                  initial={{ opacity: 0, scale: 1.02 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0"
                >
                  <Image
                    src={gallery[imageIndex]}
                    alt={product.name}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className={cn(
                      "object-cover",
                      soldOut ? "opacity-45 grayscale" : "grayscale-[15%] contrast-110",
                    )}
                  />
                </motion.div>
              </AnimatePresence>
            ) : (
              <span className="flex h-full w-full items-center justify-center text-text-muted">
                <ShoppingBag className="h-12 w-12" aria-hidden />
              </span>
            )}

            {/* Corner accents */}
            <div className="pointer-events-none absolute right-0 top-0 h-3 w-3 bg-border-active" />
            <div className="pointer-events-none absolute bottom-0 left-0 h-3 w-3 bg-border-active" />

            {product.discountPercent > 0 ? (
              <Badge tone="blue" className="chamfer absolute left-4 top-4">
                −{product.discountPercent}% OFF
              </Badge>
            ) : null}
          </div>

          {gallery.length > 1 ? (
            <div className="flex gap-2">
              {gallery.map((src, i) => (
                <button
                  key={src}
                  onClick={() => setImageIndex(i)}
                  aria-label={`View image ${i + 1}`}
                  aria-current={i === imageIndex}
                  className={cn(
                    "relative h-20 w-20 overflow-hidden border transition-colors",
                    i === imageIndex
                      ? "border-border-active"
                      : "border-border-subtle hover:border-border-strong",
                  )}
                >
                  <Image src={src} alt="" fill sizes="80px" className="object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* ---- Buy box ---- */}
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-label-tag text-label-tag uppercase tracking-widest text-tertiary">
                {product.brand}
              </span>
              {product.isNew ? <Badge tone="cyan">New</Badge> : null}
              {product.isFeatured ? <Badge tone="outline">Customer Favourite</Badge> : null}
              <span className="font-label-tag text-label-tag text-text-muted">
                {product.sku}
              </span>
            </div>

            <h1 className="font-headline-lg text-headline-lg text-text-primary text-balance">
              {product.name}
            </h1>

            {product.reviewCount > 0 ? (
              <div className="flex items-center gap-3">
                <Rating value={product.rating} showValue />
                <button
                  onClick={() => setTab("reviews")}
                  className="font-body-sm text-body-sm text-text-muted underline-offset-4 transition-colors hover:text-tertiary hover:underline"
                >
                  Read reviews
                </button>
              </div>
            ) : null}

            <p className="font-body-lg text-body-lg text-text-secondary text-pretty">
              {product.summary}
            </p>
          </div>

          {/* Price */}
          <div className="flex items-end gap-4 border-y border-border-subtle py-5">
            <span className="font-label-metric text-label-metric tabular-nums text-text-primary">
              {formatMoney(product.price)}
            </span>
            {product.compareAtPrice && product.compareAtPrice > product.price ? (
              <span className="mb-2 flex flex-col gap-0.5">
                <span className="font-body-sm text-body-sm text-text-muted line-through">
                  {formatMoney(product.compareAtPrice)}
                </span>
                <span className="font-label-tag text-label-tag uppercase text-tertiary">
                  Save {formatMoney(product.compareAtPrice - product.price)}
                </span>
              </span>
            ) : null}
          </div>

          {/* Stock */}
          <div className="flex items-center gap-2">
            {soldOut ? (
              <>
                <PackageX className="h-4 w-4 shrink-0 text-error" aria-hidden />
                <span className="font-label-tag text-label-tag uppercase tracking-widest text-error">
                  Out of stock
                </span>
              </>
            ) : product.isLowStock ? (
              <>
                <span className="h-2 w-2 animate-pulse-dot bg-amber-400" aria-hidden />
                <span className="font-label-tag text-label-tag uppercase tracking-widest text-amber-300">
                  Low stock — only {product.stock} left
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 shrink-0 text-tertiary" aria-hidden />
                <span className="font-label-tag text-label-tag uppercase tracking-widest text-tertiary">
                  In stock — {product.stock} available
                </span>
              </>
            )}
          </div>

          {/* Quantity + actions */}
          {!soldOut ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center border border-border-subtle">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  className="flex h-12 w-12 items-center justify-center text-text-muted transition-colors hover:bg-surface-card-hover hover:text-text-primary disabled:opacity-40"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-4 w-4" aria-hidden />
                </button>
                <span className="w-12 text-center font-label-button text-label-button tabular-nums text-text-primary">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                  disabled={quantity >= maxQty}
                  className="flex h-12 w-12 items-center justify-center text-text-muted transition-colors hover:bg-surface-card-hover hover:text-text-primary disabled:opacity-40"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                </button>
              </div>

              <Button
                onClick={() => handleAdd(false)}
                disabled={adding}
                className="flex-1"
                icon={adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-4 w-4" />}
              >
                {adding ? "Adding" : "Add to cart"}
              </Button>

              <ButtonLink
                href="/checkout"
                variant="secondary"
                className="flex-1"
                onClick={() => add(product.id, quantity)}
              >
                Buy now
              </ButtonLink>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row">
              <ButtonLink
                href={`https://wa.me/${siteConfig.contact.phone.replace("+", "")}?text=${encodeURIComponent(
                  `Hello, is the ${product.name} (${product.sku}) back in stock?`,
                )}`}
                fullWidth
              >
                Ask when it returns
              </ButtonLink>
              <ButtonLink href="/shop?category=accessories" variant="secondary" fullWidth>
                Browse alternatives
              </ButtonLink>
            </div>
          )}

          {/* Trust row */}
          <div className="grid grid-cols-1 gap-px border border-border-subtle bg-border-subtle sm:grid-cols-3">
            {[
              { icon: ShieldCheck, label: "Genuine parts", note: `${product.warrantyMonths}mo warranty` },
              { icon: Truck, label: "Same-day pickup", note: "Tripureshwor store" },
              {
                icon: MessageSquarePlus,
                label: "Free estimate",
                note: "Before any work",
              },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 bg-surface-card p-4">
                <item.icon className="h-4 w-4 shrink-0 text-tertiary" aria-hidden />
                <div className="min-w-0">
                  <div className="truncate font-label-tag text-label-tag uppercase text-text-primary">
                    {item.label}
                  </div>
                  <div className="truncate font-body-sm text-[11px] text-text-muted">
                    {item.note}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---- Tabs ---- */}
      <div className="mt-16 border-t border-border-subtle pt-8">
        <div className="flex flex-wrap gap-1 border-b border-border-subtle" role="tablist">
          {(
            [
              { id: "specs", label: "Specifications" },
              { id: "reviews", label: `Reviews (${product.reviewCount})` },
              { id: "warranty", label: "Warranty & Returns" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "relative px-5 py-3.5 font-label-button text-label-button uppercase tracking-wider transition-colors",
                tab === t.id ? "text-text-primary" : "text-text-muted hover:text-text-secondary",
              )}
            >
              {t.label}
              {tab === t.id ? (
                <motion.span
                  layoutId="product-tab-underline"
                  className="absolute inset-x-0 -bottom-px h-0.5 bg-border-active"
                />
              ) : null}
            </button>
          ))}
        </div>

        <div className="pt-8">
          {tab === "specs" ? (
            <div className="grid grid-cols-1 gap-gutter lg:grid-cols-2">
              <div>
                <h3 className="font-headline-sm text-headline-sm text-text-primary">
                  Overview
                </h3>
                <div className="mt-4 flex flex-col gap-4">
                  {product.description.split("\n\n").map((para, i) => (
                    <p key={i} className="font-body-md text-body-md text-text-secondary text-pretty">
                      {para}
                    </p>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-headline-sm text-headline-sm text-text-primary">
                  Technical specifications
                </h3>
                {specEntries.length > 0 ? (
                  <dl className="mt-4 divide-y divide-border-subtle border-y border-border-subtle">
                    {specEntries.map(([key, value]) => (
                      <div key={key} className="flex items-baseline justify-between gap-6 py-3">
                        <dt className="font-body-sm text-body-sm text-text-muted">{key}</dt>
                        <dd className="text-right font-label-tag text-label-tag uppercase tracking-wider text-text-primary">
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="mt-4 font-body-md text-body-md text-text-muted">
                    No specifications recorded for this item. Ask us at the counter.
                  </p>
                )}
              </div>
            </div>
          ) : null}

          {tab === "reviews" ? (
            <ReviewsPanel product={product} reviews={reviews} breakdown={ratingBreakdown} />
          ) : null}

          {tab === "warranty" ? (
            <div className="grid max-w-3xl grid-cols-1 gap-6 text-pretty">
              <div>
                <h3 className="font-headline-sm text-headline-sm text-text-primary">
                  {product.warrantyMonths}-month warranty
                </h3>
                <p className="mt-3 font-body-md text-body-md text-text-secondary">
                  Covered against manufacturing defects in materials and workmanship. Bring the
                  item and your order reference to the Tripureshwor counter — we will assess it on
                  the spot.
                </p>
              </div>
              <div>
                <h3 className="font-headline-sm text-headline-sm text-text-primary">
                  What is not covered
                </h3>
                <ul className="mt-3 flex flex-col gap-2">
                  {[
                    "Physical damage after delivery, including drops and liquid ingress",
                    "Normal battery degradation under heavy use",
                    "Consumables such as cables and screen protectors once installed",
                    "Software issues caused by third-party apps or custom ROMs",
                  ].map((line) => (
                    <li key={line} className="flex items-start gap-3">
                      <span className="mt-1.5 h-1 w-1 shrink-0 bg-error" />
                      <span className="font-body-md text-body-md text-text-secondary">{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-headline-sm text-headline-sm text-text-primary">
                  7-day return
                </h3>
                <p className="mt-3 font-body-md text-body-md text-text-secondary">
                  Unused items in original packaging can be returned within 7 days for a full
                  refund. Refunds are issued to the original payment method.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

/* ==================================================================== */

function ReviewsPanel({
  product,
  reviews,
  breakdown,
}: {
  product: SerializedProduct;
  reviews: Review[];
  breakdown: { stars: number; count: number; percent: number }[];
}) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [pending, setPending] = useState(false);
  const toast = useToast();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    setPending(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, productId: product.id, rating }),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        toast.error("Could not post", json.error ?? "Please check your review.");
        return;
      }
      toast.success("Review posted", "Thanks — it is live on this page.");
      setOpen(false);
      form.reset();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-gutter lg:grid-cols-3">
      {/* Summary */}
      <div className="border border-border-subtle bg-surface-card p-6">
        <div className="flex items-end gap-3">
          <span className="font-label-metric text-label-metric tabular-nums text-text-primary">
            {product.rating.toFixed(1)}
          </span>
          <div className="pb-2">
            <Rating value={product.rating} size={16} />
            <p className="mt-1 font-body-sm text-[12px] text-text-muted">
              {product.reviewCount} {product.reviewCount === 1 ? "review" : "reviews"}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          {breakdown.map((row) => (
            <div key={row.stars} className="flex items-center gap-3">
              <span className="w-8 shrink-0 font-label-tag text-label-tag text-text-muted">
                {row.stars}★
              </span>
              <div className="h-1 flex-1 overflow-hidden bg-surface-deep">
                <div
                  className="h-full bg-tertiary transition-all duration-700"
                  style={{ width: `${row.percent}%` }}
                />
              </div>
              <span className="w-6 shrink-0 text-right font-body-sm text-[12px] tabular-nums text-text-muted">
                {row.count}
              </span>
            </div>
          ))}
        </div>

        <Button
          variant="secondary"
          fullWidth
          className="mt-6"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Cancel" : "Write a review"}
        </Button>
      </div>

      {/* List + form */}
      <div className="lg:col-span-2">
        <AnimatePresence>
          {open ? (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={submit}
              className="mb-8 flex flex-col gap-4 overflow-hidden border border-border-active bg-surface-card p-6"
            >
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    aria-label={`${star} stars`}
                    className="p-1 text-2xl leading-none transition-transform hover:scale-110"
                  >
                    {star <= rating ? "★" : "☆"}
                  </button>
                ))}
              </div>
              <input type="hidden" name="rating" value={rating} />
              <input
                name="authorName"
                placeholder="Your name"
                className="border border-border-subtle bg-surface-deep px-4 py-3 font-body-sm text-body-sm text-text-primary placeholder:text-text-muted focus:border-border-active focus:outline-none"
              />
              <input
                name="title"
                placeholder="Headline (optional)"
                className="border border-border-subtle bg-surface-deep px-4 py-3 font-body-sm text-body-sm text-text-primary placeholder:text-text-muted focus:border-border-active focus:outline-none"
              />
              <textarea
                name="body"
                required
                rows={4}
                placeholder="How did it hold up?"
                className="border border-border-subtle bg-surface-deep px-4 py-3 font-body-sm text-body-sm text-text-primary placeholder:text-text-muted focus:border-border-active focus:outline-none"
              />
              <Button type="submit" disabled={pending} className="self-start">
                {pending ? "Posting…" : "Post review"}
              </Button>
            </motion.form>
          ) : null}
        </AnimatePresence>

        {reviews.length === 0 ? (
          <p className="border border-dashed border-border-subtle p-10 text-center font-body-md text-body-md text-text-muted">
            No reviews yet. Be the first to share your experience.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border-subtle border-y border-border-subtle">
            {reviews.map((review) => (
              <li key={review.id} className="flex flex-col gap-2 py-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center border border-border-subtle bg-surface-deep font-headline-sm text-[13px] font-bold text-text-primary">
                      {review.authorName.charAt(0).toUpperCase()}
                    </span>
                    <div className="flex flex-col">
                      <span className="font-label-button text-label-button uppercase tracking-wider text-text-primary">
                        {review.authorName}
                      </span>
                      <span className="font-body-sm text-[11px] text-text-muted">
                        {formatDate(review.createdAt)}
                      </span>
                    </div>
                  </div>
                  <Rating value={review.rating} size={13} />
                </div>

                {review.title ? (
                  <h4 className="font-headline-sm text-headline-sm text-text-primary">
                    {review.title}
                  </h4>
                ) : null}
                <p className="font-body-md text-body-md text-text-secondary text-pretty">
                  {review.body}
                </p>
                {review.isVerifiedBuyer ? (
                  <Badge tone="green">
                    <Check className="h-3 w-3" aria-hidden />
                    Verified purchase
                  </Badge>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}