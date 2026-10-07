import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { priceCart } from "@/lib/cart";
import { generateReference } from "@/lib/utils";
import { siteConfig } from "@/lib/config";
import { sendOrderConfirmationEmail } from "@/lib/mail";
import { checkoutSchema, fieldErrors } from "@/lib/validation";
import { parseCartLines } from "@/lib/schemas";
import { clientIp, fail, guarded, ok, rateLimit, readJson } from "@/lib/api";

/**
 * POST /api/orders
 *
 * Creates an order from a set of requested lines.
 *
 * Security notes:
 *  - Prices, names and totals are read from the database, never from the body.
 *  - Stock is re-checked inside the transaction and decremented atomically,
 *    so two simultaneous checkouts cannot oversell the last unit.
 *  - The coupon's usage count is incremented in the same transaction.
 */
export async function POST(request: Request) {
  return guarded(async () => {
    const limit = rateLimit(`order:${clientIp(request)}`, 15, 60 * 60 * 1000);
    if (!limit.allowed) {
      return fail("Too many orders placed. Please contact us directly.", 429);
    }

    const body = await readJson(request);
    if (!body) return fail("Invalid request body.");

    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return fail("Please correct the highlighted fields.", 422, fieldErrors(parsed.error));
    }

    const input = parsed.data;
    const lines = parseCartLines(input.items);

    if (lines.length === 0) return fail("Your cart is empty.");

    // The payment method is never gated here: both methods are always
    // selectable, and gateway readiness (TEST credentials present, LIVE keys
    // issued) is enforced when payment is *initiated*, where the backend can
    // return a clear configuration error. Blocking here would silently
    // un-select a method the UI correctly offered.

    const user = await getCurrentUser();
    const insideRingRoad = /kathmandu|lalitpur|bhaktapur|kirtipur|tripureshwor|thamel/i.test(
      input.shippingAddress.city,
    );

    const priced = await priceCart(lines, {
      couponCode: input.couponCode || undefined,
      insideRingRoad,
    });

    if (priced.lines.length === 0) return fail("Your cart is empty.");
    if (priced.couponError) return fail(priced.couponError, 422, { couponCode: priced.couponError });

    // Block checkout on anything we cannot fulfil.
    const unfulfillable = priced.lines.filter((l) => !l.isActive || !l.isAvailable);
    if (unfulfillable.length > 0) {
      return fail(
        `${unfulfillable[0]!.name} just went out of stock. Please remove it to continue.`,
        409,
        { outOfStock: unfulfillable.map((l) => l.slug).join(", ") },
      );
    }
    const shortfalls = priced.lines.filter((l) => l.stockShortfall > 0);
    if (shortfalls.length > 0) {
      const first = shortfalls[0]!;
      return fail(
        `Only ${first.stock} × ${first.name} left in stock. Please reduce the quantity.`,
        409,
        { stock: `${first.slug}:${first.stock}` },
      );
    }

    // Order numbers are random, so two simultaneous checkouts can rarely
    // collide on the unique constraint. The whole transaction rolls back on
    // failure, so regenerating and retrying is safe. After a few attempts
    // something else is wrong and the guarded wrapper reports it.
    let orderNumber = generateReference("KM");
    const shippingAddress = JSON.stringify(input.shippingAddress);

    const placeOrder = (orderNumber: string) =>
      prisma.$transaction(async (tx) => {
      // Conditional update = the concurrency guard. `updateMany` only touches
      // rows still matching `stock >= quantity`, so the loser of a race gets
      // count 0 and the whole transaction rolls back.
      for (const line of priced.lines) {
        const claimed = await tx.product.updateMany({
          where: { id: line.productId, stock: { gte: line.quantity } },
          data: { stock: { decrement: line.quantity }, soldCount: { increment: line.quantity } },
        });
        if (claimed.count === 0) {
          throw new Error(`INSUFFICIENT_STOCK:${line.slug}`);
        }
      }

      const created = await tx.order.create({
        data: {
          orderNumber,
          userId: user?.id ?? null,
          email: input.email,
          phone: input.phone,
          paymentMethod: input.paymentMethod,
          paymentStatus: input.paymentMethod === "COD" ? "PENDING" : "PENDING",
          subtotal: priced.subtotal,
          shippingFee: priced.shippingFee,
          discount: priced.discount,
          total: priced.total,
          couponCode: priced.couponCode,
          shippingAddress,
          deliveryNote: input.deliveryNote || null,
          status: input.paymentMethod === "COD" ? "CONFIRMED" : "PENDING",
          items: {
            create: priced.lines.map((line) => ({
              productId: line.productId,
              name: line.name,
              sku: line.sku,
              image: line.image,
              unitPrice: line.unitPrice,
              quantity: line.quantity,
              lineTotal: line.lineTotal,
            })),
          },
        },
        include: { items: true },
      });

      if (priced.couponCode) {
        await tx.coupon.updateMany({
          where: { code: priced.couponCode },
          data: { usedCount: { increment: 1 } },
        });
      }

      if (input.saveAddress && user) {
        await tx.address.create({
          data: {
            userId: user.id,
            contactName: input.shippingAddress.contactName,
            phone: input.shippingAddress.phone,
            line1: input.shippingAddress.line1,
            line2: input.shippingAddress.line2 || null,
            city: input.shippingAddress.city,
            province: input.shippingAddress.province,
            postalCode: input.shippingAddress.postalCode || null,
            landmark: input.shippingAddress.landmark || null,
          },
        });
      }

      if (user) {
        await tx.cartItem.deleteMany({ where: { userId: user.id } });
      }

      return created;
      }).catch((err: unknown) => {
        if (err instanceof Error && err.message.startsWith("INSUFFICIENT_STOCK:")) {
          const slug = err.message.split(":")[1];
          return { stockError: slug } as const;
        }
        throw err;
      });

    // Retries a regenerated number on the rare unique collision. The stock
    // guard above throws INSUFFICIENT_STOCK (not P2002), so a retry never
    // double-decrements: the rolled-back attempt reserved nothing.
    let order: Awaited<ReturnType<typeof placeOrder>> | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        order = await placeOrder(orderNumber);
        break;
      } catch (err) {
        const clash =
          typeof err === "object" &&
          err !== null &&
          "code" in err &&
          (err as { code?: string }).code === "P2002";
        if (!clash || attempt === 2) throw err;
        orderNumber = generateReference("KM");
      }
    }
    // The loop either breaks with an order or throws on the final attempt.
    if (!order) throw new Error("Order placement failed unexpectedly.");

    if ("stockError" in order) {
      return fail(
        "Someone just bought the last one. Please adjust your cart and try again.",
        409,
        { stock: order.stockError },
      );
    }

    // Emails must never fail the order — fire and forget.
    void sendOrderConfirmationEmail({
      to: order.email,
      name: input.shippingAddress.contactName,
      orderNumber: order.orderNumber,
      total: `${(order.total / 100).toFixed(2)} ${siteConfig.currency.code}`,
      itemCount: order.items.length,
      paymentMethod: order.paymentMethod,
    }).catch((err) => console.error("[order] confirmation email failed:", err));

    return ok(
      {
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          total: order.total,
          subtotal: order.subtotal,
          shippingFee: order.shippingFee,
          discount: order.discount,
          paymentMethod: order.paymentMethod,
          status: order.status,
          itemCount: order.items.length,
        },
      },
      { status: 201 },
    );
  });
}

/** GET /api/orders — the signed-in customer's order history. */
export async function GET() {
  return guarded(async () => {
    const user = await getCurrentUser();
    if (!user) return ok({ orders: [] });

    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { placedAt: "desc" },
      include: { items: { take: 4 } },
      take: 50,
    });

    return ok({
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        total: o.total,
        itemCount: o.items.reduce((sum, i) => sum + i.quantity, 0),
        placedAt: o.placedAt.toISOString(),
        items: o.items.map((i) => ({
          name: i.name,
          image: i.image,
          quantity: i.quantity,
          lineTotal: i.lineTotal,
        })),
      })),
    });
  });
}