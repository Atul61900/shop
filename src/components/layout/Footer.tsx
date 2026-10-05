"use client";

import Link from "next/link";

import {
  FOOTER_COMPANY_LINKS,
  FOOTER_LEGAL_LINKS,
  FOOTER_SERVICE_LINKS,
  siteConfig,
} from "@/lib/config";
import { NewsletterForm } from "./NewsletterForm";

/**
 * Brand glyphs are inlined rather than pulled from an icon set — lucide v1
 * dropped the third-party brand icons.
 */
function FacebookGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.5-3.91 3.77-3.91 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.45 2.91h-2.33V22c4.78-.76 8.44-4.92 8.44-9.94Z" />
    </svg>
  );
}

function InstagramGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="square"
      className="h-4 w-4"
      aria-hidden
    >
      <rect x="2.5" y="2.5" width="19" height="19" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TiktokGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.1v12.4a2.59 2.59 0 0 1-2.6 2.5 2.6 2.6 0 1 1 .77-5.07V9.7a5.68 5.68 0 0 0-.77-.05A5.7 5.7 0 1 0 15.54 15.4V9.01a7.35 7.35 0 0 0 4.3 1.38V7.29a4.29 4.29 0 0 1-3.24-1.47Z" />
    </svg>
  );
}

const SOCIAL_ICONS = [
  { label: "Facebook", href: siteConfig.socials[0].href, Glyph: FacebookGlyph },
  { label: "Instagram", href: siteConfig.socials[1].href, Glyph: InstagramGlyph },
  { label: "TikTok", href: siteConfig.socials[2].href, Glyph: TiktokGlyph },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-border-subtle bg-surface-card">
      {/* ---- Pre-footer CTA ---- */}
      <div className="border-b border-border-subtle bg-surface-base">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-margin-mobile py-10 lg:flex-row lg:px-margin">
          <div className="flex flex-col gap-2">
            <h2 className="font-headline-md text-headline-md text-text-primary">
              Keep your devices running smoothly
            </h2>
            <p className="font-body-md text-body-md text-text-secondary">
              Genuine parts, transparent pricing, and a 90-day component warranty.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link
              href="/services"
              className="inline-flex items-center justify-center gap-2.5 bg-primary-container px-7 py-3.5 font-label-button text-label-button uppercase tracking-wider text-text-primary shadow-glow transition-all hover:bg-secondary-container"
            >
              Explore Services
            </Link>
            <a
              href={siteConfig.contact.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2.5 border border-border-subtle bg-surface-deep px-7 py-3.5 font-label-button text-label-button uppercase tracking-wider text-text-primary transition-all hover:border-border-active"
            >
              WhatsApp Us
            </a>
          </div>
        </div>
      </div>

      {/* ---- Main footer ---- */}
      <div className="mx-auto max-w-7xl px-margin-mobile pb-space-xl pt-space-2xl lg:px-margin">
        <div className="grid grid-cols-1 gap-8 border-b border-border-subtle pb-space-xl md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="flex flex-col gap-space-sm">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 bg-border-active" />
              <span className="font-headline-sm text-headline-sm uppercase tracking-tight text-text-primary">
                {siteConfig.centerName}
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-text-muted text-pretty">
              Precision electronic diagnostics, chip-level micro-soldering, and OEM standard
              restoration for mobile hardware in Kathmandu since {new Date().getFullYear() - 5}.
            </p>
          </div>

          {/* Services */}
          <nav className="flex flex-col gap-space-sm" aria-label="Services">
            <span className="font-label-tag text-label-tag uppercase tracking-widest text-text-muted">
              Services Matrix
            </span>
            <ul className="flex flex-col gap-2 font-body-sm text-body-sm text-on-surface-variant">
              {FOOTER_SERVICE_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="group flex items-center justify-between transition-colors hover:text-text-primary"
                  >
                    <span>{link.label}</span>
                    <span className="font-label-tag text-label-tag text-text-muted transition-colors group-hover:text-border-active">
                      {link.index}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Company */}
          <nav className="flex flex-col gap-space-sm" aria-label="Company">
            <span className="font-label-tag text-label-tag uppercase tracking-widest text-text-muted">
              Company
            </span>
            <ul className="flex flex-col gap-2 font-body-sm text-body-sm text-on-surface-variant">
              {FOOTER_COMPANY_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="link-wipe w-fit transition-colors hover:text-text-primary"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-2 pt-3">
              {SOCIAL_ICONS.map(({ label, href, Glyph }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center border border-border-subtle bg-surface-deep text-text-muted transition-all hover:border-border-active hover:text-text-primary"
                >
                  <Glyph />
                </a>
              ))}
            </div>
          </nav>

          {/* Newsletter */}
          <div className="flex flex-col gap-space-sm">
            <span className="font-label-tag text-label-tag uppercase tracking-widest text-text-muted">
              Stay Updated
            </span>
            <NewsletterForm />
            <p className="font-body-sm text-[12px] leading-relaxed text-text-muted">
              Stock alerts and service updates. No spam, unsubscribe anytime.
            </p>
          </div>
        </div>

        {/* ---- Bottom bar ---- */}
        <div className="flex flex-col gap-4 pt-space-lg">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-body-sm text-body-sm text-text-muted">
              © {year} {siteConfig.name}. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              {FOOTER_LEGAL_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="font-body-sm text-body-sm text-text-muted transition-colors hover:text-text-primary"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}