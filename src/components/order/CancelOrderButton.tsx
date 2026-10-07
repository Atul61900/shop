"use client";

import { useState } from "react";
import { AlertTriangle, X, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";

type CancelOrderButtonProps = {
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
};

export function CancelOrderButton({
  orderId,
  orderNumber,
  orderStatus,
  paymentStatus,
}: CancelOrderButtonProps) {
  const router = useRouter();
  const toast = useToast();
  const [showConfirm, setShowConfirm] = useState(false);
  const [pending, setPending] = useState(false);

  const cancellableStatuses = ["PENDING", "CONFIRMED", "PROCESSING"];
  const canCancel = cancellableStatuses.includes(orderStatus) && paymentStatus !== "PAID";

  if (!canCancel) {
    return null;
  }

  async function handleCancel() {
    setPending(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        toast.error("Could not cancel order", json.error);
        return;
      }

      toast.success("Order cancelled", `Order ${orderNumber} has been cancelled.`);
      setShowConfirm(false);
      router.refresh();
    } catch {
      toast.error("Error", "Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowConfirm(true)}
        className="text-error hover:bg-error-container/10 border-error/20"
        disabled={pending}
      >
        <X className="h-3.5 w-3.5" aria-hidden />
        Cancel order
      </Button>

      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="alertdialog"
          aria-labelledby="cancel-title"
          aria-describedby="cancel-description"
        >
          <div className="w-full max-w-md bg-surface-card border border-border-subtle p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
                <AlertTriangle className="h-5 w-5 text-amber-300" aria-hidden />
              </div>
              <h2 id="cancel-title" className="font-headline-sm text-headline-sm text-text-primary">
                Cancel order {orderNumber}?
              </h2>
            </div>
            <p id="cancel-description" className="font-body-md text-body-md text-text-secondary mb-6">
              This will cancel your order and release any reserved stock. If you paid online,
              the refund will be processed back to your original payment method.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                onClick={() => setShowConfirm(false)}
                disabled={pending}
              >
                Keep order
              </Button>
              <Button
                variant="danger"
                onClick={handleCancel}
                disabled={pending}
                trailing={pending ? <span className="animate-spin">⏳</span> : <Check className="h-3.5 w-3.5" />}
              >
                {pending ? "Cancelling..." : "Yes, cancel order"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}