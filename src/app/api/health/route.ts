import { prisma } from "@/lib/prisma";
import { guarded, ok } from "@/lib/api";

/**
 * GET /api/health — liveness probe for hosts and uptime monitors.
 *
 * Checks the database is reachable and reports which optional systems are
 * configured. Never includes secret values — only booleans.
 */
export async function GET() {
  return guarded(async () => {
    let database: "up" | "down" = "down";
    try {
      await prisma.$queryRaw`SELECT 1`;
      database = "up";
    } catch {
      database = "down";
    }

    const body = {
      status: database === "up" ? "ok" : "degraded",
      database,
      env: {
        siteUrl: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
        smtp: Boolean(process.env.SMTP_HOST),
        payments: process.env.PAYMENT_ENV === "live" ? "live" : "test",
        esewaLive: Boolean(process.env.ESEWA_LIVE_SECRET_KEY),
      },
      now: new Date().toISOString(),
    };

    return ok(body, { status: database === "up" ? 200 : 503 });
  });
}
