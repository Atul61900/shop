import { NextResponse } from "next/server";

/**
 * Consistent JSON envelope + helpers so every route handler fails the same way.
 */

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(message: string, status = 400, fields?: Record<string, string>) {
  return NextResponse.json({ ok: false, error: message, fields }, { status });
}

export function unauthorized(message = "You must be signed in.") {
  return fail(message, 401);
}

export function notFound(message = "Not found.") {
  return fail(message, 404);
}

/** Wraps a handler so an unexpected throw never leaks a stack trace. */
export async function guarded(fn: () => Promise<Response>) {
  try {
    return await fn();
  } catch (err) {
    console.error("[api] unhandled error:", err);
    return fail("Something went wrong on our end. Please try again.", 500);
  }
}

/**
 * Naive per-process fixed-window rate limiter.
 * Sufficient for a single-instance deployment; swap for Redis/Upstash when
 * you run more than one instance.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }
  return { allowed: true, remaining: limit - bucket.count };
}

/**
 * Clears a bucket after a legitimate success, so a customer who mistyped twice
 * does not stay one attempt away from being locked out.
 */
export function resetRateLimit(key: string) {
  buckets.delete(key);
}

/** Best-effort client IP for rate limiting. */
export function clientIp(request: Request) {
  const headers = request.headers;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}

/** Parses a JSON body without throwing on malformed input. */
export async function readJson<T = unknown>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}