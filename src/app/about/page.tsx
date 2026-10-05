import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight, Check, Compass, Award } from "lucide-react";

import { prisma } from "@/lib/prisma";

import { ButtonLink } from "@/components/ui/Button";
import { SectionEyebrow } from "@/components/ui/Primitives";
import { Reveal, RevealGroup, RevealItem, SplitText } from "@/components/motion/Reveal";
import { CountUp, StatusDot } from "@/components/motion/Telemetry";

export const metadata: Metadata = {
  title: "About Our Service Center",
  description:
    "Krishna Mobile Repairing Center has provided precision micro-electronics repair in Kathmandu for over five years. Meet the team, our process, and the standards we hold every device to.",
  alternates: { canonical: "/about" },
};

const COMMITMENTS = [
  {
    icon: Check,
    title: "Fast Turnaround",
    body: "Quick and efficient repairs get your device back in your hands sooner. Most screen and power module work is completed while you wait.",
  },
  {
    icon: Award,
    title: "Genuine Quality",
    body: "We use authentic parts and offer reliable accessories for lasting performance. Every component is logged against your ticket.",
  },
  {
    icon: Compass,
    title: "Honest Advice",
    body: "Clear communication and fair options, so you always know what to expect. If a repair is not worth doing, we will tell you.",
  },
];

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

const NUMBERS = [
  { value: 5, suffix: "+", label: "Years in business" },
  { value: 1000, suffix: "+", label: "Devices repaired" },
  { value: 90, suffix: "d", label: "Component warranty" },
  { value: 99.4, suffix: "%", label: "First-time fix", decimals: 1 },
];

