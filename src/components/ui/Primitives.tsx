import { cn } from "@/lib/utils";

/** Small uppercase technical tag with the 4px blue marker. */
export function Badge({
  children,
  tone = "blue",
  className,
  dot = false,
}: {
  children: React.ReactNode;
  tone?: "blue" | "cyan" | "muted" | "green" | "amber" | "red" | "outline";
  className?: string;
  dot?: boolean;
}) {
  const tones = {
    blue: "bg-primary-container/10 border-primary-container/30 text-text-primary",
    cyan: "bg-tertiary-container/15 border-tertiary/30 text-tertiary",
    muted: "bg-surface-deep border-border-subtle text-text-muted",
    green: "bg-tertiary/10 border-tertiary/30 text-tertiary",
    amber: "bg-amber-500/10 border-amber-500/30 text-amber-300",
    red: "bg-error-container/20 border-error/40 text-error",
    outline: "border-border-subtle text-text-secondary",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-2.5 py-1 font-label-tag text-label-tag uppercase tracking-widest",
        tones[tone],
        className,
      )}
    >
      {dot ? <span className="h-1.5 w-1.5 shrink-0 bg-current" /> : null}
      {children}
    </span>
  );
}

/** Section eyebrow: blue rule + uppercase label, matching the Stitch design. */
export function SectionEyebrow({
  children,
  tone = "cyan",
  className,
}: {
  children: React.ReactNode;
  tone?: "cyan" | "blue" | "muted";
  className?: string;
}) {
  const tones = {
    cyan: "text-tertiary",
    blue: "text-primary-fixed-dim",
    muted: "text-text-muted",
  } as const;

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <span className="h-2 w-0.5 bg-border-active" />
      <span
        className={cn(
          "font-label-tag text-label-tag uppercase tracking-widest",
          tones[tone],
        )}
      >
        {children}
      </span>
    </div>
  );
}

/** Structural card: #0B0F17 fill, hairline border, sharp corners. */
export function Card({
  children,
  className,
  hover = false,
  sheen = false,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  sheen?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative bg-surface-card border border-border-subtle",
        hover && "transition-colors duration-300 hover:border-border-active",
        className,
      )}
    >
      {sheen ? <div className="surface-sheen pointer-events-none absolute inset-0" /> : null}
      {children}
    </div>
  );
}

/** Empty-state block used by the cart, orders, reviews and search. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-5 border border-dashed border-border-subtle bg-surface-card/40 px-6 py-20 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="flex h-14 w-14 items-center justify-center border border-border-subtle bg-surface-deep text-text-muted">
          {icon}
        </div>
      ) : null}
      <div className="flex max-w-md flex-col gap-2">
        <h3 className="font-headline-sm text-headline-sm text-text-primary">{title}</h3>
        <p className="font-body-md text-body-md text-text-secondary text-pretty">{description}</p>
      </div>
      {action}
    </div>
  );
}