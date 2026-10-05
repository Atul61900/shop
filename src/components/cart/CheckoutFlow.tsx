"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import {
  Loader2,
  ShieldCheck,
  Truck,
  Banknote,
  Smartphone,
  Wallet,
  ArrowRight,
  Lock,
  AlertTriangle,
  ShoppingBag,
  CheckCircle2,
} from "lucide-react";
import { cn, formatMoney, percent } from "@/lib/utils";

import { useCartStore } from "@/store/cart";
import { useMounted } from "@/lib/use-mounted";
import { Button } from "@/components/ui/Button";
import { EmptyState, Badge } from "@/components/ui/Primitives";
import { Checkbox, Input, Radio, Select, Textarea } from "@/components/ui/Field";
import { ProgressBar } from "@/components/motion/Telemetry";
import { useToast } from "@/components/ui/Toast";

type PaymentMethod = "COD" | "ESEWA" | "KHALTI";

const PROVINCES = [
  "Bagmati",
  "Koshi",
  "Madhesh",
  "Lumbini",
  "Karnali",
  "Sudurpashchim",
  "Gandaki",
];

const NEPAL_CODES = [
  { code: "977", label: "+977 Nepal" },
  { code: "91", label: "+91 India" },
  { code: "1", label: "+1 North America" },
  { code: "44", label: "+44 UK" },
  { code: "61", label: "+61 Australia" },
  { code: "65", label: "+65 Singapore" },
];

/** Builds a tel: value the courier can dial on a Nepali mobile. */
export function dialableNumber(raw: string, code = "977") {
  const digits = raw.replace(/\D/g, "").replace(/^0+/, "");
  if (digits.startsWith(code)) return digits;
  return `${code}${digits}`;
}

type SavedAddress = {
  id: string;
  label: string;
  contactName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  province: string;
  postalCode: string | null;
  landmark: string | null;
  isDefault: boolean;
};

