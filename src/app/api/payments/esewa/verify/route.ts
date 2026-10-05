import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/lib/config";
import { verifyEsewaPayment } from "@/lib/payments/esewa";
import { guarded, ok } from "@/lib/api";

/**
 * eSewa server-to-server callback.
 *
 * eSewa calls this after the customer completes (or abandons) payment.
 * The order is only marked paid after an independent verification call, so a
 * forged GET to this URL cannot mark an order as paid.
 */
async function settle(orderNumber: string | null, redirect: boolean) {
  if (!orderNumber) {
    return Response.json({ ok: false }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { orderNumber } });

  // Always tell the gateway we received the ping, even for unknown orders.
  if (redirect) {
    return Response.redirect(`${siteConfig.url}/checkout/success?order=${orderNumber}&gateway=esewa`);
  }
  if (!order) return Response.json({ ok: false, error: "Unknown order" }, { status: 404 });

  if (order.paymentStatus === "PAID") {
    return ok({ orderNumber, status: "PAID", alreadyPaid: true });
  }

  const verified = await verifyEsewaPayment(orderNumber, order.total);
  const payment = await prisma.payment.findFirst({
    where: { orderId: order.id, gateway: "ESEWA" },
    orderBy: { createdAt: "desc" },
  });

  if (!verified.ok) {
    await prisma.payment.updateMany({
      where: { orderId: order.id },
      data: { status: "FAILED", verifiedAt: new Date(), rawResponse: JSON.stringify(verified) },
    });
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: "FAILED" },
    });
    return ok({ orderNumber, status: "FAILED", error: verified.error });
  }

  await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "PAID",
        paymentRef: verified.transactionCode,
        status: order.status === "PENDING" ? "CONFIRMED" : order.status,
      },
    }),
    prisma.payment.updateMany({
      where: { orderId: order.id, gateway: "ESEWA" },
      data: {
        status: "SUCCESS",
        reference: verified.transactionCode,
        verifiedAt: new Date(),
        rawResponse: JSON.stringify(verified.raw),
      },
    }),
  ]);

  void payment;

  return ok({ orderNumber, status: "PAID" });
}

/** Browser redirect back from eSewa. */
export async function GET(request: Request) {
  return guarded(async () => {
    const { searchParams } = new URL(request.url);
    const orderNumber = searchParams.get("order") ?? searchParams.get("merchantAux");

    // The browser pass-through still verifies server-side; it just also
    // forwards the customer onward to the confirmation page.
    const result = await settle(orderNumber, true);
    return result;
  });
}

/** eSewa's actual callback. */
export async function POST(request: Request) {
  return guarded(async () => {
    const { searchParams } = new URL(request.url);
    let orderNumber = searchParams.get("order");

    if (!orderNumber) {
      const form = await request.formData().catch(() => null);
      orderNumber =
        (form?.get("order") as string | null) ?? (form?.get("merchantAux") as string | null);
    }

    return settle(orderNumber, false);
  });
}