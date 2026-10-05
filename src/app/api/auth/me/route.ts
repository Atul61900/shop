import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { guarded, ok } from "@/lib/api";

export async function GET() {
  return guarded(async () => {
    const user = await getCurrentUser();
    if (!user) return ok({ user: null });

    const [cartCount, orderCount] = await Promise.all([
      prisma.cartItem.aggregate({
        where: { userId: user.id },
        _sum: { quantity: true },
      }),
      prisma.order.count({ where: { userId: user.id } }),
    ]);

    return ok({
      user,
      stats: {
        cartCount: cartCount._sum.quantity ?? 0,
        orderCount,
      },
    });
  });
}