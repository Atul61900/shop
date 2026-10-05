import { z } from "zod";

/** A cart line as it travels between the browser and the server. */
export const cartLineSchema = z.object({
  productId: z.string().min(1),
  // Generous ceiling — the pricing engine clamps to 99 and flags any
  // stock shortfall explicitly, so over-quantity lines are corrected,
  // never silently dropped.
  quantity: z.number().int().min(1).max(999),
});

/** quantity 0 is allowed here — it means "remove this line". */
export const cartLineUpdateSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(0).max(99),
});

export const guestCartSchema = z.object({
  lines: z.array(cartLineSchema).max(50),
});

export const couponCodeSchema = z
  .string()
  .trim()
  .max(40)
  .transform((s) => s.toUpperCase());

/**
 * Validates an untrusted array of cart lines coming from the browser.
 * Returns only well-formed entries; anything else is discarded rather than
 * rejected outright so one bad item cannot empty a real cart.
 */
export function parseCartLines(value: unknown): z.infer<typeof cartLineSchema>[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const out: z.infer<typeof cartLineSchema>[] = [];

  for (const raw of value.slice(0, 50)) {
    const parsed = cartLineSchema.safeParse(raw);
    if (!parsed.success) continue;
    // Collapse duplicate product ids into a single clamped line.
    if (seen.has(parsed.data.productId)) {
      const existing = out.find((l) => l.productId === parsed.data.productId)!;
      existing.quantity = Math.min(99, existing.quantity + parsed.data.quantity);
      continue;
    }
    seen.add(parsed.data.productId);
    out.push(parsed.data);
  }

  return out;
}