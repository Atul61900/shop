"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

import { ButtonLink } from "@/components/ui/Button";

/**
 * Route-segment error boundary.
 * Next 16 renamed `reset` to `retry`.
 */
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Keep the real detail in the server log; the UI stays generic.
    console.error(error);
  }, [error]);

  return (
    <section className="relative overflow-hidden bg-surface-base py-20 lg:py-28">
      <div className="bg-tech-grid pointer-events-none absolute inset-0 opacity-15" />

      <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center gap-8 px-margin-mobile text-center">
        <span className="flex h-16 w-16 items-center justify-center border border-error/40 bg-error-container/10">
          <AlertTriangle className="h-7 w-7 text-error" aria-hidden />
        </span>

        <div className="flex flex-col gap-3">
          <span className="font-label-tag text-label-tag uppercase tracking-widest text-error">
            {"// System fault"}
          </span>
          <h1 className="font-display-hero text-display-hero-mobile text-text-primary lg:text-display-hero">
            Something broke on our end
          </h1>
          <p className="font-body-lg text-body-lg text-text-secondary text-pretty">
            This is not your fault. Try again — if it keeps happening, call the shop and we will
            sort it out while you wait.
          </p>
          {error.digest ? (
            <p className="font-label-tag text-label-tag text-text-muted">
              FAULT REF: {error.digest}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => retry()}
            className="group inline-flex items-center justify-center gap-2.5 bg-primary-container px-6 py-3.5 font-label-button text-label-button uppercase tracking-wider text-text-primary shadow-glow transition-all hover:bg-secondary-container"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Try again
          </button>
          <ButtonLink href="/" variant="secondary" icon={<Home className="h-4 w-4" />}>
            Back to home
          </ButtonLink>
        </div>

        <div className="mt-4 flex flex-col items-center gap-2 border border-border-subtle bg-surface-card px-6 py-5">
          <span className="font-label-tag text-label-tag uppercase text-text-muted">
            Prefer to talk to a human?
          </span>
          <a
            href="tel:+9779849821879"
            className="font-label-button text-label-button text-tertiary transition-colors hover:text-text-primary"
          >
            (+977) 984-9821879
          </a>
        </div>
      </div>
    </section>
  );
}
