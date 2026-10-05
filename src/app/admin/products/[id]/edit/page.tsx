import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata: Metadata = {
  title: "Edit product",
  robots: { index: false, follow: false },
};

/** Splits the stored JSON image array down to the single primary image. */
function firstImage(value: string): string {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? ((parsed[0] as string | undefined) ?? "") : "";
  } catch {
    return "";
  }
}

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      sku: true,
      brand: true,
      categoryId: true,
      price: true,
      compareAtPrice: true,
      stock: true,
      warrantyMonths: true,
      summary: true,
      description: true,
      images: true,
      isFeatured: true,
      isActive: true,
    },
  });
  if (!product) notFound();

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <Link
          href={"/admin"}
          className="mb-2 inline-flex w-fit items-center gap-1.5 font-label-tag text-label-tag uppercase tracking-widest text-text-muted transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to dashboard
        </Link>
        <h2 className="font-headline-md text-headline-md text-text-primary">
          Edit product
        </h2>
        <p className="font-body-md text-body-md text-text-secondary text-pretty">
          {product.name} · currently at{" "}
          <span className="text-text-primary">/shop/{product.slug}</span>
        </p>
      </div>

      {categories.length === 0 ? (
        <p className="border border-error/40 bg-error-container/10 p-5 font-body-md text-body-md text-error">
          There are no active categories, so this product cannot be saved.
        </p>
      ) : (
        <ProductForm
          categories={categories}
          product={{ ...product, image: firstImage(product.images) }}
        />
      )}
    </div>
  );
}
