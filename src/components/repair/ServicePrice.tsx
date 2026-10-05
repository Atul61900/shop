import { cn, formatMoney } from "@/lib/utils";

/** Compact price readout, reused on service cards. */
export function ServicePrice({
  costMinor,
  className,
}: {
  costMinor: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div className="flex flex-col">
        <span className="font-label-tag text-label-tag uppercase text-text-muted">From</span>
        <span className="font-headline-sm text-headline-sm tabular-nums text-text-primary">
          {formatMoney(costMinor)}
        </span>
      </div>
    </div>
  );
}