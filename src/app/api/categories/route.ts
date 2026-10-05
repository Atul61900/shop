import { prisma } from "@/lib/prisma";
import { serializeProduct } from "@/lib/cart";
import { guarded, ok } from "@/lib/api";

export async function GET(request: Request) {
  return guarded(async () => {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: {
        _count: { select: { products: { where: { isActive: true } } } },
      },
    });

    const featured =
      category === "featured"
        ? await prisma.product.findMany({
            where: { isActive: true, isFeatured: true },
            take: 8,
            orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
            include: { category: { select: { slug: true, name: true } } },
          })
        : await prisma.product.findMany({
            where: { isActive: true },
            take: 8,
            orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
            include: { category: { select: { slug: true, name: true } } },
          });

    return ok({
      categories: categories.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        tagline: c.tagline,
        description: c.description,
        image: c.image,
        accent: c.accent,
        productCount: c._count.products,
      })),
      featured: featured.map(serializeProduct),
    });
  });
}