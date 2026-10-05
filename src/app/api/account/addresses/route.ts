import { z } from "zod";
import { addressSchema, fieldErrors } from "@/lib/validation";
import { getCurrentUser } from "@/lib/auth";
import { fail, guarded, ok, readJson } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const createAddressSchema = addressSchema.extend({
  label: z.string().trim().min(1).max(30).default("Home"),
  isDefault: z.boolean().optional(),
});

/** POST /api/account/addresses */
export async function POST(request: Request) {
  return guarded(async () => {
    const user = await getCurrentUser();
    if (!user) return fail("You must be signed in.", 401);

    const body = await readJson(request);
    const parsed = createAddressSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return fail("Please correct the highlighted fields.", 422, fieldErrors(parsed.error));
    }

    const data = parsed.data;

    // First address is always the default, regardless of the checkbox.
    const existingCount = await prisma.address.count({ where: { userId: user.id } });
    const makeDefault = data.isDefault || existingCount === 0;

    const address = await prisma.$transaction(async (tx) => {
      if (makeDefault) {
        // Only one default is allowed — clear the others first.
        await tx.address.updateMany({
          where: { userId: user.id, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.address.create({
        data: {
          userId: user.id,
          label: data.label,
          contactName: data.contactName,
          phone: data.phone,
          line1: data.line1,
          line2: data.line2 || null,
          city: data.city,
          province: data.province,
          postalCode: data.postalCode || null,
          landmark: data.landmark || null,
          isDefault: makeDefault,
        },
      });
    });

    return ok({ id: address.id, isDefault: address.isDefault }, { status: 201 });
  });
}

/** GET /api/account/addresses */
export async function GET() {
  return guarded(async () => {
    const user = await getCurrentUser();
    if (!user) return fail("You must be signed in.", 401);

    const addresses = await prisma.address.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    return ok({ addresses });
  });
}