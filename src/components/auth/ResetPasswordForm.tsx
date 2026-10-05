"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Check, AlertTriangle } from "lucide-react";

import { Button, ButtonLink } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { cn } from "@/lib/utils";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [strength, setStrength] = useState(0);

  function onPasswordChange(value: string) {
    let score = 0;
    if (value.length >= 8) score++;
    if (/[a-zA-Z]/.test(value) && /[0-9]/.test(value)) score++;
    if (value.length >= 12) score++;
    if (/[^a-zA-Z0-9]/.test(value)) score++;
    setStrength(score);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    setPending(true);
    setErrors({});

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, token }),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        setErrors(json.fields ?? { form: json.error });
        return;
      }

      setDone(true);
      // Every existing session was invalidated, so the user must sign in again.
      setTimeout(() => router.push("/login"), 2600);
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-5 border border-tertiary/30 bg-tertiary/5 p-10 text-center">
        <Check className="h-10 w-10 text-tertiary" aria-hidden />
        <div className="flex flex-col gap-2">
          <h2 className="font-headline-sm text-headline-sm text-text-primary">
            Password updated
          </h2>
          <p className="max-w-sm font-body-md text-body-md text-text-secondary text-pretty">
            For your security, every device has been signed out. Taking you to the login page…
          </p>
        </div>
        <ButtonLink href="/login" variant="secondary" size="sm">
          Sign in now
        </ButtonLink>
      </div>
    );
  }

  const labels = ["Too short", "Weak", "Fair", "Good", "Strong"];

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      {errors.form ? (
        <div className="flex items-start gap-3 border border-error/40 bg-error-container/10 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-error" aria-hidden />
          <p className="font-body-sm text-body-sm text-text-primary">{errors.form}</p>
        </div>
      ) : null}

      <Input
        label="New password"
        name="password"
        type="password"
        required
        autoComplete="new-password"
        placeholder="••••••••"
        error={errors.password}
        onChange={(e) => onPasswordChange(e.target.value)}
      />

      {strength > 0 ? (
        <div className="-mt-2 flex flex-col gap-2">
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={cn(
                  "h-1 flex-1 transition-colors",
                  i <= strength
                    ? strength <= 1
                      ? "bg-error"
                      : strength === 2
                        ? "bg-amber-400"
                        : "bg-tertiary"
                    : "bg-surface-bright",
                )}
              />
            ))}
          </div>
          <span className="font-label-tag text-label-tag uppercase text-text-muted">
            Strength: {labels[strength]}
          </span>
        </div>
      ) : null}

      <Input
        label="Confirm new password"
        name="confirmPassword"
        type="password"
        required
        autoComplete="new-password"
        placeholder="••••••••"
        error={errors.confirmPassword}
      />

      <Button
        type="submit"
        fullWidth
        disabled={pending}
        trailing={pending ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
      >
        {pending ? "Updating" : "Update password"}
      </Button>

      <p className="border-t border-border-subtle pt-5 text-center font-body-sm text-body-sm text-text-secondary">
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