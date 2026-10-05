import { prisma } from "@/lib/prisma";
import { serializeService } from "@/lib/services";
import { guarded, notFound, ok } from "@/lib/api";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/services/[slug]">,
) {
  return guarded(async () => {
    const { slug } = await ctx.params;

    const service = await prisma.service.findFirst({
      where: { slug, isActive: true },
    });

    if (!service) return notFound("We do not offer that service.");

    const others = await prisma.service.findMany({
      where: { isActive: true, id: { not: service.id } },
      orderBy: { sortOrder: "asc" },
      take: 5,
    });

    return ok({
      service: serializeService(service),
      related: others.map(serializeService),
    });
  });
}