import { prisma } from "@/lib/prisma";
import { serializeService } from "@/lib/services";
import { guarded, notFound, ok } from "@/lib/api";

export async function GET(request: Request) {
  return guarded(async () => {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const services = await prisma.service.findMany({
      where: { isActive: true, ...(category ? { slug: category } : {}) },
      orderBy: { sortOrder: "asc" },
    });

    if (category && services.length === 0) {
      return notFound("We do not offer that service.");
    }

    return ok({ services: services.map(serializeService) });
  });
}