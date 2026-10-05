import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Star rating display. `size` is in pixels; filled stars use the tertiary cyan
 * to match the telemetry aesthetic.
 */
export function Rating({
  value,
  count,
  size = 14,
  showValue = false,
  className,
}: {
  value: number;
  count?: number;
  size?: number;
  showValue?: boolean;
  className?: string;
}) {
  const rounded = Math.round(value);

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div
        className="flex items-center gap-0.5"
        role="img"
        aria-label={`Rated ${value.toFixed(1)} out of 5${count !== undefined ? ` from ${count} reviews` : ""}`}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            style={{ width: size, height: size }}
            className={cn(
              "transition-colors",
              star <= rounded ? "fill-tertiary text-tertiary" : "text-text-muted/50",
            )}
            aria-hidden
          />
        ))}
      </div>
      {showValue ? (
        <span className="font-label-tag text-label-tag text-text-primary">
          {value.toFixed(1)}
        </span>
      ) : null}
      {count !== undefined ? (
        <span className="font-body-sm text-[12px] text-text-muted">
          ({count} {count === 1 ? "review" : "reviews"})
        </span>
      ) : null}
    </div>
  );
}

/** Interactive 1–5 star picker. */
export function RatingInput({
  value,
  onChange,
  name = "rating",
  error,
}: {
  value: number;
  onChange: (value: number) => void;
  name?: string;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-label-tag text-label-tag uppercase tracking-widest text-text-muted">
        Your rating
      </span>
      <input type="hidden" name={name} value={value} />
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
            aria-pressed={star === value}
            className="group/star p-1 transition-transform hover:scale-110"
          >
            <Star
              style={{ width: 26, height: 26 }}
              className={cn(
                "transition-colors",
                star <= value
                  ? "fill-tertiary text-tertiary"
                  : "text-text-muted/60 group-hover/star:text-text-secondary",
              )}
              aria-hidden
            />
          </button>
        ))}
      </div>
      {error ? <p className="font-body-sm text-[12px] text-error">{error}</p> : null}
    </div>
  );
}