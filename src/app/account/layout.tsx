import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Package, User as UserIcon, MapPin, LayoutDashboard, Shield } from "lucide-react";
import type { Route } from "next";

import { isAdmin, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { LogoutButton } from "@/components/account/LogoutButton";

export const metadata: Metadata = {
  title: "Your Account",
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/account", label: "Overview", Icon: LayoutDashboard },
  { href: "/account/orders", label: "Orders", Icon: Package },
  { href: "/account/profile", label: "Profile", Icon: UserIcon },
] as const;

/** Only rendered for admins — the target is 404 for everyone else. */
const ADMIN_NAV = [{ href: "/admin", label: "Admin Panel", Icon: Shield }] as const;

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser("/account");

  const orderCount = await prisma.order.count({ where: { userId: user.id } });

  const badges: Record<string, number> = {
    "/account/orders": orderCount,
  };

  const navItems = isAdmin(user) ? [...NAV, ...ADMIN_NAV] : NAV;

  return (
    <section className="bg-surface-base py-10 lg:py-14">
      <div className="mx-auto max-w-7xl px-margin-mobile lg:px-margin">
        <div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
          {/* ---- Sidebar ---- */}
          <aside className="lg:col-span-3">
            <div className="lg:sticky lg:top-28">
              <div className="border border-border-subtle bg-surface-card">
                {/* Identity */}
                <div className="flex items-center gap-3 border-b border-border-subtle p-6">
                  <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border-subtle bg-surface-deep">
                    {user.avatarUrl ? (
                      <Image
                        src={user.avatarUrl}
                        alt=""
                        fill
                        sizes="44px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="font-headline-sm text-headline-sm font-bold text-text-primary">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-headline-sm text-[15px] text-text-primary">
                      {user.name}
                    </p>
                    <p className="truncate font-body-sm text-[12px] text-text-muted">
                      {user.email}
                    </p>
                  </div>
                </div>

                {/* Nav */}
                <nav aria-label="Account">
                  <ul className="p-2">
                    {navItems.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href as Route}
                          className="group flex items-center justify-between px-4 py-3 font-label-button text-label-button uppercase tracking-wider text-text-secondary transition-colors hover:bg-surface-card-hover hover:text-text-primary"
                        >
                          <span className="flex items-center gap-3">
                            <item.Icon className="h-4 w-4 text-text-muted transition-colors group-hover:text-tertiary" />
                            {item.label}
                          </span>
                          {badges[item.href] ? (
                            <span className="flex h-5 min-w-5 items-center justify-center bg-border-active px-1 font-label-tag text-[10px] text-text-primary">
                              {badges[item.href]}
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>

                <div className="border-t border-border-subtle p-2">
                  <LogoutButton />
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 border border-border-subtle bg-surface-deep px-4 py-3">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-tertiary" aria-hidden />
                <span className="font-label-tag text-label-tag text-text-muted">
                  Tripureshwor · Kathmandu
                </span>
              </div>
            </div>
          </aside>

          {/* ---- Content ---- */}
          <div className="lg:col-span-9">{children}</div>
        </div>
      </div>
    </section>
  );
}