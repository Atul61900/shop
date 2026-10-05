import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { SectionEyebrow } from "@/components/ui/Primitives";
import { ButtonLink } from "@/components/ui/Button";
import { RowActions } from "@/components/admin/RowActions";

export const metadata: Metadata = {
  title: "Categories",
  robots: { index: false, follow: false },
};

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      tagline: true,
      accent: true,
      image: true,
      isActive: true,
      sortOrder: true,
      _count: { select: { products: true } },
    },
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 border-b border-border-subtle pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <SectionEyebrow>Catalogue</SectionEyebrow>
          <h2 className="font-headline-md text-headline-md text-text-primary">
            Categories
          </h2>
          <p className="max-w-2xl font-body-md text-body-md text-text-secondary text-pretty">
            A category can hold any number of products. New categories appear in
            the shop straight away, even before anything is filed under them.
          </p>
        </div>
        <ButtonLink
          href="/admin/categories/new"
          trailing={<Plus className="h-4 w-4" />}
          className="shrink-0"
        >
          Add category
        </ButtonLink>
      </div>

      {categories.length === 0 ? (
        <p className="border border-dashed border-border-subtle bg-surface-card/40 p-10 text-center font-body-md text-body-md text-text-muted">
          No categories yet. Add one to start filing products.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-px bg-border-subtle sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <li
              key={category.id}
              className="flex items-center gap-3 bg-surface-base p-3"
            >
              <span
                className="relative h-14 w-14 shrink-0 overflow-hidden border border-border-subtle bg-surface-deep"
                style={{ borderColor: `${category.accent}55` }}
              >
                {category.image ? (
                  <Image
                    src={category.image}
                    alt=""
                    fill
                    sizes="56px"
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <span
                    className="flex h-full w-full items-center justify-center"
                    aria-hidden
                  >
                    <span
                      className="h-2 w-2"
                      style={{ backgroundColor: category.accent }}
                    />
                  </span>
                )}
              </span>

              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-body-sm text-body-sm text-text-primary">
                  {category.name}
                </span>
                <span className="truncate font-body-sm text-[12px] text-text-muted">
                  {category._count.products} product
                  {category._count.products === 1 ? "" : "s"}
                  {category.isActive ? "" : " · hidden"}
                </span>
              </span>

              <RowActions
                kind="categories"
                id={category.id}
                name={category.name}
                editHref={`/admin/categories/${category.id}/edit`}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-border-subtle pt-6">
        <Link
          href="/shop"
          className="link-wipe inline-flex items-center gap-1.5 font-label-tag text-label-tag uppercase tracking-widest text-text-muted transition-colors hover:text-text-primary"
        >
          See how categories look in the shop
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
