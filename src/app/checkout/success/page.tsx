import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Package, Truck, Home, ArrowRight, AlertTriangle } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { formatDateTime, formatMoney, humanize } from "@/lib/utils";
import { siteConfig } from "@/lib/config";
import { ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Primitives";
import { StatusDot } from "@/components/motion/Telemetry";

export const metadata: Metadata = {
  title: "Order Confirmed",
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
};

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; gateway?: string; paid?: string; reason?: string }>;
}) {
  const { order: orderNumber, gateway, paid, reason } = await searchParams;

  if (!orderNumber) notFound();

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { items: true, payments: { orderBy: { createdAt: "desc" } } },
  });

  if (!order) notFound();

  let address: Address = {};
  try {
    address = JSON.parse(order.shippingAddress) as Address;
  } catch {
    address = {};
  }

  // If a gateway returned without our callback landing, reconcile here so the
  // customer is never shown a stale "unpaid" state.
  const needsReconcile =
    order.paymentStatus !== "PAID" &&
    order.paymentMethod !== "COD" &&
    gateway === "khalti" &&
    paid !== "0";

  if (needsReconcile) {
    await reconcileKhalti(order.id, order.orderNumber);
  }

  const refreshed = await prisma.order.findUnique({ where: { id: order.id } });
  const paymentStatus = refreshed?.paymentStatus ?? order.paymentStatus;
  const isPaid = paymentStatus === "PAID";
  const isCod = order.paymentMethod === "COD";
  const failed = paid === "0" || paymentStatus === "FAILED";

  // Only the gateway's own wording is surfaced — it is plain text, capped, and
  // never contains markup.
  const failureReason =
    typeof reason === "string" ? reason.replace(/[<>&"]/g, "").slice(0, 160) : "";

  const steps = isCod
    ? [
        { icon: CheckCircle2, label: "Order received", note: "We have your order" },
        { icon: Package, label: "Packed at Tripureshwor", note: "Usually within 2 hours" },
        { icon: Truck, label: "Out for delivery", note: "You will get a call first" },
        { icon: Home, label: "Delivered", note: "Pay the courier in cash" },
      ]
    : [
        { icon: CheckCircle2, label: "Order received", note: "We have your order" },
        { icon: Package, label: "Payment confirmed", note: "Verified with the gateway" },
        { icon: Truck, label: "Packed & dispatched", note: "Within one working day" },
        { icon: Home, label: "Delivered", note: "To your address" },
      ];

  return (
    <section className="relative overflow-hidden bg-surface-base py-14 lg:py-20">
      <div className="bg-tech-grid pointer-events-none absolute inset-0 opacity-15" />
      <div className="pointer-events-none absolute right-0 top-0 h-[420px] w-[420px] rounded-full bg-primary-container/10 blur-[130px]" />

      <div className="relative z-10 mx-auto max-w-3xl px-margin-mobile">
        {/* ---- Headline ---- */}
        <div className="flex flex-col items-center gap-5 text-center">
          {failed ? (
            <span className="flex h-16 w-16 items-center justify-center border border-error/40 bg-error-container/10">
              <AlertTriangle className="h-7 w-7 text-error" aria-hidden />
            </span>
          ) : (
            <span className="flex h-16 w-16 items-center justify-center border border-tertiary/30 bg-tertiary/10">
              <CheckCircle2 className="h-8 w-8 text-tertiary" aria-hidden />
            </span>
          )}

          <div className="flex flex-col gap-3">
            <h1 className="font-display-hero text-display-hero-mobile text-text-primary lg:text-display-hero">
              {failed ? "Payment not completed" : "Order confirmed"}
            </h1>
            <p className="max-w-xl font-body-lg text-body-lg text-text-secondary text-pretty">
              {failed
                ? "Your payment was not completed, so nothing has been charged. Your order is saved — you can retry the payment or switch to cash on delivery."
                : `Thanks${address.contactName ? `, ${address.contactName.split(" ")[0]}` : ""}. We have your order and sent a confirmation to ${order.email}.`}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Badge tone={isPaid ? "green" : isCod ? "cyan" : failed ? "red" : "amber"} dot>
              {isPaid
                ? "Payment received"
                : isCod
                  ? "Cash on delivery"
                  : failed
                    ? "Payment failed"
                    : "Payment pending"}
            </Badge>
            <span className="flex items-center gap-2 font-label-tag text-label-tag text-text-muted">
              <StatusDot />
              {humanize(order.status)}
            </span>
          </div>
        </div>

        {/* ---- Reference ---- */}
        <div className="mt-10 border border-border-subtle bg-surface-card">
          <div className="flex flex-col items-center gap-3 border-b border-border-subtle bg-surface-deep p-8 text-center">
            <span className="font-label-tag text-label-tag uppercase tracking-widest text-text-muted">
              Order reference
            </span>
            <span className="font-label-metric text-label-metric text-tertiary">
              {order.orderNumber}
            </span>
            <span className="font-body-sm text-[12px] text-text-muted">
              Placed {formatDateTime(order.placedAt)}
            </span>
          </div>

          {/* Steps */}
          <ol className="grid grid-cols-2 gap-px bg-border-subtle sm:grid-cols-4">
            {steps.map((step, i) => (
              <li key={step.label} className="flex flex-col gap-2 bg-surface-card p-5">
                <span className="flex items-center gap-2">
                  <span
                    className={
                      i === 0
                        ? "text-tertiary"
                        : "text-text-muted/60"
                    }
                  >
                    <step.icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="font-label-tag text-label-tag text-text-muted">
                    0{i + 1}
                  </span>
                </span>
                <span className="font-label-button text-label-button uppercase tracking-wider text-text-primary">
                  {step.label}
                </span>
                <span className="font-body-sm text-[12px] text-text-muted">{step.note}</span>
              </li>
            ))}
          </ol>

          {/* Items */}
          <div className="border-t border-border-subtle p-6">
            <h2 className="font-label-button text-label-button uppercase tracking-widest text-text-primary">
              Items
            </h2>
            <ul className="mt-4 divide-y divide-border-subtle border-y border-border-subtle">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-baseline justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <span className="font-body-md text-body-md text-text-primary">
                      {item.name}
                    </span>
                    <span className="ml-2 font-label-tag text-label-tag text-text-muted">
                      × {item.quantity}
                    </span>
                  </div>
                  <span className="shrink-0 font-label-button text-label-button tabular-nums text-text-primary">
                    {formatMoney(item.lineTotal)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="mt-5 flex flex-col gap-2">
              <TotalRow label="Subtotal" value={formatMoney(order.subtotal)} />
              {order.discount > 0 ? (
                <TotalRow
                  label={`Discount${order.couponCode ? ` (${order.couponCode})` : ""}`}
                  value={`− ${formatMoney(order.discount)}`}
                  tone
                />
              ) : null}
              <TotalRow
                label="Delivery"
                value={order.shippingFee === 0 ? "FREE" : formatMoney(order.shippingFee)}
              />
              <div className="my-1 h-px bg-border-subtle" />
              <div className="flex items-baseline justify-between">
                <dt className="font-label-tag text-label-tag uppercase tracking-widest text-text-muted">
                  Total
                </dt>
                <dd className="font-label-metric text-[30px] tabular-nums text-text-primary">
                  {formatMoney(order.total)}
                </dd>
              </div>
            </dl>
          </div>

          {/* Delivery address */}
          <div className="grid grid-cols-1 gap-px border-t border-border-subtle bg-border-subtle sm:grid-cols-2">
            <div className="bg-surface-card p-6">
              <span className="font-label-tag text-label-tag uppercase tracking-widest text-text-muted">
                Delivering to
              </span>
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
              </address>
            </div>

            <div className="bg-surface-card p-6">
              <span className="font-label-tag text-label-tag uppercase tracking-widest text-text-muted">
                Need a hand?
              </span>
              <p className="mt-3 font-body-md text-body-md text-text-secondary text-pretty">
                Quote your reference and we will sort it out immediately.
              </p>
              <div className="mt-3 flex flex-col gap-1.5">
                <a
                  href={`tel:${siteConfig.contact.phone}`}
                  className="font-label-button text-label-button text-tertiary transition-colors hover:text-text-primary"
                >
                  {siteConfig.contact.phoneDisplay}
                </a>
                <a
                  href={siteConfig.contact.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-label-button text-label-button text-tertiary transition-colors hover:text-text-primary"
                >
                  WhatsApp us
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* ---- Actions ---- */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/shop" fullWidth trailing={<ArrowRight className="h-4 w-4" />}>
            Continue shopping
          </ButtonLink>
          <ButtonLink href="/account/orders" variant="secondary" fullWidth>
            View all orders
          </ButtonLink>
        </div>

        {failed ? (
          <div className="mt-6 flex flex-col gap-3 border border-error/40 bg-error-container/5 p-5">
            {failureReason ? (
              <p className="text-center font-body-md text-body-md text-text-primary">
                {failureReason}
              </p>
            ) : null}
            <p className="text-center font-body-sm text-body-sm text-text-secondary">
              Retrying payment?{" "}
              <Link href="/contact" className="text-tertiary underline-offset-4 hover:underline">
                Contact us
              </Link>{" "}
              and we will re-issue your payment link — nothing has been charged.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function TotalRow({ label, value, tone }: { label: string; value: string; tone?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="font-body-sm text-body-sm text-text-secondary">{label}</dt>
      <dd
        className={
          tone
            ? "font-label-button text-label-button tabular-nums text-tertiary"
            : "font-label-button text-label-button tabular-nums text-text-primary"
        }
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * Last-chance reconciliation when the gateway callback never reached us
 * (ad-blockers, dropped redirects). Verified server-side against Khalti.
 */
async function reconcileKhalti(orderId: string, orderNumber: string) {
  try {
    const { isKhaltiConfigured, verifyKhaltiPayment } = await import("@/lib/payments/khalti");
    if (!isKhaltiConfigured()) return;

    const payment = await prisma.payment.findFirst({
      where: { orderId, gateway: "KHALTI" },
      orderBy: { createdAt: "desc" },
    });
    if (!payment?.reference) return;

    const verified = await verifyKhaltiPayment(payment.reference);
    if (!verified.ok) return;

    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: "PAID",
        paymentRef: verified.token,
        status: "CONFIRMED",
      },
    });
  } catch (err) {
    // Never let reconciliation break the page — the customer can retry.
    console.error("[checkout] khalti reconcile failed:", err, orderNumber);
  }
}