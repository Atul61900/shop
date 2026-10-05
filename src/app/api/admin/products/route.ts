import { getCurrentUser, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAdminAction } from "@/lib/audit";
import { revalidateCatalogue } from "@/lib/revalidate";
import { adminProductSchema, fieldErrors } from "@/lib/validation";
import { clientIp, fail, guarded, ok, rateLimit, readJson } from "@/lib/api";

/**
 * POST /api/admin/products
 * Creates a catalogue product. Prices arrive in paisa (the same minor units the
 * rest of the app uses) and are converted from rupees in the admin form.
 */
export async function POST(request: Request) {
  return guarded(async () => {
    const user = await getCurrentUser();
    if (!user) return fail("You must be signed in.", 401);
    if (!isAdmin(user)) return fail("Administrator access required.", 403);

    // Small budget: catalogue writes are rare, and this blunts a hijacked
    // session being used to flood the shop.
    const budget = rateLimit(`admin-write:${user.id}`, 30, 60 * 60 * 1000);
    if (!budget.allowed) {
      return fail("Too many catalogue changes. Please try again later.", 429);
    }

    const body = await readJson(request);
    const parsed = adminProductSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return fail("Please correct the highlighted fields.", 422, fieldErrors(parsed.error));
    }
    const data = parsed.data;

    // The category must exist and be live, otherwise the product would be
    // unreachable from the shop.
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
      select: { id: true, isActive: true },
    });
    if (!category) {
      return fail("Please correct the highlighted fields.", 422, {
        categoryId: "Choose a category",
      });
    }
    if (!category.isActive) {
      return fail("That category is hidden and cannot take products.", 422, {
        categoryId: "Choose an active category",
      });
    }

    const clash = await prisma.product.findFirst({
      where: { OR: [{ slug: data.slug }, { sku: data.sku }] },
      select: { slug: true, sku: true },
    });
    if (clash) {
      const fields: Record<string, string> = {};
      if (clash.slug === data.slug) fields.slug = "That URL is already taken";
      if (clash.sku === data.sku) fields.sku = "That SKU is already taken";
      return fail("Please correct the highlighted fields.", 422, fields);
    }

    const compareAt =
      data.compareAtPrice && data.compareAtPrice > 0 ? data.compareAtPrice : null;

    const product = await prisma.product.create({
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
        specs: JSON.stringify({}),
        isActive: data.isActive ?? true,
        isFeatured: data.isFeatured ?? false,
      },
      select: { id: true, slug: true, sku: true, name: true },
    });

    await recordAdminAction({
      actor: user.email,
      action: "PRODUCT_CREATED",
      target: product.slug,
      detail: `${product.name} · ${product.sku}`,
      ip: clientIp(request),
    });

    revalidateCatalogue({ productSlug: product.slug });

    return ok({ product }, { status: 201 });
  });
}
