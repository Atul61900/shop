import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";
import { redirect, notFound } from "next/navigation";
import bcrypt from "bcryptjs";
import type { Route } from "next";

import { prisma } from "./prisma";

const SESSION_COOKIE = "kmrc_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

// ---------------------------------------------------------------------------
// Password hashing
// ---------------------------------------------------------------------------

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

// ---------------------------------------------------------------------------
// Session lifecycle
// ---------------------------------------------------------------------------

function cookieOptions(expires: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  };
}

export async function createSession(userId: string) {
  const expires = new Date(Date.now() + SESSION_TTL_MS);

  const session = await prisma.session.create({
    data: { userId, token: crypto.randomUUID(), expiresAt: expires },
    select: { token: true },
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, session.token, cookieOptions(expires));

  return session.token;
}

/**
 * Resolves the current user from the session cookie.
 * Wrapped in React `cache` so layout + page + children share one query
 * within a single render pass.
 */
export const getCurrentUser = cache(async () => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  // Sessions and single-use tokens would otherwise accumulate forever —
  // there is no cron in this deployment, so each request rolls a small chance
  // to sweep expired rows. Fire-and-forget: cleanup must never slow a request.
  if (Math.random() < 0.02) {
    purgeExpiredSessions().catch(() => undefined);
  }

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          avatarUrl: true,
          role: true,
          emailVerified: true,
          createdAt: true,
        },
      },
    },
  });

  if (!session) return null;

  // Opportunistically clean up expired rows.
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session
      .delete({ where: { id: session.id } })
      .catch(() => undefined);
    return null;
  }

  return session.user;
});

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }
  store.delete(SESSION_COOKIE);
}

/** For pages that require a signed-in user. Redirects to login. */
export async function requireUser(returnTo?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    const next = returnTo ? `?next=${encodeURIComponent(returnTo)}` : "";
    redirect(`/login${next}` as Route);
  }
  return user;
}

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

/** The only role that may reach /admin or the admin API. */
export const ADMIN_ROLE = "ADMIN";

/** Narrow, shared check so pages and route handlers agree on who is an admin. */
export function isAdmin(user: { role: string } | null | undefined): boolean {
  return user?.role === ADMIN_ROLE;
}

/**
 * For pages behind the staff area.
 *
 * Anonymous visitors are sent to login so they can come back afterwards.
 * Signed-in non-admins get a 404 rather than a 403, so the existence of the
 * area is not confirmed to them.
 */
export async function requireAdmin(returnTo?: string): Promise<SessionUser> {
  const user = await requireUser(returnTo ?? "/admin");
  if (!isAdmin(user)) notFound();
  return user;
}

// ---------------------------------------------------------------------------
// Single-use tokens (password reset / email verification)
// ---------------------------------------------------------------------------

export async function issueVerificationToken(userId: string, purpose: string) {
  const token = crypto.randomUUID();
  await prisma.verificationToken.create({
    data: {
      token,
      purpose,
      userId,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60), // 1 hour
    },
  });
  return token;
}

/**
 * Atomically consumes a token — `usedAt` is set in the same statement that
 * matches, so a token can never be redeemed twice even under concurrency.
 */
export async function consumeVerificationToken(token: string, purpose: string) {
  return prisma.verificationToken.updateMany({
    where: { token, purpose, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
}

export async function purgeExpiredSessions() {
  await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await prisma.verificationToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}