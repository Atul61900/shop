"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

/**
 * Re-runs server-side verification for one order, then moves on: PAID goes to
 * the confirmation page, a terminal failure to the failure page, and a still-
 * pending payment stays put with a fresh timestamp.
 */
export function RecheckPaymentButton({
  method,
  orderNumber,
}: {
  method: "ESEWA";
  orderNumber: string;
}) {
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function recheck() {
    if (pending) return;
    setPending(true);
    try {
      const res = await fetch(`/api/payments/${method.toLowerCase()}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber }),
      });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        status?: string;
        error?: string;
        transient?: boolean;
      } | null;

      if (res.ok && json?.ok && json.status === "PAID") {
        router.push(`/checkout/success?order=${orderNumber}&gateway=${method.toLowerCase()}&paid=1`);
        return;
      }
      if (json?.transient || res.status === 202) {
        toast.info("Still pending", "The gateway has not confirmed yet. Please wait a little longer.");
        router.refresh();
        return;
      }
      router.push(`/checkout/payment-failed?order=${orderNumber}&method=${method}&reason=unverifiable`);
    } catch {
      toast.error("Network error", "Please try again in a moment.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      fullWidth
      disabled={pending}
      onClick={recheck}
      trailing={
        pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />
      }
    >
      {pending ? "Checking with gateway" : "Check payment status"}
    </Button>
  );
}
