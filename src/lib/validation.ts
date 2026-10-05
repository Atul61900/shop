import { z } from "zod";

/** Accepts local formats (98XXXXXXXX, 9XXXXXXXXXXXX, +977…) used in Nepal. */
export const phoneSchema = z
  .string()
  .trim()
  .min(7, "Enter a valid phone number")
  .max(20, "Phone number is too long")
  .regex(/^[+\d][\d\s()-]{6,19}$/, "Enter a valid phone number");

export const emailSchema = z.email("Enter a valid email address").trim().toLowerCase();

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(128, "Password is too long")
  .regex(/[a-zA-Z]/, "Include at least one letter")
  .regex(/[0-9]/, "Include at least one number");

export const nameSchema = z
  .string()
  .trim()
  .min(2, "Enter your full name")
  .max(80, "Name is too long");

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema.optional(),
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: passwordSchema,
    confirmPassword: z.string().min(1),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// ---------------------------------------------------------------------------
// Cart
// ---------------------------------------------------------------------------

export const addToCartSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
});

export const updateCartItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(0).max(99), // 0 removes the line
});

export const cartLineSchema = z.object({
  productId: z.string().min(1),
  // Same ceiling as the cart schema — pricing clamps and flags shortfalls,
  // and checkout hard-rejects anything above available stock.
  quantity: z.number().int().min(1).max(999),
});

/** Guests submit the same line shape; used to price the cart server-side. */
export const guestCartSchema = z.object({
  items: z.array(cartLineSchema).min(1, "Your cart is empty").max(50),
});

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

export const addressSchema = z.object({
  contactName: nameSchema,
  phone: phoneSchema,
  line1: z.string().trim().min(4, "Enter the street address").max(160),
  line2: z.string().trim().max(160).optional(),
  city: z.string().trim().min(2, "Enter the city").max(80),
  province: z.string().trim().min(2, "Select the province").max(60),
  postalCode: z
    .string()
    .trim()
    .max(10)
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || /^\d{4,6}$/.test(v), "Enter a valid postal code"),
  landmark: z.string().trim().max(160).optional(),
});

export const checkoutSchema = z.object({
  email: emailSchema,
  phone: phoneSchema,
  shippingAddress: addressSchema,
  paymentMethod: z.enum(["COD", "ESEWA", "KHALTI"]),
  deliveryNote: z.string().trim().max(500).optional(),
  saveAddress: z.boolean().optional(),
  couponCode: z.string().trim().max(40).optional(),
  items: z.array(cartLineSchema).min(1, "Your cart is empty").max(50),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

// ---------------------------------------------------------------------------
// Contact, newsletter, reviews
// ---------------------------------------------------------------------------

export const contactSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema.optional(),
  subject: z.string().trim().min(3, "Enter a subject").max(120),
  message: z.string().trim().min(10, "Enter your message").max(2000),
});
export type ContactInput = z.infer<typeof contactSchema>;

export const newsletterSchema = z.object({ email: emailSchema });

export const reviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1, "Select a rating").max(5),
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().min(10, "Tell us a little more").max(1500),
  authorName: z.string().trim().max(80).optional(),
});

// ---------------------------------------------------------------------------
// Staff area — catalogue management
// ---------------------------------------------------------------------------

/** URL-safe identifier used for both product and service paths. */
export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "Enter a URL slug")
  .max(80, "Slug is too long")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers and single hyphens only",
  );

/**
 * Only paths the app itself serves are accepted, so an admin cannot point a
 * product at an arbitrary remote or traversal path.
 */
const catalogueImageSchema = z
  .string()
  .trim()
  .regex(
    /^\/(uploads|images)\/[A-Za-z0-9._/-]+\.(jpg|jpeg|png|webp)$/,
    "Upload an image first",
  )
  .refine((value) => !value.includes(".."), "Invalid image path");

/** Prices arrive from the form in rupees and are stored in paisa. */
const priceSchema = z.coerce
  .number({ error: "Enter a price" })
  .int("Use whole rupees")
  .min(0, "Price cannot be negative")
  .max(100_000_000, "That price is too high");

export const adminProductSchema = z.object({
  name: z.string().trim().min(3, "Enter the product name").max(120),
  slug: slugSchema,
  sku: z.string().trim().min(2, "Enter a SKU").max(40),
  categoryId: z.string().min(1, "Choose a category"),
  brand: z.string().trim().min(2, "Enter a brand").max(60),
  price: priceSchema,
  compareAtPrice: z.coerce.number().int().min(0).max(100_000_000).optional(),
  stock: z.coerce
    .number({ error: "Enter the stock count" })
    .int("Use a whole number")
    .min(0, "Stock cannot be negative")
    .max(100_000, "That stock count is too high"),
  warrantyMonths: z.coerce
    .number({ error: "Enter the warranty in months" })
    .int()
    .min(0)
    .max(120, "Warranty cannot exceed 120 months"),
  summary: z.string().trim().min(10, "Write a short summary").max(300),
  description: z.string().trim().min(20, "Write a fuller description").max(5000),
  image: catalogueImageSchema,
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
});
export type AdminProductInput = z.infer<typeof adminProductSchema>;

export const adminServiceSchema = z.object({
  name: z.string().trim().min(3, "Enter the service name").max(120),
  slug: slugSchema,
  eyebrow: z.string().trim().min(2, "Enter a short label").max(60),
  summary: z.string().trim().min(10, "Write a short summary").max(300),
  description: z.string().trim().min(20, "Write a fuller description").max(5000),
  basePrice: priceSchema,
  warrantyDays: z.coerce
    .number({ error: "Enter the warranty in days" })
    .int()
    .min(0)
    .max(3650, "Warranty cannot exceed 10 years"),
  image: catalogueImageSchema,
  features: z
    .array(z.string().trim().min(1).max(140))
    .max(12, "Use at most 12 bullet points")
    .default([]),
  sortOrder: z.coerce
    .number()
    .int()
    .min(0)
    .max(999)
    .optional(),
  isActive: z.boolean().optional(),
});
export type AdminServiceInput = z.infer<typeof adminServiceSchema>;

/**
 * Categories are created by staff rather than seeded, so a new one has to
 * carry everything the shop section renders: a name, some copy, and an accent.
 */
const accentSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #0052FF")
  .default("#0052FF");

export const adminCategorySchema = z.object({
  name: z.string().trim().min(2, "Enter the category name").max(80),
  slug: slugSchema,
  tagline: z.string().trim().max(80).optional(),
  description: z.string().trim().max(400).optional(),
  accent: accentSchema,
  // Optional: the shop renders a category's products, not a category image, so
  // this is stored for future use rather than demanded up front.
  image: catalogueImageSchema.optional(),
  sortOrder: z.coerce
    .number()
    .int()
    .min(0)
    .max(999)
    .optional(),
  isActive: z.boolean().optional(),
});
export type AdminCategoryInput = z.infer<typeof adminCategorySchema>;

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Flattens a ZodError into `{ field: "first message" }`. */
export function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}