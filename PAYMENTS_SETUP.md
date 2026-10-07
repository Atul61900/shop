# Payments Setup — eSewa (beginner-friendly)

This project takes two payment methods: **Cash on Delivery** and **eSewa**. Everything below is already wired; this file explains how it works, how to test it, and what is left for going live.

---

## 1. The cast of characters

- **eSewa** is Nepal's big wallet (by F1Soft). Your customer pays from their eSewa balance, you receive it in your merchant wallet.
- A **merchant account** is *your shop* registered with the gateway. Without it, the gateway has nowhere to send the money, so it refuses to talk to you.
- **Merchant credentials/keys** prove your server is allowed to act for that account. They come in two flavours:
  - *Public identifiers* (product code) — safe to show.
  - *Secret keys* — passwords. Anyone holding one can start payments in your name, so they live **only** in `.env` on the server, never in React, never in Git.
- **TEST/UAT** = the gateway's playground. Real code, real redirects, fake money. **LIVE** = real money moving between real wallets.

## 2. Where credentials live

Everything is chosen by variables in `.env` (see `.env.example` for the full list):

```env
PAYMENT_ENV=test            # test | live — one switch for the gateway

ESEWA_TEST_PRODUCT_CODE=EPAYTEST        # official, published, pre-filled
ESEWA_TEST_SECRET_KEY=8gBm/:&EnhH.1/q   # official, published, pre-filled
ESEWA_LIVE_PRODUCT_CODE=                # issued after merchant approval
ESEWA_LIVE_SECRET_KEY=                  # issued after merchant approval
```

Notes:

- The eSewa UAT pair above is **officially published** on developer.esewa.com.np, so TEST mode works the moment you clone. Do not invent your own values.
- React never sees any of these. The browser only ever receives gateway-issued URLs and server-signed form fields.
- `.env` is gitignored. If a secret is ever committed, rotate it immediately.

## 3. What happens when I click eSewa?

1. The checkout already created an **order** (method `ESEWA`, status `PENDING`). Stock was reserved once, atomically, at that moment.
2. React calls `POST /api/payments/esewa`. Node.js builds the ePay v2 form fields and signs `total_amount,transaction_uuid,product_code` with HMAC-SHA256 (Base64) **on the server**.
3. React auto-submits those fields to the UAT form (`https://rc-epay.esewa.com.np/api/epay/main/v2/form`). The secret itself never leaves Node.
4. You pay as test customer `9711111111` / `Test@123` (MPIN `1122`, token `123456`). The trial session expires after 5 idle minutes.
5. eSewa redirects to our success endpoint with a Base64 `data` payload. Node.js decodes it, **recomputes the signature**, checks the uuid/amount, then asks eSewa's status API what really happened.
6. `COMPLETE` → `PAID` and the success page. `PENDING`/`AMBIGUOUS` → the pending page (a re-check button re-runs verification). `CANCELED` → `CANCELLED` + stock released. Anything else → `FAILED` + stock released.
7. If you land on the failure page, eSewa is asked first: a success that merely lost its redirect still settles to `PAID`.

## 4. What Node.js does, what Prisma does, what SQLite does

```
Customer
  ↓
React Checkout (chooses method, shows TEST badge)
  ↓
Node.js API (validates, checks ownership, reserves stock)
  ↓
Prisma (Order + OrderItems + Payment in one transaction)
  ↓
SQLite: order PENDING, stock decremented once, Payment INITIATED
  ↓
eSewa (customer pays on the official test page)
  ↓
Gateway Response (redirect back to our return endpoint)
  ↓
Node.js Verification (status-check API, amount match)
  ↓
Prisma (conditional flip PENDING → PAID/FAILED/CANCELLED — exactly once)
  ↓
Order PAID (+ stock stays) · or FAILED/CANCELLED (+ stock released)
  ↓
React Success / Failure / Pending page
```

The backend is the source of truth at every step. React *displays* the cart total; Node.js *re-prices* from the database before creating the order, and the settle step compares the gateway's settled amount against that stored total. A tampered price/quantity/discount/total in devtools changes nothing — the server ignores it.

## 5. How verification works

1. **It happened?** The gateway is asked directly (eSewa status check by `product_code` + `total_amount` + `transaction_uuid`).
2. **Right amount?** Settled minor units compared to `order.total`. A mismatch fails the payment and releases stock — it smells like tampering.
3. **Right order?** The transaction references our stored `txnUuid` (`transaction_uuid`), which was minted per attempt.
4. **Only once?** Terminal transitions require `paymentStatus = PENDING`. Replays, refreshes and duplicate callbacks are no-ops.

If verification cannot confirm (network down, gateway silent), the payment stays `PENDING`. Unknown is never PAID.

## 6. How to test

You need no merchant signup for eSewa UAT.

**Successful payment**
- eSewa: pick eSewa, submit, log in as `9711111111` / `Test@123`, token `123456`, confirm. You should land on the success page with the order PAID.

**Cancelled payment** — close/cancel on the gateway page. Expect the failure page with "cancelled", order `CANCELLED`, stock released.

**Failed payment** — use a wrong MPIN/OTP repeatedly or let the session expire. Expect the failure page, order `FAILED`, stock released.

**Invalid transaction** — open `/api/payments/esewa/success?order=<n>` manually with no `data`. It must hold at pending, never pay.

**Wrong amount** — covered server-side: any settled amount ≠ order total fails the order and releases stock.

**Duplicate callback** — hit the same return URL twice. The second is a no-op (`already-settled` in logs); stock moves once.

**Refreshing success URL** — re-opening the success link re-runs settle with the same idempotency: PAID stays PAID exactly once.

**Opening success URL without paying** — e.g. `/api/payments/esewa/success?order=<n>` with no `data`. Settle finds nothing to confirm → pending page, never paid.

**Unknown transaction** — a `transaction_uuid` that never existed holds at pending.

**Network interruption** — if the status call throws, settle holds at pending and the customer retries from the pending page's re-check button.

**Abandoned payment** — the order sits `PENDING` with stock reserved. A staff member can re-check it from `/admin/orders`, or cancel the order to release stock.

## 7. Switching from TEST/UAT to LIVE

1. **eSewa:** register at https://merchant.esewa.com.np/auth/register-merchant, complete test transactions, receive the live product code + secret, put them in `ESEWA_LIVE_PRODUCT_CODE` / `ESEWA_LIVE_SECRET_KEY`.
2. Set `PAYMENT_ENV=live` and restart the server.
3. Place a small real transaction (e.g. Rs 10+) on the gateway and confirm the order flips to PAID with the correct reference.
4. Remove test orders afterwards.

## 8. Reference

- eSewa ePay: https://developer.esewa.com.np/pages/Epay
- eSewa test credentials: https://developer.esewa.com.np/pages/Test-credentials
- Environment TTL note: the client Router Cache is capped at 30s for static routes (`staleTimes`), so catalogue/payment edits never look undone; see README "Seeing an admin change immediately".