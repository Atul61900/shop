# KMRC — Krishna Mobile Repairing Center

Full-stack e-commerce website for **Krishna Mobile Repairing Center**,
Tripureshwor, Kathmandu. The visual design is ported from the Stitch project
**“KMRC Website Redesign”** (`Williams GP Tech` design system — dark obsidian surfaces,
electric-blue telemetry accents, Space Grotesk + Inter, sharp 0px geometry).

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS v4 (`@theme` tokens in `src/app/globals.css`) |
| Database | Prisma 7 — **SQLite** locally, Postgres-ready for production |
| Auth | httpOnly session cookies (bcrypt + `crypto.randomUUID`) |
| Payments | Cash on Delivery + **eSewa** (sandbox-first) |
| Motion | `motion` (scroll reveals, counters, telemetry traces, drawers) |
| Email | SMTP via nodemailer (logs to console when unconfigured) |

## Quick start

```bash
npm install
cp .env.example .env          # then edit DATABASE_URL etc. if needed

npx prisma migrate dev        # creates prisma/dev.db
npx prisma db seed            # 2 categories, 8 products, 6 services, demo user

npm run dev                   # http://localhost:3000
```

**Demo login** (seeded locally — delete before going live):
`demo@kmrc.com.np` / `Demo@1234`

### Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server (Turbopack) |
| `npm run build` / `npm start` | Production build + serve |
| `npx tsc --noEmit` | Typecheck |
| `npx eslint .` | Lint (0 errors enforced) |
| `npx prisma studio` | Visual database browser |
| `npx tsx prisma/set-admin.ts you@example.com` | Grant (or `--revoke`) the admin role on an account |
| `node scripts/with-server.mjs 3000 scripts/smoke.mjs` | 76 HTTP + API checks |
| `node scripts/with-server.mjs 3000 scripts/e2e.mjs` | Full order → repair → review cycle |
| `node scripts/with-server.mjs 3000 scripts/verify-visual.mjs` | Design-token + SEO assertions |

## What is seeded

- **The 8 real products from kmrc.com.np** — GaN charger, ArmorFlex case, tempered
  glass, USB-C cable, power bank, car mount, screen replacement kit, precision
  toolkit — across 2 categories (`accessories`, `repair-parts`) with **NPR** prices.
- **6 services** mirroring the Services page + footer matrix.
- Coupons: `KMRC10` (10% off, max NPR 1,000, min spend NPR 3,000) and `CONNECT5` (NPR 500 off).
- Two logins: `demo@kmrc.com.np` / `Demo@1234` (customer) and `admin@kmrc.com.np`
  (admin). That password is **never stored in this repo** — the seed takes
  it from `ADMIN_PASSWORD` in your environment, or generates a strong one and
  prints it once. Rotate it any time with:
  `npx tsx prisma/set-admin.ts --password`.

## Admin panel (`/admin`)

Only accounts with `role = "ADMIN"` can reach it. Anonymous visitors are sent to
login; signed-in non-admins get a 404, and every admin API returns 401/403.

- `/admin` — counts plus a thumbnail list of the current products and services.
  Every row has **edit** and **delete** controls.
- `/admin/products/new` — add a product: name, auto-slugged URL, SKU, category,
  brand, price, compare-at price, stock, warranty, summary, description, photo.
- `/admin/services/new` — add a service the same way, with a per-service photo.
- `/admin/products/[id]/edit` and `/admin/services/[id]/edit` — update either in
  place. Reuses the create form, so the two can never drift apart, and saves
  through `PATCH`.
- `/admin/categories` — the full category list with product counts, plus add,
  edit and delete.

### Categories

Categories are **not seeded** — the two originals were just the starting point,
and staff create the rest themselves, so the shop grows without a redeploy.
One category holds any number of products; a product belongs to exactly one.

