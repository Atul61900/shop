import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Quote, MapPin, Phone, Mail, MessageCircle } from "lucide-react";
import type { Route } from "next";

import { prisma } from "@/lib/prisma";
import { serializeProduct } from "@/lib/cart";
import { siteConfig } from "@/lib/config";
import { cn } from "@/lib/utils";

import { ButtonLink } from "@/components/ui/Button";
import { Card, SectionEyebrow } from "@/components/ui/Primitives";
import { Reveal, RevealGroup, RevealItem, SplitText } from "@/components/motion/Reveal";
import { CountUp } from "@/components/motion/Telemetry";
import { ProductCard } from "@/components/shop/ProductCard";

export const metadata: Metadata = {
  title: "Precision Mobile Repair in Kathmandu",
  description: siteConfig.description,
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const featured = await prisma.product.findMany({
    where: { isActive: true, isFeatured: true },
    take: 8,
    orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
    include: { category: { select: { slug: true, name: true } } },
  });

  return (
    <>
      <Hero />
      <Offerings />
      <Stats />
      <FeaturedProducts products={featured.map(serializeProduct)} />
      <Testimonials />
      <ContactBand />
    </>
  );
}

/* ==========================================================================
   HERO
   ========================================================================== */

/**
 * One shared sweep so the shine loops across both headline lines in sync.
 *
 * `background-size: 200%` puts the gradient twice as wide as the text, and the
 * highlight sits at the gradient's midpoint. Animating `background-position`
 * from `100%` to `0%` therefore walks that midpoint from the first character
 * to the last — see the `text-sweep` keyframes, which are deliberately slower
 * than the shared `shimmer` used by skeletons.
 */
const HEADLINE_SWEEP =
  "bg-[linear-gradient(100deg,#ffffff_0%,#ffffff_34%,#dbe9ff_45%,#7fe3f7_50%,#dbe9ff_55%,#ffffff_66%,#ffffff_100%)] bg-[length:200%_auto] bg-no-repeat bg-clip-text text-transparent animate-text-sweep";

