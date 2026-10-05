import type { Metadata } from "next";
import { Mail, Phone, MapPin, Clock, MessageCircle, ArrowRight } from "lucide-react";

import { siteConfig } from "@/lib/config";
import { ButtonLink } from "@/components/ui/Button";
import { SectionEyebrow } from "@/components/ui/Primitives";
import { Reveal, RevealGroup, RevealItem, SplitText } from "@/components/motion/Reveal";
import { ContactForm } from "@/components/contact/ContactForm";

export const metadata: Metadata = {
  title: "Contact Us",
  description: `Reach ${siteConfig.name} in Tripureshwor, Kathmandu for repair quotes, stock availability and directions. Open Monday to Saturday, 9am – 7pm.`,
  alternates: { canonical: "/contact" },
};

const CHANNELS = [
  {
    icon: Mail,
    label: "Email",
    value: siteConfig.contact.email,
    href: `mailto:${siteConfig.contact.email}`,
    note: "Replies within one working day",
  },
  {
    icon: Phone,
    label: "Phone",
    value: siteConfig.contact.phoneDisplay,
    href: `tel:${siteConfig.contact.phone}`,
    note: "Fastest for urgent repairs",
  },
  {
    icon: MessageCircle,
    label: "WhatsApp",
    value: "Message us",
    href: siteConfig.contact.whatsapp,
    note: "Send photos of the fault",
  },
];

