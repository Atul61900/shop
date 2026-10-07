/**
 * Structured payment logging for debugging.
 *
 * Every gateway interaction logs one line with the identifiers needed to trace
 * an order end to end. Secrets, passwords and tokens are NEVER accepted by
 * this module — it only takes whitelisted fields, so a key cannot slip into a
 * log by accident.
 */

type PaymentLogEvent =
  | "initiate"
  | "initiate_failed"
  | "redirect"
  | "return"
  | "verify"
  | "settled_paid"
  | "settled_failed"
  | "settled_pending"
  | "settled_cancelled"
  | "stock_released"
  | "config_missing";

export function logPayment(input: {
  event: PaymentLogEvent;
  orderId?: string;
  orderNumber?: string;
  paymentId?: string;
  gateway?: "ESEWA" | "KHALTI";
  env?: "test" | "live";
  txn?: string;
  expectedMinor?: number;
  actualMinor?: number;
  httpStatus?: number;
  error?: string;
}) {
  const parts = [`[payment:${input.event}]`];
  if (input.orderNumber) parts.push(`order=${input.orderNumber}`);
  if (input.orderId) parts.push(`orderId=${input.orderId}`);
  if (input.paymentId) parts.push(`payment=${input.paymentId}`);
  if (input.gateway) parts.push(`gateway=${input.gateway}`);
  if (input.env) parts.push(`env=${input.env}`);
  if (input.txn) parts.push(`txn=${input.txn}`);
  if (input.expectedMinor !== undefined) parts.push(`expected=${input.expectedMinor}`);
  if (input.actualMinor !== undefined) parts.push(`actual=${input.actualMinor}`);
  if (input.httpStatus !== undefined) parts.push(`http=${input.httpStatus}`);
  if (input.error) parts.push(`error=${input.error.slice(0, 200)}`);
  console.log(parts.join(" "));
}
