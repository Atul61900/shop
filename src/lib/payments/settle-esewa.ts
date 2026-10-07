import "server-only";

import { siteConfig } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { esewaConfig } from "@/lib/payments/config";
import {
  decodeEsewaResponse,
  checkEsewaStatus,
  type EsewaStatus,
} from "@/lib/payments/esewa";
import { failOrderAndReleaseStock, markOrderPaid } from "@/lib/payments/stock";
import { logPayment } from "@/lib/payments/log";

const base = () => siteConfig.url.replace(/\/$/, "");

export function esewaSuccessUrl(orderNumber: string) {
  return `${base()}/checkout/success?order=${orderNumber}&gateway=esewa&paid=1`;
}

export function esewaFailedUrl(orderNumber: string, reason: string) {
  return `${base()}/checkout/payment-failed?order=${orderNumber}&method=ESEWA&reason=${encodeURIComponent(reason)}`;
}

export function esewaPendingUrl(orderNumber: string) {
  return `${base()}/checkout/payment-pending?order=${orderNumber}&method=ESEWA`;
}

export type EsewaSettleOutcome =
  | { outcome: "paid"; orderNumber: string }
  | { outcome: "pending"; orderNumber: string }
  | { outcome: "failed"; orderNumber: string; reason: string }
  | { outcome: "unknown-order" };

/**
 * Settles one eSewa return. `data` is the Base64 response eSewa appended to
 * `success_url`; `txnUuid` alone (from the failure page or a reconcile)
 * triggers an authority check without trusting any browser claims.
 */
export async function settleEsewaReturn(input: {
  orderNumber: string;
  data?: string | null;
  txnUuid?: string | null;
}): Promise<EsewaSettleOutcome> {
  const { orderNumber } = input;

  const order = await prisma.order.findUnique({ where: { orderNumber } });
  if (!order) {
    logPayment({ event: "return", gateway: "ESEWA", orderNumber, error: "unknown order" });
    return { outcome: "unknown-order" };
  }

  // Idempotency: refreshed or replayed returns never re-settle.
  if (order.paymentStatus === "PAID") {
    return { outcome: "paid", orderNumber };
  }

  const payment = await prisma.payment.findFirst({
    where: { orderId: order.id, gateway: "ESEWA" },
    orderBy: { createdAt: "desc" },
  });

  let decoded:
    | { transactionCode: string; status: string; totalMinor: number; txnUuid: string; productCode: string }
    | null = null;

  if (input.data) {
    const response = decodeEsewaResponse(input.data);
    if (!response.ok) {
      // A mangled/forged payload is indistinguishable from tampering: fail it,
      // but do NOT release stock — the customer may simply retry and pay.
      logPayment({ event: "return", gateway: "ESEWA", orderNumber, error: response.error });
      return { outcome: "failed", orderNumber, reason: "invalid-response" };
    }
    decoded = {
      transactionCode: response.transactionCode,
      status: response.status,
      totalMinor: response.totalMinor,
      txnUuid: response.txnUuid,
      productCode: response.productCode,
    };

  // The response must describe THIS order's transaction.
  const expectedUuid = input.txnUuid ?? payment?.txnUuid ?? null;
  if (expectedUuid && decoded.txnUuid !== expectedUuid) {
    logPayment({ event: "return", gateway: "ESEWA", orderNumber, txn: decoded.txnUuid, error: "uuid mismatch" });
    return { outcome: "failed", orderNumber, reason: "mismatch" };
  }
    if (decoded.totalMinor !== order.total) {
      await failOrderAndReleaseStock({
        orderId: order.id,
        orderNumber,
        to: "FAILED",
        reason: `Amount mismatch: eSewa reported ${decoded.totalMinor}, order is ${order.total}.`,
      });
      return { outcome: "failed", orderNumber, reason: "amount" };
    }
  }

  const txnUuid = decoded?.txnUuid || input.txnUuid || payment?.txnUuid || null;
  if (!txnUuid) {
    logPayment({ event: "return", gateway: "ESEWA", orderNumber, error: "no transaction to confirm" });
    return { outcome: "pending", orderNumber };
  }

  // The authority: eSewa's own status API, not the redirect payload.
  const orderProductCode = esewaConfig().productCode;
  const checked = await checkEsewaStatus({
    productCode: orderProductCode,
    totalMinor: order.total,
    txnUuid,
  });

  if (!checked.ok) {
    // Verification temporarily unavailable: HOLD, never fail, never pay.
    logPayment({ event: "settled_pending", gateway: "ESEWA", orderNumber, txn: txnUuid, error: checked.error });
    return { outcome: "pending", orderNumber };
  }

  return settleEsewaStatus({ order, txnUuid, status: checked.status, refId: checked.refId, raw: checked.raw });
}

export async function settleEsewaStatus(input: {
  order: { id: string; orderNumber: string; total: number };
  txnUuid: string;
  status: EsewaStatus;
  refId: string | null;
  raw: Record<string, unknown>;
}): Promise<EsewaSettleOutcome> {
  const { order, txnUuid, status, refId, raw } = input;
  const { orderNumber } = order;

  if (status === "COMPLETE") {
    await markOrderPaid({
      orderId: order.id,
      orderNumber,
      paymentRef: refId ?? txnUuid,
      gateway: "ESEWA",
    });
    await prisma.payment.updateMany({
      where: { orderId: order.id, gateway: "ESEWA", txnUuid },
      data: { status: "SUCCESS", reference: refId ?? txnUuid, verifiedAt: new Date(), rawResponse: JSON.stringify(raw) },
    });
    return { outcome: "paid", orderNumber };
  }

  if (status === "PENDING" || status === "AMBIGUOUS") {
    logPayment({ event: "settled_pending", gateway: "ESEWA", orderNumber, txn: txnUuid, error: `status=${status}` });
    return { outcome: "pending", orderNumber };
  }

  if (status === "FULL_REFUND" || status === "PARTIAL_REFUND") {
    await prisma.order.updateMany({
      where: { id: order.id, paymentStatus: "PENDING" },
      data: { paymentStatus: "REFUNDED" },
    });
    await prisma.payment.updateMany({
      where: { orderId: order.id, gateway: "ESEWA" },
      data: { status: "REFUNDED", verifiedAt: new Date(), rawResponse: JSON.stringify(raw) },
    });
    logPayment({ event: "settled_failed", gateway: "ESEWA", orderNumber, txn: txnUuid, error: `status=${status}` });
    return { outcome: "failed", orderNumber, reason: status === "FULL_REFUND" ? "refunded" : "partial-refund" };
  }

  // CANCELED / NOT_FOUND and anything unexpected: terminal, not paid.
  await failOrderAndReleaseStock({
    orderId: order.id,
    orderNumber,
    to: status === "CANCELED" ? "CANCELLED" : "FAILED",
    reason: `eSewa status check reported ${status}.`,
  });
  return { outcome: "failed", orderNumber, reason: status === "CANCELED" ? "cancelled" : "failed" };
}
