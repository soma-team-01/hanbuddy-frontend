"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LogOutIcon } from "@/components/ui/icons";

export function LogoutButton() {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } catch {
      // Logout is best-effort; still return the user to the signed-out screen.
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        disabled={isLoggingOut}
        className="mx-auto mt-6 flex cursor-pointer items-center gap-2 text-base font-medium text-danger enabled:hover:underline disabled:cursor-not-allowed disabled:opacity-60"
      >
        <LogOutIcon className="size-4" />
        {isLoggingOut ? "Logging out..." : "Log Out"}
      </button>
      {showConfirm && (
        <ConfirmDialog
          title="Log out?"
          description="You can log back in anytime."
          confirmLabel="Log Out"
          isPending={isLoggingOut}
          onConfirm={() => void handleLogout()}
          onClose={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}
