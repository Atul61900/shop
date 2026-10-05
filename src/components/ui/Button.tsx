import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Route } from "next";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "relative inline-flex items-center justify-center gap-2.5 font-label-button text-label-button uppercase tracking-wider transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap select-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary-container text-text-primary hover:bg-secondary-container shadow-glow hover:shadow-glow-strong active:translate-y-px",
  secondary:
    "bg-surface-card text-text-primary border border-border-subtle hover:bg-surface-card-hover hover:border-border-active",
  ghost:
    "bg-surface-deep text-text-primary border border-border-subtle hover:bg-surface-card-hover hover:border-border-active",
  // `error` is the LIGHT token (#ffb4ab), so anything sitting on it must use
  // the dark `on-error`. `on-error-container` is for the dark `error-container`.
  danger:
    "bg-error-container text-on-error-container border border-error/40 hover:bg-error hover:text-on-error",
};

const sizes: Record<Size, string> = {
  sm: "px-4 py-2.5",
  md: "px-6 py-3.5",
  lg: "px-8 py-4",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
  /** Renders a leading icon glyph */
  icon?: React.ReactNode;
  /** Renders a trailing icon glyph (e.g. arrow_forward) */
  trailing?: React.ReactNode;
  fullWidth?: boolean;
};

function inner({ icon, children, trailing }: Pick<CommonProps, "icon" | "children" | "trailing">) {
  return (
    <>
      {icon ? (
        <span className="shrink-0 transition-transform duration-300 group-hover:translate-x-0.5">
          {icon}
        </span>
      ) : null}
      <span>{children}</span>
      {trailing ? (
        <span className="shrink-0 transition-transform duration-300 group-hover:translate-x-1">
          {trailing}
        </span>
      ) : null}
    </>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  icon,
  trailing,
  fullWidth,
  ...props
}: CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        base,
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        "group",
        className,
      )}
      {...props}
    >
      {inner({ icon, children, trailing })}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  icon,
  trailing,
  fullWidth,
  ...props
}: CommonProps & {
  href: Route | string;
  target?: string;
  rel?: string;
  onClick?: () => void;
  /** Renders the link as a non-interactive, dimmed state. */
  disabled?: boolean;
  "aria-disabled"?: boolean;
  "aria-label"?: string;
}) {
  const isExternal = typeof href === "string" && href.startsWith("http");
  const isDisabled = Boolean(props.disabled);

  const classes = cn(
    base,
    variants[variant],
    sizes[size],
    fullWidth && "w-full",
    isDisabled && "pointer-events-none cursor-not-allowed opacity-50",
    "group",
    className,
  );

  if (isExternal) {
    return (
      <a
        href={href}
        className={classes}
        target={props.target}
        rel={props.rel ?? "noopener noreferrer"}
        onClick={props.onClick}
        aria-disabled={props["aria-disabled"] ?? (isDisabled || undefined)}
      >
        {inner({ icon, children, trailing })}
      </a>
    );
  }

  return (
    <Link
      href={href as Route}
      className={classes}
      aria-label={props["aria-label"]}
      aria-disabled={props["aria-disabled"] ?? (isDisabled || undefined)}
      onClick={isDisabled ? undefined : props.onClick}
      tabIndex={isDisabled ? -1 : undefined}
    >
      {inner({ icon, children, trailing })}
    </Link>
  );
}