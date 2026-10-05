import { prisma } from "@/lib/prisma";
import { createSession, hashPassword } from "@/lib/auth";
import { registerSchema, fieldErrors } from "@/lib/validation";
import { clientIp, fail, guarded, ok, rateLimit, readJson } from "@/lib/api";

export async function POST(request: Request) {
  return guarded(async () => {
    // 5 registrations per hour per IP.
    const limit = rateLimit(`register:${clientIp(request)}`, 5, 60 * 60 * 1000);
    if (!limit.allowed) {
      return fail("Too many attempts. Please try again later.", 429);
    }

    const body = await readJson(request);
    if (!body) return fail("Invalid request body.");

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return fail("Please correct the highlighted fields.", 422, fieldErrors(parsed.error));
    }

    const { name, email, phone, password } = parsed.data;

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      return fail("An account with this email already exists.", 409, {
        email: "This email is already registered",
      });
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        passwordHash: await hashPassword(password),
      },
      select: { id: true, name: true, email: true, phone: true, role: true },
    });

    await createSession(user.id);

    return ok({ user }, { status: 201 });
  });
}