function Hero() {
  return (
    <section className="relative w-full overflow-hidden bg-surface-base">
      <div className="bg-tech-grid pointer-events-none absolute inset-0 opacity-20" />
      <div className="pointer-events-none absolute -top-32 right-0 h-[540px] w-[540px] rounded-full bg-primary-container/15 blur-[140px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-margin-mobile pb-10 pt-14 lg:px-margin lg:pb-14 lg:pt-20">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
          {/* ---- Copy ---- */}
          <div className="flex flex-col items-start gap-6 lg:col-span-7">
            <Reveal delay={0.05}>
              <span className="inline-flex w-fit items-center gap-2 border border-border-subtle bg-surface-card px-2.5 py-1 font-label-tag text-label-tag uppercase tracking-widest text-text-secondary">
                Your Local Tech Hub
              </span>
            </Reveal>

            <h1 className="font-display-hero text-[clamp(2.5rem,5.2vw,4.5rem)] font-semibold leading-[1.06] tracking-[-0.03em] text-text-primary">
              <SplitText text="Stay Connected," className={HEADLINE_SWEEP} />{" "}
              <SplitText text="Stay Protected." className={HEADLINE_SWEEP} delay={0.1} />
            </h1>

            <Reveal delay={0.24}>
              <p className="max-w-xl font-body-lg text-body-lg text-text-secondary text-pretty">
                Browse genuine accessories, professional repair tools, and reliable
                repair services. Fast turnaround, genuine parts engineered for zero
                hardware compromise.
              </p>
            </Reveal>

            <Reveal delay={0.32} className="flex flex-wrap items-center gap-4 pt-2">
              <ButtonLink href="/shop" trailing={<ArrowRight className="h-4 w-4" />}>
                Browse Shop
              </ButtonLink>
              <ButtonLink
                href="/services"
                variant="secondary"
                trailing={<ArrowRight className="h-4 w-4" />}
              >
                Repair Services
              </ButtonLink>
            </Reveal>
          </div>

          {/* ---- Workbench ---- */}
          <div className="lg:col-span-5">
            <Reveal delay={0.15} direction="left">
              <div className="relative border border-border-subtle">
                {/* Fades the photo's left edge into the page background so it
                    reads as part of the surface rather than a pasted panel. */}
                <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-surface-base to-transparent" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-20 bg-gradient-to-t from-surface-base to-transparent" />

                <Image
                  src="/images/hero-workbench.jpg"
                  alt="A phone disassembled on a repair workbench beside precision screwdrivers and spare parts"
                  width={1000}
                  height={747}
                  priority
                  sizes="(max-width: 1024px) 100vw, 42vw"
                  className="block w-full object-cover opacity-90 contrast-[1.05]"
                />

                {/* Corner accent cuts, matching the rest of the site. */}
                <div className="pointer-events-none absolute right-0 top-0 z-20 h-3 w-3 bg-border-active" />
                <div className="pointer-events-none absolute bottom-0 left-0 z-20 h-3 w-3 bg-border-active" />
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   OFFERINGS
   ========================================================================== */

type Pillar = {
  index: string;
  sector: string;
  status: string;
  title: string;
  body: string;
  bullets: string[];
  href: string;
  cta: string;
  image: string;
  /** object-position override for images that need re-framing when cropped. */
  focus?: string;
  featured?: boolean;
};

const PILLARS: Pillar[] = [
  {
    index: "01",
    sector: "REPAIR TOOLS",
    status: "IN-STOCK",
    title: "Repair Parts & Tools",
    body: "Professional-grade toolkits, screen replacement kits and repair consumables — the same gear our technicians use daily.",
    bullets: ["62-Piece Screen Replacement Kits", "ESD-Safe Precision Tooling"],
    href: "/shop?category=repair-parts",
    cta: "Shop Tools",
    image: "/images/service-center/category-repair.webp",
  },
  {
    index: "02",
    sector: "PROTECTION",
    status: "CERTIFIED OEM",
    title: "Essential Accessories",
    body: "Genuine accessories for every need: chargers, cases, and screen protection engineered to withstand rigorous daily stress.",
    bullets: ["High-Wattage GaN Fast Power Brick", "9H Sapphire Glass Tempered Shields"],
    href: "/shop?category=accessories",
    cta: "Shop Accessories",
    image: "/images/service-center/category-accessories.webp",
  },
  {
    index: "03",
    sector: "DIAGNOSTICS",
    status: "FLAGSHIP SERVICE",
    title: "Reliable Device Repair",
    body: "Fast turnaround for screen, battery, and other hardware issues. Expert device care using precision optical equipment.",
    bullets: ["BGA Chip Reballing & Short Tracing", "Cleanroom OLED Laminate Fusion"],
    href: "/services",
    cta: "Get Repair Help",
    image: "/images/service-center/technician-microsoldering.jpg",
    // Square source cropped into a wide band, so bias up to keep the
    // microscope and the technician in frame rather than the bench edge.
    focus: "object-[center_45%]",
    featured: true,
  },
];

function Offerings() {
  return (
    <section className="w-full border-b border-border-subtle bg-surface-base pb-20 pt-16" id="shop">
      <div className="mx-auto max-w-7xl px-margin-mobile lg:px-margin">
        {/* Header */}
        <div className="flex flex-col justify-between gap-6 border-b border-border-subtle pb-10 md:flex-row md:items-end">
          <Reveal className="flex max-w-2xl flex-col gap-2">
            <SectionEyebrow>Our Offerings</SectionEyebrow>
            <h2 className="font-headline-lg text-headline-lg text-text-primary">
              Accessories, Tools &amp; Repair
            </h2>
            <p className="font-body-md text-body-md text-text-secondary">
              Protect your current device with genuine accessories, equip your workshop with
              professional tools, or get it fixed by our certified micro-repair technicians.
            </p>
          </Reveal>
          <Reveal delay={0.1} className="font-label-tag text-label-tag text-text-muted">
            SECTOR CAPABILITY MATRIX • REV 2025.4
          </Reveal>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 gap-gutter pt-10 md:grid-cols-3">
          {PILLARS.map((pillar, i) => (
            <Reveal key={pillar.index} delay={i * 0.1} direction="up" className="flex">
              <Card
                hover
                className="flex w-full flex-col justify-between border-border-subtle"
              >
                {pillar.featured ? (
                  <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 bg-border-active/10 blur-xl" />
                ) : null}

                <div className="flex h-full flex-col">
                  <div className="flex items-center justify-between border-b border-border-subtle p-5">
                    <span className="font-label-tag text-label-tag uppercase tracking-wider text-tertiary">
                      [ {pillar.index} / {pillar.sector} ]
                    </span>
                    <span
                      className={`font-label-tag text-label-tag ${
                        pillar.featured
                          ? "font-semibold text-tertiary"
                          : "text-text-muted"
                      }`}
                    >
                      {pillar.status}
                    </span>
                  </div>

                  <div className="relative h-56 overflow-hidden bg-surface-deep">
                    <Image
                      src={pillar.image}
                      alt={pillar.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className={cn(
                        "object-cover transition-transform duration-500 group-hover:scale-105",
                        pillar.focus,
                      )}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-surface-card via-transparent to-transparent" />
                  </div>

                  <div className="flex flex-1 flex-col gap-3 p-6">
                    <h3 className="font-headline-md text-headline-md text-text-primary transition-colors group-hover:text-primary-fixed">
                      {pillar.title}
                    </h3>
                    <p className="font-body-md text-body-md text-text-secondary">{pillar.body}</p>
                    <ul className="flex flex-col gap-2 border-t border-border-subtle/50 pt-4 font-body-sm text-body-sm text-text-muted">
                      {pillar.bullets.map((b) => (
                        <li key={b} className="flex items-center gap-2">
                          <span className="h-1 w-1 bg-border-active" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="p-6 pt-0">
                  <Link
                    href={pillar.href as Route}
                    className={`inline-flex w-full items-center justify-between border px-4 py-3 font-label-button text-label-button uppercase tracking-wider transition-all ${
                      pillar.featured
                        ? "border-transparent bg-primary-container text-text-primary shadow-glow hover:bg-secondary-container"
                        : "border-border-subtle bg-surface-deep text-text-primary hover:border-border-active hover:bg-primary-container"
                    }`}
                  >
                    <span>{pillar.cta}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   STATS
   ========================================================================== */

const STATS = [
  {
    index: "01",
    tag: "EXPERIENCE",
    value: 5,
    suffix: "+",
    decimals: 0,
    label: "Local Service",
    body: "Continuous operation in Kathmandu providing trusted solutions for individuals and enterprises.",
  },
  {
    index: "02",
    tag: "PROVEN TRACK",
    value: 1000,
    suffix: "+",
    decimals: 0,
    label: "Devices Repaired",
    body: "High-complexity motherboards, liquid ingress recovery, and micro-BGA chip replacements completed.",
  },
  {
    index: "03",
    tag: "HONEST QUOTES",
    value: 0,
    suffix: "",
    decimals: 0,
    label: "No Surprises",
    raw: "Fixed",
    body: "You get a clear diagnosis and a price before any work starts. If it is not worth repairing, we tell you that too.",
  },
  {
    index: "04",
    tag: "QUALITY RATING",
    value: 99.4,
    suffix: "%",
    decimals: 1,
    label: "First-Time Fix",
    body: "Strict post-repair quality testing ensures zero return defects and complete device integrity.",
  },
];

function Stats() {
  return (
    <section className="w-full border-b border-border-subtle bg-surface-base py-20">
      <div className="mx-auto max-w-7xl px-margin-mobile lg:px-margin">
        <Reveal className="mb-12 max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2">
            <span className="h-2 w-2 bg-primary-container" />
            <span className="font-label-tag text-label-tag uppercase tracking-widest text-tertiary">
              Our Commitment
            </span>
          </div>
          <h2 className="font-headline-lg text-headline-lg text-text-primary">
            Dependable Service, Every Time
          </h2>
          <p className="mt-3 font-body-lg text-body-lg text-text-secondary text-pretty">
            Precision electronics cannot rely on guesswork. We apply rigorous diagnostic
            validation and genuine component sourcing to every smartphone that enters our service center.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 border-l border-t border-border-subtle sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((stat, i) => (
            <Reveal
              key={stat.index}
              delay={i * 0.08}
              className="group flex flex-col justify-between border-b border-r border-border-subtle bg-surface-card p-8 transition-colors hover:bg-surface-card-hover"
            >
              <span className="font-label-tag text-label-tag text-text-muted">
                {"// "}
                {stat.index} • {stat.tag}
              </span>
              <div className="my-6">
                <div className="font-label-metric text-label-metric text-text-primary">
                  {stat.raw ?? <CountUp value={stat.value} decimals={stat.decimals} suffix={stat.suffix} />}
                </div>
                <div className="mt-2 font-headline-sm text-headline-sm text-tertiary">
                  {stat.label}
                </div>
              </div>
              <p className="font-body-sm text-body-sm text-text-muted">{stat.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   FEATURED PRODUCTS
   ========================================================================== */

function FeaturedProducts({
  products,
}: {
  products: ReturnType<typeof serializeProduct>[];
}) {
  if (products.length === 0) return null;

  return (
    <section className="w-full border-b border-border-subtle bg-surface-base py-20">
      <div className="mx-auto max-w-7xl px-margin-mobile lg:px-margin">
        <div className="mb-10 flex flex-col items-start justify-between gap-6 border-b border-border-subtle pb-8 sm:flex-row sm:items-end">
          <Reveal>
            <SectionEyebrow>In Stock Now</SectionEyebrow>
            <h2 className="mt-3 font-headline-lg text-headline-lg text-text-primary">
              Counter Stock
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <ButtonLink
              href="/shop"
              variant="secondary"
              trailing={<ArrowRight className="h-4 w-4" />}
            >
              View all products
            </ButtonLink>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-4">
          {products.slice(0, 8).map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   TESTIMONIALS
   ========================================================================== */

function Testimonials() {
  return (
    <section className="relative w-full overflow-hidden border-b border-border-subtle bg-surface-card py-20">
      <div className="bg-tech-grid-blue pointer-events-none absolute inset-0 opacity-15" />

      <div className="relative z-10 mx-auto max-w-7xl px-margin-mobile lg:px-margin">
        <Reveal className="mb-10 flex flex-col items-center gap-3 text-center">
          <Quote className="h-8 w-8 text-border-active" aria-hidden />
          <h2 className="font-headline-lg text-headline-lg text-text-primary">
            What Our Customers Say
          </h2>
        </Reveal>

        <RevealGroup className="grid grid-cols-1 gap-gutter md:grid-cols-3">
          {siteConfig.testimonials.map((t) => (
            <RevealItem key={t.author}>
              <figure className="flex h-full flex-col justify-between gap-6 border border-border-subtle bg-surface-base p-6 transition-colors hover:border-border-active">
                <blockquote>
                  <p className="font-body-md text-body-md leading-relaxed text-text-secondary text-pretty">
                    “{t.quote}”
                  </p>
                </blockquote>
                <figcaption className="flex flex-col gap-1 border-t border-border-subtle pt-4">
                  <span className="font-headline-sm text-headline-sm font-semibold text-text-primary">
                    {t.author}
                  </span>
                  <span className="font-label-tag text-label-tag uppercase tracking-widest text-tertiary">
                    {t.role}
                  </span>
                </figcaption>
              </figure>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

/* ==========================================================================
   CTA
   ========================================================================== */

function ContactBand() {
  return (
    <section className="relative w-full overflow-hidden bg-surface-base py-20">
      <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-primary-container/15 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-margin-mobile lg:px-margin">
        <Reveal>
          <Card hover className="group relative overflow-hidden p-8 lg:p-14">
            <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
              <div className="flex flex-col gap-4 lg:col-span-8">
                <SectionEyebrow>Connect With Our Service Center</SectionEyebrow>
                <h2 className="font-headline-lg text-text-primary lg:text-[44px]">
                  Keep Your Devices Running Smoothly
                </h2>
                <p className="max-w-2xl font-body-lg text-body-lg text-text-secondary text-pretty">
                  Whether you need a genuine accessory, a repair tool, or a quick repair, we&apos;re
                  here to help you stay connected with motorsport-grade precision.
                </p>

                <div className="flex flex-wrap items-center gap-6 pt-4 font-body-sm text-body-sm text-text-muted">
                  <span className="flex items-center gap-2">
                    <MapPin className="h-[18px] w-[18px] text-border-active" aria-hidden />
                    {siteConfig.address.line1}, {siteConfig.address.line2}
                  </span>
                  <span className="flex items-center gap-2">
                    <Phone className="h-[18px] w-[18px] text-border-active" aria-hidden />
                    {siteConfig.contact.phoneDisplay}
                  </span>
                  <span className="flex items-center gap-2">
                    <Mail className="h-[18px] w-[18px] text-border-active" aria-hidden />
                    {siteConfig.contact.email}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row lg:col-span-4 lg:flex-col">
                <ButtonLink
                  href="/shop"
                  fullWidth
                  trailing={<ArrowRight className="h-4 w-4" />}
                  className="flex-1"
                >
                  Get Connected Today
                </ButtonLink>
                <ButtonLink
                  href={siteConfig.contact.whatsapp}
                  fullWidth
                  variant="ghost"
                  icon={<MessageCircle className="h-[18px] w-[18px] text-tertiary" />}
                  className="flex-1"
                >
                  WhatsApp Direct
                </ButtonLink>
              </div>
            </div>
          </Card>
        </Reveal>
      </div>
    </section>
  );
}
