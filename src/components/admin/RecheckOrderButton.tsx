"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

/**
 * Staff-only re-check: runs the gateway lookup/status-check for a PENDING
 * order and refreshes the detail page. Safe to click repeatedly — settle
 * paths are idempotent.
 */
export function RecheckOrderButton({
  method,
  orderNumber,
}: {
  method: string;
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
      const json = (await res.json().catch(() => null)) as { ok?: boolean; status?: string; error?: string } | null;
      if (res.ok && json?.ok) {
        toast.success("Payment confirmed", json.status ?? "PAID");
      } else {
        toast.info("Still pending", json?.error ?? "The gateway has not confirmed yet.");
      }
      router.refresh();
    } catch {
      toast.error("Network error", "Please try again in a moment.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      disabled={pending}
      onClick={recheck}
      icon={pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
    >
      {pending ? "Checking gateway" : "Re-check with gateway"}
    </Button>
  );
}
