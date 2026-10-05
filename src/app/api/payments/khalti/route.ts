import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/lib/config";
import { createKhaltiPayment, isKhaltiConfigured } from "@/lib/payments/khalti";
import { fail, guarded, ok, readJson } from "@/lib/api";

/**
 * POST /api/payments/khalti
 * Body: { orderNumber: string }
 *
 * Starts a Khalti checkout and returns the redirect URL. The URL carries an
 * HMAC-signed payload so the return trip can be authenticated without trusting
 * anything the browser sends back.
 */
export async function POST(request: Request) {
  return guarded(async () => {
    if (!isKhaltiConfigured()) {
      return fail("Khalti is not configured on this deployment.", 503);
    }

    const body = await readJson<{ orderNumber?: string }>(request);
    const orderNumber = body?.orderNumber?.trim();
    if (!orderNumber) return fail("Order number is required.");

    const order = await prisma.order.findUnique({ where: { orderNumber } });
    if (!order) return fail("Order not found.", 404);
    if (order.paymentStatus === "PAID") return fail("This order is already paid.");
    if (order.paymentMethod !== "KHALTI") {
      return fail("This order was not placed with Khalti.");
    }

    const result = await createKhaltiPayment({
      orderNumber: order.orderNumber,
      amountMinor: order.total,
      email: order.email,
      phone: order.phone,
      returnUrl: `${siteConfig.url}/api/payments/khalti/verify?order=${order.orderNumber}`,
    });

    if (!result.ok) return fail(result.error, 502);

    await prisma.payment.create({
      data: {
        orderId: order.id,
        gateway: "KHALTI",
        amount: order.total,
        status: "INITIATED",
        reference: result.token,
      },
    });

    return ok({ redirectUrl: result.redirectUrl });
  });
}