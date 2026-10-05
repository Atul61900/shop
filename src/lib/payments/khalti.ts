/**
 * Khalti integration.
 *
 * Khalti's modern API is a two-step flow:
 *   1. POST /api/v2/ephemeral-key/init  -> returns a `token`
 *   2. POST https://web.khalti.com/api/payment/confirm with {token, amount, ...}
 *
 * The redirect URL handed to the browser is a legacy `checkout/test` link that
 * carries our own signed payload so the return trip can be reconciled without
 * trusting anything the browser sends back.
 *
 * Docs: https://docs.khalti.com
 */

import { createHmac } from "node:crypto";

const BASE = process.env.KHALTI_ENV === "production"
  ? "https://api.khalti.com"
  : "https://sandbox.khalti.com";

const WEB_BASE = process.env.KHALTI_ENV === "production"
  ? "https://web.khalti.com"
  : "https://web.khalti.com";

export function isKhaltiConfigured() {
  return Boolean(process.env.KHALTI_SECRET_KEY);
}

/**
 * Signs the return-trip payload. Without this we could not tell whether a
 * redirect claiming "payment succeeded" actually came from Khalti.
 */
export function signPayload(payload: string) {
  const secret = process.env.KHALTI_SECRET_KEY ?? "";
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifySignature(payload: string, signature: string) {
  if (!signature) return false;
  const expected = signPayload(payload);
  // Length-safe comparison to avoid leaking length via timing.
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

export function majorUnits(minorUnits: number) {
  return (minorUnits / 100).toFixed(2);
}

export type KhaltiInitResult =
  | { ok: true; token: string; redirectUrl: string }
  | { ok: false; error: string };

export async function createKhaltiPayment(params: {
  orderNumber: string;
  amountMinor: number;
  email: string;
  phone: string;
  returnUrl: string;
}): Promise<KhaltiInitResult> {
  const secret = process.env.KHALTI_SECRET_KEY;
  if (!secret) return { ok: false, error: "Khalti is not configured." };

  const { orderNumber, amountMinor, email, phone, returnUrl } = params;
  const amount = majorUnits(amountMinor);

  try {
    // 1. Initiate an ephemeral key
    const initRes = await fetch(`${BASE}/api/v2/ephemeral-key/init`, {
      method: "POST",
      headers: {
        Authorization: `Key ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        description: `KMRC order ${orderNumber}`,
        callback_url: returnUrl,
        email,
        phone,
      }),
      cache: "no-store",
    });

    if (!initRes.ok) {
      const detail = await initRes.text();
      throw new Error(`Ephemeral key failed (${initRes.status}): ${detail.slice(0, 200)}`);
    }

    const initJson = (await initRes.json()) as { token?: string };
    if (!initJson.token) throw new Error("No token in ephemeral key response");

    // 2. Build the signature over our own return payload
    const payload = `${orderNumber}|${amount}|${email}|${phone}`;
    const signature = signPayload(payload);

    const redirectUrl =
      `${WEB_BASE}/api/checkout/test` +
      `?token=${encodeURIComponent(initJson.token)}` +
      `&amount=${encodeURIComponent(amount)}` +
      `&callback_url=${encodeURIComponent(returnUrl)}` +
      `&payload=${encodeURIComponent(payload)}` +
      `&signature=${encodeURIComponent(signature)}`;

    return { ok: true, token: initJson.token, redirectUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Khalti error";
    console.error("[khalti] initialisation failed:", message);
    return { ok: false, error: "Unable to start Khalti payment. Please try again." };
  }
}

export type KhaltiVerifyResult =
  | { ok: true; token: string; amount: string; raw: Record<string, unknown> }
  | { ok: false; error: string };

/** Confirms a payment token against Khalti's lookup endpoint. */
export async function verifyKhaltiPayment(token: string): Promise<KhaltiVerifyResult> {
  const secret = process.env.KHALTI_SECRET_KEY;
  if (!secret) return { ok: false, error: "Khalti is not configured." };

  try {
    const res = await fetch(`${BASE}/api/v2/payment/verify`, {
      method: "POST",
      headers: {
        Authorization: `Key ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
      cache: "no-store",
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Verify failed (${res.status}): ${detail.slice(0, 200)}`);
    }

    const raw = (await res.json()) as Record<string, unknown>;
    const status = String(raw.status ?? "").toLowerCase();

    // Khalti reports Completed; treat anything else as not paid.
    if (status !== "completed" && status !== "success") {
      return { ok: false, error: `Payment not completed (status: ${status || "unknown"}).` };
    }

    return {
      ok: true,
      token: String(raw.token ?? token),
      amount: String(raw.amount ?? "0"),
      raw,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Khalti error";
    console.error("[khalti] verification failed:", message);
    return { ok: false, error: "Could not verify the Khalti payment." };
  }
}