import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Hourglass, Package } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { formatMoney } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/Button";
import { RecheckPaymentButton } from "@/components/checkout/RecheckPaymentButton";

export const metadata: Metadata = {
  title: "Payment pending",
  robots: { index: false, follow: false },
};

/**
 * The honest middle state: the gateway has not confirmed either way.
 * This page NEVER claims failure — it says pending, shows what happens next,
 * and offers a server-side re-check. Stock stays reserved while pending, and
 * marking paid later requires the same verification as the first attempt.
 */
export default async function PaymentPendingPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; method?: string }>;
}) {
  const { order: orderNumber, method } = await searchParams;
  if (!orderNumber) notFound();

  const order = await prisma.order.findUnique({ where: { orderNumber } });
  if (!order) notFound();

  // Already resolved while this page sat open — bounce to the right place.
  if (order.paymentStatus === "PAID") {
    const { redirect } = await import("next/navigation");
    redirect(`/checkout/success?order=${orderNumber}&gateway=${(method ?? "").toLowerCase()}&paid=1`);
  }

  const user = await getCurrentUser();
  const orderHref =
    user && order.userId === user.id
      ? (`/account/orders/${order.id}` as Route)
      : ("/account/orders" as Route);
  const gateway = method === "ESEWA" ? method : null;
  const methodLabel = gateway === "ESEWA" ? "eSewa" : "the gateway";

  return (
    <section className="relative overflow-hidden bg-surface-base py-14 lg:py-20">
      <div className="bg-tech-grid pointer-events-none absolute inset-0 opacity-15" />

      <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center gap-6 px-margin-mobile text-center">
        <span className="flex h-16 w-16 items-center justify-center border border-amber-500/40 bg-amber-500/10">
          <Hourglass className="h-7 w-7 text-amber-300" aria-hidden />
        </span>

        <div className="flex flex-col gap-3">
          <h1 className="font-display-hero text-display-hero-mobile text-text-primary lg:text-display-hero">
            Payment pending
          </h1>
          <p className="font-body-lg text-body-lg text-text-secondary text-pretty">
            {methodLabel} has not confirmed your payment yet. This happens when a
            verification is delayed, the connection drops mid-payment, or you
            closed the page early. <strong className="text-text-primary">Nothing has been marked paid and nothing was lost</strong> —
            your order <span className="text-text-primary">{orderNumber}</span> is
            saved for {formatMoney(order.total)}, and the stock stays reserved
            for you.
          </p>
        </div>

        <dl className="grid w-full grid-cols-2 gap-px border border-border-subtle bg-border-subtle text-left">
          {[
            ["Order", orderNumber],
            ["Amount", formatMoney(order.total)],
            ["Method", methodLabel],
            ["Status", "PENDING"],
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
          {gateway ? (
            <div className="flex-1">
              <RecheckPaymentButton method={gateway} orderNumber={orderNumber} />
            </div>
          ) : null}
          <ButtonLink href="/shop" variant="secondary" fullWidth>
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
          Back to checkout
        </Link>
      </div>
    </section>
  );
}
