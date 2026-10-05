import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata: Metadata = {
  title: "Add product",
  robots: { index: false, follow: false },
};

export default async function NewProductPage() {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h2 className="font-headline-md text-headline-md text-text-primary">
          New product
        </h2>
        <p className="font-body-md text-body-md text-text-secondary text-pretty">
          It goes live in the shop as soon as you save.
        </p>
      </div>

      {categories.length === 0 ? (
        <p className="border border-error/40 bg-error-container/10 p-5 font-body-md text-body-md text-error">
          There are no active categories yet, so a product cannot be filed. Add a
          category in the database first.
        </p>
      ) : (
        <ProductForm categories={categories} />
      )}
    </div>
  );
}
