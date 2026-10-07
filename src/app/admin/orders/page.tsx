import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { formatMoney, formatDateTime } from "@/lib/utils";
import { SectionEyebrow, Badge } from "@/components/ui/Primitives";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/admin/OrderBadges";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { ORDER_STATUSES } from "@/lib/validation";

export const metadata: Metadata = {
  title: "Orders",
  robots: { index: false, follow: false },
};

const PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED", "REFUNDED", "CANCELLED"] as const;
const PAYMENT_METHODS = ["COD", "ESEWA"] as const;

function asFilter(value: string | undefined, allowed: readonly string[]): string | undefined {
  const normalized = value?.trim().toUpperCase();
  return normalized && (allowed as readonly string[]).includes(normalized) ? normalized : undefined;
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; status?: string; payment?: string; method?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const query = params.q?.trim() ?? "";
  const status = asFilter(params.status, ORDER_STATUSES);
  const paymentStatus = asFilter(params.payment, PAYMENT_STATUSES);
  const paymentMethod = asFilter(params.method, PAYMENT_METHODS);

  const orders = await prisma.order.findMany({
    where: {
      AND: [
        query
          ? {
              OR: [
                { orderNumber: { contains: query } },
                { email: { contains: query } },
                { phone: { contains: query } },
              ],
            }
          : {},
        status ? { status } : {},
        paymentStatus ? { paymentStatus } : {},
        paymentMethod ? { paymentMethod } : {},
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      orderNumber: true,
      email: true,
      phone: true,
      paymentMethod: true,
      paymentStatus: true,
      status: true,
      total: true,
      placedAt: true,
      _count: { select: { items: true } },
      items: {
        select: { name: true, quantity: true },
        orderBy: { name: "asc" },
        take: 2,
      },
    },
  });

  const hasFilters = Boolean(query || status || paymentStatus || paymentMethod);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1 border-b border-border-subtle pb-6">
        <SectionEyebrow>Sales</SectionEyebrow>
        <h2 className="font-headline-md text-headline-md text-text-primary">
          Orders
        </h2>
        <p className="font-body-md text-body-md text-text-secondary text-pretty">
          Every order with what was placed, who placed it, payment state, and
          fulfilment condition. No secrets are shown here — only identifiers and
          statuses.
        </p>
      </div>

      <form
        method="get"
        action="/admin/orders"
        className="grid grid-cols-1 gap-4 border border-border-subtle bg-surface-card p-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        <Input
          label="Search"
          name="q"
          defaultValue={query}
          placeholder="Order no, email or phone"
        />
        <Select label="Condition" name="status" defaultValue={status ?? ""}>
          <option value="">All conditions</option>
          {ORDER_STATUSES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
        <Select label="Payment" name="payment" defaultValue={paymentStatus ?? ""}>
          <option value="">All payments</option>
          {PAYMENT_STATUSES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
        <Select label="Method" name="method" defaultValue={paymentMethod ?? ""}>
          <option value="">All methods</option>
          {PAYMENT_METHODS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
        <div className="flex items-end gap-2">
          <Button type="submit" size="sm" className="flex-1">
            Filter
          </Button>
          {hasFilters ? (
            <Link
              href="/admin/orders"
              className="flex-1 border border-border-subtle bg-surface-deep px-4 py-2.5 text-center font-label-button text-label-button uppercase tracking-wider text-text-secondary transition-colors hover:border-border-active hover:text-text-primary"
            >
              Clear
            </Link>
          ) : null}
        </div>
      </form>

      {orders.length === 0 ? (
        <p className="border border-dashed border-border-subtle bg-surface-card/40 p-10 text-center font-body-md text-body-md text-text-muted">
          {hasFilters ? "No orders match these filters." : "No orders yet."}
        </p>
      ) : (
        <>
          <p className="font-label-tag text-label-tag uppercase tracking-widest text-text-muted">
            Showing {orders.length} order{orders.length === 1 ? "" : "s"}
            {hasFilters ? " matching filters" : ""}
          </p>
          <ul className="flex flex-col gap-px border border-border-subtle bg-border-subtle">
            {orders.map((order) => (
              <li key={order.id} className="bg-surface-base">
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="group flex flex-col gap-3 p-4 transition-colors hover:bg-surface-card-hover sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="font-headline-sm text-headline-sm text-text-primary transition-colors group-hover:text-primary-fixed">
                      {order.orderNumber} · {order._count.items} item
                      {order._count.items === 1 ? "" : "s"}
                    </span>
                    <span className="truncate font-body-sm text-[12px] text-text-muted">
                      {order.email} · {order.phone} · {formatDateTime(order.placedAt)}
                    </span>
                    <span className="truncate font-body-sm text-[12px] text-text-secondary">
                      {order.items.map((item) => `${item.name} × ${item.quantity}`).join(" · ") ||
                        "No item snapshot"}
                    </span>
                  </span>

                  <span className="flex flex-wrap items-center gap-2">
                    <Badge tone="outline">{order.paymentMethod}</Badge>
                    <PaymentStatusBadge status={order.paymentStatus} />
                    <OrderStatusBadge status={order.status} />
                    <span className="font-label-button text-label-button tabular-nums text-text-primary">
                      {formatMoney(order.total)}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
