import { prisma } from "@/lib/prisma";
import { consumeVerificationToken, hashPassword } from "@/lib/auth";
import { resetPasswordSchema, fieldErrors } from "@/lib/validation";
import { clientIp, fail, guarded, ok, rateLimit, readJson } from "@/lib/api";

export async function POST(request: Request) {
  return guarded(async () => {
    const limit = rateLimit(`reset:${clientIp(request)}`, 10, 60 * 60 * 1000);
    if (!limit.allowed) return fail("Too many attempts. Please try again later.", 429);

    const body = await readJson(request);
    if (!body) return fail("Invalid request body.");

    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return fail("Please correct the highlighted fields.", 422, fieldErrors(parsed.error));
    }

    const { token, password } = parsed.data;

    const tokenRecord = await prisma.verificationToken.findUnique({
      where: { token },
      select: { id: true, userId: true, purpose: true, usedAt: true, expiresAt: true },
    });

    if (!tokenRecord || tokenRecord.purpose !== "RESET_PASSWORD") {
      return fail("This reset link is invalid.", 400);
    }
    if (tokenRecord.usedAt) {
      return fail("This reset link has already been used. Request a new one.", 400);
    }
    if (tokenRecord.expiresAt < new Date()) {
      return fail("This reset link has expired. Request a new one.", 400);
    }

    // Consuming is a single atomic update, so a token cannot be replayed.
    const consumed = await consumeVerificationToken(token, "RESET_PASSWORD");
    if (consumed.count === 0) {
      return fail("This reset link has already been used.", 400);
    }

    await prisma.user.update({
      where: { id: tokenRecord.userId },
      data: { passwordHash: await hashPassword(password) },
    });

    // Changing a password invalidates every existing session.
    await prisma.session.deleteMany({ where: { userId: tokenRecord.userId } });

    return ok({ message: "Your password has been updated. Please sign in." });
  });
}