import { getCurrentUser, isAdmin } from "@/lib/auth";
import { UploadError, saveImage } from "@/lib/uploads";
import { isUploadKind } from "@/lib/upload-shared";
import { recordAdminAction } from "@/lib/audit";
import { clientIp, fail, guarded, ok, rateLimit } from "@/lib/api";

/**
 * POST /api/admin/upload
 * Body: multipart FormData with `file` and `kind` ("products" | "services").
 *
 * Returns the public path to store on the record. Kept separate from the
 * create endpoints so the admin form can show a preview before committing.
 */
export async function POST(request: Request) {
  return guarded(async () => {
    const user = await getCurrentUser();
    if (!user) return fail("You must be signed in.", 401);
    if (!isAdmin(user)) return fail("Administrator access required.", 403);

    const limit = rateLimit(`admin-upload:${user.id}:${clientIp(request)}`, 60, 60 * 60 * 1000);
    if (!limit.allowed) {
      return fail("Too many uploads. Please try again later.", 429);
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return fail("Invalid upload.", 400);
    }

    const kind = form.get("kind");
    if (!isUploadKind(kind)) {
      return fail("Invalid upload target.", 400, { image: "Unknown upload target" });
    }

    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return fail("Choose an image to upload.", 400, { image: "No file received" });
    }

    try {
      const url = await saveImage(file, kind);
      await recordAdminAction({
        actor: user.email,
        action: "IMAGE_UPLOADED",
        target: url,
        detail: `${kind} · ${file.type}`,
        ip: clientIp(request),
      });
      return ok({ url }, { status: 201 });
    } catch (err) {
      if (err instanceof UploadError) {
        return fail(err.message, 422, { image: err.message });
      }
      throw err;
    }
  });
}
