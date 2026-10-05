import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

const fieldBase =
  "w-full bg-surface-deep border px-4 py-3 text-text-primary font-body-sm text-body-sm placeholder:text-text-muted transition-all duration-200 focus:outline-none";

function fieldClasses(invalid?: boolean, className?: string) {
  return cn(
    fieldBase,
    invalid
      ? "border-error/60 focus:border-error focus:shadow-[0_0_12px_rgba(255,180,171,0.2)]"
      : "border-border-subtle focus:border-border-active focus:shadow-glow-sm hover:border-border-strong",
    className,
  );
}

type FieldShellProps = {
  label: string;
  htmlFor: string | undefined;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
};

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: FieldShellProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label
        htmlFor={htmlFor}
        className="flex items-center gap-1.5 font-label-tag text-label-tag uppercase tracking-widest text-text-muted"
      >
        {required ? <span className="text-border-active">*</span> : null}
        {label}
      </label>
      {children}
      {error ? (
        <p className="flex items-center gap-1.5 font-body-sm text-[12px] text-error animate-fade-up">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p className="font-body-sm text-[12px] text-text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "className"> & {
  label?: string;
  error?: string;
  hint?: string;
  className?: string;
  /** Rendered inside the field on the right, e.g. a password reveal button. */
  trailing?: React.ReactNode;
};

export function Input({
  label,
  error,
  hint,
  className,
  id,
  trailing,
  ...props
}: InputProps) {
  const inputId = id ?? props.name ?? label;
  const input = (
    <input
      id={inputId}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${inputId}-error` : undefined}
      className={fieldClasses(Boolean(error), trailing ? "pr-12" : className)}
      {...props}
    />
  );

  const control = trailing ? (
    // Relative wrapper so the trailing control can sit inside the border.
    <div className="relative">
      {input}
      {trailing}
    </div>
  ) : (
    input
  );

  if (!label) return control;

  return (
    <Field label={label} htmlFor={inputId ?? undefined} error={error} hint={hint} required={props.required}>
      {control}
    </Field>
  );
}

type TextareaProps = Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "className"
> & { label?: string; error?: string; hint?: string; className?: string };

export function Textarea({
  label,
  error,
  hint,
  className,
  id,
  rows = 5,
  ...props
}: TextareaProps) {
  const inputId = id ?? props.name ?? label;
  const textarea = (
    <textarea
      id={inputId}
      rows={rows}
      aria-invalid={Boolean(error)}
      className={fieldClasses(Boolean(error), cn("resize-y", className))}
      {...props}
    />
  );

  if (!label) return textarea;

  return (
    <Field label={label} htmlFor={inputId ?? undefined} error={error} hint={hint} required={props.required}>
      {textarea}
    </Field>
  );
}

type SelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "className"> & {
  label?: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
};

export function Select({
  label,
  error,
  hint,
  className,
  id,
  children,
  ...props
}: SelectProps) {
  const selectId = id ?? props.name ?? label;
  const select = (
    <div className="relative">
      <select
        id={selectId}
        aria-invalid={Boolean(error)}
        className={fieldClasses(Boolean(error), cn("appearance-none pr-10", className))}
        {...props}
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden
      >
        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
      </svg>
    </div>
  );

  if (!label) return select;

  return (
    <Field label={label} htmlFor={selectId} error={error} hint={hint} required={props.required}>
      {select}
    </Field>
  );
}

type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "className" | "type"> & {
  label: React.ReactNode;
  className?: string;
};

export function Checkbox({ label, className, ...props }: CheckboxProps) {
  return (
    <label
      className={cn(
        "group flex cursor-pointer items-start gap-3 p-3 bg-surface-deep border border-border-subtle transition-colors hover:border-border-active",
        className,
      )}
    >
      <span className="relative mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
        <input
          type="checkbox"
          className="peer h-4 w-4 shrink-0 cursor-pointer appearance-none border border-border-strong bg-surface-base transition-all checked:border-border-active checked:bg-primary-container"
          {...props}
        />
        <svg
          className="pointer-events-none absolute h-3 w-3 text-text-primary opacity-0 transition-opacity peer-checked:opacity-100"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden
        >
          <path d="M2 6.5l2.5 2.5L10 3.5" stroke="currentColor" strokeWidth="2" />
        </svg>
      </span>
      <span className="font-body-sm text-body-sm text-text-primary">{label}</span>
    </label>
  );
}

/** Sharp 16px radio, matching the checkbox treatment. */
export function Radio({
  label,
  className,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "className" | "type"> & {
  label: React.ReactNode;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "group flex cursor-pointer items-start gap-3 p-4 bg-surface-deep border border-border-subtle transition-all hover:border-border-active has-checked:border-border-active has-checked:bg-surface-card-hover",
        className,
      )}
    >
      <span className="relative mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
        <input
          type="radio"
          className="peer h-4 w-4 shrink-0 cursor-pointer appearance-none border border-border-strong bg-surface-base transition-all checked:border-border-active"
          {...props}
        />
        <span className="pointer-events-none absolute h-2 w-2 scale-0 bg-primary-container transition-transform peer-checked:scale-100" />
      </span>
      <span className="flex flex-col gap-1">
        <span className="font-label-button text-label-button uppercase tracking-wider text-text-primary">
          {label}
        </span>
      </span>
    </label>
  );
}