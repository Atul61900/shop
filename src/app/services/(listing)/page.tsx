import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Phone } from "lucide-react";
import type { Route } from "next";

import { prisma } from "@/lib/prisma";
import { serializeService } from "@/lib/services";
import { jsonLdScript } from "@/lib/seo";
import { siteConfig } from "@/lib/config";
import { ButtonLink } from "@/components/ui/Button";
import { Badge, SectionEyebrow } from "@/components/ui/Primitives";
import { Reveal, RevealGroup, RevealItem, SplitText } from "@/components/motion/Reveal";
import { ServicePrice } from "@/components/repair/ServicePrice";

export const metadata: Metadata = {
  title: "Mobile Repair Services in Kathmandu",
  description:
    "Screen replacement, battery replacement, charging port repair, motherboard repair, water damage recovery and software diagnostics. Transparent quotes, genuine parts, 90-day warranty.",
  alternates: { canonical: "/services" },
};

const PROCESS = [
  {
    n: "01",
    title: "Quick Diagnostic",
    body: "Bring your device in for a thorough assessment. We quickly identify the problem and provide a clear, upfront estimate before any work begins.",
  },
  {
    n: "02",
    title: "Skilled Repair",
    body: "Our experienced technicians use quality replacement parts for all repairs, from screens to batteries, ensuring a reliable and lasting fix.",
  },
  {
    n: "03",
    title: "Ready for Pickup",
    body: "Once your repair is complete, we'll notify you for convenient pickup. Your device will be fully tested and ready to go.",
  },
];

