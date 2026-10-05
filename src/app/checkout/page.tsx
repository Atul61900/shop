import type { Metadata } from "next";
import { Suspense } from "react";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isEsewaConfigured } from "@/lib/payments/esewa";
import { isKhaltiConfigured } from "@/lib/payments/khalti";
import { SectionEyebrow } from "@/components/ui/Primitives";
import { CheckoutFlow } from "@/components/cart/CheckoutFlow";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your order with cash on delivery, eSewa or Khalti.",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const user = await getCurrentUser();

  const addresses = user
    ? await prisma.address.findMany({
        where: { userId: user.id },
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        take: 5,
      })
    : [];

  return (
    <>
      <section className="relative overflow-hidden border-b border-border-subtle bg-surface-base">
        <div className="bg-tech-grid pointer-events-none absolute inset-0 opacity-15" />

        <div className="relative z-10 mx-auto max-w-7xl px-margin-mobile py-12 lg:px-margin lg:py-14">
          <SectionEyebrow>Checkout · Stage 2 of 2</SectionEyebrow>
          <h1 className="mt-4 font-display-hero text-display-hero-mobile text-text-primary lg:text-display-hero">
            Complete Your Order
          </h1>
          <p className="mt-4 max-w-xl font-body-md text-body-md text-text-secondary text-pretty">
            Stock is re-verified the moment you place the order, so nothing sells out from under you
            while you type.
          </p>
        </div>
      </section>

      <section className="bg-surface-base py-10 lg:py-14">
        <div className="mx-auto max-w-7xl px-margin-mobile lg:px-margin">
          <Suspense fallback={<div className="skeleton h-96 w-full" />}>
            <CheckoutFlow
              user={user ? { name: user.name, email: user.email, phone: user.phone } : null}
              addresses={addresses}
              paymentAvailability={{
                COD: true,
                ESEWA: isEsewaConfigured(),
                KHALTI: isKhaltiConfigured(),
              }}
            />
          </Suspense>
        </div>
      </section>
    </>
  );
}