import "server-only";

/**
 * eSewa ePay v2 — per https://developer.esewa.com.np/pages/Epay.
 *
 * Flow:
 *
 *   1. The merchant SERVER builds the form fields and an HMAC-SHA256 signature
 *      (Base64) over `total_amount,transaction_uuid,product_code`, in that
 *      order. React only POSTs the finished fields — it never sees the secret.
 *   2. The browser POSTs the form to the UAT/live form URL. The customer logs
 *      in and confirms.
 *   3. eSewa GETs `success_url` with a Base64 `data` payload (transaction_code,
 *      status, total_amount, transaction_uuid, product_code, signed_field_names,
 *      signature) — or `failure_url` on failure/cancel.
 *   4. The merchant MUST verify: decode, recompute the signature over the
 *      response's own `signed_field_names`, compare amounts, then confirm with
 *      the status-check API.
 *
 * UAT (official, public): product_code EPAYTEST, secret 8gBm/:&EnhH.1/q,
 * form https://rc-epay.esewa.com.np/api/epay/main/v2/form, status check at
 * https://rc.esewa.com.np/api/epay/transaction/status/. Official test
 * customers: eSewa IDs 9711111111/2/3, password Test@123, MPIN 1122, token
 * 123456. Session expires after 5 idle minutes.
 *
 * Production: form https://epay.esewa.com.np/api/epay/main/v2/form, status
 * https://esewa.com.np/api/epay/transaction/status/.
 */

import { createHmac } from "node:crypto";

import { esewaConfig } from "@/lib/payments/config";
import { logPayment } from "@/lib/payments/log";
import { toEsewaDecimal, fromEsewaDecimal } from "@/lib/payments/money";

export const ESEWA_SIGNED_FIELDS = "total_amount,transaction_uuid,product_code" as const;

/**
 * HMAC-SHA256 over the signed fields, Base64-encoded.
 *
 * The message is `key=value` pairs in field order, e.g.
 * `total_amount=110,transaction_uuid=241028,product_code=EPAYTEST` — NOT bare
 * values. Verified against the official test vector (key 8gBm/:&EnhH.1/q
 * yields i94zsd3oXF6ZsSr/kGqT4sSzYQzjj1W/waxjWyRwaME=). Signing bare values
 * is exactly what eSewa rejects with ES104.
 *
 * The same function signs requests and verifies responses, so the two can
 * never drift apart. Callers must sign the EXACT strings they send: format
 * the amount once and reuse it for both the field and the signature.
 */
export function signEsewaFields(
  values: Record<string, string>,
  fieldNames: string,
  secretKey: string,
): string {
  const message = fieldNames
    .split(",")
    .map((name) => `${name.trim()}=${values[name.trim()] ?? ""}`)
    .join(",");
  return createHmac("sha256", secretKey).update(message, "utf8").digest("base64");
}

export type EsewaFormResult =
  | { ok: true; formUrl: string; fields: Record<string, string> }
  | { ok: false; error: string; code?: "config-missing" };

export function buildEsewaForm(params: {
  orderNumber: string;
  txnUuid: string;
  amountMinor: number;
  shippingMinor: number;
  successUrl: string;
  failureUrl: string;
}): EsewaFormResult {
  const cfg = esewaConfig();

  if (!cfg.secretKey || !cfg.productCode || cfg.readiness.ready === false) {
    logPayment({
      event: "config_missing",
      gateway: "ESEWA",
      env: cfg.env,
      orderNumber: params.orderNumber,
      error: "missing product code or secret",
    });
    // In practice unreachable in TEST (official UAT creds are defaulted), but
    // the branch exists so a LIVE deploy without keys fails loudly.
    return {
      ok: false,
      error: cfg.readiness.ready === false ? cfg.readiness.howToFix : "eSewa is not configured.",
      code: "config-missing",
    };
  }

  const amount = toEsewaDecimal(params.amountMinor - params.shippingMinor);
  const delivery = toEsewaDecimal(params.shippingMinor);
  const total = toEsewaDecimal(params.amountMinor);

  const fields: Record<string, string> = {
    amount,
    tax_amount: "0",
    total_amount: total,
    transaction_uuid: params.txnUuid,
    product_code: cfg.productCode,
    product_service_charge: "0",
    product_delivery_charge: delivery,
    success_url: params.successUrl,
    failure_url: params.failureUrl,
    signed_field_names: ESEWA_SIGNED_FIELDS,
  };
  fields.signature = signEsewaFields(fields, ESEWA_SIGNED_FIELDS, cfg.secretKey);

  logPayment({
    event: "initiate",
    gateway: "ESEWA",
    env: cfg.env,
    orderNumber: params.orderNumber,
    txn: params.txnUuid,
    expectedMinor: params.amountMinor,
  });

  return { ok: true, formUrl: cfg.formUrl, fields };
}

