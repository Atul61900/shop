/**
 * End-to-end business flow (guest-only, no accounts):
 * price -> order -> reorder -> review -> oversell guard.
 * Usage: node scripts/e2e.mjs [baseUrl]
 */
const BASE = process.argv[2] ?? "http://localhost:3212";
let failures = 0;

function assert(label, condition, detail = "") {
  if (condition) {
    console.log(`  PASS ${label}${detail ? "  (" + detail + ")" : ""}`);
  } else {
    failures++;
    console.log(`  FAIL ${label}${detail ? "  (" + detail + ")" : ""}`);
  }
}

async function api(path, { method = "GET", body, cookie } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { res, json };
}

console.log("\n── 1. REGISTER ──────────────────────────────────────");
const email = `e2e+${Date.now()}@kmrc.com.np`;
const { res: reg } = await api("/api/auth/register", {
  method: "POST",
  body: { name: "E2E Buyer", email, password: "E2eTest99", phone: "9841112222" },
});
assert("register 201", reg.status === 201);
const cookie = reg.headers.getSetCookie?.().find((c) => c.startsWith("kmrc_session="))?.split(";")[0];
assert("session cookie", Boolean(cookie));

console.log("\n── 2. SERVER PRICING WITH REAL PRODUCTS ─────────────");
const { json: cat } = await api("/api/products?inStock=true&limit=50");
const products = cat.data.products;
assert("catalogue non-empty", products.length >= 2, `${products.length} products`);
const charger = products.find((p) => p.slug === "65w-gan-fast-wall-charger");
const glass = products.find((p) => p.slug === "tempered-glass-screen-protector-2-pack");
assert("found seed products", Boolean(charger && glass));

// Client tries to lie about quantity: >99 must be clamped.
const desired = [
  { productId: charger.id, quantity: 2 },
  { productId: glass.id, quantity: 150 },
];
const { json: priced } = await api("/api/cart/price", {
  method: "POST",
  body: { lines: desired, couponCode: "KMRC10" },
});
const cart = priced.data.cart;
assert("quantity clamped to 99", cart.lines.find((l) => l.productId === glass.id).quantity === 99);
const expectedSubtotal = charger.price * 2 + glass.price * 99;
assert("subtotal from DB prices", cart.subtotal === expectedSubtotal, `subtotal=${cart.subtotal}`);

// Coupon KMRC10 = 10%, capped at 100000 (NPR 1000)
const rawDiscount = Math.round((expectedSubtotal * 10) / 100);
const expectedDiscount = Math.min(rawDiscount, 100000);
assert("coupon KMRC10 applied + capped", cart.discount === expectedDiscount, `discount=${cart.discount}`);
assert("coupon code echoed", cart.couponCode === "KMRC10");

console.log("\n── 2. PLACE ORDER AS GUEST (COD) ─────────────────────");
const stockBefore = charger.stock;
const orderBody = {
  email,
  phone: "9841112222",
  paymentMethod: "COD",
  couponCode: "KMRC10",
  deliveryNote: "E2E test order, please ignore.",
  shippingAddress: {
    contactName: "E2E Buyer",
    phone: "9841112222",
    line1: "Tripura Marg 44",
    line2: "",
    city: "Kathmandu",
    province: "Bagmati",
    postalCode: "44600",
    landmark: "",
  },
  items: [
    { productId: charger.id, quantity: 1 },
    { productId: glass.id, quantity: 2 },
  ],
};
const { res: orderRes, json: orderJson } = await api("/api/orders", {
  method: "POST",
  body: orderBody,
  cookie,
});
assert("order 201", orderRes.status === 201, `status=${orderRes.status}`);
const order = orderJson?.data?.order;
assert("order number shape", /^KM-[A-Z0-9]{6}$/.test(order?.orderNumber ?? ""), order?.orderNumber);
assert("COD order confirmed", order?.status === "CONFIRMED");

// Stock must have decreased exactly by purchased qty.
const { json: after } = await api(`/api/products/${charger.slug}`);
assert("stock decremented", after.data.product.stock === stockBefore - 1, `was ${stockBefore}, now ${after.data.product.stock}`);

console.log("\n── 3. RE-ORDER SAME QUANTITY STILL VALID ─────────────");
const { res: order2, json: order2Json } = await api("/api/orders", {
  method: "POST",
  body: { ...orderBody, deliveryNote: "Second e2e order" },
  cookie,
});
assert("second order accepted", order2.status === 201, order2Json?.error ?? "");

console.log("\n── 4. REVIEW THE PRODUCT ────────────────────────────");
const { res: revRes, json: revJson } = await api("/api/reviews", {
  method: "POST",
  body: {
    productId: charger.id,
    rating: 5,
    title: "E2E approved",
    body: "Bought through the new checkout, arrived fast, works perfectly.",
  },
  cookie,
});
assert("review 201", revRes.status === 201, revJson?.error ?? "");
const { json: prodAfter } = await api(`/api/products/${charger.slug}`);
assert("rating aggregate updated", prodAfter.data.product.reviewCount >= 1);

// Duplicate review blocked.
const { res: revDup } = await api("/api/reviews", {
  method: "POST",
  body: { productId: charger.id, rating: 4, body: "Second attempt at reviewing this product." },
  cookie,
});
assert("duplicate review 409", revDup.status === 409);

console.log("\n── 6. AVATAR UPLOAD + REMOVE ─────────────────────────");
// 1x1 transparent PNG — the crop step is client-side, the API takes any image.
const pngBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const form = new FormData();
form.append("file", new Blob([pngBytes], { type: "image/png" }), "tiny.png");
const upRes = await fetch(`${BASE}/api/account/avatar`, {
  method: "POST",
  headers: { Cookie: cookie },
  body: form,
});
const upJson = await upRes.json().catch(() => null);
assert("avatar upload 201", upRes.status === 201, upJson?.error ?? "");
assert(
  "avatar path shape",
  typeof upJson?.data?.avatarUrl === "string" && upJson.data.avatarUrl.startsWith("/uploads/avatars/"),
  upJson?.data?.avatarUrl,
);

// Wrong file type rejected.
const badForm = new FormData();
badForm.append("file", new Blob(["not an image"], { type: "text/plain" }), "note.txt");
const badRes = await fetch(`${BASE}/api/account/avatar`, {
  method: "POST",
  headers: { Cookie: cookie },
  body: badForm,
});
assert("non-image rejected 422", badRes.status === 422);

const delRes = await fetch(`${BASE}/api/account/avatar`, {
  method: "DELETE",
  headers: { Cookie: cookie },
});
assert("avatar removed 200", delRes.status === 200);

console.log("\n── 7. STOCK EXHAUSTION GUARD ────────────────────────");
const { json: full } = await api(`/api/products/${glass.slug}`);
const available = full.data.product.stock;
const { res: overRes, json: overJson } = await api("/api/orders", {
  method: "POST",
  body: { ...orderBody, items: [{ productId: glass.id, quantity: available + 50 }], couponCode: "" },
  cookie,
});
assert("oversell rejected 409", overRes.status === 409, overJson?.error ?? "");

console.log(`\n═══════════════════════════════════════════════════════`);
console.log(`  FAILURES: ${failures}`);
console.log(`═══════════════════════════════════════════════════════\n`);
process.exit(failures > 0 ? 1 : 0);