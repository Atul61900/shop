import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/lib/config";
import { verifyKhaltiPayment, verifySignature } from "@/lib/payments/khalti";
import { guarded, ok } from "@/lib/api";

/**
 * Khalti return trip.
 *
 * Khalti redirects the customer back here with `status`, `token` and the
 * payload/signature pair we signed on the way out. Three checks before money
 * is marked paid:
 *   1. our own HMAC signature still verifies (the callback is genuinely ours)
 *   2. Khalti confirms the token is Completed
 *   3. the confirmed amount matches the order total
 */
async function settle(
  orderNumber: string | null,
  payload: string | null,
  signature: string | null,
  status: string | null,
  redirect: boolean,
) {
  const finish = (paid: boolean) =>
    Response.redirect(
      `${siteConfig.url}/checkout/success?order=${orderNumber ?? ""}&gateway=khalti&paid=${paid ? "1" : "0"}`,
    );

  if (redirect) {
    if (!orderNumber) return Response.redirect(`${siteConfig.url}/checkout`);
    const looksPaid = status?.toLowerCase() === "completed";
    return finish(looksPaid);
  }

  if (!orderNumber) {
    return Response.json({ ok: false, error: "Missing order" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { orderNumber } });
  if (!order) {
    return Response.json({ ok: false, error: "Unknown order" }, { status: 404 });
  }

  if (order.paymentStatus === "PAID") {
    return ok({ orderNumber, status: "PAID", alreadyPaid: true });
  }

  // 1. Signature check — reject anything we did not sign.
  if (!payload || !signature || !verifySignature(payload, signature)) {
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: "FAILED" },
    });
    return Response.json({ ok: false, error: "Invalid payment signature" }, { status: 400 });
  }

  const [signedOrder, signedAmount] = payload.split("|");

  // The signed payload must match the order we're about to credit.
  if (signedOrder !== order.orderNumber) {
    return Response.json({ ok: false, error: "Payload/order mismatch" }, { status: 400 });
  }

  // 2. Independent verification with Khalti.
  const payment = await prisma.payment.findFirst({
    where: { orderId: order.id, gateway: "KHALTI" },
    orderBy: { createdAt: "desc" },
  });

  const verified = payment?.reference
    ? await verifyKhaltiPayment(payment.reference)
    : { ok: false as const, error: "No payment token recorded." };

  // 3. Amount reconciliation.
  const expectedMajor = (order.total / 100).toFixed(2);
  const amountMatches = verified.ok && Number(verified.amount) === Number(expectedMajor);

  if (!verified.ok || !amountMatches) {
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: "FAILED" },
    });
    await prisma.payment.updateMany({
      where: { orderId: order.id },
      data: {
        status: "FAILED",
        verifiedAt: new Date(),
        rawResponse: JSON.stringify({ verified, signedAmount, expectedMajor }),
      },
    });
    return Response.json(
      { ok: false, error: verified.ok ? "Amount mismatch" : verified.error },
      { status: 400 },
    );
  }

  await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "PAID",
        paymentRef: verified.token,
        status: order.status === "PENDING" ? "CONFIRMED" : order.status,
      },
    }),
    prisma.payment.updateMany({
      where: { orderId: order.id },
      data: {
        status: "SUCCESS",
        reference: verified.token,
        verifiedAt: new Date(),
        rawResponse: JSON.stringify(verified.raw),
      },
    }),
  ]);

  return ok({ orderNumber, status: "PAID" });
}

export async function GET(request: Request) {
  return guarded(async () => {
    const { searchParams } = new URL(request.url);
    return settle(
      searchParams.get("order"),
      searchParams.get("payload"),
      searchParams.get("signature"),
      searchParams.get("status"),
      false,
    );
  });
}

export async function POST(request: Request) {
  return guarded(async () => {
    const form = await request.formData().catch(() => null);
    return settle(
      (form?.get("order") as string | null) ?? null,
      (form?.get("payload") as string | null) ?? null,
      (form?.get("signature") as string | null) ?? null,
      (form?.get("status") as string | null) ?? null,
      false,
    );
  });
}