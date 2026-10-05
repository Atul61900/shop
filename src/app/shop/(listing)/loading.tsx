/**
 * Skeleton for the catalogue listing.
 *
 * Scoped to this route group on purpose: a `loading.tsx` higher up (or at
 * `shop/`) would wrap `shop/[slug]` too, and a Suspense boundary there flushes
 * the HTTP 200 headers before `notFound()` runs — turning every missing
 * product into a 200 instead of a 404. Keeping the boundary inside
 * `(listing)` gives the grid a loading state without affecting the detail route.
 */
import { ProductGridSkeleton } from "@/components/shop/Skeletons";

export default function ShopLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading products…</span>

      <div className="border-b border-border-subtle bg-surface-base">
        <div className="mx-auto max-w-7xl px-margin-mobile py-12 lg:px-margin lg:py-16">
          <div className="skeleton h-3 w-28" />
          <div className="skeleton mt-6 h-11 w-52" />
          <div className="skeleton mt-4 h-4 w-full max-w-md" />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-margin-mobile py-10 lg:px-margin lg:py-14">
        <ProductGridSkeleton count={12} />
      </div>
    </div>
  );
}