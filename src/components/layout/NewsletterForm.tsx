"use client";

import { useState } from "react";
import { ArrowRight, Check, Loader2 } from "lucide-react";

import { useToast } from "@/components/ui/Toast";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const toast = useToast();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "loading") return;

    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "footer" }),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        toast.error("Could not subscribe", json.error ?? "Please check your email address.");
        setStatus("idle");
        return;
      }

      toast.success("Subscribed", json.data?.message);
      setStatus("done");
      setEmail("");
    } catch {
      toast.error("Network error", "Please try again in a moment.");
      setStatus("idle");
    }
  }

  if (status === "done") {
    return (
      <div className="flex items-center gap-3 border border-tertiary/30 bg-tertiary/5 px-4 py-3">
        <Check className="h-4 w-4 shrink-0 text-tertiary" aria-hidden />
        <p className="font-body-sm text-body-sm text-text-secondary">
          You are on the list. Watch for stock alerts.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <div className="flex">
        <input
          id="newsletter-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className="min-w-0 flex-1 border border-r-0 border-border-subtle bg-surface-deep px-4 py-3 font-body-sm text-body-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-border-active focus:outline-none"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          aria-label="Subscribe to the newsletter"
          className="flex w-14 shrink-0 items-center justify-center border border-border-subtle bg-surface-card text-text-secondary transition-all hover:border-border-active hover:bg-primary-container hover:text-text-primary disabled:opacity-60"
        >
          {status === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <ArrowRight className="h-4 w-4" aria-hidden />
          )}
        </button>
      </div>
    </form>
  );
}