import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { ProfileManager } from "@/components/account/ProfileManager";

export const metadata: Metadata = {
  title: "Profile & Addresses",
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const user = await requireUser("/account/profile");

  const addresses = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="flex flex-col gap-gutter">
      <div className="border border-border-subtle bg-surface-card p-6">
        <h1 className="font-headline-lg text-headline-lg text-text-primary">
          Profile &amp; addresses
        </h1>
        <p className="mt-2 font-body-md text-body-md text-text-secondary">
          Keep these current so checkouts are quick and repair updates reach you.
        </p>
      </div>

      <ProfileManager
        user={{
          name: user.name,
          email: user.email,
          phone: user.phone,
          avatarUrl: user.avatarUrl,
        }}
        addresses={addresses.map((a) => ({
          id: a.id,
          label: a.label,
          contactName: a.contactName,
          phone: a.phone,
          line1: a.line1,
          line2: a.line2,
          city: a.city,
          province: a.province,
          postalCode: a.postalCode,
          landmark: a.landmark,
          isDefault: a.isDefault,
        }))}
      />
    </div>
  );
}