"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Loader2, Plus } from "lucide-react";

import { Button, ButtonLink } from "@/components/ui/Button";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { slugify } from "@/lib/utils";

type Errors = Record<string, string>;

export type AdminCategory = { id: string; name: string };

/** Everything needed to render the form in edit mode. */
export type ProductDefaults = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  brand: string;
  categoryId: string;
  /** Minor units — converted back to rupees for the number inputs. */
  price: number;
  compareAtPrice: number | null;
  stock: number;
  warrantyMonths: number;
  summary: string;
  description: string;
  image: string;
  isFeatured: boolean;
  isActive: boolean;
};

const EMPTY = {
  name: "",
  slug: "",
  sku: "",
  brand: "",
  categoryId: "",
  price: "",
  compareAtPrice: "",
  stock: "10",
  warrantyMonths: "12",
  summary: "",
  description: "",
  image: "",
};

function toRupees(minorUnits: number | null | undefined) {
  if (!minorUnits) return "";
  return String(Math.round(minorUnits / 100));
}

/** Rough SKU hint from the brand + name, e.g. "ANK-TC-4K2". */
function suggestSku(brand: string, name: string) {
  const initials = brand
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 3);
  const tail = name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.slice(0, 2).toUpperCase())
    .join("")
    .slice(0, 5);
  return [initials, tail].filter(Boolean).join("-");
}

export function ProductForm({
  categories,
  product,
}: {
  categories: AdminCategory[];
  /** Omit to create; pass to edit that record in place. */
  product?: ProductDefaults;
}) {
  const editing = Boolean(product);

  const [values, setValues] = useState(() =>
    product
      ? {
          name: product.name,
          slug: product.slug,
          sku: product.sku,
          brand: product.brand,
          categoryId: product.categoryId,
          price: toRupees(product.price),
          compareAtPrice: toRupees(product.compareAtPrice),
          stock: String(product.stock),
          warrantyMonths: String(product.warrantyMonths),
          summary: product.summary,
          description: product.description,
          image: product.image,
        }
      : EMPTY,
  );
  // Editing pins the existing slug/SKU instead of regenerating from the name.
  const [slugTouched, setSlugTouched] = useState(editing);
  const [skuTouched, setSkuTouched] = useState(editing);
  const [isFeatured, setIsFeatured] = useState(product?.isFeatured ?? false);
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const slug = slugTouched ? values.slug : slugify(values.name);
  const sku = skuTouched ? values.sku : suggestSku(values.brand, values.name);

  const priceError = useMemo(() => {
    const sell = Number(values.price);
    const was = values.compareAtPrice ? Number(values.compareAtPrice) : 0;
    if (!values.price || Number.isNaN(sell)) return undefined;
    if (was > 0 && was <= sell) return "Compare-at price must be higher than the price";
    return undefined;
  }, [values.price, values.compareAtPrice]);

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
        product ? `/api/admin/products/${product.id}` : "/api/admin/products",
        {
          method: product ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: values.name,
            slug,
            sku,
            categoryId: values.categoryId,
            brand: values.brand,
            // The form works in rupees; the API and database use paisa.
            price: Math.round(Number(values.price || 0) * 100),
            compareAtPrice: values.compareAtPrice
              ? Math.round(Number(values.compareAtPrice) * 100)
              : 0,
            stock: Number(values.stock || 0),
            warrantyMonths: Number(values.warrantyMonths || 0),
            summary: values.summary,
            description: values.description,
            image: values.image,
            isFeatured,
            // Editing must not silently unpublish a hidden product.
            isActive: product ? product.isActive : true,
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
        product ? "Product updated" : "Product added",
        json.data.product.name,
      );
      router.push("/admin");
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
        {/* ---- Details ---- */}
        <div className="flex flex-col gap-5 lg:col-span-7">
          <Input
            label="Product name"
            name="name"
            required
            placeholder="65W GaN Fast Wall Charger"
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            error={errors.name}
          />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input
              label="URL slug"
              name="slug"
              required
              placeholder="65w-gan-fast-wall-charger"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", slugify(e.target.value));
              }}
              error={errors.slug}
              hint={`/shop/${slug || "…"}`}
            />
            <Input
              label="SKU"
              name="sku"
              required
              placeholder="ANK-TC-4K2"
              value={sku}
              onChange={(e) => {
                setSkuTouched(true);
                set("sku", e.target.value);
              }}
              error={errors.sku}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input
              label="Brand"
              name="brand"
              required
              placeholder="Anker"
              value={values.brand}
              onChange={(e) => set("brand", e.target.value)}
              error={errors.brand}
            />
            <Select
              label="Category"
              name="categoryId"
              required
              value={values.categoryId}
              onChange={(e) => set("categoryId", e.target.value)}
              error={errors.categoryId}
            >
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
            <Input
              label="Price (NPR)"
              name="price"
              required
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              placeholder="2490"
              value={values.price}
              onChange={(e) => set("price", e.target.value)}
              error={errors.price}
            />
            <Input
              label="Compare at (NPR)"
              name="compareAtPrice"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              placeholder="2990"
              value={values.compareAtPrice}
              onChange={(e) => set("compareAtPrice", e.target.value)}
              error={errors.compareAtPrice ?? priceError}
              hint="Optional"
            />
            <Input
              label="Stock"
              name="stock"
              required
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={values.stock}
              onChange={(e) => set("stock", e.target.value)}
              error={errors.stock}
            />
          </div>

          <Input
            label="Warranty (months)"
            name="warrantyMonths"
            required
            type="number"
            min={0}
            max={120}
            step={1}
            inputMode="numeric"
            value={values.warrantyMonths}
            onChange={(e) => set("warrantyMonths", e.target.value)}
            error={errors.warrantyMonths}
            hint="Use 0 for no warranty"
          />

          <Textarea
            label="Short summary"
            name="summary"
            required
            rows={2}
            placeholder="One line that appears on the product card."
            value={values.summary}
            onChange={(e) => set("summary", e.target.value)}
            error={errors.summary}
          />

          <Textarea
            label="Full description"
            name="description"
            required
            rows={8}
            placeholder="What it is, what it fits, what is in the box, and what is covered."
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            error={errors.description}
          />

          <Checkbox
            label="Feature on the home page"
            checked={isFeatured}
            onChange={(e) => setIsFeatured(e.target.checked)}
          />
        </div>

        {/* ---- Media ---- */}
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-8">
            <ImageUploader
              kind="products"
              label="Product image"
              value={values.image}
              onChange={(url) => set("image", url)}
              error={errors.image}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-border-subtle pt-5 sm:flex-row sm:items-center sm:justify-between">
        <ButtonLink
          href={"/admin"}
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
          {pending ? "Saving" : editing ? "Save changes" : "Add product"}
        </Button>
      </div>
    </form>
  );
}

