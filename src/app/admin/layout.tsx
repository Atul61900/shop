import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { LayoutDashboard, Package, ShoppingBag, Wrench, FolderTree } from "lucide-react";

import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/admin", label: "Overview", Icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", Icon: ShoppingBag },
  { href: "/admin/products/new", label: "Add product", Icon: Package },
  { href: "/admin/services/new", label: "Add service", Icon: Wrench },
  { href: "/admin/categories", label: "Categories", Icon: FolderTree },
] as const;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Single gate for the whole area: anonymous -> login, non-admin -> 404.
  await requireAdmin("/admin");

  return (
    <div className="w-full border-b border-border-subtle bg-surface-base">
      <div className="mx-auto max-w-7xl px-margin-mobile pb-10 pt-10 lg:px-margin">
        <div className="flex flex-col gap-6 border-b border-border-subtle pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <span className="font-label-tag text-label-tag uppercase tracking-widest text-tertiary">
              Admin panel
            </span>
            <h1 className="font-headline-lg text-headline-lg text-text-primary">
              Catalogue
            </h1>
          </div>

          <nav aria-label="Admin">
            <ul className="flex flex-wrap items-center gap-2">
              {NAV.map(({ href, label, Icon }) => (
                <li key={href}>
                  <Link
                    href={href as Route}
                    className="flex items-center gap-2 border border-border-subtle bg-surface-deep px-3 py-2 font-label-tag text-label-tag uppercase tracking-widest text-text-secondary transition-colors hover:border-border-active hover:text-text-primary"
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="pt-8">{children}</div>
      </div>
    </div>
  );
}
