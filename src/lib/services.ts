/** Serialises a Service row into the shape the client consumes. */

export type SerializedService = ReturnType<typeof serializeService>;

function parseArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function serializeService<T extends {
  slug: string;
  name: string;
  eyebrow: string;
  summary: string;
  description: string;
  basePrice: number;
  turnaroundMinutes: number;
  image: string | null;
  features: string;
  deviceSupport: string;
  symptoms: string;
  icon: string;
  warrantyDays: number;
}>(s: T) {
  return {
    slug: s.slug,
    name: s.name,
    eyebrow: s.eyebrow,
    summary: s.summary,
    description: s.description,
    basePrice: s.basePrice,
    turnaroundMinutes: s.turnaroundMinutes,
    image: s.image,
    icon: s.icon,
    warrantyDays: s.warrantyDays,
    features: parseArray(s.features),
    deviceSupport: parseArray(s.deviceSupport),
    symptoms: parseArray(s.symptoms),
  };
}