import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronRight } from "lucide-react";
import type { Route } from "next";

import { prisma } from "@/lib/prisma";
import { serializeProduct } from "@/lib/cart";
import { jsonLdScript } from "@/lib/seo";
import { ProductDetail } from "@/components/shop/ProductDetail";
import { ProductCard } from "@/components/shop/ProductCard";
import { ButtonLink } from "@/components/ui/Button";
import { SectionEyebrow } from "@/components/ui/Primitives";
import { Reveal } from "@/components/motion/Reveal";

export async function generateMetadata({
  params,
}: PageProps<"/shop/[slug]">): Promise<Metadata> {
  const { slug } = await params;

  const product = await prisma.product.findFirst({
    where: { slug, isActive: true },
    select: { name: true, summary: true, images: true, price: true },
  });

  if (!product) return { title: "Product not found" };

  let image: string | undefined;
  try {
    image = (JSON.parse(product.images) as string[])[0];
  } catch {
    image = undefined;
  }

  return {
    title: product.name,
    description: product.summary,
    alternates: { canonical: `/shop/${slug}` },
    openGraph: {
      title: product.name,
      description: product.summary,
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: PageProps<"/shop/[slug]">) {
  const { slug } = await params;

  const product = await prisma.product.findFirst({
    where: { slug, isActive: true },
    include: {
      category: { select: { slug: true, name: true } },
      reviews: {
        where: { isApproved: true },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          authorName: true,
          rating: true,
          title: true,
          body: true,
          isVerifiedBuyer: true,
          createdAt: true,
        },
      },
    },
  });

  if (!product) notFound();

  const [distribution, related] = await Promise.all([
    prisma.review.groupBy({
      by: ["rating"],
      where: { productId: product.id, isApproved: true },
      _count: { _all: true },
    }),
    prisma.product.findMany({
      where: {
        isActive: true,
        categoryId: product.categoryId,
        id: { not: product.id },
      },
      take: 4,
      orderBy: [{ isFeatured: "desc" }, { rating: "desc" }],
      include: { category: { select: { slug: true, name: true } } },
    }),
  ]);

  const ratingBreakdown = Array.from({ length: 5 }, (_, i) => {
    const stars = i + 1;
    const count = distribution.find((d) => d.rating === stars)?._count._all ?? 0;
    return {
      stars,
      count,
      percent: product.reviewCount > 0 ? Math.round((count / product.reviewCount) * 100) : 0,
    };
  });

  const serialized = serializeProduct(product);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.summary,
    sku: product.sku,
    brand: { "@type": "Brand", name: product.brand },
    aggregateRating: product.reviewCount
      ? {
          "@type": "AggregateRating",
          ratingValue: product.rating,
          reviewCount: product.reviewCount,
        }
      : undefined,
    offers: {
      "@type": "Offer",
      price: (product.price / 100).toFixed(2),
      priceCurrency: "NPR",
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        // Structured data for rich results.
        dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
      />

      <div className="mx-auto max-w-7xl px-margin-mobile py-8 lg:px-margin lg:py-12">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-8">
          <ol className="flex flex-wrap items-center gap-2 font-label-tag text-label-tag text-text-muted">
            <li>
              <Link href="/" className="transition-colors hover:text-tertiary">
                Home
              </Link>
            </li>
            <ChevronRight className="h-3 w-3" aria-hidden />
            <li>
              <Link href="/shop" className="transition-colors hover:text-tertiary">
                Shop
              </Link>
            </li>
            {product.category ? (
              <>
                <ChevronRight className="h-3 w-3" aria-hidden />
                <li>
                  <Link
                    href={`/shop?category=${product.category.slug}` as Route}
                    className="transition-colors hover:text-tertiary"
                  >
                    {product.category.name}
                  </Link>
                </li>
              </>
            ) : null}
            <ChevronRight className="h-3 w-3" aria-hidden />
            <li className="text-text-primary">{product.name}</li>
          </ol>
        </nav>

        <ProductDetail
          product={serialized}
          reviews={product.reviews.map((r) => ({
            ...r,
            createdAt: r.createdAt.toISOString(),
          }))}
          ratingBreakdown={ratingBreakdown}
        />
      </div>

      {/* ---- Related ---- */}
      {related.length > 0 ? (
        <section className="border-t border-border-subtle bg-surface-card py-16">
          <div className="mx-auto max-w-7xl px-margin-mobile lg:px-margin">
            <Reveal className="mb-10 flex items-center justify-between border-b border-border-subtle pb-6">
              <div>
                <SectionEyebrow>Complete the kit</SectionEyebrow>
                <h2 className="mt-3 font-headline-lg text-headline-lg text-text-primary">
                  You may also need
                </h2>
              </div>
              <ButtonLink
                href="/shop"
                variant="secondary"
                size="sm"
                trailing={<ArrowRight className="h-3.5 w-3.5" />}
              >
                All products
              </ButtonLink>
            </Reveal>

            <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-4">
              {related.map((p, i) => (
                <ProductCard key={p.id} product={serializeProduct(p)} index={i} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}