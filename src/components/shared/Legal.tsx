import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Route } from "next";

import { SectionEyebrow } from "@/components/ui/Primitives";
import { Reveal, SplitText } from "@/components/motion/Reveal";

/** Breadcrumb shared by detail and legal pages. */
export function Breadcrumb({ trail }: { trail: { href: string; label: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-8">
      <ol className="flex flex-wrap items-center gap-2 font-label-tag text-label-tag text-text-muted">
        <li>
          <Link href="/" className="transition-colors hover:text-tertiary">
            Home
          </Link>
        </li>
        {trail.map((crumb) => (
          <li key={crumb.href} className="flex items-center gap-2">
            <ChevronRight className="h-3 w-3" aria-hidden />
            <Link href={crumb.href as Route} className="transition-colors hover:text-tertiary">
              {crumb.label}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Consistent chrome for long-form static pages (FAQ, privacy, terms). */
export function LegalLayout({
  eyebrow,
  title,
  intro,
  children,
  updated,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: React.ReactNode;
  updated?: string;
}) {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border-subtle bg-surface-base">
        <div className="bg-tech-grid pointer-events-none absolute inset-0 opacity-15" />

        <div className="relative z-10 mx-auto max-w-4xl px-margin-mobile py-14 lg:py-20">
          <Breadcrumb trail={[{ href: "/faq", label: "Support" }]} />

          <Reveal duration={0.5}>
            <SectionEyebrow>{eyebrow}</SectionEyebrow>
          </Reveal>
          <h1 className="mt-4 font-display-hero text-display-hero-mobile text-text-primary lg:text-display-hero">
            <SplitText text={title} />
          </h1>
          <Reveal delay={0.12}>
            <p className="mt-5 max-w-2xl font-body-lg text-body-lg text-text-secondary text-pretty">
              {intro}
            </p>
          </Reveal>
          {updated ? (
            <Reveal delay={0.18}>
              <p className="mt-6 font-label-tag text-label-tag uppercase tracking-widest text-text-muted">
                Last updated · {updated}
              </p>
            </Reveal>
          ) : null}
        </div>
      </section>

      <section className="bg-surface-base py-12 lg:py-16">
        <div className="mx-auto max-w-4xl px-margin-mobile">{children}</div>
      </section>
    </>
  );
}