import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { reviewSchema, fieldErrors } from "@/lib/validation";
import { clientIp, fail, guarded, ok, rateLimit, readJson } from "@/lib/api";

/**
 * POST /api/reviews
 *
 * Creates a product review and recomputes the cached rating aggregates on
 * Product in the same transaction, so the star rating shown on cards can
 * never disagree with the reviews listed underneath.
 *
 * The shop has no accounts, so every review carries the author's name and is
 * rate-limited per IP instead of de-duplicated per user.
 */
export async function POST(request: Request) {
  return guarded(async () => {
    const limit = rateLimit(`review:${clientIp(request)}`, 5, 60 * 60 * 1000);
    if (!limit.allowed) {
      return fail("Too many reviews submitted. Please try again later.", 429);
    }

    const body = await readJson(request);
    if (!body) return fail("Invalid request body.");

    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return fail("Please correct the highlighted fields.", 422, fieldErrors(parsed.error));
    }

    const { productId, rating, title, body: reviewBody, authorName } = parsed.data;

    const product = await prisma.product.findFirst({
      where: { id: productId, isActive: true },
      select: { id: true },
    });
    if (!product) return fail("That product is no longer available.", 404);

    const user = await getCurrentUser();

    // One review per customer per product.
    if (user) {
      const existing = await prisma.review.findFirst({
        where: { productId, userId: user.id },
        select: { id: true },
      });
      if (existing) return fail("You have already reviewed this product.", 409);
    }

    const author = user?.name ?? authorName?.trim() ?? "Guest customer";
    if (!user && (!authorName || authorName.trim().length < 2)) {
      return fail("Please enter your name.", 422, { authorName: "Enter your name" });
    }

    // Verified badge only when the customer actually bought this product.
    const isVerifiedBuyer = user
      ? Boolean(
          await prisma.orderItem.findFirst({
            where: {
              productId,
              order: {
                userId: user.id,
                status: { in: ["CONFIRMED", "PROCESSING", "READY", "OUT_FOR_DELIVERY", "DELIVERED"] },
              },
            },
            select: { id: true },
          }),
        )
      : false;

    await prisma.$transaction(async (tx) => {
      await tx.review.create({
        data: {
          productId,
          userId: user?.id ?? null,
          authorName: author.slice(0, 80),
          rating,
          title: title || null,
          body: reviewBody,
          isVerifiedBuyer,
          isApproved: true,
        },
      });

      const aggregate = await tx.review.aggregate({
        where: { productId, isApproved: true },
        _avg: { rating: true },
        _count: { _all: true },
      });

      await tx.product.update({
        where: { id: productId },
        data: {
          rating: Math.round((aggregate._avg.rating ?? 0) * 10) / 10,
          reviewCount: aggregate._count._all,
        },
      });
    });

    return ok(
      { message: "Thanks for the review — it is live on the product page." },
      { status: 201 },
    );
  });
}