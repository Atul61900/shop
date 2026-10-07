import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { priceCart } from "@/lib/cart";
import { parseCartLines } from "@/lib/schemas";
import { guarded, ok, rateLimit, clientIp, fail, readJson } from "@/lib/api";

/**
 * POST /api/cart/price
 * Body: { lines: [{ productId, quantity }], couponCode?: string }
 *
 * A pure read — prices a cart without touching stored state. This is what the
 * header badge, cart drawer and checkout page call, so displayed money is
 * always server-computed even for guests.
 */
export async function POST(request: Request) {
  return guarded(async () => {
    // Pricing runs a DB query per call; bound it generously so normal
    // shopping (debounced client-side) never notices. The client keeps the
    // last good pricing on 429.
    const limit = rateLimit(`cart-price:${clientIp(request)}`, 240, 60 * 60 * 1000);
    if (!limit.allowed) {
      return fail("Too many requests. Please wait a moment and try again.", 429);
    }

    const body = await readJson<{
      lines?: unknown;
      couponCode?: string | null;
    }>(request);

    const lines = body && Array.isArray(body.lines) ? parseCartLines(body.lines) : [];

    return ok({
      cart: await priceCart(lines, { couponCode: body?.couponCode ?? undefined }),
    });
  });
}

/** GET /api/cart/price — lightweight badge count for signed-in users. */
export async function GET() {
  return guarded(async () => {
    const user = await getCurrentUser();
    if (!user) return ok({ count: 0 });

    const aggregate = await prisma.cartItem.aggregate({
      where: { userId: user.id },
      _sum: { quantity: true },
    });

    return ok({ count: aggregate._sum.quantity ?? 0 });
  });
}