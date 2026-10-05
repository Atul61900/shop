/**
 * Smoke-tests every page and API route against a running dev server.
 * Usage: node scripts/smoke.mjs [baseUrl]
 */
const BASE = process.argv[2] ?? "http://localhost:3210";

const PAGES = [
  ["/", 200],
  ["/shop", 200],
  ["/shop?category=accessories", 200],
  ["/shop?search=charger&sort=price-asc", 200],
  ["/shop/65w-gan-fast-wall-charger", 200],
  ["/shop/this-product-does-not-exist", 404],
  ["/services", 200],
  ["/services/screen-repair", 200],
  ["/services/nope", 404],
  ["/about", 200],
  ["/contact", 200],
  ["/cart", 200],
  ["/checkout", 200],
  ["/login", 200],
  ["/register", 200],
  ["/forgot-password", 200],
  ["/reset-password", 200],
  ["/reset-password?token=abc", 200],
  ["/account", 307],
  ["/admin", 307],
  ["/faq", 200],
  ["/privacy", 200],
  ["/terms", 200],
  ["/robots.txt", 200],
  ["/sitemap.xml", 200],
  ["/definitely-not-a-page", 404],
];

const API_GET = [
  ["/api/products", 200],
  ["/api/products?category=accessories&limit=3", 200],
  ["/api/products?minPrice=100000&maxPrice=400000&sort=price-asc", 200],
  ["/api/products/65w-gan-fast-wall-charger", 200],
  ["/api/products/nope", 404],
  ["/api/categories", 200],
  ["/api/services", 200],
  ["/api/services/screen-repair", 200],
  ["/api/services/nope", 404],
  ["/api/cart", 200],
  ["/api/cart/price", 200],
  ["/api/auth/me", 200],
];

let pass = 0;
let fail = 0;

async function check(label, url, expected, init) {
  try {
    const res = await fetch(`${BASE}${url}`, { redirect: "manual", ...init });
    const ok = res.status === expected;
    if (ok) {
      pass++;
      console.log(`  PASS ${String(res.status).padEnd(3)} ${label}`);
    } else {
      fail++;
      console.log(`  FAIL ${String(res.status).padEnd(3)} ${label}  (expected ${expected})`);
    }
    return res;
  } catch (err) {
    fail++;
    console.log(`  FAIL ERR      ${label}  :: ${err.message}`);
    return null;
  }
}

