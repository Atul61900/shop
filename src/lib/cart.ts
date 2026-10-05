import { prisma } from "./prisma";
import { siteConfig } from "./config";
import { applyDiscount } from "./utils";

/**
 * Cart pricing is ALWAYS recomputed from the database.
 *
 * The browser only ever sends product ids and quantities. Prices, names and
 * totals are read here, so a tampered client cannot influence what is charged.
 */

export type PricedLine = {
  productId: string;
  slug: string;
  name: string;
  sku: string;
  image: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  compareAtPrice: number | null;
  stock: number;
  /** Requested quantity exceeds what we can actually fulfil. */
  stockShortfall: number;
  isAvailable: boolean;
  isActive: boolean;
};

export type PricedCart = {
  lines: PricedLine[];
  itemCount: number;
  subtotal: number;
  savings: number;
  shippingFee: number;
  discount: number;
  total: number;
  freeShippingThreshold: number;
  amountToFreeShipping: number;
  couponCode: string | null;
  couponError: string | null;
};

export type RawCartLine = { productId: string; quantity: number };

/** Parses the JSON-encoded columns used on Product. */
export function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parseJsonObject(value: string | null | undefined): Record<string, string> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/** Serialises a Product row into the shape the client consumes. */
export function serializeProduct<
  T extends {
    id: string;
    slug: string;
    sku: string;
    name: string;
    summary: string;
    description: string;
    price: number;
    compareAtPrice: number | null;
    stock: number;
    lowStockAt: number;
    brand: string;
    images: string;
    specs: string;
    tags: string;
    warrantyMonths: number;
    condition: string;
    rating: number;
    reviewCount: number;
    isFeatured: boolean;
    isNew: boolean;
    createdAt: Date;
    category?: { slug: string; name: string } | null;
  },
>(product: T) {
  const images = parseJsonArray(product.images);
  return {
    id: product.id,
    slug: product.slug,
    sku: product.sku,
    name: product.name,
    summary: product.summary,
    description: product.description,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    discountPercent:
      product.compareAtPrice && product.compareAtPrice > product.price
        ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
        : 0,
    stock: product.stock,
    inStock: product.stock > 0,
    isLowStock: product.stock > 0 && product.stock <= product.lowStockAt,
    brand: product.brand,
    image: images[0] ?? null,
    images,
    specs: parseJsonObject(product.specs),
    tags: parseJsonArray(product.tags),
    warrantyMonths: product.warrantyMonths,
    condition: product.condition,
    rating: product.rating,
    reviewCount: product.reviewCount,
    isFeatured: product.isFeatured,
    isNew: product.isNew,
    category: product.category ?? null,
    createdAt: product.createdAt.toISOString(),
  };
}

export type SerializedProduct = ReturnType<typeof serializeProduct>;

async function resolveCoupon(code: string | null | undefined) {
  if (!code) return { coupon: null, error: null as string | null };

  const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });

  if (!coupon || !coupon.isActive) {
    return { coupon: null, error: "That promo code is not valid." };
  }
  if (coupon.startsAt > new Date()) {
    return { coupon: null, error: "That promo code is not active yet." };
  }
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return { coupon: null, error: "That promo code has expired." };
  }
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    return { coupon: null, error: "That promo code has reached its usage limit." };
  }
  return { coupon, error: null };
}

/**
 * Prices a set of requested lines.
 * Lines whose product no longer exists are dropped; lines that are out of
 * stock or over stock are flagged rather than silently adjusted, so the UI can
 * explain what changed.
 */
