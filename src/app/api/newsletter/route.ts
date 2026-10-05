import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { newsletterSchema, fieldErrors } from "@/lib/validation";
import { clientIp, fail, guarded, ok, rateLimit, readJson } from "@/lib/api";

export async function POST(request: Request) {
  return guarded(async () => {
    const limit = rateLimit(`newsletter:${clientIp(request)}`, 5, 60 * 60 * 1000);
    if (!limit.allowed) {
      return fail("Too many attempts. Please try again later.", 429);
    }

    const body = await readJson<{ email?: unknown; source?: unknown }>(request);

    const parsed = newsletterSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return fail("Enter a valid email address.", 422, fieldErrors(parsed.error));
    }

    const email = parsed.data.email;
    const source = typeof body?.source === "string" ? body.source.slice(0, 40) : "footer";
    const user = await getCurrentUser();

    const existing = await prisma.subscriber.findUnique({
      where: { email },
      select: { id: true, isActive: true },
    });

    if (existing?.isActive) {
      // Idempotent — never tell a subscriber they "just" subscribed.
      return ok({ message: "You are already on the list." });
    }

    if (existing) {
      await prisma.subscriber.update({ where: { id: existing.id }, data: { isActive: true } });
    } else {
      await prisma.subscriber.create({
        data: { email, source, userId: user?.id ?? null },
      });
    }

    return ok({ message: "You are subscribed. Watch out for stock and service alerts." });
  });
}