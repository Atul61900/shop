import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clientIp, fail, guarded, ok, rateLimit } from "@/lib/api";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB — the crop step outputs ~100 KB
const ALLOWED = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "avatars");

/**
 * POST /api/account/avatar
 * Body: multipart FormData with a single `file` field.
 *
 * The browser crops to a square before upload (see AvatarCropper), so the
 * server only has to validate and store. Files live under public/uploads and
 * the DB keeps just the public path — swapping to S3/R2 later only changes
 * this one module.
 */
export async function POST(request: Request) {
  return guarded(async () => {
    const user = await getCurrentUser();
    if (!user) return fail("You must be signed in.", 401);

    const limit = rateLimit(`avatar:${user.id}:${clientIp(request)}`, 10, 60 * 60 * 1000);
    if (!limit.allowed) {
      return fail("Too many uploads. Please try again later.", 429);
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return fail("Invalid upload.", 400);
    }

    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return fail("Choose an image to upload.", 400, { file: "No file received" });
    }

    const ext = ALLOWED.get(file.type);
    if (!ext) {
      return fail("Only JPG, PNG or WebP images are accepted.", 422, {
        file: "Unsupported file type",
      });
    }
    if (file.size > MAX_BYTES) {
      return fail("Images must be smaller than 5 MB.", 422, {
        file: "File too large",
      });
    }

    const filename = `${crypto.randomUUID()}.${ext}`;
    const absolute = path.join(UPLOAD_DIR, filename);

    // Belt and braces: the name is generated, never user-supplied, so the
    // resolved path cannot escape the upload directory.
    if (path.dirname(absolute) !== UPLOAD_DIR) {
      return fail("Invalid upload.", 400);
    }

    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(absolute, Buffer.from(await file.arrayBuffer()));

    const previous = await prisma.user.findUnique({
      where: { id: user.id },
      select: { avatarUrl: true },
    });

    const avatarUrl = `/uploads/avatars/${filename}`;
    await prisma.user.update({ where: { id: user.id }, data: { avatarUrl } });

    // Best-effort cleanup of the replaced picture.
    if (previous?.avatarUrl?.startsWith("/uploads/avatars/")) {
      const oldAbsolute = path.join(process.cwd(), "public", previous.avatarUrl);
      if (path.dirname(oldAbsolute) === UPLOAD_DIR) {
        await unlink(oldAbsolute).catch(() => undefined);
      }
    }

    return ok({ avatarUrl }, { status: 201 });
  });
}

/** DELETE /api/account/avatar — remove the picture and revert to initials. */
export async function DELETE() {
  return guarded(async () => {
    const user = await getCurrentUser();
    if (!user) return fail("You must be signed in.", 401);

    const current = await prisma.user.findUnique({
      where: { id: user.id },
      select: { avatarUrl: true },
    });

    await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: null } });

    if (current?.avatarUrl?.startsWith("/uploads/avatars/")) {
      const absolute = path.join(process.cwd(), "public", current.avatarUrl);
      if (path.dirname(absolute) === UPLOAD_DIR) {
        await unlink(absolute).catch(() => undefined);
      }
    }

    return ok({ removed: true });
  });
}