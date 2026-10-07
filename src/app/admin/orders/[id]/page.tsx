import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { formatMoney, formatDateTime } from "@/lib/utils";
import { SectionEyebrow, Badge } from "@/components/ui/Primitives";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/admin/OrderBadges";
import { RecheckOrderButton } from "@/components/admin/RecheckOrderButton";
import { AdminOrderStatusForm } from "@/components/admin/AdminOrderStatusForm";

export const metadata: Metadata = {
  title: "Order detail",
  robots: { index: false, follow: false },
};

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { select: { name: true, sku: true, quantity: true, unitPrice: true, lineTotal: true } },
      payments: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!order) notFound();

  let address: Record<string, unknown> = {};
  try {
    address = JSON.parse(order.shippingAddress) as Record<string, unknown>;
  } catch {
    address = {};
  }

  const latest = order.payments[order.payments.length - 1] ?? null;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <Link
          href="/admin/orders"
          className="mb-2 inline-flex w-fit items-center gap-1.5 font-label-tag text-label-tag uppercase tracking-widest text-text-muted transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to orders
        </Link>
        <SectionEyebrow>Sale</SectionEyebrow>
        <h2 className="font-headline-md text-headline-md text-text-primary">
          {order.orderNumber}
        </h2>
        <p className="font-body-sm text-[12px] text-text-muted">
          Placed {formatDateTime(order.placedAt)} · {order.email} · {order.phone}
        </p>
      </div>

      {/* ---- Payment summary ---- */}
      <section className="flex flex-col gap-4 border border-border-subtle bg-surface-card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="outline">{order.paymentMethod}</Badge>
          <PaymentStatusBadge status={order.paymentStatus} />
          <span className="font-headline-sm text-headline-sm tabular-nums text-text-primary">
            {formatMoney(order.total)}
          </span>
        </div>

        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 font-body-sm text-body-sm sm:grid-cols-2">
          {[
            ["Gateway ref", order.paymentRef ?? "—"],
            ["Latest attempt", latest ? `${latest.gateway} · ${latest.status}` : "—"],
            ["Gateway txn", latest?.txnUuid ?? "—"],
            ["Verified", latest?.verifiedAt ? formatDateTime(latest.verifiedAt) : "—"],
            ["Paid", latest?.paidAt ? formatDateTime(latest.paidAt) : "—"],
            ["Order status", order.status],
          ].map(([term, value]) => (
            <div key={term} className="flex justify-between gap-4 border-b border-border-subtle/50 pb-1.5">
              <dt className="text-text-muted">{term}</dt>
              <dd className="truncate font-mono text-[12px] text-text-primary">{value}</dd>
            </div>
          ))}
        </dl>

        {order.paymentMethod !== "COD" && order.paymentStatus === "PENDING" && latest ? (
          <RecheckOrderButton method={order.paymentMethod} orderNumber={order.orderNumber} />
        ) : null}
      </section>

      {/* ---- Fulfilment ---- */}
      <section className="flex flex-col gap-4 border border-border-subtle bg-surface-card p-5">
        <SectionEyebrow>Fulfilment</SectionEyebrow>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 font-body-sm text-body-sm sm:grid-cols-2">
          {[
            ["Courier", order.courierName ?? "—"],
            ["Tracking", order.trackingRef ?? "—"],
            ["Delivered", order.deliveredAt ? formatDateTime(order.deliveredAt) : "—"],
          ].map(([term, value]) => (
            <div key={term} className="flex justify-between gap-4 border-b border-border-subtle/50 pb-1.5">
              <dt className="text-text-muted">{term}</dt>
              <dd className="truncate font-mono text-[12px] text-text-primary">{value}</dd>
            </div>
          ))}
          <div className="flex items-center justify-between gap-4 border-b border-border-subtle/50 pb-1.5">
            <dt className="text-text-muted">Condition</dt>
            <dd>
              <OrderStatusBadge status={order.status} />
            </dd>
          </div>
        </dl>

        <AdminOrderStatusForm
          orderId={order.id}
          status={order.status}
          paymentStatus={order.paymentStatus}
          courierName={order.courierName}
          trackingRef={order.trackingRef}
        />
      </section>

      {/* ---- Payment attempts ---- */}
      <section className="flex flex-col gap-3">
        <SectionEyebrow>Attempts</SectionEyebrow>
        {order.payments.length === 0 ? (
          <p className="font-body-sm text-body-sm text-text-muted">
            No gateway attempts. Cash on delivery settles at handover.
          </p>
        ) : (
          <ul className="flex flex-col gap-px border border-border-subtle bg-border-subtle">
            {order.payments.map((payment) => (
              <li key={payment.id} className="flex flex-wrap items-center justify-between gap-3 bg-surface-base p-3">
                <span className="flex items-center gap-2">
                  <Badge tone="outline">{payment.gateway}</Badge>
                  <PaymentStatusBadge status={payment.status} />
                </span>
                <span className="flex items-center gap-3 font-body-sm text-[12px] text-text-muted">
                  <span className="font-mono">{payment.txnUuid ?? "—"}</span>
                  <span className="tabular-nums">{formatMoney(payment.amount)}</span>
                  <span>{formatDateTime(payment.createdAt)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---- Items ---- */}
      <section className="flex flex-col gap-3">
        <SectionEyebrow>Items</SectionEyebrow>
        <ul className="flex flex-col gap-px border border-border-subtle bg-border-subtle">
          {order.items.map((item, i) => (
            <li key={i} className="flex items-center justify-between gap-3 bg-surface-base p-3 font-body-sm text-body-sm">
              <span className="min-w-0">
                <span className="block truncate text-text-primary">{item.name}</span>
                <span className="font-mono text-[12px] text-text-muted">{item.sku} × {item.quantity}</span>
              </span>
              <span className="shrink-0 tabular-nums text-text-primary">{formatMoney(item.lineTotal)}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ---- Address ---- */}
      <section className="flex flex-col gap-3">
        <SectionEyebrow>Deliver to</SectionEyebrow>
        <p className="border border-border-subtle bg-surface-card p-4 font-body-sm text-body-sm text-text-secondary">
          {[address.contactName, address.line1, address.line2, address.city, address.province, address.postalCode]
            .filter((v) => typeof v === "string" && v)
            .join(", ")}
          {typeof address.phone === "string" && address.phone ? ` · ${address.phone}` : ""}
        </p>
      </section>
    </div>
  );
}
