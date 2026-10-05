import type { Metadata } from "next";
import Link from "next/link";
import { Package, ShoppingBag, ArrowRight, MapPin, Phone, Mail } from "lucide-react";
import type { Route } from "next";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { formatDate, formatMoney, humanize } from "@/lib/utils";
import { siteConfig } from "@/lib/config";
import { ButtonLink } from "@/components/ui/Button";
import { Badge, EmptyState, SectionEyebrow } from "@/components/ui/Primitives";

export const metadata: Metadata = {
  title: "Account Overview",
  robots: { index: false, follow: false },
};

export default async function AccountOverviewPage() {
  const user = await requireUser("/account");

  const [orders, recentOrders, addresses, spend] = await Promise.all([
    prisma.order.count({ where: { userId: user.id } }),
    prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { placedAt: "desc" },
      take: 3,
      include: { items: { take: 3 } },
    }),
    prisma.address.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      take: 2,
    }),
    prisma.order.aggregate({
      where: { userId: user.id, status: { not: "CANCELLED" } },
      _sum: { total: true },
    }),
  ]);

  const firstName = user.name.split(" ")[0];

  return (
    <div className="flex flex-col gap-gutter">
      {/* ---- Greeting ---- */}
      <div className="border border-border-subtle bg-surface-card p-6 lg:p-8">
        <SectionEyebrow>Operator Console</SectionEyebrow>
        <h1 className="mt-3 font-headline-lg text-headline-lg text-text-primary">
          Welcome back, {firstName}
        </h1>
        <p className="mt-2 font-body-md text-body-md text-text-secondary">
          Your orders, addresses and repair price estimates — all in one place.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-px border border-border-subtle bg-border-subtle sm:grid-cols-3">
          <Stat label="Orders" value={String(orders)} Icon={Package} href="/account/orders" />
          <Stat
            label="Lifetime spend"
            value={formatMoney(spend._sum.total ?? 0)}
            Icon={ShoppingBag}
            href="/account/orders"
          />
          <Stat label="Saved addresses" value={String(addresses.length)} Icon={MapPin} href="/account/profile" />
        </div>
      </div>

      {/* ---- Recent orders ---- */}
      <section className="border border-border-subtle bg-surface-card">
        <div className="flex items-center justify-between border-b border-border-subtle p-6">
          <h2 className="font-headline-sm text-headline-sm text-text-primary">
            Recent orders
          </h2>
          <ButtonLink href="/account/orders" variant="ghost" size="sm" trailing={<ArrowRight className="h-3.5 w-3.5" />}>
            All orders
          </ButtonLink>
        </div>

        {recentOrders.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<Package className="h-6 w-6" aria-hidden />}
              title="No orders yet"
              description="Genuine accessories and repair tools — all in stock at our Tripureshwor counter."
              action={<ButtonLink href="/shop">Browse the shop</ButtonLink>}
            />
          </div>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {recentOrders.map((order) => (
              <li key={order.id} className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="font-label-button text-label-button text-text-primary">
                      {order.orderNumber}
                    </span>
                    <span className="font-body-sm text-body-sm text-text-muted">
                      {formatDate(order.placedAt)} ·{" "}
                      {order.items.reduce((sum, i) => sum + i.quantity, 0)} item(s)
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge
                      tone={
                        order.status === "DELIVERED"
                          ? "green"
                          : order.status === "CANCELLED"
                            ? "red"
                            : "cyan"
                      }
                    >
                      {humanize(order.status)}
                    </Badge>
                    <span className="font-label-button text-label-button tabular-nums text-text-primary">
                      {formatMoney(order.total)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {order.items.map((item) => (
                    <span
                      key={item.id}
                      className="font-body-sm text-[12px] text-text-muted"
                    >
                      {item.name} × {item.quantity}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---- Contact ---- */}
      <div className="flex flex-col gap-3 border border-border-subtle bg-surface-deep p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-label-tag text-label-tag uppercase tracking-widest text-text-muted">
            Need help with an order?
          </span>
          <span className="font-body-md text-body-md text-text-secondary">
            {siteConfig.contact.phoneDisplay} · {siteConfig.contact.email}
          </span>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href={`tel:${siteConfig.contact.phone}`}
            className="inline-flex items-center gap-2 border border-border-subtle px-4 py-2.5 font-label-button text-label-button uppercase tracking-wider text-text-primary transition-colors hover:border-border-active"
          >
            <Phone className="h-3.5 w-3.5" aria-hidden />
            Call
          </a>
          <a
            href={`mailto:${siteConfig.contact.email}`}
            className="inline-flex items-center gap-2 border border-border-subtle px-4 py-2.5 font-label-button text-label-button uppercase tracking-wider text-text-primary transition-colors hover:border-border-active"
          >
            <Mail className="h-3.5 w-3.5" aria-hidden />
            Email
          </a>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  Icon,
  href,
  accent,
}: {
  label: string;
  value: string;
  Icon: typeof Package;
  href: string;
  accent?: boolean;
}) {
  return (
    <Link href={href as Route} className="group bg-surface-card p-5 transition-colors hover:bg-surface-card-hover">
      <Icon className={accent ? "h-4 w-4 text-tertiary" : "h-4 w-4 text-text-muted"} aria-hidden />
      <div className="mt-3 font-label-metric text-[26px] leading-none text-text-primary">
        {value}
      </div>
      <div className="mt-1 font-label-tag text-label-tag uppercase tracking-wider text-text-muted">
        {label}
      </div>
    </Link>
  );
}