A new category appears on the shop page immediately, even before anything is
filed under it. Each has a name, tagline, description, an accent colour (drawn
from the palette and applied to that section's rule) and an optional image.

Deleting a category is refused with a 409 while it still holds products, because
`Product.categoryId` is a required relation — move or delete the products first
rather than orphaning stock.

A red **Admin** button appears in the site header (and the mobile menu) once
you are signed in as an admin, linking straight to the dashboard.

Images are cropped in the browser before upload — same dialog as the profile
picture — to the 4:3 shape the cards render, at 1200px wide. An admin can drop in
any phone photo, portrait or landscape, and the original never leaves their
machine. Files land in `public/uploads/products|categories/` and
`public/uploads/services/` (git-ignored) and the database stores only the public
path.

```bash
npx tsx prisma/set-admin.ts you@example.com            # make your own account an admin
npx tsx prisma/set-admin.ts you@example.com --revoke   # take it away again
npx tsx prisma/set-admin.ts --password                 # rotate the admin password
```

### How the admin panel is locked down
- **One gate.** `requireAdmin()` runs in the `/admin` layout, so every page
  beneath it is covered by a single check. Anonymous visitors are redirected to
  login; signed-in non-admins get a **404**, so the area's existence is never
  confirmed. Every admin API independently returns 401/403 — never trust the
  page gate alone.
- **No self-promotion.** `role` is written in exactly two places: the seed and
  `set-admin.ts`. The registration route never touches it, and `profile` updates
  cannot change it, so there is no route to escalate through.
- **Credential throttling.** Login is limited per IP *and* per account email, so
  a distributed attempt on one account is caught. A successful sign-in clears
  the account bucket so a real admin is never one typo from a lockout.
- **Write budget.** Catalogue mutations share a 30/hour bucket per admin
  account, which limits what a hijacked session can do.
- **Audit trail.** Every upload, create and delete is written to
  `AdminAuditLog` with the actor, target and IP. It is append-only and keyed on
  email rather than a foreign key, so the record survives account deletion.
  Covers product, service and category create/update/delete plus uploads.
  Inspect it with `npx prisma studio` → `AdminAuditLog`.
- **Not indexed.** `/admin` is disallowed in `robots.txt` and absent from the
  sitemap; its pages also send `noindex`.
- **Contrast guard.** `--color-error` is the *light* token (`#ffb4ab`), so any
  solid `bg-error` surface must pair with the dark `on-error` — pairing it with
  `on-error-container` (also light) makes text vanish. `verify-visual.mjs` and
  `scripts/smoke.mjs` both fail if any rendered class string pairs a light
  `bg-error` with the light foreground.

> Deploying publicly? Set `secure` cookie handling (already automatic when
> `NODE_ENV=production`), put the app behind HTTPS, and move the rate limiter to
> Redis if you run more than one instance — `src/lib/api.ts` keeps buckets in
> process memory.

### Seeing an admin change immediately

Two caches can make a delete *look* like it was undone:

1. **Server output.** The catalogue pages read the database during render but
   use no dynamic API, so Next is free to prerender them. Every catalogue
   mutation calls `revalidateCatalogue()` (`src/lib/revalidate.ts`), which
   invalidates `/`, `/shop`, `/services`, the affected detail page and the
   sitemap.
2. **Client Router Cache.** Even with fresh server output, the browser replays a
   cached RSC payload for up to `staleTimes.static` (default 300s), which is why
   restarting the dev server did not help — that cache lives in the browser, not
   on the server. This project sets `staleTimes.static = 30` (the framework
   floor) and `dynamic = 0`, cutting the stale window from five minutes to
   thirty seconds.

If something still looks stale, a hard refresh (`Ctrl`/`Cmd` + `Shift` + `R`)
clears the client cache; back/forward history entries keep their own snapshot
by design.

**Note on `next dev`:** only one dev server can run per directory. If you see
*"Another next dev server is already running"*, the new command did nothing and
you are still talking to the old process — stop it first, otherwise your code
changes appear not to take effect.

Deleting a product or service through the API also removes its uploaded file;
order history is unaffected because line items snapshot name and price.

> Prices on the live site are shown in USD but the gateway (eSewa/COD) settles
> in NPR, so the seed uses realistic NPR equivalents. Update them to your real counter
> prices before launching.

## Going live — the checklist

1. **Payments.** The gateway is fully implemented — checkout UI, order
   creation, redirect, and server-side settlement. Beginner-friendly guide:
   `PAYMENTS_SETUP.md`. The short version:

   - Everything runs in TEST/UAT by default (`PAYMENT_ENV=test`, the default).
     Payment methods are always selectable; readiness is enforced at payment
     time with a clear error, never a disabled button.
   - eSewa UAT needs nothing: product code `EPAYTEST` and the official secret
     ship as defaults. Test as `9711111111` / `Test@123` (token `123456`).
   - Going live: fill `ESEWA_LIVE_PRODUCT_CODE`, `ESEWA_LIVE_SECRET_KEY`, set
     `PAYMENT_ENV=live`, restart, and run one small real transaction.

   How money is protected:
   - **eSewa** redirects the browser back *and* sends a server-to-server
     callback. The order is marked paid only after an independent verification
     call with eSewa, so a forged hit on the callback URL cannot mark it paid.
   - Starting a checkout is ownership-scoped: an order belonging to an account
     can only be paid by that account's session (guest orders use the order
     number as a capability token), and each order gets a small attempt quota.
 2. **Email.** Set `SMTP_HOST/PORT/USER/PASS/FROM` for password resets and order mail.
    Without SMTP, development logs messages to the console; in production the
    content is deliberately NOT logged (reset tokens must never reach log files).
 3. **Database → Postgres.** In `prisma/schema.prisma` change
    `provider = "sqlite"` to `"postgresql"`, set `DATABASE_URL` to your instance
   (Neon/Supabase/RDS…), then `npx prisma migrate deploy`. No schema changes needed —
   every column is portable, and `src/lib/prisma.ts` picks the right driver adapter
   from the URL automatically.
 4. **Delete the demo user** and re-seed or wipe test orders/tickets.
 5. **Set real prices/stock** for all 8 products.
 6. Set `NEXT_PUBLIC_SITE_URL` to your domain (used by sitemap, metadata, payment
    return URLs).
 7. Run the three test scripts against the production build before DNS cutover.
 8. **Hosting shape.** This app writes to two places at runtime: the database
    file and `public/uploads/`. Both must live on persistent, writable storage:
    - **VPS / Docker / Coolify / Railway-volume:** works as-is. Mount a volume
      for the project directory (or at least `dev.db` + `public/uploads`), back
      both up nightly.
    - **Vercel / serverless:** the filesystem is read-only and ephemeral, so
      SQLite and local uploads will NOT work. You must switch to Postgres
      (step 3) and move uploads to object storage (S3/R2 — only
      `src/lib/uploads.ts` plus the avatar call sites need changing).
 9. **HTTPS only.** Sessions use `Secure` cookies in production automatically,
    but the host must terminate TLS — the app itself serves plain HTTP behind
    your reverse proxy / platform.
 10. **Rate limits are in-process memory** (`src/lib/api.ts`). Correct for one
    server instance; if you run more than one, move them to Redis/Upstash.

