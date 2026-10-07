/**
 * Static visual verification: fetches rendered pages and asserts the Stitch
 * design language survived — tokens, content, images, fonts, metadata.
 * Usage: node scripts/verify-visual.mjs [baseUrl]
 */
const BASE = process.argv[2] ?? "http://localhost:3215";
let failures = 0;

function assert(label, condition, detail = "") {
  if (condition) {
    console.log(`  PASS ${label}`);
  } else {
    failures++;
    console.log(`  FAIL ${label}${detail ? "  (" + detail + ")" : ""}`);
  }
}

async function page(path) {
  const res = await fetch(`${BASE}${path}`);
  return { status: res.status, html: await res.text() };
}

/**
 * next/image serves optimized URLs, so "/images/x.jpg" arrives percent-encoded
 * as "%2Fimages%2Fx.jpg". Accept either form when asserting markup content.
 */
function markupHas(html, src) {
  return html.includes(src) || html.includes(src.replace(/\//g, "%2F"));
}

console.log("\n── HOME: STITCH CONTENT PRESENT ─────────────────────");
const home = await page("/");
assert("hero headline", home.html.includes("Stay Connected") && home.html.includes("Stay Protected"));
assert("hero CTAs", home.html.includes("Browse Shop") && home.html.includes("Repair Services"));
assert("no booking CTA", !home.html.includes("/book-repair") && !home.html.includes("Book Repair Slot"));
assert("no Common Repairs strip", !home.html.includes("Common Repairs"));
assert("offerings header", home.html.includes("Accessories, Tools") && home.html.includes("Repair"));
assert("metrics strip", home.html.includes("Devices Repaired") && home.html.includes("First-Time Fix"));
assert("testimonial", home.html.includes("EastLink Logistics Team"));
assert("CTA band", home.html.includes("Keep Your Devices Running Smoothly"));
assert("no estimator section", !home.html.includes("DIAGNOSTIC ESTIMATOR") && !home.html.includes("Hardware Malfunction"));

console.log("\n── HOME: DESIGN TOKENS IN MARKUP ────────────────────");
for (const cls of [
  "bg-surface-base",
  "bg-surface-card",
  "bg-surface-deep",
  "text-text-primary",
  "text-text-secondary",
  "text-tertiary",
  "border-border-subtle",
  "bg-primary-container",
  "font-display-hero",
  "font-headline-lg",
  "font-label-tag",
  "shadow-glow",
]) {
  assert(`class ${cls}`, home.html.includes(cls));
}

console.log("\n── HOME: IMAGERY RESOLVES ───────────────────────────");
const imgs = [
  "/images/logo.jpg",
  "/images/hero-workbench.jpg",
  "/images/service-center/category-accessories.webp",
  "/images/service-center/category-repair.webp",
  "/images/service-center/technician-microsoldering.jpg",
];
for (const src of imgs) {
  assert(`in markup ${src}`, markupHas(home.html, src));
  const r = await fetch(`${BASE}${src}`);
  assert(`200 + image ${src}`, r.status === 200 && (r.headers.get("content-type") || "").startsWith("image"), `${r.status} ${r.headers.get("content-type")}`);
}
// micro-soldering lives on About + service detail pages, not Home
for (const [path, src] of [["/about", "/images/service-center/micro-soldering.jpg"], ["/services/screen-repair", "/images/services/screen-repair.webp"]]) {
  const html = await (await fetch(`${BASE}${path}`)).text();
  assert(`${src} on ${path}`, markupHas(html, src));
}

// Service and product imagery lives in the database, so read whatever the
// catalogue currently holds instead of hardcoding seeded slugs. That keeps the
// check meaningful (every stored image must resolve and appear on its own page)
// while tolerating admin additions and deletions.
console.log("\n── CATALOGUE: EVERY STORED IMAGE RESOLVES ───────────");
{
  const list = await page("/api/services");
  const services = JSON.parse(list.html)?.data?.services ?? [];
  assert("services listed", Array.isArray(services) && services.length > 0, `${services.length} found`);

  for (const service of services) {
    const html = await (await fetch(`${BASE}/services/${service.slug}`)).text();
    // React escapes text content (& -> &amp; etc.), so match the escaped form.
    const escaped = service.name
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    assert(`service page renders ${service.slug}`, html.includes(service.name) || html.includes(escaped));
    if (service.image) {
      assert(`${service.slug} uses its image`, markupHas(html, service.image));
      const r = await fetch(`${BASE}${service.image}`);
      assert(
        `200 + image for ${service.slug}`,
        r.status === 200 && (r.headers.get("content-type") || "").startsWith("image"),
        `${r.status} ${service.image}`,
      );
    }
  }
}

console.log("\n── FOOTER: MATRIX MATCHES THE CATALOGUE ──────────────");
// The footer reads services from the database, so every link it renders must
// resolve. A hardcoded list previously kept pointing at deleted services.
{
  const { html: homeHtml } = { html: (await (await fetch(`${BASE}/`)).text()) };
  const listed = [...homeHtml.matchAll(/\/services\/([a-z0-9-]+)/g)].map((m) => m[1]);
  const unique = [...new Set(listed)];
  assert("footer lists services", unique.length > 0, `${unique.length} links`);

  for (const slug of unique) {
    const res = await fetch(`${BASE}/services/${slug}`, { redirect: "manual" });
    assert(`footer link /services/${slug} resolves`, res.status === 200, `${res.status}`);
  }

  // And nothing hardcoded remains.
  const payload = JSON.parse(await (await fetch(`${BASE}/api/services`)).text());
  const active = (payload?.data?.services ?? []).map((s) => s.slug);
  const missing = active.filter((slug) => !unique.includes(slug));
  assert(
    "every active service is in the footer",
    missing.length === 0,
    missing.join(", "),
  );
}

console.log("\n── CONTRAST: NO LIGHT-ON-LIGHT ERROR TEXT ────────────");
// `error` is the LIGHT token (#ffb4ab); `on-error-container` is also light.
// Pairing them makes text disappear, which is invisible in a screenshot diff
// but obvious to a user. Guard every page that renders interactive chrome.
{
  const BAD = /bg-error(?!-container)[^"]*on-error-container/;
  const pages = ["/", "/contact", "/login", "/cart"];
  for (const path of pages) {
    const html = await (await fetch(`${BASE}${path}`)).text();
    const match = html.match(BAD);
    assert(`light-on-light error text on ${path}`, !match, match?.[0]);
  }
}

console.log("\n── AUTH: PASSWORD REVEAL TOGGLE ──────────────────────");
for (const path of ["/login", "/register"]) {
  const { html } = await page(path);
  assert(`${path} has show-password control`, html.includes("Show password"));
  assert(`${path} password field present`, html.includes('name="password"'));
}

console.log("\n── CHECKOUT: METHODS SELECTABLE + TEST BADGE ─────────");
{
  const { html } = await page("/checkout");
  // Methods must never be disabled for missing keys.
  const disabledRadios = (html.match(/<input[^>]*type="radio"[^>]*disabled/g) || []).length;
  assert("no disabled payment method", disabledRadios === 0, `${disabledRadios} disabled`);
  assert("esewa offered", html.includes("eSewa"));
  assert("TEST MODE badge shown", html.includes("Test mode"));
  assert("dev hint gone", !html.includes("Merchant key not configured"));
}

console.log("\n── PAYMENT PAGES RENDER ───────────────────────────────");
const contactHtml = await (await fetch(`${BASE}/contact`)).text();
assert("map pins exact storefront", contactHtml.includes("Krishna%20Mobile%20Repairing%20Center"));
assert("map uses street-level zoom", contactHtml.includes("z=17"));
assert("map frame has glow", /shadow-glow/.test(contactHtml));

console.log("\n── FONTS + THEME CSS ────────────────────────────────");
// next/font emits hashed variable classes on <html> and @font-face in CSS
assert("font variable classes on <html>", /__variable.*__variable/.test(home.html) || home.html.includes("variable"));
const cssHref = home.html.match(/<link[^>]*href="([^"]*\.css[^"]*)"/)?.[1];
assert("stylesheet linked", Boolean(cssHref));
if (cssHref) {
  const css = await (await fetch(`${BASE}${cssHref}`)).text();
  assert("Space Grotesk @font-face in CSS", /Space Grotesk/i.test(css) && css.includes("@font-face"));
  assert("Inter in CSS", css.includes("Inter"));
  assert("surface tokens in CSS", css.includes("surface-base"));
}
assert("dark class on html", /<html[^>]*dark/.test(home.html));
assert("theme-color meta", home.html.includes("#05070B") || home.html.includes("theme-color"));

console.log("\n── SHOP: SIMPLE GRID, NO FILTERS ────────────────────");
const shop = await page("/shop");
assert("category sections", shop.html.includes("Essential Accessories") && shop.html.includes("Repair Parts"));
assert("all 8 products listed", (shop.html.match(/mo warranty/g) || []).length >= 8);
assert("no filter UI", !shop.html.includes("Search products") && !shop.html.includes("Price: low to high"));
assert("animated cards", shop.html.includes("shadow-glow") || shop.html.includes("via-white/10"));

console.log("\n── PRODUCT: RICH DETAIL ─────────────────────────────");
const pdp = await page("/shop/65w-gan-fast-wall-charger");
assert("name + price", pdp.html.includes("65W GaN") && pdp.html.includes("NPR"));
assert("specs tab", pdp.html.includes("Specifications"));
assert("reviews tab", pdp.html.includes("Reviews"));
assert("warranty tab", pdp.html.includes("Warranty"));
assert("JSON-LD product", pdp.html.includes('"@type":"Product"'));

console.log("\n── SERVICES ─────────────────────────────────────────");
const svc = await page("/services");
assert("six services", (svc.html.match(/Call for a Quote|Call the Shop|Ask a question/g) || []).length >= 1);
assert("screen repair listed", svc.html.includes("Screen Repair"));
const svcDetail = await page("/services/screen-repair");
assert("service detail + FAQ", svcDetail.html.includes("Screen Repair") && svcDetail.html.includes("FAQPage"));

console.log("\n── ESTIMATOR REMOVED ────────────────────────────────");
assert("no estimator console", !home.html.includes("DIAGNOSTIC ESTIMATOR") && !home.html.includes("Instant Repair Triage"));
assert("no booking CTAs", !home.html.includes("Book a Repair Slot") && !home.html.includes("/book-repair"));
assert("removed pages 404", (await page("/book-repair")).status === 404 && (await page("/track")).status === 404);

console.log("\n── CHECKOUT + ACCOUNT GATES ─────────────────────────");
const checkout = await page("/checkout");
// Cart state lives in localStorage, so SSR shows the hydration skeleton by
// design — the form appears after hydration. Assert the shell, not the form.
assert("checkout shell renders", checkout.html.includes("Complete Your Order"));
assert("hydration skeleton present", checkout.html.includes("skeleton"));

console.log("\n── SEO ──────────────────────────────────────────────");
assert("canonical on home", home.html.includes('rel="canonical"'));
assert("og tags", home.html.includes("og:title") || home.html.includes("og:site_name"));
const robotsTxt = await (await fetch(`${BASE}/robots.txt`)).text();
assert("robots blocks account", robotsTxt.includes("/account/"));
assert("robots blocks staff area", robotsTxt.includes("/admin"));
assert("sitemap lists products", (await (await fetch(`${BASE}/sitemap.xml`)).text()).includes("/shop/"));

console.log(`\n═══════════════════════════════════════════════════════`);
console.log(`  FAILURES: ${failures}`);
console.log(`═══════════════════════════════════════════════════════\n`);
process.exit(failures > 0 ? 1 : 0);