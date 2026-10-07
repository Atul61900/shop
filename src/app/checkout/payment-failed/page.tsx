import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, ArrowRight, Package } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { formatMoney } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/Button";
import { RetryPaymentButton } from "@/components/checkout/RetryPaymentButton";

export const metadata: Metadata = {
  title: "Payment not completed",
  robots: { index: false, follow: false },
};

const KNOWN_REASONS: Record<string, string> = {
  cancelled: "The payment was cancelled before completion.",
  expired: "The payment link expired before completion.",
  amount: "The amount reported by the gateway did not match the order.",
  mismatch: "The gateway response did not match this order.",
  refunded: "The payment was refunded by the gateway.",
  "partial-refund": "The payment was partially refunded by the gateway.",
  unverifiable: "The payment could not be verified with the gateway.",
  "invalid-response": "The payment response failed integrity checking.",
  failed: "The payment did not complete.",
};

export default async function PaymentFailedPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; method?: string; reason?: string }>;
}) {
  const { order: orderNumber, method, reason } = await searchParams;
  if (!orderNumber) notFound();

  const order = await prisma.order.findUnique({ where: { orderNumber } });
  if (!order) notFound();

  const user = await getCurrentUser();
  // Guests and other accounts see the overview, never a deep link that would
  // 404 or leak existence.
  const orderHref =
    user && order.userId === user.id
      ? (`/account/orders/${order.id}` as Route)
      : ("/account/orders" as Route);

  // Only the gateway's own vocabulary is surfaced; unknown keys fall back to
  // a neutral line rather than rendering raw input.
  const explanation =
    (reason && KNOWN_REASONS[reason]) ??
    "The payment did not complete. No money has been taken for this attempt.";

  const methodLabel = method === "ESEWA" ? "eSewa" : "the gateway";

  // Retry is only possible when the method is a real gateway attempt.
  const retryable = method === "ESEWA";

  return (
    <section className="relative overflow-hidden bg-surface-base py-14 lg:py-20">
      <div className="bg-tech-grid pointer-events-none absolute inset-0 opacity-15" />

      <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center gap-6 px-margin-mobile text-center">
        <span className="flex h-16 w-16 items-center justify-center border border-error/40 bg-error-container/10">
          <AlertTriangle className="h-7 w-7 text-error" aria-hidden />
        </span>

        <div className="flex flex-col gap-3">
          <h1 className="font-display-hero text-display-hero-mobile text-text-primary lg:text-display-hero">
            Payment not completed
          </h1>
          <p className="font-body-lg text-body-lg text-text-secondary text-pretty">
            {explanation} Your order <span className="text-text-primary">{orderNumber}</span>{" "}
            is saved — nothing was charged, and the reserved stock was released.
          </p>
        </div>

        <dl className="grid w-full grid-cols-2 gap-px border border-border-subtle bg-border-subtle text-left">
          {[
            ["Order", orderNumber],
            ["Method", methodLabel],
            ["Amount", formatMoney(order.total)],
            ["Status", order.paymentStatus],
          ].map(([term, value]) => (
            <div key={term} className="flex flex-col gap-1 bg-surface-card p-4">
              <dt className="font-label-tag text-label-tag uppercase tracking-widest text-text-muted">
                {term}
              </dt>
              <dd className="font-body-md text-body-md text-text-primary">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="flex w-full flex-col gap-3 sm:flex-row">
          {retryable ? (
            <div className="flex-1">
              <RetryPaymentButton method={method} orderNumber={orderNumber} />
            </div>
          ) : null}
          <ButtonLink href="/shop" variant="secondary" fullWidth trailing={<ArrowRight className="h-4 w-4" />}>
            Continue shopping
          </ButtonLink>
        </div>

        <Link
          href={orderHref}
          className="link-wipe inline-flex items-center gap-1.5 font-label-tag text-label-tag uppercase tracking-widest text-text-muted transition-colors hover:text-text-primary"
        >
          <Package className="h-3.5 w-3.5" aria-hidden />
          View order
        </Link>

        <Link
          href="/checkout"
          className="link-wipe inline-flex items-center gap-1.5 font-label-tag text-label-tag uppercase tracking-widest text-text-muted transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Choose another payment method
        </Link>
      </div>
    </section>
  );
}
