"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { ORDER_STATUSES } from "@/lib/validation";

const EDITABLE_STATUSES = ORDER_STATUSES.filter((status) => status !== "REFUNDED");

/**
 * Staff fulfilment controls for one order. Payment state itself stays
 * gateway-driven; cancelling an unpaid order releases reserved stock, while a
 * paid order is refused here because it needs the refund flow instead.
 */
export function AdminOrderStatusForm({
  orderId,
  status,
  paymentStatus,
  courierName,
  trackingRef,
}: {
  orderId: string;
  status: string;
  paymentStatus: string;
  courierName: string | null;
  trackingRef: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [nextStatus, setNextStatus] = useState(status);
  const [courier, setCourier] = useState(courierName ?? "");
  const [tracking, setTracking] = useState(trackingRef ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  const closed = ["DELIVERED", "CANCELLED", "REFUNDED"].includes(status);
  const paid = paymentStatus === "PAID";
  const cancelling = nextStatus === "CANCELLED";

  if (closed) {
    return (
      <p className="font-body-sm text-body-sm text-text-muted">
        This order is closed ({status}). Closed orders cannot be changed here.
      </p>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setErrors({});

    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          courierName: courier,
          trackingRef: tracking,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        fields?: Record<string, string>;
      } | null;

      if (!res.ok || !json?.ok) {
        setErrors(json?.fields ?? { form: json?.error ?? "Could not update this order." });
        toast.error("Could not update order", json?.error ?? "Please check the form and try again.");
        return;
      }

      toast.success("Order updated", `Status is now ${nextStatus}.`);
      router.refresh();
    } catch {
      toast.error("Network error", "Please try again in a moment.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {errors.form ? (
        <p className="border border-error/40 bg-error-container/10 px-4 py-3 font-body-sm text-body-sm text-error">
          {errors.form}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Select
          label="Order status"
          name="status"
          required
          value={nextStatus}
          onChange={(event) => setNextStatus(event.target.value)}
          error={errors.status}
        >
          {EDITABLE_STATUSES.map((option) => (
            <option key={option} value={option} disabled={option === "CANCELLED" && paid}>
              {option}
              {option === "CANCELLED" && paid ? " (paid — use refund flow)" : ""}
            </option>
          ))}
        </Select>

        <Input
          label="Courier"
          name="courierName"
          value={courier}
          onChange={(event) => setCourier(event.target.value)}
          error={errors.courierName}
          placeholder="e.g. Pathao, Aramex"
        />

        <Input
          label="Tracking reference"
          name="trackingRef"
          value={tracking}
          onChange={(event) => setTracking(event.target.value)}
          error={errors.trackingRef}
          placeholder="e.g. TRK-12345"
        />
      </div>

      {cancelling ? (
        <p className="font-body-sm text-body-sm text-text-muted">
          Cancelling releases reserved stock for unpaid orders. Paid orders cannot be cancelled here.
        </p>
      ) : null}

      <div>
        <Button
          type="submit"
          variant={cancelling ? "danger" : "primary"}
          size="sm"
          disabled={pending}
          icon={pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
        >
          {pending ? "Saving" : cancelling ? "Cancel order" : "Save status"}
        </Button>
      </div>
    </form>
  );
}
