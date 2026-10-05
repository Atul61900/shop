import { cn } from "@/lib/utils";

export function ProductCardSkeleton() {
  return (
    <div className="border border-border-subtle bg-surface-card">
      <div className="skeleton aspect-[4/3] w-full" />
      <div className="flex flex-col gap-3 p-5">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-4 w-4/5" />
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-2/3" />
        <div className="mt-3 flex items-center justify-between">
          <div className="skeleton h-4 w-20" />
          <div className="skeleton h-3 w-16" />
        </div>
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 gap-gutter sm:grid-cols-2 xl:grid-cols-3"
      aria-hidden
    >
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-gutter lg:grid-cols-2">
      <div className="skeleton aspect-square w-full" />
      <div className="flex flex-col gap-4">
        <div className="skeleton h-3 w-32" />
        <div className="skeleton h-8 w-4/5" />
        <div className="skeleton h-4 w-28" />
        <div className="skeleton h-10 w-40" />
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-2/3" />
        <div className="mt-4 flex gap-3">
          <div className="skeleton h-14 w-40" />
          <div className="skeleton h-14 flex-1" />
        </div>
      </div>
    </div>
  );
}

export function LineSkeleton({ rows = 4 }: { rows?: number }): React.ReactNode {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 border-b border-border-subtle pb-4">
          <div className="skeleton h-20 w-20 shrink-0" />
          <div className="flex-1">
            <div className="skeleton h-3 w-3/4" />
            <div className="mt-2 skeleton h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PanelSkeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton w-full", className)} aria-hidden />;
}