import { prisma } from "@/lib/prisma";
import { settleEsewaReturn } from "@/lib/payments/settle-esewa";
import { clientIp, fail, guarded, ok, rateLimit, readJson } from "@/lib/api";

/**
 * POST /api/payments/esewa/verify — programmatic settle.
 * Body: { orderNumber: string }. Used by admin status re-checks and the
 * success-page reconcile. Never redirects; always JSON.
 */
export async function POST(request: Request) {
  return guarded(async () => {
    // Each call can trigger a live status check against eSewa, so bound it.
    // Legitimate callers (admin re-check, page reconcile) hit this rarely.
    const limit = rateLimit(`esewa-verify:${clientIp(request)}`, 30, 60 * 60 * 1000);
    if (!limit.allowed) {
      return fail("Too many verification attempts. Please try again later.", 429);
    }

    const body = await readJson<{ orderNumber?: string }>(request);
    const orderNumber = body?.orderNumber?.trim();
    if (!orderNumber) {
      return Response.json({ ok: false, error: "Order number is required." }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { orderNumber } });
    if (!order) {
      return Response.json({ ok: false, error: "Unknown order." }, { status: 404 });
    }
    if (order.paymentStatus === "PAID") {
      return ok({ orderNumber, status: "PAID", alreadyPaid: true });
    }

    const outcome = await settleEsewaReturn({ orderNumber });

    if (outcome.outcome === "unknown-order") {
      return Response.json({ ok: false, error: "Unknown order." }, { status: 404 });
    }
    if (outcome.outcome === "paid") return ok({ orderNumber, status: "PAID" });
    if (outcome.outcome === "pending") {
      return Response.json({ ok: false, error: "Payment is still pending.", transient: true }, { status: 202 });
    }
    return Response.json({ ok: false, error: "Payment was not completed." }, { status: 409 });
  });
}