export default async function ServicesPage() {
  const services = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  const serialized = services.map(serializeService);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: serialized.flatMap((s) => [
      {
        "@type": "Question",
        name: `How long does ${s.name.toLowerCase()} take?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: "It depends on the fault and the parts involved. Describe the issue when you call or walk in and we will tell you honestly before starting any work.",
        },
      },
      {
        "@type": "Question",
        name: `Is ${s.name.toLowerCase()} covered by warranty?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Yes — every ${s.name.toLowerCase()} carries a ${s.warrantyDays}-day component warranty.`,
        },
      },
    ]),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
      />

      {/* ---- Hero ---- */}
      <section className="relative overflow-hidden border-b border-border-subtle bg-surface-deep">
        <div className="bg-tech-grid-blue pointer-events-none absolute inset-0 opacity-15" />
        <div className="pointer-events-none absolute -right-24 top-0 h-[460px] w-[460px] rounded-full bg-primary-container/12 blur-[130px]" />

        <div className="relative z-10 mx-auto max-w-7xl px-margin-mobile py-16 lg:px-margin lg:py-24">
          <div className="grid grid-cols-1 items-center gap-gutter lg:grid-cols-2">
            <div className="flex flex-col gap-6">
              <Reveal duration={0.5}>
                <SectionEyebrow>Device Care</SectionEyebrow>
              </Reveal>

              <h1 className="font-display-hero text-display-hero-mobile text-text-primary lg:text-display-hero">
                <SplitText text="Expert Mobile Repair" />
              </h1>

              <Reveal delay={0.12}>
                <p className="max-w-xl font-body-lg text-body-lg text-text-secondary text-pretty">
                  Get your smartphone back in top condition with our fast and reliable repair
                  services. We specialise in screen replacements, battery fixes, and charging port
                  repairs, ensuring your device is ready when you need it.
                </p>
              </Reveal>

              <Reveal delay={0.2} className="flex flex-wrap items-center gap-4">
                <ButtonLink href={`tel:${siteConfig.contact.phone}`} trailing={<Phone className="h-4 w-4" />}>
                  Call for a Quote
                </ButtonLink>
                <ButtonLink href="/contact" variant="secondary">
                  Ask a question
                </ButtonLink>
              </Reveal>
            </div>

            <Reveal direction="left" delay={0.15}>
              <div className="relative border border-border-subtle bg-surface-card p-2">
                <div className="absolute right-0 top-0 z-20 h-3 w-3 bg-border-active" />
                <div className="absolute bottom-0 left-0 z-20 h-3 w-3 bg-border-active" />
                <div className="relative h-[320px] overflow-hidden bg-surface-deep lg:h-[400px]">
                  <Image
                    src="/images/service-center/micro-soldering.jpg"
                    alt="Micro-soldering a logic board under magnification"
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover grayscale-[20%] contrast-125"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-deep via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 border border-border-subtle bg-surface-card/90 p-3 backdrop-blur-md">
                    <div className="flex items-center justify-between font-label-tag text-label-tag">
                      <span className="text-tertiary">SERVICE CAPACITY</span>
                      <span className="text-text-muted">2 / 3 STATIONS ACTIVE</span>
                    </div>
                    <div className="mt-2 h-1 w-full overflow-hidden bg-surface-deep">
                      <div className="h-full w-2/3 bg-border-active" />
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---- Services grid ---- */}
      <section className="border-b border-border-subtle bg-surface-base py-20">
        <div className="mx-auto max-w-7xl px-margin-mobile lg:px-margin">
          <Reveal className="mb-12 max-w-2xl">
            <SectionEyebrow>Our Services</SectionEyebrow>
            <h2 className="mt-3 font-headline-lg text-headline-lg text-text-primary">
              Common Repairs
            </h2>
            <p className="mt-3 font-body-md text-body-md text-text-secondary">
              Every repair includes a firm quote before we start, genuine parts, and a 90-day
              component warranty.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 gap-gutter md:grid-cols-2 lg:grid-cols-3">
            {serialized.map((service, i) => (
              <Reveal key={service.slug} delay={(i % 3) * 0.08} className="flex">
                <Link
                  href={`/services/${service.slug}` as Route}
                  className="group flex w-full flex-col border border-border-subtle bg-surface-card transition-colors hover:border-border-active"
                >
                  {service.image ? (
                    <div className="relative h-48 overflow-hidden bg-surface-deep">
                      <Image
                        src={service.image}
                        alt={service.name}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover grayscale-[15%] contrast-110 transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-surface-card via-transparent to-transparent" />
                      <Badge tone="cyan" className="absolute left-4 top-4">
                        {service.eyebrow}
                      </Badge>
                    </div>
                  ) : null}

                  <div className="flex flex-1 flex-col gap-3 p-6">
                    <h3 className="font-headline-sm text-headline-sm text-text-primary transition-colors group-hover:text-primary-fixed">
                      {service.name}
                    </h3>
                    <p className="line-clamp-3 font-body-md text-body-md text-text-secondary">
                      {service.summary}
                    </p>

                    <ul className="mt-1 flex flex-col gap-1.5">
                      {service.features.slice(0, 3).map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-2 font-body-sm text-[12px] text-text-muted"
                        >
                          <Check className="mt-0.5 h-3 w-3 shrink-0 text-tertiary" aria-hidden />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-auto flex items-end justify-between gap-4 border-t border-border-subtle pt-5">
                      <ServicePrice
                        costMinor={service.basePrice}
                      />
                      <ArrowRight className="h-4 w-4 shrink-0 text-text-muted transition-all group-hover:translate-x-1 group-hover:text-primary" />
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Process ---- */}
      <section className="border-b border-border-subtle bg-surface-deep py-20">
        <div className="mx-auto max-w-7xl px-margin-mobile lg:px-margin">
          <Reveal className="mb-12 flex items-center justify-between border-b border-border-subtle pb-8">
            <h2 className="font-headline-lg text-headline-lg text-text-primary">
              Simple Steps to Repair
            </h2>
            <span className="hidden font-label-tag text-label-tag uppercase text-text-muted sm:inline">
              3 STAGES
            </span>
          </Reveal>

          <RevealGroup className="grid grid-cols-1 gap-gutter md:grid-cols-3">
            {PROCESS.map((step) => (
              <RevealItem key={step.n}>
                <div className="group flex h-full flex-col gap-4 border border-border-subtle bg-surface-card p-6 transition-colors hover:border-border-active">
                  <span className="font-label-metric text-[40px] leading-none text-tertiary">
                    {step.n}
                  </span>
                  <h3 className="font-headline-sm text-headline-sm text-text-primary">
                    {step.title}
                  </h3>
                  <p className="font-body-md text-body-md text-text-secondary">{step.body}</p>
                  <div className="mt-2 h-0.5 w-10 bg-border-active transition-all duration-500 group-hover:w-full" />
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section className="bg-surface-base py-20">
        <div className="mx-auto max-w-4xl px-margin-mobile text-center lg:px-margin">
          <Reveal>
            <SectionEyebrow className="justify-center">Ready when you are</SectionEyebrow>
            <h2 className="mt-4 font-headline-lg text-headline-lg text-text-primary text-balance">
              Not sure what is wrong?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl font-body-lg text-body-lg text-text-secondary text-pretty">
              Walk in with your device and we will assess it before you commit to
              anything. If it is not worth repairing, we will say so.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <ButtonLink href={`tel:${siteConfig.contact.phone}`} size="lg" trailing={<Phone className="h-4 w-4" />}>
                Call the Shop
              </ButtonLink>
              <ButtonLink href="/contact" size="lg" variant="secondary">
                Ask a question
              </ButtonLink>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}