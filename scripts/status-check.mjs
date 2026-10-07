// Verifies HTTP status codes for notFound() and redirect() in production,
// where streaming behavior differs from dev.
const BASE = process.argv[2] ?? "http://localhost:3211";

async function status(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, { redirect: "manual", ...init });
  return { status: res.status, location: res.headers.get("location") };
}

console.log("\n── PRODUCTION STATUS CHECKS ─────────────────────────");
const cases = [
  ["/", 200],
  ["/shop", 200],
  ["/shop/this-does-not-exist", 404],
  ["/services/nope", 404],
  ["/account", 307],
  ["/admin", 307],
  ["/admin/orders", 307],
  ["/login", 200],
  ["/api/health", 200],
  ["/definitely-not-a-page", 404],
];

let bad = 0;
for (const [path, expected] of cases) {
  const r = await status(path);
  const ok = r.status === expected;
  if (!ok) bad++;
  console.log(
    `  ${ok ? "PASS" : "FAIL"} ${String(r.status).padEnd(3)} ${path}  (expected ${expected})${
      r.location ? " -> " + r.location : ""
    }`,
  );
}

// Security headers ship on every response; X-Powered-By must be gone.
{
  const res = await fetch(`${BASE}/`, { redirect: "manual" });
  const h = res.headers;
  const checks = [
    ["x-frame-options", "DENY"],
    ["x-content-type-options", "nosniff"],
  ];
  for (const [name, want] of checks) {
    const got = h.get(name);
    const ok = got === want;
    if (!ok) bad++;
    console.log(`  ${ok ? "PASS" : "FAIL"} header ${name}: ${got ?? "(missing)"}  (expected ${want})`);
  }
  const powered = h.get("x-powered-by");
  if (powered) {
    bad++;
    console.log(`  FAIL x-powered-by present: ${powered}  (expected absent)`);
  } else {
    console.log("  PASS x-powered-by absent");
  }
}
console.log(`\n  ${bad === 0 ? "All status codes correct." : bad + " incorrect."}\n`);
process.exit(bad > 0 ? 1 : 0);