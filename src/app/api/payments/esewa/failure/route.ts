import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/lib/config";
import { settleEsewaReturn, esewaSuccessUrl, esewaFailedUrl, esewaPendingUrl } from "@/lib/payments/settle-esewa";
import { clientIp, guarded, rateLimit } from "@/lib/api";

/**
 * GET /api/payments/esewa/failure — the `failure_url` given to eSewa.
 *
 * eSewa sends failures AND pendings here. A lost success redirect can look
 * like a failure, so this endpoint re-checks authority first: if the status
 * API says COMPLETE, the customer still gets the success page. Only a
 * definitive non-paid state lands on the failure page.
 */
export async function GET(request: Request) {
  return guarded(async () => {
    const base = siteConfig.url.replace(/\/$/, "");
    const params = new URL(request.url).searchParams;
    const orderNumber = params.get("order");

    if (!orderNumber) {
      return Response.redirect(`${base}/checkout`, 303);
    }

    // Same bound as the success return: over-limit browsers hold on pending.
    const limit = rateLimit(`esewa-return:${clientIp(request)}`, 120, 60 * 60 * 1000);
    if (!limit.allowed) {
      return Response.redirect(esewaPendingUrl(orderNumber), 303);
    }

    const order = await prisma.order.findUnique({ where: { orderNumber } });
    if (!order) {
      return Response.redirect(`${base}/checkout`, 303);
    }
    if (order.paymentStatus === "PAID") {
      return Response.redirect(esewaSuccessUrl(orderNumber), 303);
    }

    const outcome = await settleEsewaReturn({ orderNumber });

    if (outcome.outcome === "unknown-order") {
      return Response.redirect(`${base}/checkout`, 303);
    }
    if (outcome.outcome === "paid") return Response.redirect(esewaSuccessUrl(orderNumber), 303);
    if (outcome.outcome === "pending") return Response.redirect(esewaPendingUrl(orderNumber), 303);
    return Response.redirect(esewaFailedUrl(orderNumber, outcome.reason), 303);
  });
}
