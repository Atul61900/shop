import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword } from "@/lib/auth";
import { loginSchema, fieldErrors } from "@/lib/validation";
import { clientIp, fail, guarded, ok, rateLimit, readJson, resetRateLimit } from "@/lib/api";

export async function POST(request: Request) {
  return guarded(async () => {
    // 10 attempts per 15 minutes per IP.
    const limit = rateLimit(`login:${clientIp(request)}`, 10, 15 * 60 * 1000);
    if (!limit.allowed) {
      return fail("Too many login attempts. Please try again in a few minutes.", 429);
    }

    const body = await readJson(request);
    if (!body) return fail("Invalid request body.");

    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return fail("Enter your email and password.", 422, fieldErrors(parsed.error));
    }

    const { email, password } = parsed.data;

    // Per-account throttle. The per-IP limit above cannot see a distributed
    // attempt against one account, which is exactly the shape of an attack on
    // the staff login.
    const accountKey = `login-account:${email}`;
    const accountLimit = rateLimit(accountKey, 10, 15 * 60 * 1000);
    if (!accountLimit.allowed) {
      return fail(
        "Too many attempts for this account. Please try again in a few minutes.",
        429,
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        passwordHash: true,
      },
    });

    // Always run a comparison so the response time does not reveal whether
    // the email exists — prevents account enumeration via timing.
    const hash = user?.passwordHash ?? "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv";
    const valid = await verifyPassword(password, hash);

    if (!user || !valid) {
      return fail("Incorrect email or password.", 401);
    }

    // Legitimate sign-in: clear the account bucket.
    resetRateLimit(accountKey);

    await createSession(user.id);

    return ok({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  });
}