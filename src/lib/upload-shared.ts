/**
 * Upload constants shared by the server helpers and the browser uploader.
 *
 * This module must stay free of `server-only` and Node built-ins so client
 * components can import the same limits the API enforces.
 */

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

/** Mirrored exactly by the server-side allow-list in `uploads.ts`. */
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const ACCEPT_ATTRIBUTE = ACCEPTED_IMAGE_TYPES.join(",");

export type UploadKind = "products" | "services" | "categories";

export const UPLOAD_KINDS: readonly UploadKind[] = [
  "products",
  "services",
  "categories",
];

export function isUploadKind(value: unknown): value is UploadKind {
  return typeof value === "string" && (UPLOAD_KINDS as readonly string[]).includes(value);
}
