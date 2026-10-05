"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { siteConfig } from "@/lib/config";

type Errors = Record<string, string>;

export function ContactForm() {
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const toast = useToast();
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    // Honeypot: hidden from users, tempting for bots.
    if (typeof data.company === "string" && data.company.length > 0) {
      setDone("Thanks — we will reply shortly.");
      return;
    }

    setPending(true);
    setErrors({});

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        setErrors(json.fields ?? {});
        toast.error("Could not send", json.error ?? "Please check the form and try again.");
        return;
      }

      setDone(json.data.message);
      toast.success("Message sent", "We will reply within one working day.");
      form.reset();
    } catch {
      toast.error("Network error", "Please try again in a moment.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-5 border border-tertiary/30 bg-tertiary/5 p-10 text-center">
        <CheckCircle2 className="h-10 w-10 text-tertiary" aria-hidden />
        <div className="flex flex-col gap-2">
          <h3 className="font-headline-sm text-headline-sm text-text-primary">
            Message received
          </h3>
          <p className="max-w-sm font-body-md text-body-md text-text-secondary text-pretty">
            {done}
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => router.refresh()}>
            Send another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Input
          label="Name"
          name="name"
          required
          autoComplete="name"
          placeholder="Your full name"
          error={errors.name}
        />
        <Input
          label="Email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Input
          label="Phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="98XXXXXXXX"
          error={errors.phone}
          hint="Optional — but fastest for urgent repairs"
        />
        <Input
          label="Subject"
          name="subject"
          required
          placeholder="e.g. Screen replacement quote"
          error={errors.subject}
        />
      </div>

      {/* Honeypot — visually hidden, off the tab order */}
      <div className="absolute left-[-9999px] h-0 w-0 overflow-hidden" aria-hidden>
        <label>
          Company
          <input type="text" name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <Textarea
        label="Message"
        name="message"
        required
        rows={6}
        placeholder="Tell us what you need — the device, the fault, and any deadline."
        error={errors.message}
      />

      <div className="flex flex-col gap-3 border-t border-border-subtle pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-body-sm text-[12px] text-text-muted">
          We reply within one working day ·{" "}
          <a
            href={`tel:${siteConfig.contact.phone}`}
            className="text-tertiary transition-colors hover:text-text-primary"
          >
            Or call {siteConfig.contact.phoneDisplay}
          </a>
        </p>
        <Button
          type="submit"
          disabled={pending}
          trailing={pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        >
          {pending ? "Sending" : "Send message"}
        </Button>
      </div>
    </form>
  );
}