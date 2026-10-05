"use client";

import NextImage from "next/image";
import { useRef, useState } from "react";
import { Crop, ImagePlus, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { ImageCropDialog } from "@/components/shared/ImageCropDialog";
import {
  ACCEPT_ATTRIBUTE,
  MAX_UPLOAD_BYTES,
  type UploadKind,
} from "@/lib/upload-shared";

/**
 * Catalogue cards render 4:3, so images are cropped to that shape here and
 * stored at exactly the size the site displays. Cropping in the browser means
 * an admin can drop in any phone photo — portrait, landscape, or a screenshot
 * — and still get a correctly framed picture, without the original ever being
 * uploaded.
 */
const ASPECT = 4 / 3;
const OUTPUT_WIDTH = 1200;

export function ImageUploader({
  kind,
  value,
  onChange,
  error,
  label = "Image",
  hint = "JPG, PNG or WebP · up to 5 MB · cropped to 4:3 on upload",
  optional = false,
}: {
  kind: UploadKind;
  value: string;
  onChange: (url: string) => void;
  error?: string;
  label?: string;
  hint?: string;
  /** Categories do not require a picture. */
  optional?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset so picking the same file twice still fires onChange.
    event.target.value = "";
    if (!file || uploading) return;

    if (!ACCEPT_ATTRIBUTE.split(",").includes(file.type)) {
      toast.error("Unsupported file", "Please choose a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error("File too large", "Please choose an image under 5 MB.");
      return;
    }

    // Revoke the previous object URL so repeated picks do not leak memory.
    setCropSrc((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return URL.createObjectURL(file);
    });
  }

  function closeCropper() {
    setCropSrc((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return null;
    });
  }

  async function uploadCropped(blob: Blob) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("kind", kind);
      form.append(
        "file",
        blob,
        `${kind}.${blob.type === "image/webp" ? "webp" : "jpg"}`,
      );

      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        toast.error("Upload failed", json.error ?? "Please try another image.");
        return;
      }

      onChange(json.data.url);
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(
        "Upload failed",
        err instanceof Error ? err.message : "Please try another image.",
      );
    } finally {
      setUploading(false);
      closeCropper();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="flex items-center gap-1.5 font-label-tag text-label-tag uppercase tracking-widest text-text-muted">
        {optional ? null : <span className="text-border-active">*</span>}
        {label}
        {optional ? <span className="text-text-muted">· optional</span> : null}
      </span>

      <div className="border border-border-subtle bg-surface-deep p-2">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-deep">
          {value ? (
            <NextImage
              src={value}
              alt="Selected catalogue image"
              fill
              sizes="(max-width: 1024px) 100vw, 420px"
              unoptimized
              className="object-cover"
            />
          ) : (
            <span className="flex h-full w-full flex-col items-center justify-center gap-2 text-text-muted">
              <ImagePlus className="h-7 w-7" aria-hidden />
              <span className="font-label-tag text-label-tag uppercase tracking-widest">
                No image yet
              </span>
            </span>
          )}

          {uploading ? (
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface-deep/85">
              <Loader2 className="h-6 w-6 animate-spin text-tertiary" aria-hidden />
              <span className="font-label-tag text-label-tag uppercase tracking-widest text-text-secondary">
                Uploading
              </span>
            </span>
          ) : null}
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="flex-1"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            icon={value ? <Crop className="h-3.5 w-3.5" /> : <ImagePlus className="h-3.5 w-3.5" />}
          >
            {value ? "Recrop / replace" : "Choose image"}
          </Button>
          {value ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={uploading}
              onClick={() => onChange("")}
              aria-label="Remove image"
              icon={<Trash2 className="h-3.5 w-3.5" />}
            >
              Remove
            </Button>
          ) : null}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        onChange={handleFile}
        className="sr-only"
        aria-label={`Choose ${label.toLowerCase()}`}
      />

      {error ? (
        <p className="font-body-sm text-[12px] text-error">{error}</p>
      ) : (
        <p className="font-body-sm text-[12px] text-text-muted">{hint}</p>
      )}

      {cropSrc ? (
        <ImageCropDialog
          imageSrc={cropSrc}
          title={`Crop ${label.toLowerCase()}`}
          hint="Drag to position · scroll or slide to zoom"
          aspect={ASPECT}
          width={OUTPUT_WIDTH}
          confirmLabel="Use this image"
          onCancel={closeCropper}
          onCropped={uploadCropped}
        />
      ) : null}
    </div>
  );
}
