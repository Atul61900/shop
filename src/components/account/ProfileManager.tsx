"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Save, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Primitives";
import { useToast } from "@/components/ui/Toast";
import { AvatarCropDialog } from "./AvatarCropper";

type Address = {
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

const PROVINCES = [
  "Bagmati",
  "Koshi",
  "Madhesh",
  "Lumbini",
  "Karnali",
  "Sudurpashchim",
  "Gandaki",
];

export function ProfileManager({
  user,
  addresses,
}: {
  user: { name: string; email: string; phone: string | null; avatarUrl: string | null };
  addresses: Address[];
}) {
  const router = useRouter();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);

  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);

  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({});
  const [savingAddress, setSavingAddress] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setSavingProfile(true);
    setProfileErrors({});

    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        setProfileErrors(json.fields ?? {});
        toast.error("Could not save", json.error);
        return;
      }

      toast.success("Profile updated");
      router.refresh();
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveAddress(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingAddress(true);
    setAddressErrors({});

    const data = Object.fromEntries(new FormData(event.currentTarget).entries());

    try {
      const res = await fetch("/api/account/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        setAddressErrors(json.fields ?? {});
        toast.error("Could not save address", json.error);
        return;
      }

      toast.success("Address saved", json.data?.isDefault ? "Set as your default." : undefined);
      event.currentTarget.reset();
      router.refresh();
    } finally {
      setSavingAddress(false);
    }
  }

  async function removeAddress(id: string) {
    setRemovingId(id);
    try {
      const res = await fetch(`/api/account/addresses/${id}`, { method: "DELETE" });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        toast.error("Could not delete", json.error);
        return;
      }
      toast.success("Address removed");
      router.refresh();
    } finally {
      setRemovingId(null);
    }
  }

  async function makeDefault(id: string) {
    const res = await fetch(`/api/account/addresses/${id}/default`, { method: "POST" });
    const json = await res.json();

    if (!res.ok || !json.ok) {
      toast.error("Could not update", json.error);
      return;
    }
    toast.success("Default address updated");
    router.refresh();
  }

  const profileDirty = name !== user.name || phone !== (user.phone ?? "");

  function onFileChosen(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset so picking the same file twice still fires onChange.
    event.target.value = "";
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Unsupported file", "Please choose a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large", "Please choose an image under 5 MB.");
      return;
    }
    // Revoke the previous object URL so repeated picks do not leak memory.
    setCropSrc((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return URL.createObjectURL(file);
    });
  }

  async function uploadCropped(blob: Blob) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", blob, "avatar.jpg");

      const res = await fetch("/api/account/avatar", { method: "POST", body: form });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        toast.error("Could not save picture", json.error);
        return;
      }
      setAvatarUrl(json.data.avatarUrl);
      toast.success("Profile picture updated");
      router.refresh();
    } finally {
      setUploading(false);
      setCropSrc((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return null;
      });
    }
  }

  async function removeAvatar() {
    if (removingAvatar) return;
    setRemovingAvatar(true);
    try {
      const res = await fetch("/api/account/avatar", { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error("Could not remove picture", json.error);
        return;
      }
      setAvatarUrl(null);
      toast.success("Profile picture removed");
      router.refresh();
    } finally {
      setRemovingAvatar(false);
    }
  }

  return (
    <div className="flex flex-col gap-gutter">
      {/* ---- Avatar ---- */}
      <section className="border border-border-subtle bg-surface-card">
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border-subtle bg-surface-deep">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={`${user.name}’s profile picture`}
                fill
                sizes="80px"
                className="object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center font-headline-sm text-headline-sm font-bold text-text-primary">
                {user.name.charAt(0).toUpperCase()}
              </span>
            )}
            {uploading ? (
              <span className="absolute inset-0 flex items-center justify-center bg-surface-deep/70">
                <Loader2 className="h-5 w-5 animate-spin text-tertiary" aria-hidden />
              </span>
            ) : null}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <h2 className="font-headline-sm text-headline-sm text-text-primary">
              Profile picture
            </h2>
            <p className="font-body-sm text-body-sm text-text-muted">
              Square-cropped on your device before upload. JPG, PNG or WebP, up to 5&nbsp;MB.
            </p>
            <div className="mt-2 flex flex-wrap gap-2.5">
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={onFileChosen}
                className="sr-only"
                aria-label="Choose a profile picture"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
                icon={<Camera className="h-3.5 w-3.5" aria-hidden />}
              >
                {avatarUrl ? "Change picture" : "Upload picture"}
              </Button>
              {avatarUrl ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removeAvatar}
                  disabled={uploading || removingAvatar}
                  icon={
                    removingAvatar ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    )
                  }
                >
                  Remove
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {cropSrc ? (
        <AvatarCropDialog
          imageSrc={cropSrc}
          onCancel={() =>
            setCropSrc((previous) => {
              if (previous) URL.revokeObjectURL(previous);
              return null;
            })
          }
          onCropped={uploadCropped}
        />
      ) : null}

      {/* ---- Profile ---- */}
      <form onSubmit={saveProfile} className="border border-border-subtle bg-surface-card">
        <div className="flex items-center justify-between border-b border-border-subtle p-6">
          <h2 className="font-headline-sm text-headline-sm text-text-primary">
            Personal details
          </h2>
        </div>

        <div className="flex flex-col gap-5 p-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input
              label="Full name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              error={profileErrors.name}
            />
            <Input label="Email" value={user.email} disabled hint="Contact us to change this" />
          </div>

          <Input
            label="Phone"
            name="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="98XXXXXXXX"
            error={profileErrors.phone}
            hint="Used for repair notifications and delivery calls"
          />

          <div className="flex justify-end border-t border-border-subtle pt-5">
            <Button
              type="submit"
              disabled={!profileDirty || savingProfile}
              icon={savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            >
              {savingProfile ? "Saving" : "Save changes"}
            </Button>
          </div>
        </div>
      </form>

      {/* ---- Addresses ---- */}
      <div className="border border-border-subtle bg-surface-card">
        <div className="flex items-center justify-between border-b border-border-subtle p-6">
          <h2 className="font-headline-sm text-headline-sm text-text-primary">
            Delivery addresses
          </h2>
          <span className="font-label-tag text-label-tag text-text-muted">
            {addresses.length} SAVED
          </span>
        </div>

        {addresses.length > 0 ? (
          <ul className="divide-y divide-border-subtle">
            {addresses.map((address) => (
              <li key={address.id} className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-label-button text-label-button uppercase tracking-wider text-text-primary">
                        {address.label}
                      </span>
                      {address.isDefault ? <Badge tone="cyan">Default</Badge> : null}
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

                  <div className="flex items-center gap-2">
                    {!address.isDefault ? (
                      <button
                        onClick={() => makeDefault(address.id)}
                        className="font-label-tag text-label-tag uppercase tracking-widest text-text-muted transition-colors hover:text-tertiary"
                      >
                        Make default
                      </button>
                    ) : null}
                    <button
                      onClick={() => removeAddress(address.id)}
                      disabled={removingId === address.id}
                      aria-label={`Delete ${address.label} address`}
                      className="flex h-9 w-9 items-center justify-center border border-border-subtle text-text-muted transition-colors hover:border-error hover:text-error disabled:opacity-50"
                    >
                      {removingId === address.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      )}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {/* Add new */}
        <form onSubmit={saveAddress} className="border-t border-border-subtle p-6">
          <div className="mb-5 flex items-center gap-2">
            <Plus className="h-3.5 w-3.5 text-tertiary" aria-hidden />
            <span className="font-label-button text-label-button uppercase tracking-widest text-text-primary">
              Add an address
            </span>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input
              label="Label"
              name="label"
              defaultValue="Home"
              error={addressErrors.label}
              hint="Home, Office, Parents’ place…"
            />
            <Input
              label="Contact name"
              name="contactName"
              required
              defaultValue={user.name}
              error={addressErrors.contactName}
            />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input label="Phone" name="phone" type="tel" required error={addressErrors.phone} />
            <Input
              label="Street address"
              name="line1"
              required
              placeholder="House / building, street"
              error={addressErrors.line1}
            />
          </div>

          <div className="mt-5">
            <Input
              label="Area (optional)"
              name="line2"
              placeholder="Ward, landmark area"
              error={addressErrors.line2}
            />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Input label="City" name="city" required defaultValue="Kathmandu" error={addressErrors.city} />
            <Select label="Province" name="province" required defaultValue="Bagmati" error={addressErrors.province}>
              {PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
            <Input
              label="Postal code"
              name="postalCode"
              inputMode="numeric"
              placeholder="44600"
              error={addressErrors.postalCode}
            />
          </div>

          <div className="mt-5">
            <Input
              label="Landmark (optional)"
              name="landmark"
              placeholder="Near the blue temple…"
              error={addressErrors.landmark}
            />
          </div>

          <label className="mt-5 flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              name="isDefault"
              value="on"
              className="h-4 w-4 cursor-pointer appearance-none border border-border-strong bg-surface-base transition-all checked:border-border-active checked:bg-primary-container"
            />
            <span className="font-body-sm text-body-sm text-text-secondary">
              Make this my default delivery address
            </span>
          </label>

          <div className="mt-6 flex justify-end border-t border-border-subtle pt-5">
            <Button
              type="submit"
              disabled={savingAddress}
              icon={savingAddress ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            >
              {savingAddress ? "Saving" : "Add address"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}