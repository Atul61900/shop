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
  eyebrow: "",
  summary: "",
  description: "",
  basePrice: "",
  warrantyDays: "90",
  features: "",
  image: "",
};

/** Everything needed to render the form in edit mode. */
export type ServiceDefaults = {
  id: string;
  name: string;
  slug: string;
  eyebrow: string;
  summary: string;
  description: string;
  /** Minor units — converted back to rupees for the number input. */
  basePrice: number;
  warrantyDays: number;
  features: string[];
  image: string;
  isActive: boolean;
};

function toRupees(minorUnits: number | null | undefined) {
  if (!minorUnits) return "";
  return String(Math.round(minorUnits / 100));
}

export function ServiceForm({ service }: { service?: ServiceDefaults }) {
  const editing = Boolean(service);

  const [values, setValues] = useState(() =>
    service
      ? {
          name: service.name,
          slug: service.slug,
          eyebrow: service.eyebrow,
          summary: service.summary,
          description: service.description,
          basePrice: toRupees(service.basePrice),
          warrantyDays: String(service.warrantyDays),
          features: service.features.join("\n"),
          image: service.image,
        }
      : EMPTY,
  );
  // Editing pins the existing slug instead of regenerating it from the name.
  const [slugTouched, setSlugTouched] = useState(editing);
  const [isActive, setIsActive] = useState(service?.isActive ?? true);
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

    // One bullet per line, blank lines dropped.
    const features = values.features
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 12);

    try {
      const res = await fetch(
        service ? `/api/admin/services/${service.id}` : "/api/admin/services",
        {
          method: service ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: values.name,
            slug,
            eyebrow: values.eyebrow,
            summary: values.summary,
            description: values.description,
            // Rupees in the form, paisa on the wire and in the database.
            basePrice: Math.round(Number(values.basePrice || 0) * 100),
            warrantyDays: Number(values.warrantyDays || 0),
            features,
            image: values.image,
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
        service ? "Service updated" : "Service added",
        json.data.service.name,
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
            label="Service name"
            name="name"
            required
            placeholder="Camera Module Replacement"
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            error={errors.name}
          />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input
              label="URL slug"
              name="slug"
              required
              placeholder="camera-module-replacement"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", slugify(e.target.value));
              }}
              error={errors.slug}
              hint={`/services/${slug || "…"}`}
            />
            <Input
              label="Short label"
              name="eyebrow"
              required
              placeholder="OPTICS"
              value={values.eyebrow}
              onChange={(e) => set("eyebrow", e.target.value)}
              error={errors.eyebrow}
              hint="Shown above the name"
            />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <Input
              label="Price from (NPR)"
              name="basePrice"
              required
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              placeholder="2500"
              value={values.basePrice}
              onChange={(e) => set("basePrice", e.target.value)}
              error={errors.basePrice}
            />
            <Input
              label="Warranty (days)"
              name="warrantyDays"
              required
              type="number"
              min={0}
              max={3650}
              step={1}
              inputMode="numeric"
              value={values.warrantyDays}
              onChange={(e) => set("warrantyDays", e.target.value)}
              error={errors.warrantyDays}
            />
          </div>

          <Textarea
            label="Short summary"
            name="summary"
            required
            rows={2}
            placeholder="One line that appears on the service card."
            value={values.summary}
            onChange={(e) => set("summary", e.target.value)}
            error={errors.summary}
          />

          <Textarea
            label="Full description"
            name="description"
            required
            rows={8}
            placeholder="What the job involves, what we check, and what we do if it is not worth repairing."
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            error={errors.description}
          />

          <Textarea
            label="What is included"
            name="features"
            rows={5}
            placeholder={"Module replacement with OEM grade part\nFull camera calibration\n90-day workmanship warranty"}
            value={values.features}
            onChange={(e) => set("features", e.target.value)}
            error={errors.features}
            hint="One bullet per line · up to 12"
          />

          <Checkbox
            label="Show this service on the site"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
        </div>

        {/* ---- Media ---- */}
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-8">
            <ImageUploader
              kind="services"
              label="Service image"
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
          {pending ? "Saving" : editing ? "Save changes" : "Add service"}
        </Button>
      </div>
    </form>
  );
}
