/**
 * eSewa integration.
 *
 * eSewa exposes two very different eras of API. The modern REST API requires a
 * merchant account and OAuth client credentials; the older form-post checkout
 * only needs a merchant code. We support both and auto-detect which one is
 * configured so the checkout page can offer eSewa the moment keys are added.
 *
 * Docs: https://developer.esewa.com.np
 */

const SANDBOX = process.env.ESEWA_ENV !== "production";

const BASE = SANDBOX
  ? "https://uat.esewa.com.np"
  : "https://payment.esewa.com.np";

/** Major units — eSewa expects rupees, not paisa. */
function toMajor(minorUnits: number) {
  return (minorUnits / 100).toFixed(2);
}

export function isEsewaConfigured() {
  return Boolean(process.env.ESEWA_MERCHANT_ID && process.env.ESEWA_SECRET_KEY);
}

export type EsewaInitResult =
  | { ok: true; mode: "rest"; redirectUrl: string }
  | { ok: true; mode: "form"; formUrl: string; fields: Record<string, string> }
  | { ok: false; error: string };

/**
 * Starts an eSewa payment.
 *
 * REST mode returns a redirect URL to send the customer to.
 * Form mode (legacy) returns fields the browser must POST — used as a
 * graceful fallback when only a merchant code is configured.
 */
export async function createEsewaPayment(params: {
  orderNumber: string;
  amountMinor: number;
  email: string;
  phone: string;
  successUrl: string;
  failureUrl: string;
  callbackUrl: string;
}): Promise<EsewaInitResult> {
  const { orderNumber, amountMinor, successUrl, failureUrl, callbackUrl } = params;
  const amount = toMajor(amountMinor);

  const merchantId = process.env.ESEWA_MERCHANT_ID;
  const secretKey = process.env.ESEWA_SECRET_KEY;

  if (merchantId && secretKey) {
    try {
      // 1. Obtain an access token
      const basic = Buffer.from(`${merchantId}:${secretKey}`).toString("base64");
      const tokenRes = await fetch(`${BASE}/api/v1/token`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${basic}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: merchantId, password: secretKey }),
        cache: "no-store",
      });

      if (!tokenRes.ok) {
        throw new Error(`Token endpoint returned ${tokenRes.status}`);
      }

      const tokenJson = (await tokenRes.json()) as { access_token?: string };
      const accessToken = tokenJson.access_token;
      if (!accessToken) throw new Error("No access_token in response");

      // 2. Create the payment
      const payRes = await fetch(`${BASE}/api/v1/merchant-transaction`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          currency: "NPR",
          callbackUrl,
          clientId: merchantId,
          merchantId,
          merchantAux: orderNumber,
          profileId: process.env.ESEWA_PROFILE_ID ?? "kmrc-web",
          successUrl,
          failureUrl,
          signedFieldNames: "amount,currency,callbackUrl,merchantAux,profileId,transactionUuid",
          signedData: `${amount},NPR,${callbackUrl},${orderNumber},${
            process.env.ESEWA_PROFILE_ID ?? "kmrc-web"
          },${orderNumber}`,
          transactionUuid: orderNumber,
          successRedirectUrl: successUrl,
          failureRedirectUrl: failureUrl,
        }),
        cache: "no-store",
      });

      if (!payRes.ok) {
        const detail = await payRes.text();
        throw new Error(`Payment init failed (${payRes.status}): ${detail.slice(0, 200)}`);
      }

      const payJson = (await payRes.json()) as { url?: string };
      if (!payJson.url) throw new Error("No redirect url in payment response");

      return { ok: true, mode: "rest", redirectUrl: payJson.url };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown eSewa error";
      // Surface the real reason to logs, never to the customer.
      console.error("[esewa] initialisation failed:", message);
      return { ok: false, error: "Unable to start eSewa payment. Please try again." };
    }
  }

  // Legacy form-post fallback
  const legacyCode = process.env.ESEWA_MERCHANT_CODE ?? process.env.ESEWA_MERCHANT_ID;
  if (legacyCode) {
    return {
      ok: true,
      mode: "form",
      formUrl: `${SANDBOX ? "https://uat.esewa.com.np" : "https://www.esewa.com.np"}/nepal/esewa-process`,
      fields: {
        esewa_merchant_code: legacyCode,
        esewa_transaction_uuid: orderNumber,
        esewa_amount: amount,
        esewa_currency: "NPR",
        esewa_callback: callbackUrl,
        esewa_success_callback: successUrl,
        esewa_failure_callback: failureUrl,
        successUrl,
        failureUrl,
        signedFieldNames: "currency,amount,transaction_uuid",
        signedData: `NPR,${amount},${orderNumber}`,
      },
    };
  }

  return { ok: false, error: "eSewa is not configured." };
}

export type EsewaVerifyResult =
  | { ok: true; transactionCode: string; raw: Record<string, unknown> }
  | { ok: false; error: string };

/** Verifies a completed payment against eSewa's status endpoint. */
export async function verifyEsewaPayment(
  orderNumber: string,
  amountMinor: number,
): Promise<EsewaVerifyResult> {
  const merchantId = process.env.ESEWA_MERCHANT_ID;
  const secretKey = process.env.ESEWA_SECRET_KEY;
  if (!merchantId || !secretKey) {
    return { ok: false, error: "eSewa is not configured." };
  }

  try {
    const basic = Buffer.from(`${merchantId}:${secretKey}`).toString("base64");
    const tokenRes = await fetch(`${BASE}/api/v1/token`, {
      method: "POST",
      headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/json" },
      body: JSON.stringify({ username: merchantId, password: secretKey }),
      cache: "no-store",
    });
    if (!tokenRes.ok) throw new Error(`Token failed: ${tokenRes.status}`);

    const { access_token: accessToken } = (await tokenRes.json()) as {
      access_token?: string;
    };
    if (!accessToken) throw new Error("No access token");

    const statusRes = await fetch(
      `${BASE}/api/v1/transaction-status/${orderNumber}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      },
    );
    if (!statusRes.ok) throw new Error(`Status failed: ${statusRes.status}`);

    const raw = (await statusRes.json()) as Record<string, unknown>;
    const status = String(raw.status ?? "").toUpperCase();
    const confirmed = Number(raw.amount ?? 0) === Number(toMajor(amountMinor));

    if (status !== "COMPLETE") {
      return { ok: false, error: `Payment not completed (status: ${status || "unknown"}).` };
    }
    if (!confirmed) {
      return { ok: false, error: "Payment amount does not match the order." };
    }

    return { ok: true, transactionCode: String(raw.transaction_code ?? orderNumber), raw };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown eSewa error";
    console.error("[esewa] verification failed:", message);
    return { ok: false, error: "Could not verify the eSewa payment." };
  }
}