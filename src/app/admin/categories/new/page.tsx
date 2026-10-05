import type { Metadata } from "next";

import { CategoryForm } from "@/components/admin/CategoryForm";

export const metadata: Metadata = {
  title: "Add category",
  robots: { index: false, follow: false },
};

export default function NewCategoryPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h2 className="font-headline-md text-headline-md text-text-primary">
          New category
        </h2>
        <p className="font-body-md text-body-md text-text-secondary text-pretty">
          Give it a name and a tagline, then file products under it from the
          product form.
        </p>
      </div>

      <CategoryForm />
    </div>
  );
}
