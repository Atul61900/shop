import "server-only";

import { prisma } from "@/lib/prisma";
import { logPayment } from "@/lib/payments/log";

/**
 * Marks an order definitively failed/cancelled AND releases its reserved
 * stock, atomically and exactly once.
 *
 * Orders reserve units at creation (atomic conditional decrement). A checkout
 * that definitely fails must give those units back, or abandoned gateway
 * attempts permanently shrink the catalogue. But a duplicate callback,
 * a refreshed result page, or a later retry must never restore twice — hence
 * the conditional flip: only an order STILL in PENDING matches, so repeats
 * are silent no-ops.
 *
 * Never call this for PENDING/unknown states; the customer may still pay.
 */
export async function failOrderAndReleaseStock(input: {
  orderId: string;
  orderNumber: string;
  to: "FAILED" | "CANCELLED";
  reason: string;
}): Promise<"settled" | "already-settled"> {
  const { orderId, orderNumber, to, reason } = input;

  const result = await prisma.$transaction(async (tx) => {
    // Conditional flip = the idempotency key.
    const flipped = await tx.order.updateMany({
      where: { id: orderId, paymentStatus: "PENDING" },
      data: { paymentStatus: to },
    });
    if (flipped.count === 0) return { settled: false as const, items: [] as { productId: string | null; quantity: number }[] };

    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { items: { select: { productId: true, quantity: true } } },
    });

    const items = order?.items ?? [];
    for (const item of items) {
      if (!item.productId) continue;
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: { increment: item.quantity },
          soldCount: { decrement: item.quantity },
        },
      });
    }

    await tx.payment.updateMany({
      where: { orderId, status: { in: ["INITIATED", "PENDING"] } },
      data: { status: to === "CANCELLED" ? "CANCELLED" : "FAILED", verifiedAt: new Date() },
    });

    return { settled: true as const, items };
  });

  if (!result.settled) return "already-settled";

  // soldCount has no unsigned constraint, so guard a pathological negative.
  const ids = result.items
    .map((i) => i.productId)
    .filter((id): id is string => Boolean(id));
  if (ids.length > 0) {
    await prisma.product.updateMany({
      where: { id: { in: ids }, soldCount: { lt: 0 } },
      data: { soldCount: 0 },
    });
  }

  logPayment({
    event: to === "CANCELLED" ? "settled_cancelled" : "settled_failed",
    orderId,
    orderNumber,
    error: reason,
  });

  return "settled";
}

/**
 * Marks an order PAID exactly once. A refreshed success URL, a duplicate
 * gateway callback, or a late status poll all converge here; only the first
 * call flips PENDING -> PAID, the rest are no-ops.
 */
export async function markOrderPaid(input: {
  orderId: string;
  orderNumber: string;
  paymentRef: string;
  gateway: "ESEWA" | "KHALTI";
}): Promise<"settled" | "already-settled"> {
  const { orderId, orderNumber, paymentRef, gateway } = input;

  const flipped = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({
      where: { id: orderId, paymentStatus: "PENDING" },
      data: {
        paymentStatus: "PAID",
        paymentRef,
        status: "CONFIRMED",
      },
    });
    if (updated.count === 0) return 0;

    await tx.payment.updateMany({
      where: { orderId, gateway, status: { in: ["INITIATED", "PENDING"] } },
      data: {
        status: "SUCCESS",
        reference: paymentRef,
        verifiedAt: new Date(),
        paidAt: new Date(),
      },
    });
    return updated.count;
  });

  if (flipped === 0) return "already-settled";

  // Note: order.status CONFIRMED unconditionally would clobber a later
  // fulfilment state, but this flip only matches PENDING orders, which by
  // definition have never left the counter state.
  logPayment({
    event: "settled_paid",
    orderId,
    orderNumber,
    gateway,
    txn: paymentRef,
  });

  return "settled";
}
