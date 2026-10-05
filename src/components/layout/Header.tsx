"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  startTransition,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X, ShoppingBag, User, Wrench, ChevronDown, Phone, Shield } from "lucide-react";
import type { Route } from "next";

import { NAV_LINKS, siteConfig } from "@/lib/config";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/store/cart";
import { ButtonLink } from "@/components/ui/Button";

type SessionUser = {
  name: string;
  email: string;
  avatarUrl: string | null;
  /** Drives the admin dashboard button; the page itself re-checks the role. */
  role?: string;
} | null;

/** Subscribes to scroll position without polling or effect-driven setState. */
function subscribeScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

export function Header({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const itemCount = useCartStore((s) =>
    s.cart.itemCount > 0
      ? s.cart.itemCount
      : s.lines.reduce((sum, l) => sum + l.quantity, 0),
  );
  const openDrawer = useCartStore((s) => s.openDrawer);

  // Records whether the sheet was open, so the navigation effect only has to
  // call setState when there is actually something to close.
  const sheetWasOpen = useRef(false);

  function openSheet() {
    sheetWasOpen.current = true;
    startTransition(() => setMobileOpen(true));
  }

  function closeSheet() {
    sheetWasOpen.current = false;
    startTransition(() => setMobileOpen(false));
  }

  // Solid header once the page scrolls. Subscribing (rather than setting state
  // inside an effect) keeps the first paint free of a cascading render.
  const scrolled = useSyncExternalStore(
    subscribeScroll,
    () => window.scrollY > 12,
    () => false,
  );

  // Close the mobile sheet whenever navigation happens.
  useEffect(() => {
    if (sheetWasOpen.current) {
      sheetWasOpen.current = false;
      startTransition(() => setMobileOpen(false));
    }
  }, [pathname]);

  // Lock body scroll while the sheet is open.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSheet();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* Skip link for keyboard users */}
      <a
        href="#main"
        className="sr-only-focusable fixed left-4 top-4 z-[200] border border-border-active bg-surface-card px-4 py-2 font-label-tag text-label-tag uppercase tracking-widest text-text-primary"
      >
        Skip to content
      </a>

      <header
        className={cn(
          "sticky top-0 z-50 w-full border-b transition-all duration-300",
          scrolled
            ? "border-border-subtle bg-surface-base/92 shadow-panel backdrop-blur-xl"
            : "border-transparent bg-surface-base",
        )}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-margin-mobile py-4 lg:px-margin">
          {/* ---- Brand ---- */}
          <Link href="/" className="group flex shrink-0 items-center gap-3.5" aria-label="KMRC home">
            <span className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-border-subtle bg-surface-card">
              <Image
                src="/images/logo.jpg"
                alt=""
                width={48}
                height={48}
                className="h-full w-full object-cover"
                priority
              />
            </span>
            <span className="hidden flex-col leading-none sm:flex">
              <span className="font-headline-sm text-[19px] font-bold tracking-tight text-text-primary">
                KMRC<span className="text-tertiary">.</span>
              </span>
              <span className="mt-1 font-label-tag text-[10px] uppercase tracking-[0.14em] text-text-muted">
                Mobile Repairing Center
              </span>
            </span>
          </Link>

          {/* ---- Desktop nav ---- */}
          <nav className="hidden items-center gap-1.5 lg:flex" aria-label="Main">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href as Route}
                data-active={isActive(link.href)}
                className={cn(
                  "link-wipe px-4 py-2.5 font-label-button text-[14px] uppercase leading-[20px] tracking-wider transition-colors",
                  isActive(link.href)
                    ? "text-text-primary"
                    : "text-text-secondary hover:text-text-primary",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* ---- Actions ---- */}
          <div className="flex shrink-0 items-center gap-1.5">
            {/* Call the shop — walk-ins welcome during store hours */}
            <a
              href={`tel:${siteConfig.contact.phone}`}
              className="hidden h-11 items-center gap-2 border border-border-subtle bg-surface-card px-4 transition-colors hover:border-border-active sm:flex"
              aria-label={`Call the shop at ${siteConfig.contact.phoneDisplay}`}
            >
              <Phone className="h-4 w-4 text-tertiary" aria-hidden />
              <span className="font-label-button text-label-button uppercase tracking-wider text-text-primary">
                Call Shop
              </span>
            </a>

            {/* Admin dashboard — highlighted so it is obvious where it leads */}
            {user?.role === "ADMIN" ? (
              <Link
                href={"/admin"}
                data-active={pathname.startsWith("/admin")}
                aria-label="Admin dashboard"
                className={cn(
                  "flex h-11 items-center gap-2 border px-4 transition-colors",
                  // `error` is the light token, so the solid states need the
                  // dark `on-error` — `on-error-container` would vanish into it.
                  pathname.startsWith("/admin")
                    ? "border-error bg-error text-on-error"
                    : "border-error/50 bg-error-container/15 text-error hover:bg-error hover:text-on-error",
                )}
              >
                <Shield className="h-4 w-4" aria-hidden />
                <span className="font-label-button text-label-button uppercase tracking-wider">
                  Admin
                </span>
              </Link>
            ) : null}

            {/* Account */}
            <Link
              href={user ? "/account" : "/login"}
              className="relative flex h-11 w-11 items-center justify-center overflow-hidden border border-border-subtle bg-surface-card transition-colors hover:border-border-active"
              aria-label={user ? "Your account" : "Sign in"}
            >
              {user ? (
                user.avatarUrl ? (
                  <Image
                    src={user.avatarUrl}
                    alt=""
                    fill
                    sizes="44px"
                    className="object-cover"
                  />
                ) : (
                  <span className="font-headline-sm text-[13px] font-bold text-text-primary">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                )
              ) : (
                <User className="h-4 w-4 text-text-secondary" aria-hidden />
              )}
            </Link>

            {/* Cart */}
            <button
              onClick={openDrawer}
              className="relative flex h-11 items-center gap-2 border border-border-subtle bg-surface-card px-4 transition-colors hover:border-border-active"
              aria-label={`Cart, ${itemCount} item${itemCount === 1 ? "" : "s"}`}
            >
              <ShoppingBag className="h-4 w-4 text-text-secondary" aria-hidden />
              <span className="font-label-button text-label-button tabular-nums text-text-primary">
                {itemCount}
              </span>
              {itemCount > 0 ? (
                <motion.span
                  key={itemCount}
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute -right-1 -top-1 h-2 w-2 bg-tertiary"
                  aria-hidden
                />
              ) : null}
            </button>

            {/* Mobile menu trigger */}
            <button
              onClick={() => (mobileOpen ? closeSheet() : openSheet())}
              className="flex h-11 w-11 items-center justify-center border border-border-subtle bg-surface-card transition-colors hover:border-border-active lg:hidden"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? (
                <X className="h-4 w-4 text-text-primary" aria-hidden />
              ) : (
                <Menu className="h-4 w-4 text-text-primary" aria-hidden />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ---- Mobile sheet ---- */}
      <AnimatePresence>
        {mobileOpen ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-surface-deep/80 backdrop-blur-sm lg:hidden"
              onClick={closeSheet}
              aria-hidden
            />
            <motion.nav
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.34, ease: [0.32, 0.72, 0, 1] }}
              className="fixed inset-y-0 right-0 z-50 flex w-[min(88vw,380px)] flex-col border-l border-border-subtle bg-surface-base lg:hidden"
              aria-label="Mobile navigation"
            >
              <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
                <span className="font-headline-sm text-headline-sm text-text-primary">
                  KMRC<span className="text-tertiary">.</span>
                </span>
                <button
                  onClick={closeSheet}
                  className="flex h-9 w-9 items-center justify-center border border-border-subtle"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>

              <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-5">
                {NAV_LINKS.map((link, i) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + i * 0.05, duration: 0.3 }}
                  >
                    <Link
                      href={link.href as Route}
                      className={cn(
                        "flex items-center justify-between border-b border-border-subtle py-4 font-headline-sm text-headline-sm transition-colors",
                        isActive(link.href)
                          ? "text-tertiary"
                          : "text-text-primary hover:text-tertiary",
                      )}
                    >
                      {link.label}
                      <ChevronDown className="h-4 w-4 -rotate-90 text-text-muted" aria-hidden />
                    </Link>
                  </motion.div>
                ))}

                <div className="mt-6 flex flex-col gap-3">
                  {user?.role === "ADMIN" ? (
                    <ButtonLink
                      href="/admin"
                      variant="danger"
                      fullWidth
                      icon={<Shield className="h-4 w-4" aria-hidden />}
                    >
                      Admin Dashboard
                    </ButtonLink>
                  ) : null}
                  <ButtonLink
                    href={user ? "/account" : "/login"}
                    variant="secondary"
                    fullWidth
                    icon={<User className="h-4 w-4" aria-hidden />}
                  >
                    {user ? "My Account" : "Sign In"}
                  </ButtonLink>
                  <ButtonLink
                    href="/services"
                    fullWidth
                    trailing={<Wrench className="h-4 w-4" aria-hidden />}
                  >
                    Repair Services
                  </ButtonLink>
                  <ButtonLink
                    href="/contact"
                    variant="secondary"
                    fullWidth
                    icon={<Phone className="h-4 w-4" aria-hidden />}
                  >
                    Contact Us
                  </ButtonLink>
                </div>

                <div className="mt-auto pt-8">
                  <a
                    href={`tel:${siteConfig.contact.phone}`}
                    className="flex items-center gap-2 border border-border-subtle bg-surface-card p-4 font-label-button text-label-button uppercase tracking-wider text-text-primary"
                  >
                    <Phone className="h-4 w-4 text-tertiary" aria-hidden />
                    {siteConfig.contact.phoneDisplay}
                  </a>
                  <p className="mt-3 font-body-sm text-body-sm text-text-muted">
                    {siteConfig.address.line1}, {siteConfig.address.line2}
                  </p>
                </div>
              </div>
            </motion.nav>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}