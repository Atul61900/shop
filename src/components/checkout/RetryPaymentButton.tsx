"use client";

import { useState } from "react";
import { Loader2, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { startGatewayPayment, type GatewayMethod } from "@/lib/payments/client";

/**
 * Re-initiates a gateway payment for the SAME order — no new order, no second
 * stock reservation. Shares the starter with the checkout form.
 */
export function RetryPaymentButton({
  method,
  orderNumber,
}: {
  method: GatewayMethod;
  orderNumber: string;
}) {
  const [pending, setPending] = useState(false);
  const toast = useToast();

  async function retry() {
    if (pending) return;
    setPending(true);
    try {
      const error = await startGatewayPayment(method, orderNumber);
      if (error) {
        toast.error("Could not restart payment", error);
        setPending(false);
      }
      // Success navigates away, so `pending` intentionally stays true.
    } catch {
      toast.error("Network error", "Please try again in a moment.");
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      fullWidth
      disabled={pending}
      onClick={retry}
      trailing={
        pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />
      }
    >
      {pending ? "Starting payment" : "Retry payment"}
    </Button>
  );
}
