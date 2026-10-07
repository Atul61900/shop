import { Badge } from "@/components/ui/Primitives";

type Tone = "blue" | "cyan" | "muted" | "green" | "amber" | "red" | "outline";

function paymentTone(status: string): Tone {
  if (status === "PAID") return "green";
  if (status === "PENDING") return "amber";
  if (status === "REFUNDED") return "cyan";
  if (status === "CANCELLED") return "muted";
  return "red";
}

function orderTone(status: string): Tone {
  if (status === "DELIVERED") return "green";
  if (status === "CANCELLED" || status === "REFUNDED") return "red";
  if (status === "PENDING") return "amber";
  return "cyan";
}

export function PaymentStatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={paymentTone(status)} dot>
      {status}
    </Badge>
  );
}

export function OrderStatusBadge({ status }: { status: string }) {
  return <Badge tone={orderTone(status)}>{status}</Badge>;
}
