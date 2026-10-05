import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { nameSchema, phoneSchema, fieldErrors } from "@/lib/validation";
import { fail, guarded, ok, readJson } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const profileSchema = z.object({
  name: nameSchema,
  phone: phoneSchema.optional(),
});

/** PATCH /api/account/profile — update the signed-in user's own details. */
export async function PATCH(request: Request) {
  return guarded(async () => {
    const user = await getCurrentUser();
    if (!user) return fail("You must be signed in.", 401);

    const body = await readJson(request);
    const parsed = profileSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return fail("Please correct the highlighted fields.", 422, fieldErrors(parsed.error));
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone || null,
      },
    });

    return ok({ updated: true });
  });
}