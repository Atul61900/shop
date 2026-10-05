import { prisma } from "@/lib/prisma";
import { serializeProduct, parseJsonArray } from "@/lib/cart";
import { guarded, notFound, ok } from "@/lib/api";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/products/[slug]">,
) {
  return guarded(async () => {
    const { slug } = await ctx.params;

    const product = await prisma.product.findFirst({
      where: { slug, isActive: true },
      include: {
        category: { select: { slug: true, name: true } },
        reviews: {
          where: { isApproved: true },
          orderBy: { createdAt: "desc" },
          take: 12,
          select: {
            id: true,
            authorName: true,
            rating: true,
            title: true,
            body: true,
            isVerifiedBuyer: true,
            createdAt: true,
          },
        },
      },
    });

    if (!product) return notFound("That product is no longer available.");

    // Rating distribution for the histogram readout.
    const distribution = await prisma.review.groupBy({
      by: ["rating"],
      where: { productId: product.id, isApproved: true },
      _count: { _all: true },
    });

    const related = await prisma.product.findMany({
      where: {
        isActive: true,
        categoryId: product.categoryId,
        id: { not: product.id },
      },
      take: 4,
      orderBy: [{ isFeatured: "desc" }, { rating: "desc" }],
      include: { category: { select: { slug: true, name: true } } },
    });

    return ok({
      product: serializeProduct(product),
      reviews: product.reviews.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      })),
      ratingBreakdown: Array.from({ length: 5 }, (_, i) => {
        const stars = i + 1;
        const count = distribution.find((d) => d.rating === stars)?._count._all ?? 0;
        return {
          stars,
          count,
          percent: product.reviewCount > 0 ? Math.round((count / product.reviewCount) * 100) : 0,
        };
      }),
      related: related.map(serializeProduct),
      tags: parseJsonArray(product.tags),
    });
  });
}