function post(label, url, body, expected = 200) {
  return check(label, url, expected, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

console.log("\n── PAGES ──────────────────────────────────────────────");
for (const [url, expected] of PAGES) {
  await check(url, url, expected);
}

console.log("\n── API: READS ─────────────────────────────────────────");
for (const [url, expected] of API_GET) {
  await check(url, url, expected);
}

console.log("\n── API: REMOVED ESTIMATE ENDPOINT ───────────────────");
await post("estimate gone", "/api/estimate", { faultType: "display", addOns: [] }, 404);

console.log("\n── API: CART PRICING (server-authoritative) ──────────");
const priced = await post(
  "price 2x charger + 1x case",
  "/api/cart/price",
  { lines: [{ productId: "0", quantity: 2 }], couponCode: "KMRC10" },
);
if (priced) {
  const j = await priced.json();
  console.log(
    `       -> subtotal=${j?.data?.cart?.subtotal} discount=${j?.data?.cart?.discount} couponError=${j?.data?.cart?.couponError}`,
  );
}

console.log("\n── API: VALIDATION REJECTS BAD INPUT ──────────────────");
await post("checkout: empty cart", "/api/orders", {
  email: "a@b.com",
  phone: "9841234567",
  paymentMethod: "COD",
  shippingAddress: {
    contactName: "Test",
    phone: "9841234567",
    line1: "Some street",
    city: "Kathmandu",
    province: "Bagmati",
  },
  items: [],
}, 422);
await post("contact: honeypot filled", "/api/contact", {
  name: "Bot",
  email: "bot@x.com",
  subject: "Hi",
  message: "spam spam spam here",
  company: "Acme",
}, 200);
await post("removed: repairs endpoint gone", "/api/repairs", {
  name: "Test",
  phone: "9841234567",
  faultType: "battery",
  description: "Something is broken with my phone badly",
}, 404);
await post("removed: track endpoint gone", "/api/repairs/track", {
  ticketNumber: "KM-ABCDEF",
  phone: "9841234567",
}, 404);

console.log("\n── API: AUTH FLOW ─────────────────────────────────────");
const email = `smoke+${Date.now()}@kmrc.com.np`;
const reg = await post(
  "register",
  "/api/auth/register",
  { name: "Smoke Test", email, password: "SmokeTest1", phone: "9841234567" },
  201,
);
const cookie = reg?.headers.getSetCookie?.().find((c) => c.startsWith("kmrc_session="));
console.log(`       -> session cookie issued: ${Boolean(cookie)}`);
if (cookie) {
  const authed = { headers: { Cookie: cookie.split(";")[0], "Content-Type": "application/json" } };
  const me = await fetch(`${BASE}/api/auth/me`, { headers: { Cookie: cookie.split(";")[0] } });
  const meJson = await me.json();
  console.log(`       -> /api/auth/me user=${meJson?.data?.user?.email}`);

  await post("duplicate register blocked", "/api/auth/register", {
    name: "Dup", email, password: "SmokeTest1",
  }, 409);

  // Address book
  const addr = await fetch(`${BASE}/api/account/addresses`, {
    method: "POST",
    ...authed,
    body: JSON.stringify({
      label: "Home",
      contactName: "Smoke Test",
      phone: "9841234567",
      line1: "Tripura Marg 44",
      city: "Kathmandu",
      province: "Bagmati",
      postalCode: "44600",
    }),
  });
  console.log(`       -> address created: ${addr.status === 201}`);

  const prof = await fetch(`${BASE}/api/account/profile`, {
    method: "PATCH",
    ...authed,
    body: JSON.stringify({ name: "Smoke Renamed", phone: "9849999999" }),
  });
  console.log(`       -> profile updated: ${prof.status === 200}`);
}

await post("login wrong password", "/api/auth/login", {
  email, password: "WrongPass1",
}, 401);
const loginOk = await post("login correct", "/api/auth/login", { email, password: "SmokeTest1" });
console.log(`       -> login ok: ${loginOk?.status === 200}`);

console.log("\n── API: AVATAR REQUIRES SIGN-IN ─────────────────────");
await post("avatar upload anonymously", "/api/account/avatar", {}, 401);
{
  const res = await fetch(`${BASE}/api/account/avatar`, { method: "DELETE", redirect: "manual" });
  if (res.status === 401) {
    console.log("  PASS 401 /api/account/avatar DELETE");
    pass++;
  } else {
    console.log(`  FAIL ${res.status} /api/account/avatar DELETE  (expected 401)`);
    fail++;
  }
}
// ---------------------------------------------------------------------------
// Staff area
// ---------------------------------------------------------------------------

console.log("\n── API: ADMIN CLOSED TO NON-STAFF ────────────────────");
await post("admin product create anonymously", "/api/admin/products", {}, 401);
await post("admin service create anonymously", "/api/admin/services", {}, 401);
await post("admin upload anonymously", "/api/admin/upload", {}, 401);

{
  // The upload endpoint is create-only — there is no DELETE by design.
  const res = await fetch(`${BASE}/api/admin/upload`, { method: "DELETE", redirect: "manual" });
  if (res.status === 405) {
    console.log("  PASS 405 /api/admin/upload DELETE (no such method)");
    pass++;
  } else {
    console.log(`  FAIL ${res.status} /api/admin/upload DELETE  (expected 405)`);
    fail++;
  }
}

console.log("\n── API: ADMIN PANEL ───────────────────────────────────");
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@kmrc.com.np";
// Deliberately not hardcoded: the staff password lives in .env, never in this
// file. Without it the staff checks are skipped rather than run against a
// secret committed to the repo.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";
const stamp = Date.now();

let adminCookie;
if (!ADMIN_PASSWORD) {
  console.log("  SKIP staff checks — set ADMIN_PASSWORD in .env to run them");
} else {
  const adminLogin = await post(
    "admin login",
    "/api/auth/login",
    { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  );
  adminCookie = adminLogin?.headers
    .getSetCookie?.()
    .find((c) => c.startsWith("kmrc_session="));
  console.log(`       -> admin signed in: ${Boolean(adminCookie)}`);
}

if (adminCookie) {
  const adminHeader = { Cookie: adminCookie.split(";")[0] };

  // The dashboard and both forms render for staff.
  const dashboard = await check("/admin dashboard", "/admin", 200, { headers: adminHeader });
  if (dashboard) {
    const html = await dashboard.text();
    const listsRows =
      html.includes("65W GaN") && html.includes("Screen Repair");
    console.log(`       -> dashboard lists products + services: ${listsRows}`);
    console.log(`       -> delete controls rendered: ${html.includes("Delete Screen Repair")}`);
    console.log(`       -> edit controls rendered: ${html.includes("Edit 65W GaN") || html.includes("Edit Screen Repair")}`);
    console.log(`       -> edit links point at /edit: ${html.includes("/edit")}`);

    // The header must expose the admin shortcut to admins.
    const adminHome = await (await fetch(`${BASE}/`, { headers: adminHeader })).text();
    if (adminHome.includes("Admin dashboard")) {
      console.log("  PASS admin button present in header for admins");
      pass++;
    } else {
      console.log("  FAIL admin button missing from header for admins");
      fail++;
    }

    // Contrast guard: `error` is the light token, so a solid `bg-error` state
    // must pair with the dark `on-error`, never the light `on-error-container`.
    const BAD_CONTRAST = /bg-error(?!-container)[^"]*on-error-container/;
    if (BAD_CONTRAST.test(adminHome)) {
      const bad = adminHome.match(BAD_CONTRAST)[0];
      console.log(`  FAIL admin button has light-on-light text  (${bad})`);
      fail++;
    } else {
      console.log("  PASS admin button keeps readable text on every state");
      pass++;
    }
    if (BAD_CONTRAST.test(html)) {
      console.log(`  FAIL admin panel has light-on-light text  (${html.match(BAD_CONTRAST)[0]})`);
      fail++;
    } else {
      console.log("  PASS admin panel delete/edit controls stay readable");
      pass++;
    }
  }
  await check("/admin/products/new", "/admin/products/new", 200, { headers: adminHeader });
  await check("/admin/services/new", "/admin/services/new", 200, { headers: adminHeader });
  // Exercises the refactored avatar cropper on the profile page.
  await check("/account/profile", "/account/profile", 200, { headers: adminHeader });

  // Upload an image first, then attach it to a new product.
  const form = new FormData();
  form.append("kind", "products");
  form.append(
    "file",
    new Blob([Buffer.from("89504e470d0a1a0a", "hex")], { type: "image/png" }),
    "smoke.png",
  );
  const uploaded = await fetch(`${BASE}/api/admin/upload`, {
    method: "POST",
    headers: adminHeader,
    body: form,
  });
  const uploadJson = await uploaded.json();
  const imageUrl = uploadJson?.data?.url;
  console.log(`       -> image uploaded: ${uploaded.status === 201} ${imageUrl ?? ""}`);

  // Reject an upload that is not an image.
  const badForm = new FormData();
  badForm.append("kind", "products");
  badForm.append("file", new Blob(["not an image"], { type: "text/plain" }), "bad.txt");
  const badUpload = await fetch(`${BASE}/api/admin/upload`, {
    method: "POST",
    headers: adminHeader,
    body: badForm,
  });
  console.log(`       -> non-image rejected: ${badUpload.status === 422}`);

  const categories = await (await fetch(`${BASE}/api/categories`)).json();
  const categoryId = categories?.data?.categories?.[0]?.id;

  const productBody = {
    name: `Smoke Product ${stamp}`,
    slug: `smoke-product-${stamp}`,
    sku: `SMK-${stamp}`,
    categoryId,
    brand: "Smoke",
    price: 249000,
    stock: 5,
    warrantyMonths: 12,
    summary: "Created by the smoke suite to prove the staff area works.",
    description: "This record is created and then removed again by scripts/smoke.mjs.",
    image: imageUrl,
    isActive: true,
  };
  const created = await check(
    "create product",
    "/api/admin/products",
    201,
    {
      method: "POST",
      headers: { ...adminHeader, "Content-Type": "application/json" },
      body: JSON.stringify(productBody),
    },
  );
  const createdJson = created ? await created.json() : null;
  const productId = createdJson?.data?.product?.id;
  console.log(`       -> product id: ${productId ?? "none"}`);

  // Duplicate slug must be refused.
  await check(
    "duplicate slug rejected",
    "/api/admin/products",
    422,
    {
      method: "POST",
      headers: { ...adminHeader, "Content-Type": "application/json" },
      body: JSON.stringify(productBody),
    },
  );

  // Price in rupees but stored in paisa is the client's job — verify the
  // record is reachable on the public site.
  if (productId) {
    await check(`product page ${productBody.slug}`, `/shop/${productBody.slug}`, 200);
  }

  const serviceForm = new FormData();
  serviceForm.append("kind", "services");
  serviceForm.append(
    "file",
    new Blob([Buffer.from("89504e470d0a1a0a", "hex")], { type: "image/png" }),
    "smoke.png",
  );
  const serviceUpload = await fetch(`${BASE}/api/admin/upload`, {
    method: "POST",
    headers: adminHeader,
    body: serviceForm,
  });
  const serviceUploadJson = await serviceUpload.json();

  const serviceBody = {
    name: `Smoke Service ${stamp}`,
    slug: `smoke-service-${stamp}`,
    eyebrow: "SMOKE",
    summary: "Created by the smoke suite to prove the staff area works.",
    description: "This record is created and then removed again by scripts/smoke.mjs.",
    basePrice: 150000,
    warrantyDays: 90,
    features: ["Created by the smoke suite"],
    image: serviceUploadJson?.data?.url,
    isActive: true,
  };
  const createdService = await check(
    "create service",
    "/api/admin/services",
    201,
    {
      method: "POST",
      headers: { ...adminHeader, "Content-Type": "application/json" },
      body: JSON.stringify(serviceBody),
    },
  );
  const serviceJson = createdService ? await createdService.json() : null;
  const serviceId = serviceJson?.data?.service?.id;
  console.log(`       -> service id: ${serviceId ?? "none"}`);

  if (serviceId) {
    await check(`service page ${serviceBody.slug}`, `/services/${serviceBody.slug}`, 200);
  }

  // ---- Update in place -------------------------------------------------
  // Editing pins the existing slug/SKU, so saving unchanged fields must work
  // without tripping the uniqueness check.
  if (productId) {
    const editPage = await check(
      "edit product page renders",
      `/admin/products/${productId}/edit`,
      200,
      { headers: adminHeader },
    );
    if (editPage) {
      const html = await editPage.text();
      console.log(`       -> edit form prefilled: ${html.includes("Save changes")}`);
    }

    const patched = await check(
      "update product price + stock",
      `/api/admin/products/${productId}`,
      200,
      {
        method: "PATCH",
        headers: { ...adminHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          ...productBody,
          name: `${productBody.name} Updated`,
          price: 199000,
          stock: 42,
        }),
      },
    );
    if (patched) {
      const json = await patched.json();
      console.log(`       -> updated slug: ${json?.data?.product?.slug}`);
    }

    // The change must be visible on the public site.
    const live = await (await fetch(`${BASE}/shop/${productBody.slug}`)).text();
    console.log(`       -> update visible on shop page: ${live.includes("42") || live.includes("1,990")}`);

    // Renaming onto another record's slug must be refused.
    await check(
      "update onto taken slug rejected",
      `/api/admin/products/${productId}`,
      422,
      {
        method: "PATCH",
        headers: { ...adminHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ ...productBody, slug: "65w-gan-fast-wall-charger" }),
      },
    );

    // A PATCH to a record that does not exist is a 404, not a 500.
    await check("update missing product 404s", "/api/admin/products/does-not-exist", 404, {
      method: "PATCH",
      headers: { ...adminHeader, "Content-Type": "application/json" },
      body: JSON.stringify(productBody),
    });
  }

  if (serviceId) {
    await check("edit service page renders", `/admin/services/${serviceId}/edit`, 200, {
      headers: adminHeader,
    });
    await check(
      "update service price",
      `/api/admin/services/${serviceId}`,
      200,
      {
        method: "PATCH",
        headers: { ...adminHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ ...serviceBody, basePrice: 175000 }),
      },
    );
    await check("update missing service 404s", "/api/admin/services/does-not-exist", 404, {
      method: "PATCH",
      headers: { ...adminHeader, "Content-Type": "application/json" },
      body: JSON.stringify(serviceBody),
    });
  }

  // ---- Categories ----------------------------------------------------
  // A category holds any number of products and is created by staff, so this
  // walks the lifecycle: create, appear in the shop, edit, refuse deletion
  // while it still holds products, then delete once empty.
  console.log("\n── API: CATEGORIES ────────────────────────────────────");
  await check("/admin/categories", "/admin/categories", 200, { headers: adminHeader });
  await check("/admin/categories/new", "/admin/categories/new", 200, { headers: adminHeader });

  {
    const anon = await fetch(`${BASE}/api/admin/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (anon.status === 401) {
      console.log("  PASS 401 category create anonymously");
      pass++;
    } else {
      console.log(`  FAIL ${anon.status} category create anonymously  (expected 401)`);
      fail++;
    }
  }

  const homeCategoryId = categories?.data?.categories?.[0]?.id;
  const categoryBody = {
    name: `Smoke Category ${stamp}`,
    slug: `smoke-category-${stamp}`,
    tagline: "SMOKE",
    description: "Created by the smoke suite.",
    accent: "#00DAF3",
    isActive: true,
  };
  const createdCat = await check("create category", "/api/admin/categories", 201, {
    method: "POST",
    headers: { ...adminHeader, "Content-Type": "application/json" },
    body: JSON.stringify(categoryBody),
  });
  const catJson = createdCat ? await createdCat.json() : null;
  const newCategoryId = catJson?.data?.category?.id;

  if (newCategoryId) {
    // A brand new category must already be live on the shop page.
    const shopHtml = await (await fetch(`${BASE}/shop`)).text();
    console.log(`       -> new category shows in shop: ${shopHtml.includes(categoryBody.name)}`);

    await check("edit category page renders", `/admin/categories/${newCategoryId}/edit`, 200, {
      headers: adminHeader,
    });
    await check(
      "update category name",
      `/api/admin/categories/${newCategoryId}`,
      200,
      {
        method: "PATCH",
        headers: { ...adminHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ ...categoryBody, name: `${categoryBody.name} Renamed` }),
      },
    );
    await check(
      "duplicate category slug rejected",
      "/api/admin/categories",
      422,
      {
        method: "POST",
        headers: { ...adminHeader, "Content-Type": "application/json" },
        body: JSON.stringify(categoryBody),
      },
    );
    await check("non-hex accent rejected", "/api/admin/categories", 422, {
      method: "POST",
      headers: { ...adminHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ ...categoryBody, slug: `bad-accent-${stamp}`, accent: "nope" }),
    });

    // File a product into it, then prove the category refuses deletion.
    if (productId) {
      await check(
        "move product into new category",
        `/api/admin/products/${productId}`,
        200,
        {
          method: "PATCH",
          headers: { ...adminHeader, "Content-Type": "application/json" },
          body: JSON.stringify({
            ...productBody,
            name: `${productBody.name} Updated`,
            categoryId: newCategoryId,
          }),
        },
      );

      const blocked = await check(
        "delete stocked category refused",
        `/api/admin/categories/${newCategoryId}`,
        409,
        { method: "DELETE", headers: adminHeader },
      );
      if (blocked) {
        const json = await blocked.json();
        console.log(`       -> reason: ${json.error}`);
      }

      // Move it back, then the empty category can be removed.
      await check(
        "move product back to home category",
        `/api/admin/products/${productId}`,
        200,
        {
          method: "PATCH",
          headers: { ...adminHeader, "Content-Type": "application/json" },
          body: JSON.stringify({
            ...productBody,
            name: `${productBody.name} Updated`,
            categoryId: homeCategoryId,
          }),
        },
      );

      await check("delete empty category", `/api/admin/categories/${newCategoryId}`, 200, {
        method: "DELETE",
        headers: adminHeader,
      });
    }
  }

  // Missing image is refused.
  await check(
    "product without image rejected",
    "/api/admin/products",
    422,
    {
      method: "POST",
      headers: { ...adminHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ ...productBody, slug: `no-img-${stamp}`, sku: `NOI-${stamp}`, image: "" }),
    },
  );

  // Clean up so the suite stays idempotent.
  if (productId) {
    await check("delete product", `/api/admin/products/${productId}`, 200, {
      method: "DELETE",
      headers: adminHeader,
    });
    await check(`deleted product 404s`, `/shop/${productBody.slug}`, 404);
  }
  if (serviceId) {
    await check("delete service", `/api/admin/services/${serviceId}`, 200, {
      method: "DELETE",
      headers: adminHeader,
    });
    await check(`deleted service 404s`, `/services/${serviceBody.slug}`, 404);
  }
} else if (ADMIN_PASSWORD) {
  console.log("  FAIL could not sign in as the seeded admin — staff checks skipped");
  fail++;
}

// A signed-in customer must not reach the staff area.
{
  const customerLogin = await post(
    "customer login",
    "/api/auth/login",
    { email, password: "SmokeTest1" },
  );
  const customerCookie = customerLogin?.headers
    .getSetCookie?.()
    .find((c) => c.startsWith("kmrc_session="));
  if (customerCookie) {
    const customerHeader = { Cookie: customerCookie.split(";")[0] };
    await check("customer blocked from /admin", "/admin", 404, { headers: customerHeader });
    // The red admin button must never appear for a plain customer.
    const customerHome = await (await fetch(`${BASE}/`, { headers: customerHeader })).text();
    if (!customerHome.includes(">Admin<")) {
      console.log("  PASS admin button hidden from customers");
      pass++;
    } else {
      console.log("  FAIL admin button shown to a non-admin");
      fail++;
    }
    await check(
      "customer blocked from admin API",
      "/api/admin/products",
      403,
      {
        method: "POST",
        headers: { ...customerHeader, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
    );
  }
}

console.log("\n── SECURITY: NO ROLE SELF-ESCALATION ────────────────");
// The highest-value check in this file: `role` must never be settable from a
// public request. Registration, profile updates and login bodies that all try
// to claim ADMIN must leave the account a plain customer.
{
  const escalateEmail = `escalate+${Date.now()}@kmrc.com.np`;
  const escalate = await post(
    "register with role:ADMIN",
    "/api/auth/register",
    {
      name: "Escalation Attempt",
      email: escalateEmail,
      password: "Escalate1",
      role: "ADMIN",
    },
    201,
  );

  const me = await fetch(`${BASE}/api/auth/me`, {
    headers: { Cookie: escalate?.headers.getSetCookie?.().find((c) => c.startsWith("kmrc_session="))?.split(";")[0] ?? "" },
  });
  const meJson = await me.json();
  const claimedRole = meJson?.data?.user?.role;
  const notAdmin = claimedRole !== "ADMIN";
  console.log(`       -> registered role: ${claimedRole}`);
  if (notAdmin) {
    console.log("  PASS registration cannot grant ADMIN");
    pass++;
  } else {
    console.log("  FAIL registration granted ADMIN — privilege escalation");
    fail++;
  }

  // And the escalated account must still be refused by the staff area.
  const escalateCookie = escalate?.headers
    .getSetCookie?.()
    .find((c) => c.startsWith("kmrc_session="))
    ?.split(";")[0];
  if (escalateCookie) {
    await check("escalated account blocked from /admin", "/admin", 404, {
      headers: { Cookie: escalateCookie },
    });

    // Profile updates ignore unknown fields rather than erroring, so assert the
    // outcome that matters: the role is still not ADMIN afterwards.
    await check(
      "profile update accepts role field",
      "/api/account/profile",
      200,
      {
        method: "PATCH",
        headers: { Cookie: escalateCookie, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Still Normal", role: "ADMIN" }),
      },
    );
    const after = await (
      await fetch(`${BASE}/api/auth/me`, { headers: { Cookie: escalateCookie } })
    ).json();
    if (after?.data?.user?.role !== "ADMIN") {
      console.log("  PASS profile update cannot set role");
      pass++;
    } else {
      console.log("  FAIL profile update granted ADMIN — privilege escalation");
      fail++;
    }
  }
}

console.log("\n── API: GATEWAYS REJECT WHEN UNCONFIGURED ─────────────");
await post("esewa init", "/api/payments/esewa", { orderNumber: "KM-XXXXXX" }, 503);
await post("khalti init", "/api/payments/khalti", { orderNumber: "KM-XXXXXX" }, 503);

console.log("\n── API: CONTACT + NEWSLETTER ───────────────────────────");
await post("contact real", "/api/contact", {
  name: "Smoke Tester",
  email: "smoke@kmrc.com.np",
  subject: "Screen quote please",
  message: "My iPhone 13 screen is cracked. Roughly what would it cost?",
}, 201);
await post("newsletter", "/api/newsletter", { email: "smoke-news@kmrc.com.np" });
await post("newsletter invalid", "/api/newsletter", { email: "nope" }, 422);

console.log(`\n═══════════════════════════════════════════════════════`);
console.log(`  PASS: ${pass}    FAIL: ${fail}`);
console.log(`═══════════════════════════════════════════════════════\n`);
process.exit(fail > 0 ? 1 : 0);
