"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Send, CheckCircle2, ArrowLeft } from "lucide-react";

import { Button, ButtonLink } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();
  const toast = useToast();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const email = String(new FormData(event.currentTarget).get("email") ?? "");
    setPending(true);
    setError(undefined);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        setError(json.error);
        return;
      }
      setSent(json.data.message);
      toast.success("Check your inbox", "If that email is registered, a link is on its way.");
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-5 border border-tertiary/30 bg-tertiary/5 p-10 text-center">
        <CheckCircle2 className="h-10 w-10 text-tertiary" aria-hidden />
        <div className="flex flex-col gap-2">
          <h2 className="font-headline-sm text-headline-sm text-text-primary">Link sent</h2>
          <p className="max-w-sm font-body-md text-body-md text-text-secondary text-pretty">
            {sent} The link expires in one hour.
          </p>
        </div>
        <ButtonLink href="/login" variant="secondary" size="sm" icon={<ArrowLeft className="h-3.5 w-3.5" />}>
          Back to sign in
        </ButtonLink>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <Input
        label="Email"
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="you@example.com"
        error={error}
        hint="We will send a one-time link to choose a new password."
      />

      <Button
        type="submit"
        fullWidth
        disabled={pending}
        icon={pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      >
        {pending ? "Sending" : "Send reset link"}
      </Button>

      <p className="border-t border-border-subtle pt-5 text-center font-body-sm text-body-sm text-text-secondary">
        Remembered it?{" "}
        <Link
          href="/login"
          className="text-tertiary underline-offset-4 transition-colors hover:text-text-primary hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </form>
  );
}