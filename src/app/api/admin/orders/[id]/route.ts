import { revalidatePath } from "next/cache";

import { getCurrentUser, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { failOrderAndReleaseStock } from "@/lib/payments/stock";
import { recordAdminAction } from "@/lib/audit";
import { adminOrderUpdateSchema, fieldErrors, ORDER_TERMINAL_STATUSES } from "@/lib/validation";
import { clientIp, fail, guarded, ok, rateLimit } from "@/lib/api";

/**
 * PATCH /api/admin/orders/[id] — update fulfilment state.
 *
 * Payment state stays gateway-driven: this endpoint moves the fulfilment
 * status, courier and tracking reference, and can cancel an unpaid order
 * (which releases reserved stock exactly once). Paid orders are never
 * cancelled here; they need the refund flow instead.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return guarded(async () => {
    const user = await getCurrentUser();
    if (!user) return fail("You must be signed in.", 401);
    if (!isAdmin(user)) return fail("Administrator access required.", 403);

    const budget = rateLimit(`admin-write:${user.id}`, 30, 60 * 60 * 1000);
    if (!budget.allowed) {
      return fail("Too many catalogue changes. Please try again later.", 429);
    }

    const { id } = await params;
    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) return fail("Order not found.", 404);

    if ((ORDER_TERMINAL_STATUSES as readonly string[]).includes(existing.status)) {
      return fail("This order is closed and can no longer be changed.", 409, {
        status: existing.status,
      });
    }

    const body = await request.json().catch(() => null);
    const parsed = adminOrderUpdateSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return fail("Please correct the highlighted fields.", 422, fieldErrors(parsed.error));
    }
    const data = parsed.data;

    if (data.status === "CANCELLED" && existing.paymentStatus === "PAID") {
      return fail("This order has already been paid. Please use the refund flow instead.", 409);
    }

    if (data.status === "CANCELLED" && existing.paymentStatus === "PENDING") {
      await failOrderAndReleaseStock({
        orderId: id,
        orderNumber: existing.orderNumber,
        to: "CANCELLED",
        reason: "Cancelled from the admin panel.",
      });
    }

    const order = await prisma.order.update({
      where: { id },
      data: {
        status: data.status,
        courierName: data.courierName === undefined ? existing.courierName : (data.courierName || null),
        trackingRef: data.trackingRef === undefined ? existing.trackingRef : (data.trackingRef || null),
        deliveredAt: data.status === "DELIVERED" ? (existing.deliveredAt ?? new Date()) : null,
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        courierName: true,
        trackingRef: true,
        deliveredAt: true,
      },
    });

    await recordAdminAction({
      actor: user.email,
      action: "ORDER_UPDATED",
      target: order.orderNumber,
      detail: `Status ${existing.status} -> ${order.status}`,
      ip: clientIp(request),
    });

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${id}`);
    revalidatePath("/account/orders");

    return ok({ order });
  });
}
