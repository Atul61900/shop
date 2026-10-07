import "server-only";

import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/api";

/**
 * Guard for the payment-init endpoints.
 *
 * Starting a gateway checkout is state-changing: it creates a Payment row and
 * spends a request against the merchant's gateway quota. Without a check,
 * anyone who guessed or scraped an `orderNumber` could drive that against
 * someone else's order.
 *
 * Money still cannot be stolen this way — settlement requires an HMAC signature
 * plus independent verification with the gateway — but the caller should be
 * the order's owner. Guest checkout is a supported flow, so a guest order is
 * allowed and the order number acts as the capability token, matching the rule
 * `GET /api/orders/[id]` already applies.
 */
export async function checkOrderOwnership(order: {
  userId: string | null;
}): Promise<{ ok: true } | { ok: false; status: 401 | 403; error: string }> {
  if (!order.userId) return { ok: true };

  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      status: 401,
      error: "Sign in to continue with this payment.",
    };
  }
  if (user.id !== order.userId) {
    return { ok: false, status: 403, error: "This order belongs to another account." };
  }
  return { ok: true };
}

/**
 * Small per-order quota so a stuck or spammed checkout button cannot exhaust
 * the gateway's request budget. Retries within the window are allowed because
 * a customer legitimately re-enters the payment page.
 */
export function paymentInitQuota(orderId: string) {
  return rateLimit(`payment-init:${orderId}`, 5, 10 * 60 * 1000);
}