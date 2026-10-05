import Link from "next/link";
import { Home, Search, Wrench, ArrowRight } from "lucide-react";
import type { Route } from "next";

import { ButtonLink } from "@/components/ui/Button";
import { StatusDot } from "@/components/motion/Telemetry";

export default function NotFound() {
  return (
    <section className="relative overflow-hidden bg-surface-base py-20 lg:py-32">
      <div className="bg-tech-grid pointer-events-none absolute inset-0 opacity-15" />
      <div className="pointer-events-none absolute right-0 top-0 h-[420px] w-[420px] rounded-full bg-primary-container/10 blur-[130px]" />

      <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center gap-8 px-margin-mobile text-center">
        <div className="flex flex-col items-center gap-4">
          <span className="font-label-tag text-label-tag uppercase tracking-widest text-tertiary">
            {"// Fault code 404"}
          </span>
          <span className="font-label-metric text-[96px] leading-none text-text-primary lg:text-[140px]">
            404
          </span>
        </div>

        <div className="flex flex-col gap-3">
          <h1 className="font-headline-lg text-headline-lg text-text-primary">
            Nothing on this counter
          </h1>
          <p className="font-body-lg text-body-lg text-text-secondary text-pretty">
            The page you asked for does not exist — it may have been moved, or the link may have
            been mistyped. Let&apos;s get you back to something useful.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/" trailing={<ArrowRight className="h-4 w-4" />}>
            Back to home
          </ButtonLink>
          <ButtonLink href="/shop" variant="secondary">
            Browse the shop
          </ButtonLink>
        </div>

        <div className="mt-4 grid w-full grid-cols-1 gap-px border border-border-subtle bg-border-subtle sm:grid-cols-3">
          {[
            { href: "/shop", Icon: Search, label: "Shop", note: "Accessories & tools" },
            { href: "/services", Icon: Wrench, label: "Services", note: "Repair menu & prices" },
            { href: "/contact", Icon: Home, label: "Contact", note: "Visit or call us" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href as Route}
              className="group flex flex-col items-center gap-2 bg-surface-card p-6 transition-colors hover:bg-surface-card-hover"
            >
              <item.Icon className="h-4 w-4 text-tertiary" aria-hidden />
              <span className="font-label-button text-label-button uppercase tracking-wider text-text-primary">
                {item.label}
              </span>
              <span className="font-body-sm text-[12px] text-text-muted">{item.note}</span>
            </Link>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2 border border-border-subtle bg-surface-card px-5 py-4">
          <StatusDot />
          <span className="font-label-tag text-label-tag text-text-muted">
            NEED HELP? CALL {`(+977) 984-9821879`}
          </span>
        </div>
      </div>
    </section>
  );
}
