import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, FolderTree, Package, Plus, Wrench } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { formatMoney } from "@/lib/utils";
import { Reveal } from "@/components/motion/Reveal";
import { Card, SectionEyebrow } from "@/components/ui/Primitives";
import { ButtonLink } from "@/components/ui/Button";
import { RowActions } from "@/components/admin/RowActions";

export default async function AdminDashboard() {
  const user = await requireAdmin("/admin");

  const [productCount, serviceCount, categoryCount, products, services] =
    await Promise.all([
      prisma.product.count(),
      prisma.service.count(),
      prisma.category.count({ where: { isActive: true } }),
      prisma.product.findMany({
        // No cap here — every record must be reachable for editing/removal,
        // not just the newest handful.
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          slug: true,
          name: true,
          price: true,
          stock: true,
          images: true,
          isActive: true,
        },
      }),
      prisma.service.findMany({
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          slug: true,
          name: true,
          basePrice: true,
          image: true,
          isActive: true,
        },
      }),
    ]);

  const firstImage = (value: string) => {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed[0] as string | undefined) ?? null : null;
    } catch {
      return null;
    }
  };

  const stats = [
    { label: "Products", value: productCount },
    { label: "Services", value: serviceCount },
    { label: "Categories", value: categoryCount },
  ];

  return (
    <div className="flex flex-col gap-10">
      <Reveal className="flex flex-col gap-1">
        <p className="font-body-md text-body-md text-text-secondary">
          Signed in as {user.name} ({user.email}).
        </p>
      </Reveal>

      {/* ---- Quick actions ---- */}
      <div className="grid grid-cols-1 gap-gutter md:grid-cols-2">
        {[
          {
            href: "/admin/products/new",
            title: "Add a product",
            body: "List something from the counter — price, stock, warranty and a photo.",
            Icon: Package,
          },
          {
            href: "/admin/services/new",
            title: "Add a service",
            body: "Publish a new repair service with its own image and pricing.",
            Icon: Wrench,
          },
          {
            href: "/admin/categories",
            title: "Manage categories",
            body: "Create a new category and file any number of products under it.",
            Icon: FolderTree,
          },
        ].map((action) => (
          <Reveal key={action.href}>
            <Card hover className="group flex h-full items-center justify-between gap-6 p-6">
              <div className="flex flex-col gap-2">
                <span className="flex h-10 w-10 items-center justify-center border border-border-subtle bg-surface-deep text-tertiary">
                  <action.Icon className="h-4 w-4" aria-hidden />
                </span>
                <h2 className="font-headline-sm text-headline-sm text-text-primary">
                  {action.title}
                </h2>
                <p className="font-body-sm text-body-sm text-text-secondary text-pretty">
                  {action.body}
                </p>
              </div>
              <ButtonLink href={action.href as Route} size="sm" trailing={<Plus className="h-3.5 w-3.5" />}>
                Create
              </ButtonLink>
            </Card>
          </Reveal>
        ))}
      </div>

      {/* ---- Counts ---- */}
      <div className="grid grid-cols-3 border-l border-t border-border-subtle">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col gap-1 border-b border-r border-border-subtle bg-surface-card p-5"
          >
            <span className="font-label-metric text-label-metric tabular-nums text-text-primary">
              {stat.value}
            </span>
            <span className="font-label-tag text-label-tag uppercase tracking-widest text-text-muted">
              {stat.label}
            </span>
          </div>
        ))}
      </div>

      {/* ---- Products ---- */}
      <section className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-4 border-b border-border-subtle pb-4">
          <SectionEyebrow>Shop</SectionEyebrow>
          <Link
            href="/shop"
            className="link-wipe flex items-center gap-1.5 font-label-tag text-label-tag uppercase tracking-widest text-text-muted transition-colors hover:text-text-primary"
          >
            View shop
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>

        <ul className="grid grid-cols-1 gap-px bg-border-subtle sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <li
              key={product.id}
              className="flex items-center gap-3 bg-surface-base p-3"
            >
              <span className="relative h-14 w-14 shrink-0 overflow-hidden border border-border-subtle bg-surface-deep">
                {firstImage(product.images) ? (
                  <Image
                    src={firstImage(product.images)!}
                    alt=""
                    fill
                    sizes="56px"
                    unoptimized
                    className="object-cover"
                  />
                ) : null}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-body-sm text-body-sm text-text-primary">
                  {product.name}
                </span>
                <span className="truncate font-body-sm text-[12px] text-text-muted">
                  {formatMoney(product.price)} · {product.stock} in stock
                  {product.isActive ? "" : " · hidden"}
                </span>
              </span>
              <RowActions
                kind="products"
                id={product.id}
                name={product.name}
                editHref={`/admin/products/${product.id}/edit`}
              />
            </li>
          ))}
        </ul>
      </section>

      {/* ---- Services ---- */}
      <section className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-4 border-b border-border-subtle pb-4">
          <SectionEyebrow>Repairs</SectionEyebrow>
          <Link
            href="/services"
            className="link-wipe flex items-center gap-1.5 font-label-tag text-label-tag uppercase tracking-widest text-text-muted transition-colors hover:text-text-primary"
          >
            View services
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>

        <ul className="grid grid-cols-1 gap-px bg-border-subtle sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <li key={service.id} className="flex items-center gap-3 bg-surface-base p-3">
              <span className="relative h-14 w-14 shrink-0 overflow-hidden border border-border-subtle bg-surface-deep">
                {service.image ? (
                  <Image
                    src={service.image}
                    alt=""
                    fill
                    sizes="56px"
                    unoptimized
                    className="object-cover"
                  />
                ) : null}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-body-sm text-body-sm text-text-primary">
                  {service.name}
                </span>
                <span className="font-body-sm text-[12px] text-text-muted">
                  From {formatMoney(service.basePrice)}
                  {service.isActive ? "" : " · hidden"}
                </span>
              </span>
              <RowActions
                kind="services"
                id={service.id}
                name={service.name}
                editHref={`/admin/services/${service.id}/edit`}
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
