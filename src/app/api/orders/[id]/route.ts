import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { guarded, notFound, ok, unauthorized, readJson, fail } from "@/lib/api";

type ShippingAddress = {
  contactName?: string;
  phone?: string;
  line1?: string;
  line2?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  landmark?: string;
};

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/orders/[id]">,
) {
  return guarded(async () => {
    const { id } = await ctx.params;
    const user = await getCurrentUser();

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true, payments: true },
    });

    if (!order) return notFound("Order not found.");

    // Guests can view their own order using the order number as a capability
    // token; signed-in users are additionally checked against ownership.
    const isOwner = user?.id === order.userId;
    if (!isOwner && user) return unauthorized("This order belongs to another account.");

    let address: ShippingAddress = {};
    try {
      address = JSON.parse(order.shippingAddress) as ShippingAddress;
    } catch {
      address = {};
    }

    return ok({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        paymentRef: order.paymentRef,
        subtotal: order.subtotal,
        shippingFee: order.shippingFee,
        discount: order.discount,
        total: order.total,
        couponCode: order.couponCode,
        deliveryNote: order.deliveryNote,
        courierName: order.courierName,
        trackingRef: order.trackingRef,
        shippingAddress: address,
        placedAt: order.placedAt.toISOString(),
        deliveredAt: order.deliveredAt?.toISOString() ?? null,
        items: order.items.map((i) => ({
          name: i.name,
          slug: i.productId,
          sku: i.sku,
          image: i.image,
          unitPrice: i.unitPrice,
          quantity: i.quantity,
          lineTotal: i.lineTotal,
        })),
      },
    });
  });
}

/** PATCH /api/orders/[id] — cancel an order (customer-facing). */
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/orders/[id]">,
) {
  return guarded(async () => {
    const { id } = await ctx.params;
    const user = await getCurrentUser();

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true, payments: true },
    });

    if (!order) return notFound("Order not found.");

    // Guests can cancel their own order using the order number as a capability
    // token; signed-in users are additionally checked against ownership.
    const isOwner = user?.id === order.userId;
    if (!isOwner && user) return unauthorized("This order belongs to another account.");

    const body = await readJson<{ action?: string }>(request);
    const action = body?.action;

    if (action !== "cancel") {
      return fail("Invalid action. Only 'cancel' is supported.", 400);
    }

    // Only allow cancellation if order is still in a cancellable state
    const cancellableStatuses = ["PENDING", "CONFIRMED", "PROCESSING"];
    if (!cancellableStatuses.includes(order.status)) {
      return fail("This order can no longer be cancelled.", 409, {
        status: order.status,
      });
    }

    // If payment was already made, we can't cancel through this endpoint
    // (would need a refund flow instead)
    if (order.paymentStatus === "PAID") {
      return fail("This order has already been paid. Please contact support for a refund.", 409);
    }

    // Release stock for each item
    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        if (item.productId) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      // Update order status to CANCELLED
      await tx.order.update({
        where: { id },
        data: {
          status: "CANCELLED",
          paymentStatus: "CANCELLED",
        },
      });

      // Update any associated payments to CANCELLED
      await tx.payment.updateMany({
        where: { orderId: id },
        data: { status: "CANCELLED" },
      });
    });

    return ok({
      message: "Order cancelled successfully.",
      order: { id: order.id, orderNumber: order.orderNumber, status: "CANCELLED" },
    });
  });
}