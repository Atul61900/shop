import type { Metadata } from "next";
import Link from "next/link";

import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { SectionEyebrow } from "@/components/ui/Primitives";

export const metadata: Metadata = {
  title: "Choose a New Password",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <section className="relative overflow-hidden bg-surface-base py-16 lg:py-24">
      <div className="bg-tech-grid pointer-events-none absolute inset-0 opacity-15" />

      <div className="relative z-10 mx-auto max-w-lg px-margin-mobile">
        <div className="border border-border-subtle bg-surface-card p-6 lg:p-10">
          <div className="mb-8">
            <SectionEyebrow>Account Recovery</SectionEyebrow>
            <h1 className="mt-4 font-headline-lg text-headline-lg text-text-primary">
              Choose a new password
            </h1>
            <p className="mt-3 font-body-md text-body-md text-text-secondary text-pretty">
              Pick something you have not used before. You will be signed out everywhere
              afterwards.
            </p>
          </div>

          {token ? (
            <ResetPasswordForm token={token} />
          ) : (
            <div className="border border-error/40 bg-error-container/10 p-6">
              <h2 className="font-headline-sm text-headline-sm text-text-primary">
                This link is incomplete
              </h2>
              <p className="mt-2 font-body-md text-body-md text-text-secondary text-pretty">
                The reset link is missing its token. Request a fresh one and open it directly from
                your email.
              </p>
              <Link
                href="/forgot-password"
                className="mt-5 inline-flex items-center gap-2 font-label-button text-label-button uppercase tracking-wider text-tertiary hover:text-text-primary"
              >
                Request a new link
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}