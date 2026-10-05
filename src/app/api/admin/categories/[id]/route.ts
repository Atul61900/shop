import { getCurrentUser, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteImage } from "@/lib/uploads";
import { recordAdminAction } from "@/lib/audit";
import { adminCategorySchema, fieldErrors } from "@/lib/validation";
import { clientIp, fail, guarded, ok, rateLimit } from "@/lib/api";

/** PATCH /api/admin/categories/[id] — rename a category or change its copy. */
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
    const existing = await prisma.category.findUnique({
      where: { id },
      select: { id: true, slug: true, image: true },
    });
    if (!existing) return fail("Category not found.", 404);

    const body = await request.json().catch(() => null);
    const parsed = adminCategorySchema.safeParse(body ?? {});
    if (!parsed.success) {
      return fail("Please correct the highlighted fields.", 422, fieldErrors(parsed.error));
    }
    const data = parsed.data;

    const clash = await prisma.category.findFirst({
      where: { id: { not: id }, slug: data.slug },
      select: { slug: true },
    });
    if (clash) {
      return fail("Please correct the highlighted fields.", 422, {
        slug: "That URL is already taken",
      });
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        slug: data.slug,
        name: data.name,
        tagline: data.tagline || null,
        description: data.description || null,
        accent: data.accent,
        image: data.image || null,
        sortOrder: data.sortOrder,
        isActive: data.isActive ?? true,
      },
      select: { id: true, slug: true, name: true },
    });

    if (existing.image && existing.image !== data.image) {
      await deleteImage(existing.image, "categories");
    }

    await recordAdminAction({
      actor: user.email,
      action: "CATEGORY_UPDATED",
      target: category.slug,
      detail: `${category.name}${category.slug !== existing.slug ? ` (was ${existing.slug})` : ""}`,
      ip: clientIp(request),
    });

    return ok({ category });
  });
}

/**
 * DELETE /api/admin/categories/[id]
 *
 * Refused while the category still holds products — `Product.categoryId` is a
 * required relation with no cascade, so deleting it would either fail deep in
 * the database or orphan stock. Move or delete the products first.
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

    const category = await prisma.category.findUnique({
      where: { id },
      select: { id: true, slug: true, image: true, _count: { select: { products: true } } },
    });
    if (!category) return fail("Category not found.", 404);

    if (category._count.products > 0) {
      return fail(
        `Move or delete the ${category._count.products} product(s) in this category first.`,
        409,
      );
    }

    await prisma.category.delete({ where: { id } });
    await deleteImage(category.image, "categories");

    await recordAdminAction({
      actor: user.email,
      action: "CATEGORY_DELETED",
      target: category.slug,
      ip: clientIp(request),
    });

    return ok({ deleted: category.id });
  });
}
