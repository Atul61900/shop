import { siteConfig } from "@/lib/config";
import { settleEsewaReturn, esewaSuccessUrl, esewaFailedUrl, esewaPendingUrl } from "@/lib/payments/settle-esewa";
import { clientIp, guarded, rateLimit } from "@/lib/api";

/**
 * GET /api/payments/esewa/success — the `success_url` given to eSewa.
 *
 * eSewa appends `?data=<base64>`. This handler decodes and signature-checks
 * the response, then confirms with the status API, and only then forwards
 * the browser. Opening this URL without paying simply runs the same checks
 * and lands on pending — it can never mint a PAID order.
 */
export async function GET(request: Request) {
  return guarded(async () => {
    const base = siteConfig.url.replace(/\/$/, "");
    const params = new URL(request.url).searchParams;
    const orderNumber = params.get("order");
    const data = params.get("data");

    if (!orderNumber) {
      return Response.redirect(`${base}/checkout`, 303);
    }

    // Bound per IP so the endpoint cannot be used to spray eSewa's status
    // API. Over-limit browsers land on pending (which re-checks) instead of
    // an error, so a legitimate customer is never stranded.
    const limit = rateLimit(`esewa-return:${clientIp(request)}`, 120, 60 * 60 * 1000);
    if (!limit.allowed) {
      return Response.redirect(esewaPendingUrl(orderNumber), 303);
    }

    const outcome = await settleEsewaReturn({ orderNumber, data });

    if (outcome.outcome === "unknown-order") {
      return Response.redirect(`${base}/checkout`, 303);
    }
    if (outcome.outcome === "paid") return Response.redirect(esewaSuccessUrl(orderNumber), 303);
    if (outcome.outcome === "pending") return Response.redirect(esewaPendingUrl(orderNumber), 303);
    return Response.redirect(esewaFailedUrl(orderNumber, outcome.reason), 303);
  });
}
