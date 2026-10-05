import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/lib/config";
import { createEsewaPayment, isEsewaConfigured } from "@/lib/payments/esewa";
import { fail, guarded, ok, readJson } from "@/lib/api";

/**
 * POST /api/payments/esewa
 * Body: { orderNumber: string }
 *
 * Starts an eSewa checkout for an existing pending order and returns the URL
 * the browser should be redirected to.
 */
export async function POST(request: Request) {
  return guarded(async () => {
    if (!isEsewaConfigured()) {
      return fail("eSewa is not configured on this deployment.", 503);
    }

    const body = await readJson<{ orderNumber?: string }>(request);
    const orderNumber = body?.orderNumber?.trim();
    if (!orderNumber) return fail("Order number is required.");

    const order = await prisma.order.findUnique({ where: { orderNumber } });
    if (!order) return fail("Order not found.", 404);
    if (order.paymentStatus === "PAID") return fail("This order is already paid.");
    if (order.paymentMethod !== "ESEWA") {
      return fail("This order was not placed with eSewa.");
    }

    const base = siteConfig.url;
    const returnBase = `${base}/checkout/success`;

    const result = await createEsewaPayment({
      orderNumber: order.orderNumber,
      amountMinor: order.total,
      email: order.email,
      phone: order.phone,
      successUrl: `${returnBase}?order=${order.orderNumber}&gateway=esewa`,
      failureUrl: `${base}/checkout?order=${order.orderNumber}&gateway=failed`,
      callbackUrl: `${base}/api/payments/esewa/verify?order=${order.orderNumber}`,
    });

    if (!result.ok) return fail(result.error, 502);

    await prisma.payment.create({
      data: {
        orderId: order.id,
        gateway: "ESEWA",
        amount: order.total,
        status: "INITIATED",
      },
    });

    if (result.mode === "rest") {
      return ok({ mode: "rest", redirectUrl: result.redirectUrl });
    }

    // Legacy form-post: stash the fields so the checkout page can POST them.
    const store = await cookies();
    store.set(
      "kmrc_esewa_form",
      JSON.stringify(result.fields).slice(0, 3800),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 600,
      },
    );

    return ok({ mode: "form", formUrl: result.formUrl });
  });
}