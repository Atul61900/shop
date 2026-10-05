"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Loader2, Plus } from "lucide-react";

import { Button, ButtonLink } from "@/components/ui/Button";
import { Checkbox, Input, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { slugify } from "@/lib/utils";

type Errors = Record<string, string>;

const EMPTY = {
  name: "",
  slug: "",
  tagline: "",
  description: "",
  accent: "#0052FF",
  sortOrder: "",
  image: "",
};

export type CategoryDefaults = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  accent: string;
  image: string | null;
  sortOrder: number;
  isActive: boolean;
};

export function CategoryForm({ category }: { category?: CategoryDefaults }) {
  const editing = Boolean(category);

  const [values, setValues] = useState(() =>
    category
      ? {
          name: category.name,
          slug: category.slug,
          tagline: category.tagline ?? "",
          description: category.description ?? "",
          accent: category.accent,
          sortOrder: String(category.sortOrder),
          image: category.image ?? "",
        }
      : EMPTY,
  );
  const [slugTouched, setSlugTouched] = useState(editing);
  const [isActive, setIsActive] = useState(category?.isActive ?? true);
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const slug = slugTouched ? values.slug : slugify(values.name);

  function set(field: keyof typeof EMPTY, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setErrors({});

    try {
      const res = await fetch(
        category ? `/api/admin/categories/${category.id}` : "/api/admin/categories",
        {
          method: category ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: values.name,
            slug,
            tagline: values.tagline,
            description: values.description,
            accent: values.accent,
            // Optional: the shop renders the products, not a category image.
            image: values.image || undefined,
            sortOrder: values.sortOrder === "" ? undefined : Number(values.sortOrder),
            isActive,
          }),
        },
      );
      const json = await res.json();

      if (!res.ok || !json.ok) {
        setErrors(json.fields ?? {});
        toast.error("Could not save", json.error ?? "Please check the form and try again.");
        return;
      }

      toast.success(
        category ? "Category updated" : "Category added",
        json.data.category.name,
      );
      router.push("/admin/categories");
      router.refresh();
    } catch {
      toast.error("Network error", "Please try again in a moment.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-5 lg:col-span-7">
          <Input
            label="Category name"
            name="name"
            required
            placeholder="Power Banks"
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            error={errors.name}
          />

          <Input
            label="URL slug"
            name="slug"
            required
            placeholder="power-banks"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              set("slug", slugify(e.target.value));
            }}
            error={errors.slug}
            hint={`/shop?category=${slug || "…"}`}
          />

          <Input
            label="Short tagline"
            name="tagline"
            placeholder="Genuine OEM protection and power"
            value={values.tagline}
            onChange={(e) => set("tagline", e.target.value)}
            error={errors.tagline}
            hint="Shown above the name on the shop page"
          />

          <Textarea
            label="Description"
            name="description"
            rows={3}
            placeholder="One or two lines about what belongs in this category."
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            error={errors.description}
            hint="Optional"
          />

          <div className="grid grid-cols-2 gap-5">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="category-accent"
                className="flex items-center gap-1.5 font-label-tag text-label-tag uppercase tracking-widest text-text-muted"
              >
                Accent colour
              </label>
              <div className="flex items-center gap-3 border border-border-subtle bg-surface-deep px-3 py-2 transition-colors focus-within:border-border-active">
                <input
                  id="category-accent"
                  type="color"
                  value={values.accent}
                  onChange={(e) => set("accent", e.target.value)}
                  aria-label="Accent colour"
                  className="h-8 w-10 shrink-0 cursor-pointer border border-border-subtle bg-transparent"
                />
                <input
                  type="text"
                  value={values.accent}
                  onChange={(e) => set("accent", e.target.value)}
                  spellCheck={false}
                  aria-label="Accent colour hex value"
                  className="min-w-0 flex-1 bg-transparent font-body-sm text-body-sm uppercase text-text-primary outline-none"
                />
              </div>
              {errors.accent ? (
                <p className="font-body-sm text-[12px] text-error">{errors.accent}</p>
              ) : null}
            </div>

            <Input
              label="Sort order"
              name="sortOrder"
              type="number"
              min={0}
              max={999}
              step={1}
              inputMode="numeric"
              placeholder="Auto"
              value={values.sortOrder}
              onChange={(e) => set("sortOrder", e.target.value)}
              error={errors.sortOrder}
              hint="Lower shows first"
            />
          </div>

          <Checkbox
            label="Show this category in the shop"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
        </div>

        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-8">
            <ImageUploader
              kind="categories"
              label="Category image"
              optional
              value={values.image}
              onChange={(url) => set("image", url)}
              error={errors.image}
              hint="Optional — the shop shows this category's products"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-border-subtle pt-5 sm:flex-row sm:items-center sm:justify-between">
        <ButtonLink
          href="/admin/categories"
          variant="ghost"
          size="sm"
          icon={<ArrowLeft className="h-3.5 w-3.5" />}
        >
          Cancel
        </ButtonLink>
        <Button
          type="submit"
          disabled={pending}
          trailing={
            pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : editing ? (
              <Check className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )
          }
        >
          {pending ? "Saving" : editing ? "Save changes" : "Add category"}
        </Button>
      </div>
    </form>
  );
}
