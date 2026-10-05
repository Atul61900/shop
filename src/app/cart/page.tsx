import type { Metadata } from "next";
import { Suspense } from "react";

import { SectionEyebrow } from "@/components/ui/Primitives";
import { CartView } from "@/components/cart/CartView";
import { ProductGridSkeleton } from "@/components/shop/Skeletons";

export const metadata: Metadata = {
  title: "Your Cart",
  description: "Review the items in your cart before checking out.",
  robots: { index: false, follow: true },
};

export default function CartPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border-subtle bg-surface-base">
        <div className="bg-tech-grid pointer-events-none absolute inset-0 opacity-15" />

        <div className="relative z-10 mx-auto max-w-7xl px-margin-mobile py-12 lg:px-margin lg:py-16">
          <SectionEyebrow>Checkout · Stage 1 of 2</SectionEyebrow>
          <h1 className="mt-4 font-display-hero text-display-hero-mobile text-text-primary lg:text-display-hero">
            Your Cart
          </h1>
          <p className="mt-4 max-w-xl font-body-md text-body-md text-text-secondary text-pretty">
            Stock and pricing are re-checked against our live inventory every time this page loads,
            so what you see here is what you will pay.
          </p>
        </div>
      </section>

      <section className="bg-surface-base py-10 lg:py-14">
        <div className="mx-auto max-w-7xl px-margin-mobile lg:px-margin">
          <Suspense fallback={<ProductGridSkeleton count={3} />}>
            <CartView />
          </Suspense>
        </div>
      </section>
    </>
  );
}