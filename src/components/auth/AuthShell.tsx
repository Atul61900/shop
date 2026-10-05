import Image from "next/image";
import Link from "next/link";

import { SectionEyebrow } from "@/components/ui/Primitives";
import { StatusDot } from "@/components/motion/Telemetry";
import { AuthBenefits } from "./AuthForm";

/** Two-column shell shared by the sign-in and registration pages. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-surface-base py-12 lg:py-20">
      <div className="bg-tech-grid pointer-events-none absolute inset-0 opacity-15" />
      <div className="pointer-events-none absolute -right-24 top-0 h-[420px] w-[420px] rounded-full bg-primary-container/10 blur-[130px]" />

      <div className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 gap-gutter px-margin-mobile lg:grid-cols-2">
        {/* ---- Panel ---- */}
        <div className="flex flex-col gap-8">
          <div className="border border-border-subtle bg-surface-card p-6 lg:p-10">
            <Link href="/" className="mb-8 flex items-center gap-3">
              <span className="relative h-12 w-12 overflow-hidden rounded-full border border-border-subtle">
                <Image src="/images/logo.jpg" alt="" fill sizes="48px" className="object-cover" priority />
              </span>
              <span className="flex flex-col leading-none">
                <span className="font-headline-sm text-headline-sm font-bold text-text-primary">
                  KMRC<span className="text-tertiary">.</span>
                </span>
                <span className="mt-1 font-label-tag text-[9px] uppercase tracking-[0.14em] text-text-muted">
                  Mobile Repairing Center
                </span>
              </span>
            </Link>

            {children}
          </div>

          <div className="flex items-center justify-between border border-border-subtle bg-surface-deep px-5 py-4">
            <span className="flex items-center gap-2 font-label-tag text-label-tag text-tertiary">
              <StatusDot />
              SECURE SESSION
            </span>
            <span className="font-label-tag text-label-tag text-text-muted">
              HTTPONLY COOKIE · 30 DAYS
            </span>
          </div>
        </div>

        {/* ---- Aside ---- */}
        <aside className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 border border-border-subtle bg-surface-card p-6 lg:p-8">
            <SectionEyebrow>Why sign in</SectionEyebrow>
            <h2 className="font-headline-lg text-headline-lg text-text-primary text-balance">
              One account for your shop activity
            </h2>
            <AuthBenefits />
          </div>

          <div className="border border-border-subtle bg-surface-deep p-6">
            <div className="font-label-tag text-label-tag uppercase tracking-widest text-text-muted">
              {"// Test account"}
            </div>
            <dl className="mt-4 flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="font-body-sm text-body-sm text-text-secondary">Email</dt>
                <dd className="font-label-tag text-label-tag text-text-primary">
                  demo@kmrc.com.np
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="font-body-sm text-body-sm text-text-secondary">Password</dt>
                <dd className="font-label-tag text-label-tag text-text-primary">Demo@1234</dd>
              </div>
            </dl>
            <p className="mt-4 font-body-sm text-[12px] text-text-muted">
              Seeded locally by <code className="text-text-secondary">prisma db seed</code>. Delete
              it before going live.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}