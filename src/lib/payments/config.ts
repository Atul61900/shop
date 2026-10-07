import "server-only";

/**
 * Payment configuration: TEST/UAT first, LIVE only with real credentials.
 *
 * One switch selects the environment for the gateway:
 *
 *   PAYMENT_ENV=test   (default)  -> sandbox/UAT endpoints + test config
 *   PAYMENT_ENV=live              -> production endpoints + live config
 *
 * Credential names follow the official dashboards:
 *
 *   eSewa: product code + HMAC secret. The UAT pair is OFFICIAL and PUBLIC
 *   (published on developer.esewa.com.np), so TEST mode works with zero setup.
 *
 *   ESEWA_TEST_PRODUCT_CODE  default "EPAYTEST" (official UAT code)
 *   ESEWA_TEST_SECRET_KEY    default "8gBm/:&EnhH.1/q" (official UAT secret)
 *   ESEWA_LIVE_PRODUCT_CODE  your merchant code
 *   ESEWA_LIVE_SECRET_KEY    your production secret
 *
 * Nothing in this module is ever sent to React. Route handlers resolve the
 * active credentials and hand the browser only gateway-issued output
 * (redirect URLs, signed form fields) — never a secret.
 */

export type PaymentEnv = "test" | "live";

export function paymentEnv(): PaymentEnv {
  return process.env.PAYMENT_ENV === "live" ? "live" : "test";
}

export function isTestMode() {
  return paymentEnv() === "test";
}

/** Which gateway environments have everything they need to talk to the API. */
export type GatewayReadiness =
  | { ready: true }
  | { ready: false; missing: string[]; howToFix: string };

const ESEWA_UAT_PRODUCT_CODE = "EPAYTEST";
const ESEWA_UAT_SECRET_KEY = "8gBm/:&EnhH.1/q";

export function esewaConfig(): {
  env: PaymentEnv;
  formUrl: string;
  statusUrl: string;
  productCode: string;
  secretKey: string;
  readiness: GatewayReadiness;
} {
  const env = paymentEnv();

  if (env === "live") {
    const productCode = process.env.ESEWA_LIVE_PRODUCT_CODE?.trim() ?? "";
    const secretKey = process.env.ESEWA_LIVE_SECRET_KEY?.trim() ?? "";
    if (productCode && secretKey) {
      return {
        env,
        formUrl: "https://epay.esewa.com.np/api/epay/main/v2/form",
        statusUrl: "https://esewa.com.np/api/epay/transaction/status/",
        productCode,
        secretKey,
        readiness: { ready: true },
      };
    }
    return {
      env,
      formUrl: "",
      statusUrl: "",
      productCode,
      secretKey: "",
      readiness: {
        ready: false,
        missing: [
          ...(productCode ? [] : ["ESEWA_LIVE_PRODUCT_CODE"]),
          ...(secretKey ? [] : ["ESEWA_LIVE_SECRET_KEY"]),
        ],
        howToFix:
          "Become a merchant at https://merchant.esewa.com.np/auth/register-merchant and put the issued product code and secret in .env. Then restart the server.",
      },
    };
  }

  // UAT credentials are officially published, so TEST mode needs no setup.
  return {
    env,
    formUrl: "https://rc-epay.esewa.com.np/api/epay/main/v2/form",
    statusUrl: "https://rc.esewa.com.np/api/epay/transaction/status/",
    productCode: process.env.ESEWA_TEST_PRODUCT_CODE?.trim() || ESEWA_UAT_PRODUCT_CODE,
    secretKey: process.env.ESEWA_TEST_SECRET_KEY?.trim() || ESEWA_UAT_SECRET_KEY,
    readiness: { ready: true },
  };
}

/**
 * What React is allowed to know. No secrets, no keys, no codes — only the
 * environment (for the TEST MODE badge) and that each method is offered.
 */
export function publicPaymentConfig() {
  return {
    env: paymentEnv(),
    methods: { COD: true, ESEWA: true },
  } as const;
}