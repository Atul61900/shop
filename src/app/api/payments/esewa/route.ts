import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/lib/config";
import { buildEsewaForm } from "@/lib/payments/esewa";
import { checkOrderOwnership, paymentInitQuota } from "@/lib/payments/ownership";
import { logPayment } from "@/lib/payments/log";
import { fail, guarded, ok, readJson } from "@/lib/api";

/**
 * POST /api/payments/esewa
 * Body: { orderNumber: string }
 *
 * Builds the SIGNED ePay v2 form fields server-side (HMAC stays on the Node
 * backend) and hands them to React, which POSTs them straight to eSewa's form
 * URL. `transaction_uuid` is minted per attempt (`<order>-<n>`) so a retry is
 * a fresh gateway transaction that still traces to the same order.
 */
export async function POST(request: Request) {
  return guarded(async () => {
    const body = await readJson<{ orderNumber?: string }>(request);
    const orderNumber = body?.orderNumber?.trim();
    if (!orderNumber) return fail("Order number is required.");

    const order = await prisma.order.findUnique({ where: { orderNumber } });
    if (!order) return fail("Order not found.", 404);

    // Ownership and quota run before anything else: an anonymous caller should
    // learn they need to sign in, not whether a gateway is deployed.
    const ownership = await checkOrderOwnership(order);
    if (!ownership.ok) return fail(ownership.error, ownership.status);

    if (!paymentInitQuota(order.id).allowed) {
      return fail("Too many payment attempts. Please wait a few minutes.", 429);
    }

    if (order.paymentStatus === "PAID") return fail("This order is already paid.");
    if (order.paymentMethod !== "ESEWA") {
      return fail("This order was not placed with eSewa.");
    }

    const attempt = (await prisma.payment.count({ where: { orderId: order.id, gateway: "ESEWA" } })) + 1;
    const txnUuid = `${order.orderNumber}-${attempt}`;

    const base = siteConfig.url.replace(/\/$/, "");
    const result = buildEsewaForm({
      orderNumber: order.orderNumber,
      txnUuid,
      amountMinor: order.total,
      // Shipping is the only surcharge this checkout knows; tax and service
      // charge are zero, which keeps total = amount + delivery honest.
      shippingMinor: order.shippingFee,
      successUrl: `${base}/api/payments/esewa/success?order=${order.orderNumber}`,
      failureUrl: `${base}/api/payments/esewa/failure?order=${order.orderNumber}`,
    });

    if (!result.ok) {
      const status = result.code === "config-missing" ? 503 : 502;
      return fail(result.error, status, { gateway: "ESEWA" });
    }

    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        gateway: "ESEWA",
        amount: order.total,
        currency: "NPR",
        txnUuid,
        status: "INITIATED",
      },
      select: { id: true },
    });

    logPayment({
      event: "initiate",
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentId: payment.id,
      gateway: "ESEWA",
      txn: txnUuid,
      expectedMinor: order.total,
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: "PENDING" },
    });

    return ok({ mode: "esewa-form", formUrl: result.formUrl, fields: result.fields });
  });
}