## How the backend is organized

```
src/app/api/
  auth/…            register · login · logout · me · forgot/reset password
  products/…        filter · sort · search · paginate (+ facets for the shop UI)
  categories/       categories + featured products
  services/…        repair menu + detail
  cart/…            DB cart (users) + server-authoritative price quotes
  orders/…          checkout w/ atomic stock decrement + coupon use
  payments/
    esewa[/verify]  REST init · legacy form fallback · server-to-server verify
  reviews           post + live rating aggregates
  contact           honeypot + rate-limited inbox
  newsletter        idempotent subscribe
  account/…         profile · address book (default promotion on delete) · avatar upload
```

**Money rules** (enforced, tested by `scripts/e2e.mjs`):
- Amounts are integer minor units (paisa) — never floats.
- The browser sends only product IDs + quantities. Prices, names, discounts,
  shipping and totals are recomputed from the database on every request.
- Stock is decremented with a conditional `updateMany … stock >= qty` inside the
  order transaction, so two simultaneous checkouts can’t oversell the last unit.
- Coupons are validated (active window, usage cap, minimum spend) and their
  `usedCount` increments in the same transaction.

## Project conventions worth knowing

- **Design tokens live in `src/app/globals.css`** under `@theme` — same names as the
  Stitch export (`bg-surface-card`, `text-tertiary`, `font-display-hero`,
  `border-border-subtle`, `shadow-glow`, …). Change the hex once, update everywhere.
- **Status codes are load-bearing for SEO.** `notFound()`/`redirect()` must run
  before any streaming flush, so `loading.tsx` boundaries are scoped to route groups
  (`shop/(listing)`, `services/(listing)`) and never wrap `[slug]` detail routes.
- `typedRoutes: true` — `<Link href>` and `router.push` are type-checked against
  real routes. Run `npx next typegen` after adding pages.
- Client cart = `zustand` + localStorage; server cart = Prisma. `CartSync` re-prices
  on every change; login merges the anonymous cart without losing items.
- Rate limits are in-process (`src/lib/api.ts`) — fine for one instance; move to
  Redis/Upstash when you scale horizontally.
- Test accounts/orders created by the scripts use `smoke+…` / `e2e+…` emails so
  they’re trivial to find and delete in Prisma Studio.
- Profile pictures are cropped to a 512px square in the browser, then stored under
  `public/uploads/avatars/` (git-ignored). On a multi-instance or serverless host,
  point the avatar module at object storage (S3/R2) instead — the DB keeps only the
  public path, so nothing else changes.