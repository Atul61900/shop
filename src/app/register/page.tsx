import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthShell } from "@/components/auth/AuthShell";

export const metadata: Metadata = {
  title: "Create Account",
  description:
    "Create a Krishna Mobile Repairing Center account to save your cart, track orders and manage repairs.",
  robots: { index: false, follow: true },
};

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/account");

  return (
    <AuthShell>
      <Suspense fallback={<div className="skeleton h-96 w-full" />}>
        <AuthForm mode="register" />
      </Suspense>
    </AuthShell>
  );
}