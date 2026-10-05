import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { SectionEyebrow } from "@/components/ui/Primitives";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Request a password reset link for your Krishna Mobile Repairing Center account.",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <section className="relative overflow-hidden bg-surface-base py-16 lg:py-24">
      <div className="bg-tech-grid pointer-events-none absolute inset-0 opacity-15" />

      <div className="relative z-10 mx-auto max-w-lg px-margin-mobile">
        <div className="border border-border-subtle bg-surface-card p-6 lg:p-10">
          <div className="mb-8">
            <SectionEyebrow>Account Recovery</SectionEyebrow>
            <h1 className="mt-4 font-headline-lg text-headline-lg text-text-primary">
              Forgot your password?
            </h1>
            <p className="mt-3 font-body-md text-body-md text-text-secondary text-pretty">
              Enter the email on your account and we will send a one-time link to set a new
              password.
            </p>
          </div>

          <ForgotPasswordForm />
        </div>
      </div>
    </section>
  );
}