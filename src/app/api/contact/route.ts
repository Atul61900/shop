import { prisma } from "@/lib/prisma";
import { contactSchema, fieldErrors } from "@/lib/validation";
import { clientIp, fail, guarded, ok, rateLimit, readJson } from "@/lib/api";

export async function POST(request: Request) {
  return guarded(async () => {
    // 5 messages per hour per IP — enough for a real person, not a scraper.
    const limit = rateLimit(`contact:${clientIp(request)}`, 5, 60 * 60 * 1000);
    if (!limit.allowed) {
      return fail("Too many messages sent. Please call us instead.", 429);
    }

    const body = await readJson(request);
    if (!body) return fail("Invalid request body.");

    // Honeypot: real people never fill a hidden field.
    if (typeof body === "object" && body !== null && "company" in body) {
      const honeypot = (body as { company?: unknown }).company;
      if (typeof honeypot === "string" && honeypot.length > 0) {
        // Silently accept so bots do not learn they were caught.
        return ok({ message: "Thanks — we will reply shortly." });
      }
    }

    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      return fail("Please correct the highlighted fields.", 422, fieldErrors(parsed.error));
    }

    const { name, email, phone, subject, message } = parsed.data;

    await prisma.contactMessage.create({
      data: {
        name,
        email,
        phone: phone || null,
        subject,
        message,
      },
    });

    return ok(
      {
        message: "Thanks — we have your message and will reply within one working day.",
      },
      { status: 201 },
    );
  });
}