import type { Metadata } from "next";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { serializeProduct } from "@/lib/cart";
import { SectionEyebrow } from "@/components/ui/Primitives";
import { Reveal } from "@/components/motion/Reveal";
import { CountUp } from "@/components/motion/Telemetry";
import { ProductCard } from "@/components/shop/ProductCard";

export const metadata: Metadata = {
  title: "Shop Accessories & Repair Tools",
  description:
    "Buy genuine chargers, cases, cables, screen protection and repair tools from Krishna Mobile Repairing Center, Kathmandu. COD, eSewa and Khalti accepted.",
  alternates: { canonical: "/shop" },
};

export default async function ShopPage() {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      products: {
        where: { isActive: true },
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
        include: { category: { select: { slug: true, name: true } } },
      },
    },
  });

  const total = categories.reduce((sum, c) => sum + c.products.length, 0);

  return (
    <>
      {/* ---- Header ---- */}
      <section className="relative overflow-hidden border-b border-border-subtle bg-surface-base">
        <div className="bg-tech-grid pointer-events-none absolute inset-0 opacity-15" />
        <div className="pointer-events-none absolute -right-24 top-0 h-[380px] w-[380px] rounded-full bg-primary-container/10 blur-[130px]" />

        <div className="relative z-10 mx-auto max-w-7xl px-margin-mobile py-12 lg:px-margin lg:py-16">
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 font-label-tag text-label-tag text-text-muted">
              <li>
                <Link href="/" className="transition-colors hover:text-tertiary">
                  Home
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li className="text-text-primary">Shop</li>
            </ol>
          </nav>

          <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-3">
              <SectionEyebrow>Counter Stock</SectionEyebrow>
              <h1 className="font-display-hero text-display-hero-mobile text-text-primary lg:text-display-hero">
                Shop
              </h1>
              <p className="max-w-xl font-body-md text-body-md text-text-secondary text-pretty">
                Everything on this shelf is physically in our Tripureshwor store. Prices are what
                you pay at the counter.
              </p>
            </div>
            <div className="flex flex-col gap-1 text-right">
              <span className="font-label-metric text-[36px] leading-none text-text-primary">
                <CountUp value={total} />
              </span>
              <span className="font-label-tag text-label-tag uppercase text-text-muted">
                Products listed
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Category sections ---- */}
      {categories.map((category, sectionIndex) => (
        <section
          key={category.slug}
          className={
            sectionIndex % 2 === 0
              ? "border-b border-border-subtle bg-surface-base py-14 lg:py-20"
              : "border-b border-border-subtle bg-surface-deep py-14 lg:py-20"
          }
        >
          <div className="mx-auto max-w-7xl px-margin-mobile lg:px-margin">
            <Reveal className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="flex max-w-2xl flex-col gap-3">
                <div className="inline-flex items-center gap-2">
                  {/* Uses the category's own accent, chosen in the admin panel. */}
                  <span
                    className="h-2 w-0.5"
                    style={{ backgroundColor: category.accent }}
                  />
                  <span className="font-label-tag text-label-tag uppercase tracking-widest text-tertiary">
                    {category.tagline ?? category.name}
                  </span>
                </div>
                <h2 className="font-headline-lg text-headline-lg text-text-primary">
                  {category.name}
                </h2>
                {category.description ? (
                  <p className="font-body-md text-body-md text-text-secondary text-pretty">
                    {category.description}
                  </p>
                ) : null}
              </div>
              <span className="shrink-0 font-label-tag text-label-tag uppercase text-text-muted">
                {String(category.products.length).padStart(2, "0")} /{" "}
                {String(total).padStart(2, "0")} ITEMS
              </span>
            </Reveal>

            <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 xl:grid-cols-4">
              {category.products.map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={serializeProduct(product)}
                  index={i}
                  priority={sectionIndex === 0 && i < 2}
                />
              ))}
            </div>
          </div>

          {/* Telemetry divider between sections */}
          {sectionIndex < categories.length - 1 ? (
            <div className="mx-auto mt-14 max-w-7xl px-margin-mobile lg:px-margin" aria-hidden>
              <div className="flex items-center gap-4 opacity-60">
                <span className="h-px flex-1 bg-border-subtle" />
                <span className="flex items-center gap-2 font-label-tag text-label-tag text-text-muted">
                  <span className="h-1.5 w-1.5 animate-pulse-dot bg-tertiary" />
                  KMRC · GENUINE STOCK · {category.slug.toUpperCase()} COMPLETE
                </span>
                <span className="h-px flex-1 bg-border-subtle" />
              </div>
            </div>
          ) : null}
        </section>
      ))}
    </>
  );
}