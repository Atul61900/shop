import type { Metadata, Viewport } from "next";
import "./globals.css";

import { inter, spaceGrotesk } from "./fonts";
import { siteConfig } from "@/lib/config";
import { getCurrentUser } from "@/lib/auth";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ToastProvider } from "@/components/ui/Toast";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { CartSync } from "@/components/cart/CartSync";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — Precision Mobile Repair in Kathmandu`,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    "mobile repair Kathmandu",
    "phone repair Nepal",
    "screen replacement Kathmandu",
    "battery replacement Nepal",
    "mobile accessories Kathmandu",
    "mobile repair Tripureshwor",
    "micro soldering Nepal",
    "Krishna Mobile Repairing Center",
  ],
  authors: [{ name: siteConfig.name }],
  openGraph: {
    type: "website",
    locale: "en_NP",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: `${siteConfig.name} — Precision Mobile Repair`,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} — Precision Mobile Repair`,
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: "#05070B",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();

  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-surface-base antialiased">
        <a
          href="#main"
          className="sr-only-focusable absolute left-4 top-4 z-[300] border border-border-active bg-surface-card px-4 py-2 font-label-tag text-label-tag uppercase tracking-widest text-text-primary"
        >
          Skip to content
        </a>

        <ToastProvider>
          <CartSync isAuthenticated={Boolean(user)} />

          <div className="flex min-h-dvh flex-col">
            <Header
              user={
        user
          ? {
              name: user.name,
              email: user.email,
              avatarUrl: user.avatarUrl,
              // Drives the admin shortcut in the header; /admin still
              // re-checks the role server-side.
              role: user.role,
            }
          : null
      }
            />

            <main id="main" className="flex-1">
              {children}
            </main>

            <Footer />
          </div>

          <CartDrawer />
        </ToastProvider>
      </body>
    </html>
  );
}