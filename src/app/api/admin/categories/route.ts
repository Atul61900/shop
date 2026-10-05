import { getCurrentUser, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAdminAction } from "@/lib/audit";
import { revalidateCatalogue } from "@/lib/revalidate";
import { adminCategorySchema, fieldErrors } from "@/lib/validation";
import { clientIp, fail, guarded, ok, rateLimit, readJson } from "@/lib/api";

/**
 * POST /api/admin/categories
 *
 * Categories are not seeded — staff create them, so the shop grows without a
 * deploy. A new category with no products yet is fine: the shop page renders
 * every active category, so it appears immediately and fills up as products
 * are filed against it.
 */
export async function POST(request: Request) {
  return guarded(async () => {
    const user = await getCurrentUser();
    if (!user) return fail("You must be signed in.", 401);
    if (!isAdmin(user)) return fail("Administrator access required.", 403);

    const budget = rateLimit(`admin-write:${user.id}`, 30, 60 * 60 * 1000);
    if (!budget.allowed) {
      return fail("Too many catalogue changes. Please try again later.", 429);
    }

    const body = await readJson(request);
    const parsed = adminCategorySchema.safeParse(body ?? {});
    if (!parsed.success) {
      return fail("Please correct the highlighted fields.", 422, fieldErrors(parsed.error));
    }
    const data = parsed.data;

    const clash = await prisma.category.findUnique({
      where: { slug: data.slug },
      select: { slug: true },
    });
    if (clash) {
      return fail("Please correct the highlighted fields.", 422, {
        slug: "That URL is already taken",
      });
    }

    // New categories land last unless an explicit position is given.
    const last = await prisma.category.findFirst({
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const category = await prisma.category.create({
      data: {
        slug: data.slug,
        name: data.name,
        tagline: data.tagline || null,
        description: data.description || null,
        accent: data.accent,
        image: data.image || null,
        sortOrder: data.sortOrder ?? (last?.sortOrder ?? 0) + 1,
        isActive: data.isActive ?? true,
      },
      select: { id: true, slug: true, name: true },
    });

    await recordAdminAction({
      actor: user.email,
      action: "CATEGORY_CREATED",
      target: category.slug,
      detail: category.name,
      ip: clientIp(request),
    });

    revalidateCatalogue();

    return ok({ category }, { status: 201 });
  });
}
