/**
 * Runs once when the server boots (dev + production).
 *
 * Fail-closed is wrong here — a missing optional key must not prevent the
 * shop from serving — so this logs loudly instead of throwing. Anything
 * printed here shows up in host logs on first deploy, which is exactly when
 * misconfiguration happens.
 */
export function register() {
  const problems: string[] = [];

  if (!process.env.DATABASE_URL) {
    problems.push("DATABASE_URL is unset — using the default local SQLite file.");
  }
  if (!process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL.includes("localhost")) {
    problems.push(
      "NEXT_PUBLIC_SITE_URL is missing or localhost — sitemap, metadata and payment return URLs will be wrong in production.",
    );
  }
  if (!process.env.SMTP_HOST) {
    problems.push("SMTP is unconfigured — password resets and order mail will only be logged, never sent.");
  }
  if (process.env.PAYMENT_ENV === "live") {
    if (!process.env.ESEWA_LIVE_SECRET_KEY || !process.env.ESEWA_LIVE_PRODUCT_CODE) {
      problems.push("PAYMENT_ENV=live but eSewa live credentials are missing — eSewa payments will fail.");
    }
  }
  if (process.env.ADMIN_PASSWORD) {
    problems.push("ADMIN_PASSWORD is set in the environment — prefer rotating it via prisma/set-admin.ts and unsetting the variable.");
  }

  for (const problem of problems) {
    console.warn(`[boot] ${problem}`);
  }

  if (problems.length === 0) {
    console.log("[boot] environment OK");
  }
}
