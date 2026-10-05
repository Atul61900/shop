"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { Check, Loader2, X, ZoomIn } from "lucide-react";

import { Button } from "@/components/ui/Button";

/**
 * Shared crop dialog.
 *
 * Used by the profile picture and by catalogue imagery so there is one
 * implementation and one set of controls. The output dimensions are fixed, so
 * a 12 MP phone photo is cut down to exactly what the site renders — the
 * server never receives the original.
 */

/** Renders a cropped blob from an image URL plus a pixel crop area. */
export async function cropToBlob(
  imageSrc: string,
  pixels: Area,
  opts: {
    width: number;
    /** width / height, e.g. 4 / 3 for catalogue cards. */
    aspect: number;
    mime?: "image/jpeg" | "image/webp";
    quality?: number;
  },
): Promise<Blob> {
  const mime = opts.mime ?? "image/jpeg";

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read that image."));
    img.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width = opts.width;
  canvas.height = Math.round(opts.width / opts.aspect);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");

  ctx.imageSmoothingQuality = "high";
  // Flatten any transparency so a JPEG export never gains black edges.
  ctx.fillStyle = "#05070B";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(
    image,
    pixels.x,
    pixels.y,
    pixels.width,
    pixels.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, mime, opts.quality ?? 0.9),
  );
  if (!blob) throw new Error("Could not process that image.");
  return blob;
}

export function ImageCropDialog({
  imageSrc,
  title,
  hint,
  aspect = 1,
  width = 512,
  round = false,
  mime = "image/jpeg",
  confirmLabel = "Use this picture",
  onCancel,
  onCropped,
}: {
  imageSrc: string;
  title: string;
  hint: string;
  /** width / height of the crop frame. */
  aspect?: number;
  /** Output width in pixels; height follows the aspect. */
  width?: number;
  /** Circular mask, for the profile picture. */
  round?: boolean;
  mime?: "image/jpeg" | "image/webp";
  confirmLabel?: string;
  onCancel: () => void;
  onCropped: (blob: Blob) => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pixels, setPixels] = useState<Area | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleComplete = useCallback((_: Area, areaPixels: Area) => {
    setPixels(areaPixels);
  }, []);

  async function handleSave() {
    if (!pixels || working) return;
    setWorking(true);
    setError(null);
    try {
      onCropped(await cropToBlob(imageSrc, pixels, { width, aspect, mime }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not process that image.");
      setWorking(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-surface-deep/85 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="flex max-h-full w-full max-w-lg flex-col overflow-y-auto border border-border-subtle bg-surface-base shadow-panel-lg">
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
          <div>
            <h2 className="font-headline-sm text-headline-sm text-text-primary">
              {title}
            </h2>
            <p className="mt-1 font-body-sm text-[12px] text-text-muted">{hint}</p>
          </div>
          <button
            onClick={onCancel}
            aria-label="Cancel cropping"
            className="flex h-9 w-9 shrink-0 items-center justify-center border border-border-subtle text-text-muted transition-colors hover:border-border-active hover:text-text-primary"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div
          className="relative h-[320px] bg-surface-deep sm:h-[380px]"
          style={aspect !== 1 ? { aspectRatio: String(aspect) } : undefined}
        >
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={round ? "round" : "rect"}
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleComplete}
          />
        </div>

        <div className="flex items-center gap-3 border-t border-border-subtle px-5 py-4">
          <ZoomIn className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
          <label htmlFor="crop-zoom" className="sr-only">
            Zoom
          </label>
          <input
            id="crop-zoom"
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="h-1 flex-1 cursor-pointer appearance-none bg-surface-bright accent-[#0052FF]"
          />
        </div>

        {error ? (
          <p className="border-t border-error/40 bg-error-container/10 px-5 py-3 font-body-sm text-body-sm text-error">
            {error}
          </p>
        ) : null}

        <div className="flex gap-3 border-t border-border-subtle p-5">
          <Button variant="secondary" fullWidth onClick={onCancel} disabled={working}>
            Cancel
          </Button>
          <Button
            fullWidth
            onClick={handleSave}
            disabled={working || !pixels}
            icon={
              working ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )
            }
          >
            {working ? "Saving" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
