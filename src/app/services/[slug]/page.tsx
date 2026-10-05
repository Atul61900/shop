import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, ChevronRight, ShieldCheck, Clock, Wrench, Phone } from "lucide-react";
import type { Route } from "next";

import { prisma } from "@/lib/prisma";
import { serializeService } from "@/lib/services";
import { ButtonLink } from "@/components/ui/Button";
import { Badge, SectionEyebrow } from "@/components/ui/Primitives";
import { Reveal } from "@/components/motion/Reveal";
import { ServicePrice } from "@/components/repair/ServicePrice";
import { siteConfig } from "@/lib/config";

export async function generateMetadata({
  params,
}: PageProps<"/services/[slug]">): Promise<Metadata> {
  const { slug } = await params;

  const service = await prisma.service.findFirst({
    where: { slug, isActive: true },
    select: { name: true, summary: true },
  });

  if (!service) return { title: "Service not found" };

  return {
    title: `${service.name} in Kathmandu`,
    description: service.summary,
    alternates: { canonical: `/services/${slug}` },
  };
}

export default async function ServiceDetailPage({
  params,
}: PageProps<"/services/[slug]">) {
  const { slug } = await params;

  const service = await prisma.service.findFirst({
    where: { slug, isActive: true },
  });

  if (!service) notFound();

  const related = await prisma.service.findMany({
    where: { isActive: true, id: { not: service.id } },
    orderBy: { sortOrder: "asc" },
    take: 3,
  });

  const data = serializeService(service);

  const faq = [
    {
      q: `How long does ${data.name.toLowerCase()} take?`,
      a:
        data.turnaroundMinutes < 60
          ? `Most ${data.name.toLowerCase()} jobs are completed in about ${data.turnaroundMinutes} minutes while you wait.`
          : `Allow roughly ${Math.round(data.turnaroundMinutes / 60)} hours for ${data.name.toLowerCase()}, since it involves board-level work and post-repair testing.`,
    },
    {
      q: "Will you confirm the price before starting?",
      a: "Always. We diagnose first, then send a firm quote. No work begins until you approve it, and we stop to call you if we find something unexpected once the device is open.",
    },
    {
      q: "What is covered by the warranty?",
      a: `Every ${data.name.toLowerCase()} carries a ${data.warrantyDays}-day component warranty against manufacturing defects. Physical damage and liquid ingress after the repair are not covered.`,
    },
    {
      q: "Do you need my phone unlocked?",
      a: "No. We only need the device. If a passcode is required for testing after the repair we will ask you at drop-off, but most jobs do not need one.",
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-7xl px-margin-mobile py-8 lg:px-margin lg:py-12">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-8">
          <ol className="flex flex-wrap items-center gap-2 font-label-tag text-label-tag text-text-muted">
            <li>
              <Link href="/" className="transition-colors hover:text-tertiary">
                Home
              </Link>
            </li>
            <ChevronRight className="h-3 w-3" aria-hidden />
            <li>
              <Link href="/services" className="transition-colors hover:text-tertiary">
                Services
              </Link>
            </li>
            <ChevronRight className="h-3 w-3" aria-hidden />
            <li className="text-text-primary">{data.name}</li>
          </ol>
        </nav>

        {/* ---- Header ---- */}
        <div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
          <div className="flex flex-col gap-6 lg:col-span-7">
            <Reveal>
              <SectionEyebrow>{data.eyebrow}</SectionEyebrow>
              <h1 className="mt-4 font-display-hero text-display-hero-mobile text-text-primary lg:text-display-hero">
                {data.name}
              </h1>
              <p className="mt-5 max-w-xl font-body-lg text-body-lg text-text-secondary text-pretty">
                {data.summary}
              </p>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="flex flex-wrap items-center gap-6 border-y border-border-subtle py-5">
                <ServicePrice costMinor={data.basePrice} />
                <div className="h-10 w-px bg-border-subtle" />
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-tertiary" aria-hidden />
                  <div className="flex flex-col">
                    <span className="font-label-tag text-label-tag uppercase text-text-muted">
                      Warranty
                    </span>
                    <span className="font-label-button text-label-button text-text-primary">
                      {data.warrantyDays} days
                    </span>
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.18} className="flex flex-wrap gap-4">
              <ButtonLink
                href={`tel:${siteConfig.contact.phone}`}
                trailing={<Phone className="h-4 w-4" />}
              >
                Call About This Repair
              </ButtonLink>
              <ButtonLink href="/contact" variant="secondary">
                Ask a question
              </ButtonLink>
            </Reveal>

            {/* Description */}
            <Reveal delay={0.24}>
              <div className="mt-4 flex flex-col gap-4">
                {data.description.split("\n\n").map((para, i) => (
                  <p key={i} className="font-body-md text-body-md text-text-secondary text-pretty">
                    {para}
                  </p>
                ))}
              </div>
            </Reveal>
          </div>

          {/* Imagery */}
          <div className="lg:col-span-5">
            <Reveal direction="left" delay={0.1}>
              <div className="relative border border-border-subtle bg-surface-card p-2">
                <div className="absolute right-0 top-0 z-20 h-3 w-3 bg-border-active" />
                <div className="absolute bottom-0 left-0 z-20 h-3 w-3 bg-border-active" />
                <div className="relative h-[300px] overflow-hidden bg-surface-deep lg:h-[420px]">
                  {data.image ? (
                    <Image
                      src={data.image}
                      alt={data.name}
                      fill
                      priority
                      sizes="(max-width: 1024px) 100vw, 42vw"
                      className="object-cover grayscale-[15%] contrast-110"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-text-muted">
                      <Wrench className="h-10 w-10" aria-hidden />
                    </span>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-deep/70 to-transparent" />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border border-border-subtle bg-surface-card p-4">
                <span className="font-label-tag text-label-tag uppercase text-text-muted">
                  Component warranty
                </span>
                <span className="font-label-metric text-[28px] tabular-nums text-text-primary">
                  {data.warrantyDays}d
                </span>
              </div>
            </Reveal>
          </div>
        </div>

        {/* ---- Detail panels ---- */}
        <div className="mt-16 grid grid-cols-1 gap-gutter lg:grid-cols-3">
          <Reveal>
            <Panel title="What's included" icon={<Check className="h-4 w-4" />}>
              <ul className="flex flex-col gap-2.5">
                {data.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-tertiary" aria-hidden />
                    <span className="font-body-md text-body-md text-text-secondary">{f}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </Reveal>

          <Reveal delay={0.08}>
            <Panel title="Common symptoms" icon={<Wrench className="h-4 w-4" />}>
              <ul className="flex flex-col gap-2.5">
                {data.symptoms.map((s) => (
                  <li key={s} className="flex items-start gap-2.5">
                    <span className="mt-1.5 h-1 w-1 shrink-0 bg-border-active" />
                    <span className="font-body-md text-body-md text-text-secondary">{s}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </Reveal>

          <Reveal delay={0.16}>
            <Panel title="Devices we handle" icon={<Clock className="h-4 w-4" />}>
              <ul className="flex flex-wrap gap-2">
                {data.deviceSupport.map((d) => (
                  <li key={d}>
                    <Badge tone="outline">{d}</Badge>
                  </li>
                ))}
              </ul>
            </Panel>
          </Reveal>
        </div>

        {/* ---- FAQ ---- */}
        <section className="mt-16">
          <Reveal className="mb-8 border-b border-border-subtle pb-6">
            <SectionEyebrow tone="blue">Questions</SectionEyebrow>
            <h2 className="mt-3 font-headline-md text-headline-md text-text-primary">
              Everything about {data.name.toLowerCase()}
            </h2>
          </Reveal>

          <div className="grid max-w-4xl grid-cols-1 gap-px border border-border-subtle bg-border-subtle">
            {faq.map((item, i) => (
              <Reveal key={item.q} delay={i * 0.05}>
                <div className="bg-surface-card p-6">
                  <h3 className="font-headline-sm text-headline-sm text-text-primary">
                    {item.q}
                  </h3>
                  <p className="mt-3 font-body-md text-body-md text-text-secondary text-pretty">
                    {item.a}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ---- Related ---- */}
        {related.length > 0 ? (
          <section className="mt-16">
            <Reveal className="mb-8 flex items-center justify-between border-b border-border-subtle pb-6">
              <h2 className="font-headline-md text-headline-md text-text-primary">
                Other services
              </h2>
              <ButtonLink
                href="/services"
                variant="secondary"
                size="sm"
                trailing={<ArrowRight className="h-3.5 w-3.5" />}
              >
                All services
              </ButtonLink>
            </Reveal>

            <div className="grid grid-cols-1 gap-gutter md:grid-cols-3">
              {related.map((r, i) => {
                const item = serializeService(r);
                return (
                  <Reveal key={r.slug} delay={i * 0.08}>
                    <Link
                      href={`/services/${item.slug}` as Route}
                      className="group flex h-full flex-col gap-3 border border-border-subtle bg-surface-card p-6 transition-colors hover:border-border-active"
                    >
                      <span className="font-label-tag text-label-tag uppercase tracking-widest text-tertiary">
                        {item.eyebrow}
                      </span>
                      <h3 className="font-headline-sm text-headline-sm text-text-primary transition-colors group-hover:text-primary-fixed">
                        {item.name}
                      </h3>
                      <p className="line-clamp-2 font-body-sm text-body-sm text-text-secondary">
                        {item.summary}
                      </p>
                      <div className="mt-auto pt-4">
                        <ServicePrice
                          costMinor={item.basePrice}
                        />
                      </div>
                    </Link>
                  </Reveal>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col gap-5 border border-border-subtle bg-surface-card p-6">
      <div className="flex items-center gap-2.5">
        <span className="text-tertiary">{icon}</span>
        <h3 className="font-label-button text-label-button uppercase tracking-widest text-text-primary">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}