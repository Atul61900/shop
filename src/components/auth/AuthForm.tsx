"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ArrowRight, Eye, EyeOff } from "lucide-react";
import type { Route } from "next";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { useCartStore } from "@/store/cart";

type Mode = "login" | "register";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  // Lines are deliberately NOT cleared after sign-in — they now live in the
  // account cart, and clearing would push an empty cart back to the server.
  const lines = useCartStore((s) => s.lines);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Only allow same-origin redirects — never bounce to an attacker URL.
  const nextParam = searchParams.get("next") ?? "";
  const next = (
    nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/account"
  ) as Route;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    setPending(true);
    setErrors({});

    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        setErrors(json.fields ?? {});
        toast.error(mode === "login" ? "Sign in failed" : "Could not create account", json.error);
        return;
      }

      // Carry the anonymous cart over to the new session.
      if (lines.length > 0) {
        await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lines }),
        }).catch(() => undefined);
      }

      toast.success(
        mode === "login" ? `Welcome back, ${json.data.user.name.split(" ")[0]}` : "Account created",
        mode === "login" ? "You are signed in." : "Your cart has been saved to your account.",
      );

      router.push(next);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  const isLogin = mode === "login";

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      {!isLogin ? (
        <>
          <Input
            label="Full name"
            name="name"
            required
            autoComplete="name"
            placeholder="Your full name"
            error={errors.name}
          />
          <Input
            label="Phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="98XXXXXXXX"
            error={errors.phone}
            hint="Optional — lets us reach you about orders faster"
          />
        </>
      ) : null}

      <Input
        label="Email"
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="you@example.com"
        error={errors.email}
      />

      <Input
        label="Password"
        name="password"
        type={showPassword ? "text" : "password"}
        required
        autoComplete={isLogin ? "current-password" : "new-password"}
        placeholder="••••••••"
        error={errors.password}
        hint={
          isLogin
            ? undefined
            : "At least 8 characters, including a letter and a number"
        }
        trailing={
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            title={showPassword ? "Hide password" : "Show password"}
            className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center text-text-muted transition-colors hover:text-text-primary"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden />
            ) : (
              <Eye className="h-4 w-4" aria-hidden />
            )}
          </button>
        }
      />

      <Button
        type="submit"
        fullWidth
        disabled={pending}
        trailing={
          pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />
        }
      >
        {pending ? "Please wait" : isLogin ? "Sign in" : "Create account"}
      </Button>

      <div className="flex flex-col items-center gap-2 border-t border-border-subtle pt-5 text-center">
        <p className="font-body-sm text-body-sm text-text-secondary">
          {isLogin ? "New to KMRC?" : "Already have an account?"}{" "}
          <Link
            href={isLogin ? "/register" : "/login"}
            className="text-tertiary underline-offset-4 transition-colors hover:text-text-primary hover:underline"
          >
            {isLogin ? "Create an account" : "Sign in instead"}
          </Link>
        </p>
        {isLogin ? (
          <Link
            href="/forgot-password"
            className="font-body-sm text-body-sm text-text-muted underline-offset-4 transition-colors hover:text-tertiary hover:underline"
          >
            Forgotten your password?
          </Link>
        ) : null}
      </div>
    </form>
  );
}

/** Compact list of what an account unlocks. */
export function AuthBenefits() {
  const benefits = [
    "Your cart follows you across devices",
    "Full order history in one place",
    "Save delivery addresses for faster checkout",
    "Faster checkout with pre-filled details",
  ];

  return (
    <div className="flex flex-col gap-4">
      {benefits.map((b) => (
        <div key={b} className="flex items-start gap-3">
          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center bg-tertiary text-surface-base">
            <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" aria-hidden>
              <path d="M2 6.5l2.5 2.5L10 3.5" stroke="currentColor" strokeWidth="2" />
            </svg>
          </span>
          <span className="font-body-md text-body-md text-text-secondary">{b}</span>
        </div>
      ))}
    </div>
  );
}