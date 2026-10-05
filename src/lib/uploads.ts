import "server-only";

import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  MAX_UPLOAD_BYTES,
  type UploadKind,
} from "@/lib/upload-shared";

/**
 * Server side of catalogue image uploads.
 *
 * Files land under `public/uploads/<kind>/` and the database only ever stores
 * the public path, so moving to S3/R2 later means changing this one module
 * plus the delete call sites.
 *
 * The hardening mirrors the avatar endpoint: the extension is derived from an
 * allow-list keyed off the MIME type (never from the uploaded filename), the
 * stored name is a fresh UUID, and the resolved path is asserted to stay
 * inside the target directory.
 */

const ALLOWED_TYPES = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

/** Public URL prefix for a kind — also what the Zod schemas allow. */
export function uploadPrefix(kind: UploadKind) {
  return `/uploads/${kind}/`;
}

function dirFor(kind: UploadKind) {
  return path.join(process.cwd(), "public", "uploads", kind);
}

export type ImageCheck = { ok: true; ext: string } | { ok: false; message: string };

/** Validates a picked file before any bytes are written. */
export function checkImageFile(file: File): ImageCheck {
  const ext = ALLOWED_TYPES.get(file.type);
  if (!ext) {
    return { ok: false, message: "Only JPG, PNG or WebP images are accepted." };
  }
  if (file.size === 0) {
    return { ok: false, message: "That file is empty." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, message: "Images must be smaller than 5 MB." };
  }
  return { ok: true, ext };
}

/** Writes the file and returns the public path to store in the database. */
export async function saveImage(file: File, kind: UploadKind): Promise<string> {
  const checked = checkImageFile(file);
  if (!checked.ok) throw new UploadError(checked.message);

  const dir = dirFor(kind);
  const filename = `${crypto.randomUUID()}.${checked.ext}`;
  const absolute = path.join(dir, filename);

  // The name is generated, never user-supplied — this is belt and braces.
  if (path.dirname(absolute) !== dir) {
    throw new UploadError("Invalid upload.");
  }

  await mkdir(dir, { recursive: true });
  await writeFile(absolute, Buffer.from(await file.arrayBuffer()));

  return `${uploadPrefix(kind)}${filename}`;
}

/** Thrown for user-fixable problems so callers can map it to a 422. */
export class UploadError extends Error {}

/**
 * Best-effort removal of a stored upload.
 *
 * Only paths that sit directly inside this kind's own directory are touched,
 * so a record pointing at a bundled `/images/...` asset is left alone.
 */
export async function deleteImage(publicPath: string | null | undefined, kind: UploadKind) {
  if (!publicPath) return;

  const prefix = uploadPrefix(kind);
  if (!publicPath.startsWith(prefix)) return;

  const dir = dirFor(kind);
  const absolute = path.join(process.cwd(), "public", publicPath);
  if (path.dirname(absolute) !== dir) return;

  await unlink(absolute).catch(() => undefined);
}
