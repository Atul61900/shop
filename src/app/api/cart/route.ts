import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { loadUserCartLines, priceCart } from "@/lib/cart";
import { parseCartLines } from "@/lib/schemas";
import { guarded, ok, readJson } from "@/lib/api";

/**
 * GET /api/cart
 * Returns the signed-in user's persisted, fully priced cart.
 *
 * Guests never hit this endpoint — their cart lives in localStorage and is
 * priced on demand via POST /api/cart/price.
 */
export async function GET(request: Request) {
  return guarded(async () => {
    const user = await getCurrentUser();
    if (!user) return ok({ cart: null, isGuest: true });

    const { searchParams } = new URL(request.url);
    const cart = await priceCart(await loadUserCartLines(user.id), {
      couponCode: searchParams.get("coupon"),
    });

    return ok({ cart, isGuest: false });
  });
}

/**
 * POST /api/cart
 * Body: { lines: [{ productId, quantity }] }
 *
 * Replaces the caller's cart with the supplied lines and returns the priced
 * result. Used for two things:
 *   - syncing a signed-in user's localStorage cart to the server
 *   - merging an anonymous cart after login
 *
 * Prices are always recomputed from the database, and quantities are clamped
 * to real stock, so the client cannot dictate what is charged.
 */
export async function POST(request: Request) {
  return guarded(async () => {
    const user = await getCurrentUser();

    const body = await readJson<{ lines?: unknown; couponCode?: string }>(request);
    const lines = parseCartLines(body?.lines);

    // --- Signed in: persist, clamped to available stock ---
    if (user) {
      const products = lines.length
        ? await prisma.product.findMany({
            where: { id: { in: lines.map((l) => l.productId) } },
            select: { id: true, stock: true, isActive: true },
          })
        : [];

      const stockById = new Map(products.map((p) => [p.id, p]));

      await prisma.$transaction([
        prisma.cartItem.deleteMany({ where: { userId: user.id } }),
        ...lines.map((line) => {
          const product = stockById.get(line.productId);
          const quantity =
            product && product.isActive
              ? Math.max(1, Math.min(line.quantity, product.stock, 99))
              : 0;

          return prisma.cartItem.create({
            data: { userId: user.id, productId: line.productId, quantity },
          });
        }),
      ]);

      const cart = await priceCart(await loadUserCartLines(user.id), {
        couponCode: body?.couponCode,
      });
      return ok({ cart, isGuest: false });
    }

    // --- Guest: just price it, nothing to persist ---
    const cart = await priceCart(lines, { couponCode: body?.couponCode });
    return ok({ cart, isGuest: true });
  });
}