import { getCurrentUser, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteImage } from "@/lib/uploads";
import { recordAdminAction } from "@/lib/audit";
import { revalidateCatalogue } from "@/lib/revalidate";
import { adminProductSchema, fieldErrors } from "@/lib/validation";
import { clientIp, fail, guarded, ok, rateLimit } from "@/lib/api";

/**
 * PATCH /api/admin/products/[id] — update an existing product.
 *
 * The same Zod schema as creation is reused, so the admin form cannot drift
 * from the API. Uniqueness is checked against every *other* row, which lets a
 * product keep its own slug and SKU while saving unchanged fields.
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
    const existing = await prisma.product.findUnique({
      where: { id },
      select: { id: true, slug: true, sku: true, images: true },
    });
    if (!existing) return fail("Product not found.", 404);

    const body = await request.json().catch(() => null);
    const parsed = adminProductSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return fail("Please correct the highlighted fields.", 422, fieldErrors(parsed.error));
    }
    const data = parsed.data;

    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
      select: { id: true, isActive: true },
    });
    if (!category || !category.isActive) {
      return fail("Please correct the highlighted fields.", 422, {
        categoryId: "Choose an active category",
      });
    }

    // Excludes this record so saving without changing the slug is allowed.
    const clash = await prisma.product.findFirst({
      where: { id: { not: id }, OR: [{ slug: data.slug }, { sku: data.sku }] },
      select: { slug: true, sku: true },
    });
    if (clash) {
      const fields: Record<string, string> = {};
      if (clash.slug === data.slug) fields.slug = "That URL is already taken";
      if (clash.sku === data.sku) fields.sku = "That SKU is already taken";
      return fail("Please correct the highlighted fields.", 422, fields);
    }

    // Keep the new image but drop the one it replaced.
    const previous = (() => {
      try {
        const parsedImages = JSON.parse(existing.images);
        return Array.isArray(parsedImages)
          ? (parsedImages.filter((v) => typeof v === "string") as string[])
          : [];
      } catch {
        return [];
      }
    })();

    const compareAt =
      data.compareAtPrice && data.compareAtPrice > 0 ? data.compareAtPrice : null;

    const product = await prisma.product.update({
      where: { id },
      data: {
        slug: data.slug,
        sku: data.sku,
        name: data.name,
        summary: data.summary,
        description: data.description,
        price: data.price,
        compareAtPrice: compareAt,
        stock: data.stock,
        warrantyMonths: data.warrantyMonths,
        brand: data.brand,
        categoryId: data.categoryId,
        images: JSON.stringify([data.image]),
        isActive: data.isActive ?? true,
        isFeatured: data.isFeatured ?? false,
      },
      select: { id: true, slug: true, name: true },
    });

    for (const image of previous) {
      if (image !== data.image) await deleteImage(image, "products");
    }

    await recordAdminAction({
      actor: user.email,
      action: "PRODUCT_UPDATED",
      target: product.slug,
      detail: `${product.name}${product.slug !== existing.slug ? ` (was ${existing.slug})` : ""}`,
      ip: clientIp(request),
    });

    // Both slugs, because a rename leaves the old detail page cached.
    revalidateCatalogue({ productSlug: product.slug });
    revalidateCatalogue({ productSlug: existing.slug });

    return ok({ product });
  });
}

/**
 * DELETE /api/admin/products/[id]
 *
 * Order lines keep a name/price snapshot and `OrderItem.productId` is
 * nullable, so removing a product never damages order history. Reviews and
 * cart rows cascade.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return guarded(async () => {
    const user = await getCurrentUser();
    if (!user) return fail("You must be signed in.", 401);
    if (!isAdmin(user)) return fail("Administrator access required.", 403);

    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
select: { id: true, slug: true, images: true },
      });
    if (!product) return fail("Product not found.", 404);

    await prisma.product.delete({ where: { id } });

    let images: string[] = [];
    try {
      const parsed = JSON.parse(product.images);
      if (Array.isArray(parsed)) images = parsed.filter((v) => typeof v === "string");
    } catch {
      // A malformed column should not block the delete.
    }
    for (const image of images) {
      await deleteImage(image, "products");
    }

    await recordAdminAction({
      actor: user.email,
      action: "PRODUCT_DELETED",
      target: product.id,
      ip: clientIp(request),
    });

    // Drop the detail page as well as the listings that linked to it.
    revalidateCatalogue({ productSlug: product.slug });

    return ok({ deleted: product.id });
  });
}