export type EsewaResponseResult =
  | {
      ok: true;
      transactionCode: string;
      status: string;
      totalMinor: number;
      txnUuid: string;
      productCode: string;
      signatureValid: boolean;
      raw: Record<string, unknown>;
    }
  | { ok: false; error: string };

/**
 * Decodes the Base64 `data` eSewa appends to `success_url` and recomputes the
 * signature over the response's own `signed_field_names`. A forged or mangled
 * response is rejected here, before any status check or database write.
 */
export function decodeEsewaResponse(encoded: string): EsewaResponseResult {
  const cfg = esewaConfig();

  let raw: Record<string, unknown>;
  try {
    const json = Buffer.from(encoded, "base64").toString("utf8");
    const parsed: unknown = JSON.parse(json);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("not an object");
    }
    raw = parsed as Record<string, unknown>;
  } catch {
    return { ok: false, error: "The payment response could not be read." };
  }

  const get = (key: string) => (typeof raw[key] === "string" ? (raw[key] as string) : "");
  const signedFieldNames = get("signed_field_names");
  if (!signedFieldNames) {
    return { ok: false, error: "The payment response is missing its signature." };
  }

  const values: Record<string, string> = {};
  for (const name of signedFieldNames.split(",")) {
    const key = name.trim();
    values[key] = get(key);
  }
  const expected = signEsewaFields(values, signedFieldNames, cfg.secretKey);
  const signatureValid = expected.length === get("signature").length && timingSafeEqual(expected, get("signature"));
  if (!signatureValid) {
    logPayment({ event: "verify", gateway: "ESEWA", env: cfg.env, error: "response signature mismatch" });
    return { ok: false, error: "The payment response failed integrity checking." };
  }

  const totalMinor = fromEsewaDecimal(raw.total_amount);
  if (totalMinor === null) {
    return { ok: false, error: "The payment response has an unreadable amount." };
  }

  return {
    ok: true,
    transactionCode: get("transaction_code"),
    status: get("status"),
    totalMinor,
    txnUuid: get("transaction_uuid"),
    productCode: get("product_code"),
    signatureValid: true,
    raw,
  };
}

/** Length-safe string comparison for HMAC digests. */
function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export type EsewaStatus = "COMPLETE" | "PENDING" | "FULL_REFUND" | "PARTIAL_REFUND" | "AMBIGUOUS" | "NOT_FOUND" | "CANCELED" | "UNKNOWN";

/**
 * Status-check API: authoritative when the redirect never arrived, disagrees,
 * or needs confirmation. COMPLETE means paid; PENDING/AMBIGUOUS mean hold;
 * everything else is terminal-not-paid.
 */
export async function checkEsewaStatus(params: {
  productCode: string;
  totalMinor: number;
  txnUuid: string;
}): Promise<{ ok: true; status: EsewaStatus; refId: string | null; raw: Record<string, unknown> } | { ok: false; error: string }> {
  const cfg = esewaConfig();

  const url =
    `${cfg.statusUrl}?product_code=${encodeURIComponent(params.productCode)}` +
    `&total_amount=${encodeURIComponent(toEsewaDecimal(params.totalMinor))}` +
    `&transaction_uuid=${encodeURIComponent(params.txnUuid)}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const detail = await res.text();
      logPayment({ event: "verify", gateway: "ESEWA", env: cfg.env, txn: params.txnUuid, httpStatus: res.status, error: detail.slice(0, 200) });
      return { ok: false, error: "eSewa could not confirm the transaction right now." };
    }

    const raw = (await res.json()) as Record<string, unknown>;
    const status = String(raw.status ?? "UNKNOWN") as EsewaStatus;
    const refId = typeof raw.ref_id === "string" ? raw.ref_id : null;

    logPayment({ event: "verify", gateway: "ESEWA", env: cfg.env, txn: params.txnUuid, actualMinor: params.totalMinor, error: `status=${status}` });

    return { ok: true, status, refId, raw };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown eSewa error";
    logPayment({ event: "verify", gateway: "ESEWA", env: cfg.env, txn: params.txnUuid, error: message });
    return { ok: false, error: "eSewa could not confirm the transaction right now." };
  }
}
