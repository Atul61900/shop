import { prisma } from "@/lib/prisma";
import { serializeProduct } from "@/lib/cart";
import { guarded, ok } from "@/lib/api";

/**
 * GET /api/products
 *
 * Query: search, category, brands, minPrice, maxPrice, inStock, sort, page, limit
 * `sort`: newest | price-asc | price-desc | rating | popular | name-asc
 */
export async function GET(request: Request) {
  return guarded(async () => {
    const url = new URL(request.url);
    const q = url.searchParams;

    const search = q.get("search")?.trim() ?? "";
    const category = q.get("category")?.trim() ?? "";
    const brandFilter = q.getAll("brand").flatMap((b) => b.split(",")).filter(Boolean);
    const inStock = q.get("inStock") === "true";
    const featured = q.get("featured") === "true";

    const minPrice = Number.parseInt(q.get("minPrice") ?? "", 10);
    const maxPrice = Number.parseInt(q.get("maxPrice") ?? "", 10);

    const page = Math.max(1, Number.parseInt(q.get("page") ?? "1", 10) || 1);
    const limit = Math.min(60, Math.max(1, Number.parseInt(q.get("limit") ?? "12", 10) || 12));
    const skip = (page - 1) * limit;

    const where = {
      isActive: true,
      ...(featured ? { isFeatured: true } : {}),
      ...(inStock ? { stock: { gt: 0 } } : {}),
      ...(category ? { category: { slug: category } } : {}),
      ...(brandFilter.length ? { brand: { in: brandFilter } } : {}),
      ...(Number.isFinite(minPrice) || Number.isFinite(maxPrice)
        ? {
            price: {
              ...(Number.isFinite(minPrice) ? { gte: minPrice } : {}),
              ...(Number.isFinite(maxPrice) ? { lte: maxPrice } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { summary: { contains: search } },
              { brand: { contains: search } },
              { sku: { contains: search } },
              { tags: { contains: search } },
            ],
          }
        : {}),
    };

    const orderBy = (() => {
      switch (q.get("sort")) {
        case "price-asc":
          return { price: "asc" as const };
        case "price-desc":
          return { price: "desc" as const };
        case "rating":
          return [{ rating: "desc" as const }, { reviewCount: "desc" as const }];
        case "popular":
          return [{ soldCount: "desc" as const }, { rating: "desc" as const }];
        case "name-asc":
          return { name: "asc" as const };
        case "name-desc":
          return { name: "desc" as const };
        default:
          return [{ isFeatured: "desc" as const }, { createdAt: "desc" as const }];
      }
    })();

    const [items, total, brands, range, categories] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: { category: { select: { slug: true, name: true } } },
      }),
      prisma.product.count({ where }),
      prisma.product.findMany({
        where: { isActive: true },
        distinct: ["brand"],
        select: { brand: true },
        orderBy: { brand: "asc" },
      }),
      prisma.product.aggregate({
        where: { isActive: true },
        _min: { price: true },
        _max: { price: true },
      }),
      prisma.category.findMany({
        where: { isActive: true },
        select: { slug: true, name: true },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    return ok({
      products: items.map(serializeProduct),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasMore: skip + items.length < total,
      },
      facets: {
        brands: brands.map((b) => b.brand),
        minPrice: range._min.price ?? 0,
        maxPrice: range._max.price ?? 0,
        categories,
      },
    });
  });
}