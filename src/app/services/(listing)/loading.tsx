/**
 * Skeleton for the services listing.
 *
 * Route-group scoped for the same reason as `shop/(listing)/loading.tsx` — a
 * boundary above `services/[slug]` would flush headers before `notFound()`
 * runs and return 200 instead of 404.
 */
export default function ServicesLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading services…</span>

      <div className="border-b border-border-subtle bg-surface-deep">
        <div className="mx-auto max-w-7xl px-margin-mobile py-16 lg:px-margin lg:py-24">
          <div className="skeleton h-3 w-32" />
          <div className="skeleton mt-6 h-12 w-full max-w-lg" />
          <div className="skeleton mt-6 h-4 w-full max-w-xl" />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-margin-mobile py-20 lg:px-margin">
        <div className="grid grid-cols-1 gap-gutter md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border border-border-subtle bg-surface-card">
              <div className="skeleton h-48 w-full" />
              <div className="flex flex-col gap-3 p-6">
                <div className="skeleton h-3 w-24" />
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-3 w-full" />
                <div className="skeleton h-3 w-5/6" />
                <div className="mt-2 skeleton h-8 w-40" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}