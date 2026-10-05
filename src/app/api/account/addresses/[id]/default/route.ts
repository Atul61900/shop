import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, guarded, ok } from "@/lib/api";

/** POST /api/account/addresses/[id]/default */
export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/account/addresses/[id]/default">,
) {
  return guarded(async () => {
    const user = await getCurrentUser();
    if (!user) return fail("You must be signed in.", 401);

    const { id } = await ctx.params;

    const owned = await prisma.address.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });
    if (!owned) return fail("Address not found.", 404);

    await prisma.$transaction([
      prisma.address.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      }),
      prisma.address.update({ where: { id }, data: { isDefault: true } }),
    ]);

    return ok({ isDefault: true });
  });
}