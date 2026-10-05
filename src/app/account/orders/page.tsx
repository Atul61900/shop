import type { Metadata } from "next";
import Link from "next/link";
import { Package, ChevronRight, ArrowRight } from "lucide-react";
import type { Route } from "next";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { formatDateTime, formatMoney, humanize } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/Button";
import { Badge, EmptyState } from "@/components/ui/Primitives";

export const metadata: Metadata = {
  title: "Your Orders",
  robots: { index: false, follow: false },
};

const STATUS_TONE = {
  DELIVERED: "green",
  CANCELLED: "red",
  REFUNDED: "muted",
  CONFIRMED: "cyan",
  PROCESSING: "cyan",
  READY: "cyan",
  OUT_FOR_DELIVERY: "blue",
  PENDING: "amber",
} as const;

export default async function OrdersPage() {
  const user = await requireUser("/account/orders");

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { placedAt: "desc" },
    include: { items: true },
    take: 50,
  });

  if (orders.length === 0) {
    return (
      <div className="border border-border-subtle bg-surface-card p-6">
        <EmptyState
          icon={<Package className="h-6 w-6" aria-hidden />}
          title="No orders yet"
          description="When you place an order it will appear here with live status, so you always know where your parcel is."
          action={<ButtonLink href="/shop">Browse the shop</ButtonLink>}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-gutter">
      <div className="border border-border-subtle bg-surface-card p-6">
        <h1 className="font-headline-lg text-headline-lg text-text-primary">Your orders</h1>
        <p className="mt-2 font-body-md text-body-md text-text-secondary">
          {orders.length} order{orders.length === 1 ? "" : "s"} placed since{" "}
          {formatDateTime(orders[orders.length - 1]!.placedAt).split(",")[0]}.
        </p>
      </div>

      <ul className="flex flex-col gap-4">
        {orders.map((order) => {
          const tone = STATUS_TONE[order.status as keyof typeof STATUS_TONE] ?? "outline";

          return (
            <li key={order.id} className="border border-border-subtle bg-surface-card">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-subtle bg-surface-deep p-5">
                <div className="flex flex-col gap-1">
                  <span className="font-label-button text-label-button text-text-primary">
                    {order.orderNumber}
                  </span>
                  <span className="font-body-sm text-body-sm text-text-muted">
                    Placed {formatDateTime(order.placedAt)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Badge tone={tone}>{humanize(order.status)}</Badge>
                  {order.paymentStatus === "PAID" ? (
                    <Badge tone="green">Paid</Badge>
                  ) : order.paymentMethod === "COD" ? (
                    <Badge tone="muted">Pay on delivery</Badge>
                  ) : order.paymentStatus === "FAILED" ? (
                    <Badge tone="red">Payment failed</Badge>
                  ) : (
                    <Badge tone="amber">Payment pending</Badge>
                  )}
                  <span className="font-label-metric text-[24px] tabular-nums text-text-primary">
                    {formatMoney(order.total)}
                  </span>
                </div>
              </div>

              {/* Items */}
              <ul className="divide-y divide-border-subtle">
                {order.items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-4 p-5">
                    <div className="min-w-0">
                      <span className="font-body-md text-body-md text-text-primary">
                        {item.name}
                      </span>
                      <span className="ml-2 font-label-tag text-label-tag text-text-muted">
                        {item.sku} · × {item.quantity}
                      </span>
                    </div>
                    <span className="shrink-0 font-label-button text-label-button tabular-nums text-text-primary">
                      {formatMoney(item.lineTotal)}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Footer */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border-subtle px-5 py-4">
                <span className="font-body-sm text-body-sm text-text-muted">
                  {order.trackingRef
                    ? `Courier ref: ${order.trackingRef}`
                    : "Hand-delivered by our own rider"}
                </span>
                <Link
                  href={`/account/orders/${order.id}` as Route}
                  className="inline-flex items-center gap-2 font-label-button text-label-button uppercase tracking-wider text-tertiary transition-colors hover:text-text-primary"
                >
                  View details
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex justify-center">
        <ButtonLink href="/shop" variant="secondary" trailing={<ArrowRight className="h-4 w-4" />}>
          Shop again
        </ButtonLink>
      </div>
    </div>
  );
}