export default async function AboutPage() {
  const serviceCount = await prisma.service.count({ where: { isActive: true } });

  return (
    <>
      {/* ---- Hero ---- */}
      <section className="relative overflow-hidden border-b border-border-subtle bg-surface-base">
        <div className="bg-tech-grid pointer-events-none absolute inset-0 opacity-15" />
        <div className="pointer-events-none absolute -left-24 top-0 h-[420px] w-[420px] rounded-full bg-primary-container/10 blur-[130px]" />

        <div className="relative z-10 mx-auto max-w-7xl px-margin-mobile py-16 lg:px-margin lg:py-24">
          <Reveal duration={0.5}>
            <SectionEyebrow>Our Mission</SectionEyebrow>
          </Reveal>

          <h1 className="mt-4 max-w-4xl font-display-hero text-display-hero-mobile text-text-primary lg:text-display-hero">
            <SplitText text="Your Local Mobile Hub" />
          </h1>

          <Reveal delay={0.15}>
            <p className="mt-6 max-w-2xl font-body-lg text-body-lg text-text-secondary text-pretty">
              Dedicated to keeping our community connected with dependable mobile care, offering
              genuine accessories, and expert device maintenance.
            </p>
          </Reveal>

          <Reveal delay={0.25} className="mt-10 flex flex-wrap items-center gap-4">
            <ButtonLink href="/contact" trailing={<ArrowRight className="h-4 w-4" />}>
              Contact our store
            </ButtonLink>
            <ButtonLink href="/services" variant="secondary">
              See our services
            </ButtonLink>
          </Reveal>

          <Reveal
            delay={0.35}
            className="mt-14 grid grid-cols-2 gap-px border border-border-subtle bg-border-subtle lg:grid-cols-4"
          >
            {NUMBERS.map((n) => (
              <div key={n.label} className="bg-surface-card p-6">
                <div className="font-label-metric text-[36px] text-text-primary">
                  <CountUp value={n.value} decimals={n.decimals ?? 0} suffix={n.suffix} />
                </div>
                <div className="mt-1 font-label-tag text-label-tag uppercase text-text-muted">
                  {n.label}
                </div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ---- Story ---- */}
      <section className="border-b border-border-subtle bg-surface-card">
        <div className="mx-auto max-w-7xl px-margin-mobile py-20 lg:px-margin">
          <div className="grid grid-cols-1 items-center gap-gutter lg:grid-cols-12">
            <div className="lg:col-span-6">
              <Reveal>
                <div className="relative h-[360px] overflow-hidden border border-border-subtle bg-surface-deep lg:h-[440px]">
                  <Image
                    src="/images/service-center/micro-soldering.jpg"
                    alt="Technician aligning a ribbon cable on a logic board"
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover contrast-125"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-deep/80 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between border border-border-subtle bg-surface-card/90 p-3 backdrop-blur-md">
                    <span className="flex items-center gap-2 font-label-tag text-label-tag text-tertiary">
                      <StatusDot />
                      STATION 01 · MICRO-SOLDERING
                    </span>
                    <span className="font-label-tag text-label-tag text-text-muted">
                      {serviceCount} SERVICES
                    </span>
                  </div>
                </div>
              </Reveal>
            </div>

            <div className="flex flex-col gap-6 lg:col-span-6 lg:pl-8">
              <Reveal>
                <SectionEyebrow tone="blue">Our Journey</SectionEyebrow>
                <h2 className="mt-3 font-headline-lg text-headline-lg text-text-primary">
                  Keeping You Connected
                </h2>
              </Reveal>

              <Reveal delay={0.1}>
                <p className="font-body-lg text-body-lg text-text-secondary text-pretty">
                  Krishna Mobile Repairing Center combines a practical inventory of genuine
                  accessories and professional repair tools with hands-on technical experience. We ensure you get honest advice
                  and reliable support for all your everyday tech needs.
                </p>
              </Reveal>

              <Reveal delay={0.16}>
                <p className="font-body-md text-body-md text-text-muted text-pretty">
                  What started as a single counter in Tripureshwor has grown into a full
                  service center — but the rule has not changed. We quote before we start, we use
                  parts we can stand behind, and we tell you plainly when a device is not worth
                  repairing. That is why people come back, and why they send their neighbours.
                </p>
              </Reveal>

              <Reveal delay={0.22}>
                <div className="flex flex-col gap-3 border-t border-border-subtle pt-6">
                  {[
                    "Quote before any work begins — no surprise invoices",
                    "Genuine OEM components, logged against your ticket",
                    "90-day component warranty on every repair",
                    "No repair charge if a device is beyond economical repair",
                  ].map((line) => (
                    <div key={line} className="flex items-start gap-3">
                      <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center bg-tertiary text-surface-base">
                        <Check className="h-3 w-3" aria-hidden />
                      </span>
                      <span className="font-body-md text-body-md text-text-secondary">
                        {line}
                      </span>
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>
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
              KMRC PROTOCOL
            </span>
          </Reveal>

          <RevealGroup className="grid grid-cols-1 gap-gutter md:grid-cols-3">
            {PROCESS.map((step) => (
              <RevealItem key={step.n}>
                <div className="group relative flex h-full flex-col gap-4 border border-border-subtle bg-surface-card p-6 transition-colors hover:border-border-active">
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

      {/* ---- Commitments ---- */}
      <section className="bg-surface-base py-24">
        <div className="mx-auto max-w-7xl px-margin-mobile lg:px-margin">
          <Reveal className="mb-14 max-w-3xl">
            <SectionEyebrow tone="blue">Our Commitments</SectionEyebrow>
            <h2 className="mt-3 font-headline-lg text-headline-lg text-text-primary">
              Service You Can Trust
            </h2>
            <p className="mt-3 font-body-lg text-body-lg text-text-secondary text-pretty">
              We believe in transparent service and quality products. Our values guide every repair
              and every recommendation.
            </p>
          </Reveal>

          <RevealGroup className="grid grid-cols-1 gap-gutter md:grid-cols-3">
            {COMMITMENTS.map((c) => (
              <RevealItem key={c.title}>
                <div className="group flex h-full flex-col gap-4 border border-border-subtle bg-surface-card p-6 transition-colors hover:border-border-active">
                  <span className="flex h-11 w-11 items-center justify-center border border-border-subtle bg-surface-deep text-tertiary transition-colors group-hover:border-border-active">
                    <c.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="font-headline-sm text-headline-sm text-text-primary">
                    {c.title}
                  </h3>
                  <p className="font-body-md text-body-md text-text-secondary">{c.body}</p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>

          <Reveal delay={0.1} className="mt-14 flex justify-center">
            <ButtonLink href="/contact" size="lg" trailing={<ArrowRight className="h-4 w-4" />}>
              Visit the service center
            </ButtonLink>
          </Reveal>
        </div>
      </section>
    </>
  );
}