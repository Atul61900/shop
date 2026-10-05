import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { siteConfig } from "./config";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * All monetary values are stored as integer minor units.
 * 15000 minor units === NPR 150.00
 */
export function formatMoney(
  minorUnits: number,
  opts: { compact?: boolean; withCode?: boolean } = {},
) {
  const { compact = false, withCode = true } = opts;
  const major = minorUnits / 100;

  const formatted = new Intl.NumberFormat(siteConfig.currency.locale, {
    style: "currency",
    currency: siteConfig.currency.code,
    minimumFractionDigits: compact && Number.isInteger(major) ? 0 : 2,
    maximumFractionDigits: compact && Number.isInteger(major) ? 0 : 2,
    notation: compact ? "compact" : "standard",
  }).format(major);

  return withCode ? formatted : formatted.replace(/[^\d.,]/g, "").trim();
}

/** Plain grouped number, e.g. 4,500 — used inside telemetry readouts. */
export function formatNumber(value: number) {
  return new Intl.NumberFormat(siteConfig.currency.locale).format(value);
}

/** Compact telemetry readout, e.g. "30 MIN" or "2 HRS". */
export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} MIN`;
  const hours = minutes / 60;
  const rounded = Number.isInteger(hours) ? hours : Math.round(hours * 10) / 10;
  return `${rounded} HRS`;
}

export function formatDate(date: Date | string, opts?: Intl.DateTimeFormatOptions) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...opts,
  }).format(d);
}

export function formatDateTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/** "in 3 days" / "2 hours ago" — used on orders and newsletter timestamps. */
export function formatRelative(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = d.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["day", 60 * 24],
    ["hour", 60],
    ["minute", 1],
  ];

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, minutesInUnit] of units) {
    if (Math.abs(diffMinutes) >= minutesInUnit || unit === "minute") {
      return rtf.format(Math.round(diffMinutes / minutesInUnit), unit);
    }
  }
  return rtf.format(0, "minute");
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function truncate(text: string, max: number) {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

/** Clamp a number into a range — used for progress readouts. */
export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function percent(part: number, total: number) {
  if (total <= 0) return 0;
  return clamp(Math.round((part / total) * 100), 0, 100);
}

/** Stable, human-readable reference: KM-4F2K9A */
export function generateReference(prefix = "KM") {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `${prefix}-${out}`;
}

/** Discount percent off a minor-unit amount. */
export function applyDiscount(minorUnits: number, discountPercent: number) {
  if (discountPercent <= 0) return 0;
  return Math.round((minorUnits * Math.min(discountPercent, 100)) / 100);
}

/** Human label for an enum-ish value: OUT_FOR_DELIVERY -> "Out for delivery" */
export function humanize(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function absoluteUrl(path = "") {
  return `${siteConfig.url.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}