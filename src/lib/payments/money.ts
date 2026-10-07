/**
 * Money helpers. Everything is stored in integer minor units (paisa); gateways
 * speak their own dialects, so every conversion lives here and nowhere else.
 */

/** Convert to integer minor units (paisa) — our native unit. */
export function toPaisa(minorUnits: number) {
  return Math.round(minorUnits);
}

/**
 * eSewa ePay v2 expects major units (rupees) as a decimal string, e.g. 110 or
 * 110.50. The SAME string is posted and signed, so compute once per payment.
 */
export function toEsewaDecimal(minorUnits: number) {
  const major = minorUnits / 100;
  return Number.isInteger(major) ? String(major) : major.toFixed(2);
}

/** Parse an eSewa decimal response value back into our minor units. */
export function fromEsewaDecimal(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

/** Parse an integer paisa value back into minor units. */
export function fromPaisa(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) return null;
  return n;
}
