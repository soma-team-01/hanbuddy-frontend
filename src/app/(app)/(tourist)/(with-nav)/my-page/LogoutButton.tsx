"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOutIcon } from "@/components/ui/icons";

export function LogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="mx-auto mt-6 flex cursor-pointer items-center gap-2 text-base font-medium text-danger disabled:cursor-not-allowed disabled:opacity-60"
    >
      <LogOutIcon className="size-4" />
      {isLoggingOut ? "Logging out..." : "Log Out"}
    </button>
  );
}