export default function ContactPage() {
  // Pinned to the exact storefront (27.692791, 85.315253), zoomed to street level.
  const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(
    siteConfig.address.mapQuery,
  )}&z=17&output=embed`;
  const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    siteConfig.address.mapQuery,
  )}`;

  return (
    <>
      {/* ---- Header ---- */}
      <section className="relative overflow-hidden border-b border-border-subtle bg-surface-base">
        <div className="bg-tech-grid pointer-events-none absolute inset-0 opacity-15" />

        <div className="relative z-10 mx-auto max-w-7xl px-margin-mobile py-16 lg:px-margin lg:py-20">
          <Reveal duration={0.5}>
            <SectionEyebrow>Get in Touch</SectionEyebrow>
          </Reveal>
          <h1 className="mt-4 max-w-3xl font-display-hero text-display-hero-mobile text-text-primary lg:text-display-hero">
            <SplitText text="Connect With Us" />
          </h1>
          <Reveal delay={0.12}>
            <p className="mt-6 max-w-2xl font-body-lg text-body-lg text-text-secondary text-pretty">
              Reach out for quick repair quotes and current stock availability. We&apos;re here to
              help keep you connected with fast turnaround and genuine accessories.
            </p>
          </Reveal>

          {/* Channels */}
          <RevealGroup className="mt-12 grid grid-cols-1 gap-px border border-border-subtle bg-border-subtle md:grid-cols-3">
            {CHANNELS.map((channel) => (
              <RevealItem key={channel.label}>
                <a
                  href={channel.href}
                  target={channel.href.startsWith("http") ? "_blank" : undefined}
                  rel={channel.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="group flex h-full flex-col gap-3 bg-surface-card p-6 transition-colors hover:bg-surface-card-hover"
                >
                  <span className="flex h-10 w-10 items-center justify-center border border-border-subtle bg-surface-deep text-tertiary transition-colors group-hover:border-border-active">
                    <channel.icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="flex flex-col gap-1">
                    <span className="font-label-tag text-label-tag uppercase tracking-widest text-text-muted">
                      {channel.label}
                    </span>
                    <span className="font-headline-sm text-headline-sm text-text-primary transition-colors group-hover:text-tertiary">
                      {channel.value}
                    </span>
                    <span className="font-body-sm text-[12px] text-text-muted">{channel.note}</span>
                  </div>
                </a>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* ---- Form + details ---- */}
      <section className="border-b border-border-subtle bg-surface-card">
        <div className="mx-auto max-w-7xl px-margin-mobile py-20 lg:px-margin">
          <div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
            {/* Form */}
            <div className="lg:col-span-7">
              <Reveal>
                <h2 className="font-headline-lg text-headline-lg text-text-primary">
                  Send us a message
                </h2>
                <p className="mt-3 font-body-md text-body-md text-text-secondary">
                  Tell us what happened and we will come back with a realistic quote and timeline.
                </p>
              </Reveal>

              <Reveal delay={0.1} className="mt-8 border border-border-subtle bg-surface-base p-6 lg:p-8">
                <ContactForm />
              </Reveal>
            </div>

            {/* Details */}
            <aside className="flex flex-col gap-gutter lg:col-span-5">
              <Reveal direction="left">
                <div className="flex flex-col gap-4 border border-border-subtle bg-surface-base p-6">
                  <span className="flex items-center gap-2 font-label-tag text-label-tag uppercase tracking-widest text-tertiary">
                    <MapPin className="h-3.5 w-3.5" aria-hidden />
                    Visit the store
                  </span>
                  <address className="not-italic">
                    <span className="block font-headline-sm text-headline-sm text-text-primary">
                      {siteConfig.name}
                    </span>
                    <span className="mt-1 block font-body-md text-body-md text-text-secondary">
                      {siteConfig.address.line1}
                      <br />
                      {siteConfig.address.line2}
                      <br />
                      {siteConfig.address.country}
                    </span>
                  </address>
                  <ButtonLink href={mapLink} variant="ghost" size="sm" trailing={<ArrowRight className="h-3.5 w-3.5" />}>
                    Open in Google Maps
                  </ButtonLink>
                </div>
              </Reveal>

              <Reveal direction="left" delay={0.08}>
                <div className="flex flex-col gap-4 border border-border-subtle bg-surface-base p-6">
                  <span className="flex items-center gap-2 font-label-tag text-label-tag uppercase tracking-widest text-tertiary">
                    <Clock className="h-3.5 w-3.5" aria-hidden />
                    Store hours
                  </span>
                  <dl className="flex flex-col gap-2.5">
                    {siteConfig.hours.map((h) => (
                      <div key={h.days} className="flex items-baseline justify-between gap-4">
                        <dt className="font-body-sm text-body-sm text-text-secondary">{h.days}</dt>
                        <dd
                          className={`shrink-0 font-label-tag text-label-tag ${
                            h.time === "Closed (emergency calls only)"
                              ? "text-text-muted"
                              : "text-text-primary"
                          }`}
                        >
                          {h.time}
                        </dd>
                      </div>
                    ))}
</dl>
                </div>
              </Reveal>

              <Reveal direction="left" delay={0.16}>
                <div className="border border-border-subtle bg-surface-deep p-6">
                  <h3 className="font-headline-sm text-headline-sm text-text-primary">
                    Prefer to just call?
                  </h3>
                  <p className="mt-2 font-body-md text-body-md text-text-secondary">
                    Describe the fault on the phone and we will tell you straight away whether
                    it is worth bringing in — and what it will cost.
                  </p>
                  <ButtonLink href={`tel:${siteConfig.contact.phone}`} variant="secondary" size="sm" className="mt-5" trailing={<Phone className="h-3.5 w-3.5" />}>
                    {siteConfig.contact.phoneDisplay}
                  </ButtonLink>
                </div>
              </Reveal>
            </aside>
          </div>
        </div>
      </section>

      {/* ---- Map ---- */}
      <section className="bg-surface-base">
        <div className="mx-auto max-w-7xl px-margin-mobile py-20 lg:px-margin">
          <Reveal className="mb-10 flex items-center justify-between border-b border-border-subtle pb-6">
            <h2 className="font-headline-lg text-headline-lg text-text-primary">
              Find Our Store
            </h2>
            <span className="hidden font-label-tag text-label-tag uppercase text-text-muted sm:inline">
              KATHMANDU-01
            </span>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="group relative h-[420px] overflow-hidden border border-border-subtle bg-surface-card shadow-glow transition-shadow duration-500 hover:shadow-glow-strong">
              {/* Corner accent cuts */}
              <div className="pointer-events-none absolute right-0 top-0 z-20 h-3 w-3 bg-border-active" />
              <div className="pointer-events-none absolute bottom-0 left-0 z-20 h-3 w-3 bg-border-active" />
              <iframe
                src={mapSrc}
                className="h-full w-full grayscale-[35%] contrast-110"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={`Map showing ${siteConfig.name}`}
                style={{ border: 0 }}
              />
              {/* Store pin badge */}
              <div className="absolute bottom-4 left-4 flex items-center gap-3 border border-border-subtle bg-surface-card/90 p-3 backdrop-blur-md">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-primary-container text-text-primary">
                  <MapPin className="h-4 w-4" aria-hidden />
                </span>
                <span className="flex flex-col">
                  <span className="font-label-tag text-label-tag uppercase tracking-widest text-text-primary">
                    {siteConfig.shortName} · Tripureshwor-11
                  </span>
                  <span className="font-body-sm text-[12px] text-text-muted">
                    {siteConfig.address.line2}
                  </span>
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}