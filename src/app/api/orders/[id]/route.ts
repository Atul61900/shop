import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { guarded, notFound, ok, unauthorized } from "@/lib/api";

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