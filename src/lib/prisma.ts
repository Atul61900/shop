import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Prisma 7 requires an explicit driver adapter.
 *
 * The adapter is chosen from `DATABASE_URL` so the same code runs on SQLite
 * locally and Postgres in production:
 *
 *   SQLite   -> @prisma/adapter-better-sqlite3   (file:./dev.db)
 *   Postgres -> @prisma/adapter-pg              (postgresql://...)
 *
 * `provider` in prisma/schema.prisma must match.
 */

function createClient() {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";

  const adapter = url.startsWith("postgres")
    ? new PrismaPg({ connectionString: url })
    : new PrismaBetterSqlite3({ url });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

/**
 * Reuse one client across hot reloads in development, otherwise every reload
 * opens a fresh connection and SQLite eventually locks.
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createClient>;
};

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}