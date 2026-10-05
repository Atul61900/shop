import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { ServiceForm } from "@/components/admin/ServiceForm";

export const metadata: Metadata = {
  title: "Edit service",
  robots: { index: false, follow: false },
};

function parseArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const service = await prisma.service.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      eyebrow: true,
      summary: true,
      description: true,
      basePrice: true,
      warrantyDays: true,
      features: true,
      image: true,
      isActive: true,
    },
  });
  if (!service) notFound();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <Link
          href="/admin"
          className="mb-2 inline-flex w-fit items-center gap-1.5 font-label-tag text-label-tag uppercase tracking-widest text-text-muted transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to dashboard
        </Link>
        <h2 className="font-headline-md text-headline-md text-text-primary">
          Edit service
        </h2>
        <p className="font-body-md text-body-md text-text-secondary text-pretty">
          {service.name} · currently at{" "}
          <span className="text-text-primary">/services/{service.slug}</span>
        </p>
      </div>

      <ServiceForm
        service={{
          ...service,
          features: parseArray(service.features),
          image: service.image ?? "",
        }}
      />
    </div>
  );
}