export async function priceCart(
  rawLines: RawCartLine[],
  opts: { couponCode?: string | null; insideRingRoad?: boolean } = {},
): Promise<PricedCart> {
  const { couponCode, insideRingRoad = false } = opts;

  const productIds = [...new Set(rawLines.map((l) => l.productId))];

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      slug: true,
      name: true,
      sku: true,
      images: true,
      price: true,
      compareAtPrice: true,
      stock: true,
      isActive: true,
    },
  });

  const productById = new Map(products.map((p) => [p.id, p]));

  const lines: PricedLine[] = [];

  for (const raw of rawLines) {
    const product = productById.get(raw.productId);
    if (!product) continue; // product was deleted — drop the line

    const quantity = Math.max(1, Math.min(raw.quantity, 99));
    const images = parseJsonArray(product.images);
    const stockShortfall = Math.max(0, quantity - product.stock);

    lines.push({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      sku: product.sku,
      image: images[0] ?? null,
      unitPrice: product.price,
      quantity,
      lineTotal: product.price * quantity,
      compareAtPrice: product.compareAtPrice,
      stock: product.stock,
      stockShortfall,
      isAvailable: product.stock > 0,
      isActive: product.isActive,
    });
  }

  // Only active, in-stock lines contribute to the money totals.
  const payableLines = lines.filter((l) => l.isAvailable && l.isActive);

  const subtotal = payableLines.reduce((sum, l) => sum + l.lineTotal, 0);
  const itemCount = payableLines.reduce((sum, l) => sum + l.quantity, 0);

  const savings = payableLines.reduce(
    (sum, l) => sum + (l.compareAtPrice && l.compareAtPrice > l.unitPrice ? (l.compareAtPrice - l.unitPrice) * l.quantity : 0),
    0,
  );

  // --- Coupon ---
  const { coupon, error: couponError } = await resolveCoupon(couponCode);
  let discount = 0;
  let appliedCode: string | null = null;

  if (coupon) {
    if (subtotal < coupon.minOrderAmount) {
      return withTotals({
        lines,
        itemCount,
        subtotal,
        savings,
        shippingFee: 0,
        discount: 0,
        total: subtotal,
        couponCode: null,
        couponError: `Spend at least ${(coupon.minOrderAmount / 100).toFixed(0)} to use this code.`,
      });
    }
    discount =
      coupon.kind === "PERCENT"
        ? Math.min(applyDiscount(subtotal, coupon.value), coupon.maxDiscount ?? Infinity)
        : Math.min(coupon.value, subtotal);
    appliedCode = coupon.code;
  }

  // --- Shipping ---
  const discountedSubtotal = subtotal - discount;
  const qualifiesFreeShipping = discountedSubtotal >= siteConfig.shipping.freeThreshold;

  const shippingFee =
    itemCount === 0
      ? 0
      : qualifiesFreeShipping
        ? 0
        : insideRingRoad
          ? siteConfig.shipping.insideRingRoadFee
          : siteConfig.shipping.fee;

  const total = discountedSubtotal + shippingFee;

  return withTotals({
    lines,
    itemCount,
    subtotal,
    savings,
    shippingFee,
    discount,
    total,
    couponCode: appliedCode,
    couponError,
  });
}

function withTotals(
  cart: Omit<PricedCart, "freeShippingThreshold" | "amountToFreeShipping">,
): PricedCart {
  const threshold = siteConfig.shipping.freeThreshold;
  return {
    ...cart,
    freeShippingThreshold: threshold,
    amountToFreeShipping: Math.max(0, threshold - (cart.subtotal - cart.discount)),
  };
}

/** Loads the cart lines the current user has persisted server-side. */
export async function loadUserCartLines(userId: string): Promise<RawCartLine[]> {
  const items = await prisma.cartItem.findMany({
    where: { userId },
    select: { productId: true, quantity: true },
  });
  return items.map((i) => ({ productId: i.productId, quantity: i.quantity }));
}

/** Removes persisted lines whose products are gone or now unavailable. */
export async function syncUserCart(userId: string, priced: PricedCart) {
  const validIds = priced.lines.filter((l) => l.isActive).map((l) => l.productId);
  await prisma.cartItem.deleteMany({
    where: { userId, productId: { notIn: validIds.length ? validIds : [""] } },
  });
}

export async function emptyUserCart(userId: string) {
  await prisma.cartItem.deleteMany({ where: { userId } });
}