"use client";

import {
  ImageCropDialog,
  cropToBlob,
} from "@/components/shared/ImageCropDialog";

export const AVATAR_SIZE = 512;

/**
 * Renders a cropped square JPEG blob from an image + pixel crop area.
 * Output is fixed at 512px so uploads stay small regardless of source size.
 */
export function cropToAvatar(imageSrc: string, pixels: Parameters<typeof cropToBlob>[1]) {
  return cropToBlob(imageSrc, pixels, {
    width: AVATAR_SIZE,
    aspect: 1,
    mime: "image/jpeg",
    quality: 0.9,
  });
}

/**
 * Full-screen crop dialog for the profile picture. The round preview matches
 * the circular avatar display, so what you see is exactly what the header and
 * account page will show.
 *
 * The implementation lives in the shared dialog so catalogue images crop the
 * same way.
 */
export function AvatarCropDialog({
  imageSrc,
  onCancel,
  onCropped,
}: {
  imageSrc: string;
  onCancel: () => void;
  onCropped: (blob: Blob) => void;
}) {
  return (
    <ImageCropDialog
      imageSrc={imageSrc}
      title="Crop your picture"
      hint="Drag to position · scroll or slide to zoom"
      aspect={1}
      width={AVATAR_SIZE}
      round
      mime="image/jpeg"
      confirmLabel="Use this picture"
      onCancel={onCancel}
      onCropped={onCropped}
    />
  );
}
