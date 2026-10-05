import { prisma } from "@/lib/prisma";
import { issueVerificationToken } from "@/lib/auth";
import { forgotPasswordSchema, fieldErrors } from "@/lib/validation";
import { sendPasswordResetEmail } from "@/lib/mail";
import { clientIp, fail, guarded, ok, rateLimit, readJson } from "@/lib/api";

export async function POST(request: Request) {
  return guarded(async () => {
    // 3 requests per hour per IP.
    const limit = rateLimit(`forgot:${clientIp(request)}`, 3, 60 * 60 * 1000);
    if (!limit.allowed) {
      return fail("Too many requests. Please try again later.", 429);
    }

    const body = await readJson(request);
    if (!body) return fail("Invalid request body.");

    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return fail("Enter a valid email address.", 422, fieldErrors(parsed.error));
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true, name: true, email: true },
    });

    // Always respond identically so this endpoint cannot be used to discover
    // which email addresses have accounts.
    if (user) {
      const token = await issueVerificationToken(user.id, "RESET_PASSWORD");
      await sendPasswordResetEmail({ to: user.email, name: user.name, token });
    }

    return ok({
      message: "If that email is registered, a reset link is on its way.",
    });
  });
}