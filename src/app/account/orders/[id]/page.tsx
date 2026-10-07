import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Phone, Mail, Truck, CreditCard, Copy } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { formatDateTime, formatMoney, humanize } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Primitives";
import { CancelOrderButton } from "@/components/order/CancelOrderButton";

export const metadata: Metadata = {
  title: "Order Details",
  robots: { index: false, follow: false },
};

type Address = {
  contactName?: string;
  phone?: string;
  line1?: string;
  line2?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  landmark?: string;
};

const FLOW = [
  { status: "CONFIRMED", label: "Order confirmed", note: "We have your order" },
  { status: "PROCESSING", label: "Packed", note: "Picked and checked at the counter" },
  { status: "READY", label: "Ready to dispatch", note: "Handed to the rider" },
  { status: "OUT_FOR_DELIVERY", label: "Out for delivery", note: "Arriving today" },
  { status: "DELIVERED", label: "Delivered", note: "Handed over and signed" },
];

export default async function OrderDetailPage({
  params,
}: PageProps<"/account/orders/[id]">,
) {
  const user = await requireUser();
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, payments: { orderBy: { createdAt: "desc" } } },
  });

  // 404 rather than 403 so we do not confirm the existence of other orders.
  if (!order || order.userId !== user.id) notFound();

  let address: Address = {};
  try {
    address = JSON.parse(order.shippingAddress) as Address;
  } catch {
    address = {};
  }

  const cancelled = order.status === "CANCELLED" || order.status === "REFUNDED";
  const currentIndex = FLOW.findIndex((s) => s.status === order.status);

  return (
    <div className="flex flex-col gap-gutter">
      {/* Header */}
      <div className="border border-border-subtle bg-surface-card">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border-subtle bg-surface-deep p-6">
          <div className="flex flex-col gap-1">
            <Link
              href="/account/orders"
              className="inline-flex items-center gap-1.5 font-label-tag text-label-tag text-text-muted transition-colors hover:text-tertiary"
            >
              <ArrowLeft className="h-3 w-3" aria-hidden />
              All orders
            </Link>
            <span className="mt-2 font-label-metric text-[32px] leading-none text-text-primary">
              {order.orderNumber}
            </span>
            <span className="font-body-sm text-body-sm text-text-muted">
              Placed {formatDateTime(order.placedAt)}
            </span>
          </div>

          <div className="flex flex-col items-end gap-2">
            <Badge tone={cancelled ? "red" : "cyan"} dot>
              {humanize(order.status)}
            </Badge>
            <span className="font-label-metric text-[26px] tabular-nums text-text-primary">
              {formatMoney(order.total)}
            </span>
            {!cancelled && (
              <CancelOrderButton
                orderId={order.id}
                orderNumber={order.orderNumber}
                orderStatus={order.status}
                paymentStatus={order.paymentStatus}
              />
            )}
          </div>
        </div>

        {/* Progress */}
        {!cancelled ? (
          <div className="border-b border-border-subtle p-6">
            <ol className="flex flex-col gap-0 sm:flex-row">
              {FLOW.map((step, i) => {
                const done = currentIndex >= i;
                const active = currentIndex === i;

                return (
                  <li key={step.status} className="flex flex-1 gap-3 pb-6 sm:flex-col sm:pb-0">
                    <div className="flex flex-col items-center sm:flex-row sm:gap-0">
                      <span
                        className={
                          done
                            ? "flex h-6 w-6 shrink-0 items-center justify-center bg-tertiary text-surface-base"
                            : "flex h-6 w-6 shrink-0 items-center justify-center border border-border-subtle bg-surface-deep text-text-muted"
                        }
                      >
                        {done ? (
                          <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" aria-hidden>
                            <path d="M2 6.5l2.5 2.5L10 3.5" stroke="currentColor" strokeWidth="2" />
                          </svg>
                        ) : (
                          <span className="h-1.5 w-1.5 bg-current" />
                        )}
                      </span>
                      {i < FLOW.length - 1 ? (
                        <span
                          className={
                            currentIndex > i
                              ? "h-px w-full flex-1 bg-tertiary/40 sm:mt-0 sm:h-0"
                              : "h-px w-full flex-1 bg-border-subtle sm:mt-0 sm:h-0"
                          }
                        />
                      ) : null}
                    </div>

                    <div className="flex flex-col gap-0.5 sm:mt-3 sm:pr-4">
                      <span
                        className={
                          active
                            ? "font-label-button text-label-button uppercase tracking-wider text-tertiary"
                            : done
                              ? "font-label-button text-label-button uppercase tracking-wider text-text-primary"
                              : "font-label-button text-label-button uppercase tracking-wider text-text-muted"
                        }
                      >
                        {step.label}
                      </span>
                      <span className="font-body-sm text-[12px] text-text-muted">{step.note}</span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : null}

        {/* Items */}
        <div className="p-6">
          <h2 className="font-label-button text-label-button uppercase tracking-widest text-text-primary">
            Items
          </h2>
          <ul className="mt-4 divide-y divide-border-subtle border-y border-border-subtle">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <p className="font-body-md text-body-md text-text-primary">{item.name}</p>
                  <p className="font-label-tag text-label-tag text-text-muted">
                    {item.sku} · {formatMoney(item.unitPrice)} each
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-body-sm text-body-sm text-text-muted">
                    × {item.quantity}
                  </span>
                  <span className="font-label-button text-label-button tabular-nums text-text-primary">
                    {formatMoney(item.lineTotal)}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <dl className="mt-5 flex flex-col gap-2">
            <Row label="Subtotal" value={formatMoney(order.subtotal)} />
            {order.discount > 0 ? (
              <Row
                label={`Discount${order.couponCode ? ` (${order.couponCode})` : ""}`}
                value={`− ${formatMoney(order.discount)}`}
                tone
              />
            ) : null}
            <Row
              label="Delivery"
              value={order.shippingFee === 0 ? "FREE" : formatMoney(order.shippingFee)}
            />
            <div className="my-1 h-px bg-border-subtle" />
            <div className="flex items-baseline justify-between">
              <dt className="font-label-tag text-label-tag uppercase tracking-widest text-text-muted">
                Total
              </dt>
              <dd className="font-label-metric text-[28px] tabular-nums text-text-primary">
                {formatMoney(order.total)}
              </dd>
            </div>
          </dl>
        </div>

        {/* Details */}
        <div className="grid grid-cols-1 gap-px border-t border-border-subtle bg-border-subtle sm:grid-cols-2">
          <div className="bg-surface-card p-6">
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-tertiary" aria-hidden />
              <span className="font-label-tag text-label-tag uppercase tracking-widest text-text-muted">
                Delivery address
              </span>
            </div>
            <address className="mt-3 not-italic">
              <span className="block font-body-md text-body-md text-text-primary">
                {address.contactName}
              </span>
              <span className="mt-1 block font-body-sm text-body-sm text-text-secondary">
                {address.line1}
                {address.line2 ? `, ${address.line2}` : ""}
                <br />
                {address.city}, {address.province}
                {address.postalCode ? ` ${address.postalCode}` : ""}
                <br />
                {address.phone}
              </span>
              {address.landmark ? (
                <span className="mt-2 block font-body-sm text-[12px] text-text-muted">
                  Landmark: {address.landmark}
                </span>
              ) : null}
            </address>
            {order.deliveryNote ? (
              <p className="mt-3 border-l-2 border-border-active bg-surface-deep px-3 py-2 font-body-sm text-body-sm text-text-secondary">
                {order.deliveryNote}
              </p>
            ) : null}
          </div>

          <div className="bg-surface-card p-6">
            <div className="flex items-center gap-2">
              <CreditCard className="h-3.5 w-3.5 text-tertiary" aria-hidden />
              <span className="font-label-tag text-label-tag uppercase tracking-widest text-text-muted">
                Payment
              </span>
            </div>
            <dl className="mt-3 flex flex-col gap-2">
              <Row label="Method" value={order.paymentMethod} />
              <Row
                label="Status"
                value={humanize(order.paymentStatus)}
                tone={order.paymentStatus === "PAID"}
              />
              {order.paymentRef ? (
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="font-body-sm text-body-sm text-text-secondary">Reference</dt>
                  <dd className="flex items-center gap-2">
                    <span className="font-label-tag text-label-tag text-text-primary">
                      {order.paymentRef.slice(0, 18)}
                    </span>
                    <Copy className="h-3 w-3 text-text-muted" aria-hidden />
                  </dd>
                </div>
              ) : null}
            </dl>

            {order.trackingRef ? (
              <div className="mt-4 flex items-center gap-2 border border-border-subtle bg-surface-deep px-3 py-2">
                <Truck className="h-3.5 w-3.5 shrink-0 text-tertiary" aria-hidden />
                <span className="font-label-tag text-label-tag text-text-secondary">
                  {order.courierName ?? "Courier"} · {order.trackingRef}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Contact */}
        <div className="flex flex-col gap-4 border-t border-border-subtle p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="font-label-tag text-label-tag uppercase tracking-widest text-text-muted">
              Something wrong?
            </span>
            <p className="mt-1 font-body-md text-body-md text-text-secondary">
              Quote {order.orderNumber} and we will sort it out.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href="tel:+9779849821879"
              className="inline-flex items-center gap-2 border border-border-subtle px-4 py-2.5 font-label-button text-label-button uppercase tracking-wider text-text-primary transition-colors hover:border-border-active"
            >
              <Phone className="h-3.5 w-3.5" aria-hidden />
              Call
            </a>
            <a
              href={`mailto:${order.email}?subject=${encodeURIComponent(`Order ${order.orderNumber}`)}`}
              className="inline-flex items-center gap-2 border border-border-subtle px-4 py-2.5 font-label-button text-label-button uppercase tracking-wider text-text-primary transition-colors hover:border-border-active"
            >
              <Mail className="h-3.5 w-3.5" aria-hidden />
              Email
            </a>
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <ButtonLink href="/shop" variant="secondary">
          Continue shopping
        </ButtonLink>
      </div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="font-body-sm text-body-sm text-text-secondary">{label}</dt>
      <dd
        className={
          tone
            ? "font-label-button text-label-button text-tertiary"
            : "font-label-button text-label-button text-text-primary"
        }
      >
        {value}
      </dd>
    </div>
  );
}