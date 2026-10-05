import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Route } from "next";

import { getCurrentUser } from "@/lib/auth";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthShell } from "@/components/auth/AuthShell";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to your Krishna Mobile Repairing Center account to track orders, manage repairs and speed up checkout.",
  robots: { index: false, follow: true },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  const { next } = await searchParams;

  // Already signed in — send them where they were heading.
  if (user) {
    redirect((next && next.startsWith("/") && !next.startsWith("//") ? next : "/account") as Route);
  }

  return (
    <AuthShell>
      <Suspense fallback={<div className="skeleton h-80 w-full" />}>
        <AuthForm mode="login" />
      </Suspense>
    </AuthShell>
  );
}