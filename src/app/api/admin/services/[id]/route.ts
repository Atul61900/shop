import { getCurrentUser, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteImage } from "@/lib/uploads";
import { recordAdminAction } from "@/lib/audit";
import { revalidateCatalogue } from "@/lib/revalidate";
import { adminServiceSchema, fieldErrors } from "@/lib/validation";
import { clientIp, fail, guarded, ok, rateLimit } from "@/lib/api";

/** PATCH /api/admin/services/[id] — update an existing service. */
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
    const existing = await prisma.service.findUnique({
      where: { id },
      select: { id: true, slug: true, image: true },
    });
    if (!existing) return fail("Service not found.", 404);

    const body = await request.json().catch(() => null);
    const parsed = adminServiceSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return fail("Please correct the highlighted fields.", 422, fieldErrors(parsed.error));
    }
    const data = parsed.data;

    const clash = await prisma.service.findFirst({
      where: { id: { not: id }, slug: data.slug },
      select: { slug: true },
    });
    if (clash) {
      return fail("Please correct the highlighted fields.", 422, {
        slug: "That URL is already taken",
      });
    }

    const service = await prisma.service.update({
      where: { id },
      data: {
        slug: data.slug,
        name: data.name,
        eyebrow: data.eyebrow,
        summary: data.summary,
        description: data.description,
        basePrice: data.basePrice,
        image: data.image,
        features: JSON.stringify(data.features),
        isActive: data.isActive ?? true,
        warrantyDays: data.warrantyDays,
      },
      select: { id: true, slug: true, name: true },
    });

    if (existing.image && existing.image !== data.image) {
      await deleteImage(existing.image, "services");
    }

    await recordAdminAction({
      actor: user.email,
      action: "SERVICE_UPDATED",
      target: service.slug,
      detail: `${service.name}${service.slug !== existing.slug ? ` (was ${existing.slug})` : ""}`,
      ip: clientIp(request),
    });

    // Both slugs, because a rename leaves the old detail page cached.
    revalidateCatalogue({ serviceSlug: service.slug });
    revalidateCatalogue({ serviceSlug: existing.slug });

    return ok({ service });
  });
}

/** DELETE /api/admin/services/[id] — removes a service and its uploaded image. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return guarded(async () => {
    const user = await getCurrentUser();
    if (!user) return fail("You must be signed in.", 401);
    if (!isAdmin(user)) return fail("Administrator access required.", 403);

    const { id } = await params;

    const service = await prisma.service.findUnique({
      where: { id },
      select: { id: true, slug: true, image: true },
    });
    if (!service) return fail("Service not found.", 404);

    await prisma.service.delete({ where: { id } });
    await deleteImage(service.image, "services");

    await recordAdminAction({
      actor: user.email,
      action: "SERVICE_DELETED",
      target: service.id,
      ip: clientIp(request),
    });

    // Drop the detail page as well as the listings that linked to it.
    revalidateCatalogue({ serviceSlug: service.slug });

    return ok({ deleted: service.id });
  });
}
