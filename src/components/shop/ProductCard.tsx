"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { motion } from "motion/react";
import { Plus, Check, ShoppingBag, PackageX } from "lucide-react";
import type { Route } from "next";

import type { SerializedProduct } from "@/lib/cart";
import { cn, formatMoney } from "@/lib/utils";
import { useCartStore } from "@/store/cart";
import { useToast } from "@/components/ui/Toast";
import { Rating } from "@/components/ui/Rating";
import { Badge } from "@/components/ui/Primitives";

export function ProductCard({
  product,
  index = 0,
  priority = false,
  className,
}: {
  product: SerializedProduct;
  index?: number;
  priority?: boolean;
  className?: string;
}) {
  const add = useCartStore((s) => s.add);
  const openDrawer = useCartStore((s) => s.openDrawer);
  const toast = useToast();
  const [justAdded, setJustAdded] = useState(false);

  const soldOut = product.stock <= 0;

  function handleAdd(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (soldOut) {
      toast.error("Out of stock", "We will notify you when this is back in stock.");
      return;
    }

    add(product.id, 1);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1400);
    toast.success("Added to cart", product.name);
    openDrawer();
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 28, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6, delay: Math.min(index * 0.07, 0.42), ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -6 }}
      className={cn(
        "group relative flex flex-col border border-border-subtle bg-surface-card transition-[border-color,box-shadow] duration-300 hover:border-border-active hover:shadow-glow",
        className,
      )}
    >
      {/* ---- Media ---- */}
      <Link
        href={`/shop/${product.slug}` as Route}
        className="relative block aspect-[4/3] overflow-hidden bg-surface-deep"
        aria-label={product.name}
      >
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            priority={priority}
            className={cn(
              "object-cover transition-transform duration-700",
              soldOut ? "opacity-45 grayscale" : "group-hover:scale-105",
            )}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-text-muted">
            <ShoppingBag className="h-8 w-8" aria-hidden />
          </span>
        )}

        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-surface-card to-transparent" />

        {/* Shine sweep on hover */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-2/3 -translate-x-[130%] -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[220%]"
        />

        {/* Badges */}
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {product.discountPercent > 0 && !soldOut ? (
            <Badge tone="blue" className="chamfer">
              −{product.discountPercent}%
            </Badge>
          ) : null}
          {product.isNew && !soldOut ? <Badge tone="cyan">New</Badge> : null}
        </div>

        {soldOut ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="flex items-center gap-2 border border-border-subtle bg-surface-deep/90 px-3 py-1.5 font-label-tag text-label-tag uppercase tracking-widest text-text-secondary">
              <PackageX className="h-3.5 w-3.5" aria-hidden />
              Sold out
            </span>
          </div>
        ) : null}

        {product.isLowStock && !soldOut ? (
          <div className="absolute bottom-2 left-3">
            <Badge tone="amber">Only {product.stock} left</Badge>
          </div>
        ) : null}

        {/* Quick add */}
        {!soldOut ? (
          <button
            onClick={handleAdd}
            aria-label={`Add ${product.name} to cart`}
            className={cn(
              "absolute bottom-0 right-0 flex h-11 w-11 items-center justify-center border-l border-t transition-all duration-300",
              justAdded
                ? "border-tertiary bg-tertiary text-surface-base"
                : "translate-y-full border-border-subtle bg-surface-deep/95 text-text-primary group-hover:translate-y-0 hover:bg-primary-container",
            )}
          >
            {justAdded ? (
              <Check className="h-4 w-4" aria-hidden />
            ) : (
              <Plus className="h-4 w-4" aria-hidden />
            )}
          </button>
        ) : null}
      </Link>

      {/* ---- Body ---- */}
      <div className="flex flex-1 flex-col gap-2.5 p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-label-tag text-label-tag uppercase tracking-widest text-tertiary">
            {product.brand}
          </span>
          {product.reviewCount > 0 ? (
            <Rating value={product.rating} count={product.reviewCount} size={11} />
          ) : null}
        </div>

        <h3 className="font-headline-sm text-[17px] leading-snug text-text-primary">
          <Link
            href={`/shop/${product.slug}` as Route}
            className="link-wipe transition-colors hover:text-tertiary"
          >
            {product.name}
          </Link>
        </h3>

        <p className="line-clamp-2 font-body-sm text-body-sm text-text-secondary">
          {product.summary}
        </p>

        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <div className="flex flex-col">
            <span className="font-label-button text-label-button tabular-nums text-text-primary">
              {formatMoney(product.price)}
            </span>
            {product.compareAtPrice && product.compareAtPrice > product.price ? (
              <span className="font-body-sm text-[12px] text-text-muted line-through">
                {formatMoney(product.compareAtPrice)}
              </span>
            ) : null}
          </div>
          {product.warrantyMonths > 0 ? (
            <span className="font-label-tag text-label-tag uppercase text-text-muted">
              {product.warrantyMonths}mo warranty
            </span>
          ) : null}
        </div>
      </div>
    </motion.article>
  );
}