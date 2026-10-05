"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";

import { useToast } from "@/components/ui/Toast";
import { useCartStore } from "@/store/cart";

export function LogoutButton() {
  const router = useRouter();
  const toast = useToast();
  const clear = useCartStore((s) => s.clear);
  const [pending, setPending] = useState(false);

  async function signOut() {
    if (pending) return;
    setPending(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
      clear();
      toast.success("Signed out", "See you next time.");
      router.push("/");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      onClick={signOut}
      disabled={pending}
      className="flex w-full items-center gap-3 px-4 py-3 font-label-button text-label-button uppercase tracking-wider text-text-muted transition-colors hover:bg-surface-card-hover hover:text-error disabled:opacity-50"
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <LogOut className="h-4 w-4" aria-hidden />
      )}
      Sign out
    </button>
  );
}