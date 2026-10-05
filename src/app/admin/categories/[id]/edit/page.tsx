import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { CategoryForm } from "@/components/admin/CategoryForm";

export const metadata: Metadata = {
  title: "Edit category",
  robots: { index: false, follow: false },
};

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const category = await prisma.category.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      tagline: true,
      description: true,
      accent: true,
      image: true,
      sortOrder: true,
      isActive: true,
      _count: { select: { products: true } },
    },
  });
  if (!category) notFound();

  const { _count, ...fields } = category;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <Link
          href="/admin/categories"
          className="mb-2 inline-flex w-fit items-center gap-1.5 font-label-tag text-label-tag uppercase tracking-widest text-text-muted transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to categories
        </Link>
        <h2 className="font-headline-md text-headline-md text-text-primary">
          Edit category
        </h2>
        <p className="font-body-md text-body-md text-text-secondary text-pretty">
          {category.name} · {_count.products} product
          {_count.products === 1 ? "" : "s"} filed under it
        </p>
      </div>

      <CategoryForm category={fields} />
    </div>
  );
}
