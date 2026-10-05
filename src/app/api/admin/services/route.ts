import { getCurrentUser, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAdminAction } from "@/lib/audit";
import { revalidateCatalogue } from "@/lib/revalidate";
import { adminServiceSchema, fieldErrors } from "@/lib/validation";
import { clientIp, fail, guarded, ok, rateLimit, readJson } from "@/lib/api";

/** POST /api/admin/services — creates a service in the repair matrix. */
export async function POST(request: Request) {
  return guarded(async () => {
    const user = await getCurrentUser();
    if (!user) return fail("You must be signed in.", 401);
    if (!isAdmin(user)) return fail("Administrator access required.", 403);

    // Shares the catalogue-write budget with product creation.
    const budget = rateLimit(`admin-write:${user.id}`, 30, 60 * 60 * 1000);
    if (!budget.allowed) {
      return fail("Too many catalogue changes. Please try again later.", 429);
    }

    const body = await readJson(request);
    const parsed = adminServiceSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return fail("Please correct the highlighted fields.", 422, fieldErrors(parsed.error));
    }
    const data = parsed.data;

    const clash = await prisma.service.findUnique({
      where: { slug: data.slug },
      select: { slug: true },
    });
    if (clash) {
      return fail("Please correct the highlighted fields.", 422, {
        slug: "That URL is already taken",
      });
    }

    // New services land after the current ones unless a slot is given.
    const last = await prisma.service.findFirst({
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const service = await prisma.service.create({
      data: {
        slug: data.slug,
        name: data.name,
        eyebrow: data.eyebrow,
        summary: data.summary,
        description: data.description,
        basePrice: data.basePrice,
        // Repair time is no longer surfaced anywhere in the UI, so it is a
        // fixed internal value rather than something an admin has to fill in.
        turnaroundMinutes: 60,
        image: data.image,
        features: JSON.stringify(data.features),
        sortOrder: data.sortOrder ?? (last?.sortOrder ?? 0) + 1,
        isActive: data.isActive ?? true,
        warrantyDays: data.warrantyDays,
      },
      select: { id: true, slug: true, name: true },
    });

    await recordAdminAction({
      actor: user.email,
      action: "SERVICE_CREATED",
      target: service.slug,
      detail: service.name,
      ip: clientIp(request),
    });

    revalidateCatalogue({ serviceSlug: service.slug });

    return ok({ service }, { status: 201 });
  });
}
