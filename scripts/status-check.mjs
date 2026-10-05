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
  ["/login", 200],
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
console.log(`\n  ${bad === 0 ? "All status codes correct." : bad + " incorrect."}\n`);
process.exit(bad > 0 ? 1 : 0);