export function CheckoutFlow({
  user,
  addresses,
  paymentAvailability,
}: {
  user: { name: string; email: string; phone: string | null } | null;
  addresses: SavedAddress[];
  paymentAvailability: Record<PaymentMethod, boolean>;
}) {
  const router = useRouter();
  const toast = useToast();
  const mounted = useMounted();

  const cart = useCartStore((s) => s.cart);
  const lines = useCartStore((s) => s.lines);
  const clear = useCartStore((s) => s.clear);
  const closeDrawer = useCartStore((s) => s.closeDrawer);

  const [method, setMethod] = useState<PaymentMethod>("COD");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [sameAsPhone, setSameAsPhone] = useState(true);

  // Never leave the drawer covering the form.
  useEffect(() => closeDrawer(), [closeDrawer]);

  const hasBlocked = cart.lines.some((l) => !l.isAvailable || !l.isActive);
  const freeShippingPercent = percent(cart.subtotal - cart.discount, cart.freeShippingThreshold);

  // Preselect the customer's default address. Derived from props during render
  // rather than assigned in an effect, so there is no cascading render.
  const [chosenAddress, setChosenAddress] = useState<string | "new" | null>(null);
  const savedAddressId =
    chosenAddress ??
    (addresses.length > 0
      ? (addresses.find((a) => a.isDefault) ?? addresses[0]).id
      : "new");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    // Using a saved address means the address fields are not on the form.
    const usingSaved = savedAddressId !== "new" && addresses.length > 0;
    const saved = addresses.find((a) => a.id === savedAddressId);

    setPending(true);
    setErrors({});

    try {
      const payload = {
        email: String(data.email ?? ""),
        phone: String(data.phone ?? ""),
        paymentMethod: method,
        deliveryNote: String(data.deliveryNote ?? ""),
        saveAddress: data.saveAddress === "on",
        couponCode: cart.couponCode,
        items: lines,
        shippingAddress: usingSaved
          ? {
              contactName: saved!.contactName,
              phone: saved!.phone,
              line1: saved!.line1,
              line2: saved!.line2 ?? "",
              city: saved!.city,
              province: saved!.province,
              postalCode: saved!.postalCode ?? "",
              landmark: saved!.landmark ?? "",
            }
          : {
              contactName: String(data.contactName ?? ""),
              phone: sameAsPhone ? String(data.phone ?? "") : String(data.addressPhone ?? ""),
              line1: String(data.line1 ?? ""),
              line2: String(data.line2 ?? ""),
              city: String(data.city ?? ""),
              province: String(data.province ?? ""),
              postalCode: String(data.postalCode ?? ""),
              landmark: String(data.landmark ?? ""),
            },
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        setErrors(json.fields ?? { form: json.error });
        toast.error("Could not place order", json.error);
        document
          .querySelector("[data-error='true']")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      const order = json.data.order;
      clear();

      // COD is settled on handover — go straight to confirmation.
      if (method === "COD") {
        router.push(`/checkout/success?order=${order.orderNumber}`);
        return;
      }

      // Hand off to the gateway.
      const initRes = await fetch(`/api/payments/${method.toLowerCase()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: order.orderNumber }),
      });
      const initJson = await initRes.json();

      if (!initRes.ok || !initJson.ok) {
        // The order exists but payment did not start — send them to the page
        // so they can retry or switch method rather than losing the order.
        router.push(
          `/checkout/success?order=${order.orderNumber}&gateway=failed&reason=${encodeURIComponent(
            initJson.error ?? "Payment could not be started",
          )}`,
        );
        return;
      }

      if (initJson.data.redirectUrl) {
        window.location.href = initJson.data.redirectUrl;
        return;
      }

      if (initJson.data.mode === "form") {
        router.push(`/checkout/success?order=${order.orderNumber}&gateway=esewa-form`);
        return;
      }

      router.push(`/checkout/success?order=${order.orderNumber}`);
    } finally {
      setPending(false);
    }
  }

  if (!mounted) {
    return (
      <div className="flex flex-col gap-4" aria-hidden>
        <div className="skeleton h-64 w-full" />
        <div className="skeleton h-44 w-full" />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag className="h-6 w-6" aria-hidden />}
        title="There is nothing to check out"
        description="Your cart is empty. Add a few items and come back — we will hold them against live stock while you pay."
        action={<Button onClick={() => router.push("/shop")}>Browse the shop</Button>}
      />
    );
  }

  const usingSaved = savedAddressId !== "new" && addresses.length > 0;

  return (
    <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
      {/* ================= Left ================= */}
      <div className="flex flex-col gap-gutter lg:col-span-7 xl:col-span-8">
        {/* ---- Contact ---- */}
        <Panel step="01" title="Contact details">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input
              label="Email"
              name="email"
              type="email"
              required
              autoComplete="email"
              defaultValue={user?.email ?? ""}
              placeholder="you@example.com"
              error={errors.email}
              hint="Order confirmation goes here"
            />
            <Input
              label="Phone"
              name="phone"
              type="tel"
              required
              autoComplete="tel"
              defaultValue={user?.phone ?? ""}
              placeholder="98XXXXXXXX"
              error={errors.phone}
              hint="The courier will call before delivery"
            />
          </div>
        </Panel>

        {/* ---- Address ---- */}
        <Panel step="02" title="Delivery address">
          {addresses.length > 0 ? (
            <div className="flex flex-col gap-3">
              {addresses.map((address) => (
                <label
                  key={address.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 border p-4 transition-all",
                    savedAddressId === address.id
                      ? "border-border-active bg-primary-container/5"
                      : "border-border-subtle bg-surface-deep hover:border-border-strong",
                  )}
                >
                  <input
                    type="radio"
                    name="savedAddress"
                    value={address.id}
                    checked={savedAddressId === address.id}
                    onChange={() => setChosenAddress(address.id)}
                    className="sr-only"
                  />
                  <span
                    className={cn(
                      "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border transition-colors",
                      savedAddressId === address.id
                        ? "border-border-active bg-primary-container"
                        : "border-border-strong",
                    )}
                  >
                    {savedAddressId === address.id ? (
                      <span className="h-1.5 w-1.5 bg-white" />
                    ) : null}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-label-button text-label-button uppercase tracking-wider text-text-primary">
                        {address.label}
                      </span>
                      {address.isDefault ? <Badge tone="outline">Default</Badge> : null}
                    </div>
                    <span className="font-body-md text-body-md text-text-secondary">
                      {address.contactName} · {address.phone}
                    </span>
                    <span className="font-body-sm text-body-sm text-text-muted">
                      {address.line1}
                      {address.line2 ? `, ${address.line2}` : ""}, {address.city},{" "}
                      {address.province}
                      {address.postalCode ? ` ${address.postalCode}` : ""}
                    </span>
                    {address.landmark ? (
                      <span className="font-body-sm text-[12px] text-text-muted">
                        Landmark: {address.landmark}
                      </span>
                    ) : null}
                  </div>
                </label>
              ))}

              <button
                type="button"
                onClick={() => setChosenAddress("new")}
                className={cn(
                  "flex items-center justify-center border border-dashed px-4 py-3 font-label-button text-label-button uppercase tracking-wider transition-colors",
                  savedAddressId === "new"
                    ? "border-border-active bg-primary-container/5 text-text-primary"
                    : "border-border-subtle text-text-muted hover:border-border-strong hover:text-text-secondary",
                )}
              >
                + Use a different address
              </button>
            </div>
          ) : null}

          {!usingSaved ? (
            <div className="flex flex-col gap-5">
            <Input
              label="Full name"
              name="contactName"
              required
              autoComplete="name"
              defaultValue={user?.name ?? ""}
              error={errors["shippingAddress.contactName"]}
            />

              <div className="flex flex-col gap-2">
                <Checkbox
                  checked={sameAsPhone}
                  onChange={(e) => setSameAsPhone(e.target.checked)}
                  label="Same as my contact number"
                />
{!sameAsPhone ? (
                  <div>
                    <Input
                      label="Delivery phone"
                      name="addressPhone"
                      required
                      type="tel"
                      autoComplete="tel"
                      placeholder="98XXXXXXXX"
                      error={errors["shippingAddress.phone"]}
                      hint={`Include the country code if outside Nepal (${NEPAL_CODES.map((c) => c.label).join(", ")})`}
                    />
                  </div>
                ) : null}
              </div>

              <Input
                label="Street address"
                name="line1"
                required
                autoComplete="address-line1"
                placeholder="House / building, street"
                error={errors["shippingAddress.line1"]}
              />
              <Input
                label="Area (optional)"
                name="line2"
                autoComplete="address-line2"
                placeholder="Ward, landmark area"
                error={errors["shippingAddress.line2"]}
              />

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <Input
                  label="City"
                  name="city"
                  required
                  autoComplete="address-level2"
                  defaultValue="Kathmandu"
                  error={errors["shippingAddress.city"]}
                />
                <div>
                  <Select
                    label="Province"
                    name="province"
                    required
                    defaultValue="Bagmati"
                    error={errors["shippingAddress.province"]}
                  >
                    {PROVINCES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </Select>
                </div>
                <Input
                  label="Postal code"
                  name="postalCode"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  placeholder="44600"
                  error={errors["shippingAddress.postalCode"]}
                />
              </div>

<Input
              label="Landmark (optional)"
              name="landmark"
              placeholder="Near the blue temple, second floor…"
              error={errors["shippingAddress.landmark"]}
            />

              {user ? (
                <Checkbox
                  name="saveAddress"
                  label="Save this address for next time"
                />
              ) : null}
            </div>
          ) : null}

          <Textarea
            label="Delivery note (optional)"
            name="deliveryNote"
            rows={3}
            placeholder="Gate code, best time to call, gift message…"
            error={errors.deliveryNote}
          />
        </Panel>

        {/* ---- Payment ---- */}
        <Panel step="03" title="Payment method">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Radio
              name="paymentMethod"
              value="COD"
              checked={method === "COD"}
              onChange={() => setMethod("COD")}
              label={
                <span className="flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-tertiary" aria-hidden />
                  Cash on delivery
                </span>
              }
            />

            <Radio
              name="paymentMethod"
              value="ESEWA"
              checked={method === "ESEWA"}
              onChange={() => setMethod("ESEWA")}
              disabled={!paymentAvailability.ESEWA}
              label={
                <span className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-tertiary" aria-hidden />
                  eSewa
                </span>
              }
            />

            <Radio
              name="paymentMethod"
              value="KHALTI"
              checked={method === "KHALTI"}
              onChange={() => setMethod("KHALTI")}
              disabled={!paymentAvailability.KHALTI}
              label={
                <span className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-tertiary" aria-hidden />
                  Khalti
                </span>
              }
            />
          </div>

          {!paymentAvailability.ESEWA || !paymentAvailability.KHALTI ? (
            <p className="flex items-start gap-2 border border-border-subtle bg-surface-deep p-3 font-body-sm text-[12px] text-text-muted">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              Gateway payments appear once merchant keys are added to <code>.env</code>. Cash on
              delivery is fully available now.
            </p>
          ) : null}

          <AnimatePresence mode="wait">
            <motion.div
              key={method}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="border-l-2 border-border-active bg-surface-deep px-4 py-3"
            >
              <p className="font-body-md text-body-md text-text-secondary">
                {method === "COD"
                  ? "Pay the courier in cash when your order arrives. Please have the exact amount ready — our riders carry limited change."
                  : method === "ESEWA"
                    ? "You will be redirected to eSewa to complete payment securely. Your order is confirmed only once the payment goes through."
                    : "You will be redirected to Khalti to complete payment securely. Your order is confirmed only once the payment goes through."}
              </p>
            </motion.div>
          </AnimatePresence>
        </Panel>
      </div>

      {/* ================= Summary ================= */}
      <aside className="lg:col-span-5 xl:col-span-4">
        <div className="sticky top-28 border border-border-subtle bg-surface-card">
          <div className="border-b border-border-subtle p-6">
            <h2 className="font-headline-sm text-headline-sm text-text-primary">
              Order summary
            </h2>
          </div>

          {/* Lines */}
          <ul className="max-h-72 overflow-y-auto border-b border-border-subtle">
            {cart.lines.map((line) => (
              <li key={line.productId} className="flex items-center gap-3 p-4">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden border border-border-subtle bg-surface-deep">
                  {line.image ? (
                    <Image src={line.image} alt="" fill sizes="56px" className="object-cover" />
                  ) : null}
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center bg-border-active px-1 font-label-tag text-[10px] text-text-primary">
                    {line.quantity}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-body-sm text-body-sm text-text-primary">
                    {line.name}
                  </p>
                  <p className="font-label-tag text-label-tag text-text-muted">
                    {line.sku}
                  </p>
                </div>
                <span className="shrink-0 font-label-button text-label-button tabular-nums text-text-primary">
                  {formatMoney(line.lineTotal)}
                </span>
              </li>
            ))}
          </ul>

          {/* Free shipping */}
          <div className="border-b border-border-subtle p-5">
            {cart.amountToFreeShipping > 0 ? (
              <>
                <div className="flex items-center gap-2 font-body-sm text-body-sm text-text-secondary">
                  <Truck className="h-3.5 w-3.5 shrink-0 text-tertiary" aria-hidden />
                  <span>
                    <strong className="text-text-primary">
                      {formatMoney(cart.amountToFreeShipping, { withCode: false })}
                    </strong>{" "}
                    to free delivery
                  </span>
                </div>
                <ProgressBar value={freeShippingPercent} tone="cyan" className="mt-2.5" />
              </>
            ) : (
              <div className="flex items-center gap-2 font-body-sm text-body-sm text-tertiary">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                Free delivery applied
              </div>
            )}
          </div>

          {/* Totals */}
          <dl className="flex flex-col gap-3 p-6">
            <Row label="Subtotal" value={formatMoney(cart.subtotal)} />
            {cart.discount > 0 ? (
              <Row
                label={`Discount${cart.couponCode ? ` (${cart.couponCode})` : ""}`}
                value={`− ${formatMoney(cart.discount)}`}
                tone="cyan"
              />
            ) : null}
            <Row
              label="Delivery"
              value={cart.shippingFee === 0 ? "FREE" : formatMoney(cart.shippingFee)}
              tone={cart.shippingFee === 0 ? "cyan" : undefined}
            />
            <div className="my-1 h-px bg-border-subtle" />
            <div className="flex items-baseline justify-between">
              <dt className="font-label-tag text-label-tag uppercase tracking-widest text-text-muted">
                Total
              </dt>
              <dd className="font-label-metric text-[32px] tabular-nums text-text-primary">
                {formatMoney(cart.total)}
              </dd>
            </div>
          </dl>

          <div className="flex flex-col gap-3 border-t border-border-subtle p-6">
            {hasBlocked ? (
              <div className="flex items-start gap-2 border border-amber-500/40 bg-amber-500/5 p-3">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden />
                <p className="font-body-sm text-[12px] text-text-primary">
                  Remove the unavailable items above to continue.
                </p>
              </div>
            ) : null}

            <Button
              type="submit"
              fullWidth
              disabled={pending || hasBlocked}
              trailing={pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            >
              {pending
                ? "Processing"
                : method === "COD"
                  ? "Place order"
                  : `Pay ${formatMoney(cart.total)}`}
            </Button>

            <div className="flex items-center justify-center gap-2 font-body-sm text-[12px] text-text-muted">
              <Lock className="h-3 w-3" aria-hidden />
              Card details are never handled by this site
            </div>

            <div className="flex items-center justify-center gap-2 border-t border-border-subtle pt-4 font-body-sm text-[12px] text-text-muted">
              <ShieldCheck className="h-3.5 w-3.5 text-tertiary" aria-hidden />
              Prices verified server-side at checkout
            </div>
          </div>
        </div>
      </aside>
    </form>
  );
}

/* ------------------------------------------------------------------ */

function Panel({
  step,
  title,
  children,
}: {
  step: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-5 border border-border-subtle bg-surface-card p-6">
      <div className="flex items-center justify-between gap-4 border-b border-border-subtle pb-4">
        <h2 className="font-headline-sm text-headline-sm text-text-primary">{title}</h2>
        <span className="font-label-metric text-[26px] leading-none text-tertiary/40">
          {step}
        </span>
      </div>
      {children}
    </section>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "cyan" }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="font-body-sm text-body-sm text-text-secondary">{label}</dt>
      <dd
        className={cn(
          "font-label-button text-label-button tabular-nums",
          tone === "cyan" ? "text-tertiary" : "text-text-primary",
        )}
      >
        {value}
      </dd>
    </div>
  );
}