import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, guarded, ok } from "@/lib/api";

/** DELETE /api/account/addresses/[id] */
export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/account/addresses/[id]">,
) {
  return guarded(async () => {
    const user = await getCurrentUser();
    if (!user) return fail("You must be signed in.", 401);

    const { id } = await ctx.params;

    // Scoping the delete by userId makes cross-account deletion impossible.
    const deleted = await prisma.address.deleteMany({
      where: { id, userId: user.id },
    });

    if (deleted.count === 0) return fail("Address not found.", 404);

    // If we removed the default, promote the most recent remaining address.
    const remainingDefault = await prisma.address.count({
      where: { userId: user.id, isDefault: true },
    });

    if (remainingDefault === 0) {
      const newest = await prisma.address.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (newest) {
        await prisma.address.update({
          where: { id: newest.id },
          data: { isDefault: true },
        });
      }
    }

    return ok({ deleted: true });
  });
}