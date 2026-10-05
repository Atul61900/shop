"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil, Trash2, X } from "lucide-react";
import type { Route } from "next";

import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

const ICON_BUTTON =
  "flex h-8 w-8 shrink-0 items-center justify-center border border-border-subtle text-text-muted transition-colors";

/**
 * Edit + delete for a dashboard row.
 *
 * Both live in a `shrink-0` action column at the end of the row while the
 * label column is `min-w-0 flex-1` with truncating text, so the controls can
 * never sit on top of the name no matter how long it gets. Confirmation is
 * inline rather than a native `confirm()` so it can explain itself, and the
 * list re-renders from the server afterwards so the counts stay honest.
 */
export function RowActions({
  kind,
  id,
  name,
  editHref,
}: {
  kind: "products" | "services" | "categories";
  id: string;
  name: string;
  editHref: Route | string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function remove() {
    if (pending) return;
    setPending(true);

    try {
      const res = await fetch(`/api/admin/${kind}/${id}`, { method: "DELETE" });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        toast.error("Could not delete", json.error ?? "Please try again.");
        setConfirming(false);
        return;
      }

      toast.success("Deleted", name);
      setConfirming(false);
      router.refresh();
    } catch {
      toast.error("Network error", "Please try again in a moment.");
    } finally {
      setPending(false);
    }
  }

  if (confirming) {
    return (
      <span className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          className="flex h-8 shrink-0 items-center gap-1.5 border border-error/40 bg-error-container/10 px-2.5 font-label-tag text-[11px] uppercase tracking-widest text-error transition-colors hover:bg-error hover:text-on-error disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Check className="h-3.5 w-3.5" aria-hidden />
          )}
          Delete
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          aria-label="Cancel delete"
          className={cn(ICON_BUTTON, "hover:border-border-active hover:text-text-primary")}
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </span>
    );
  }

  return (
    <span className="flex shrink-0 items-center gap-1">
      <Link
        href={editHref as Route}
        aria-label={`Edit ${name}`}
        className={cn(ICON_BUTTON, "hover:border-border-active hover:text-text-primary")}
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden />
      </Link>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={`Delete ${name}`}
        className={cn(ICON_BUTTON, "hover:border-error/50 hover:text-error")}
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
      </button>
    </span>
  );
}
