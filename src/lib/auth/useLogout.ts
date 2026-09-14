"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import type { UserType } from "@/lib/auth/types";

export function useLogout(userType: UserType) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function logout() {
    setIsLoggingOut(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } catch {
      // Logout is best-effort; still return the user to the signed-out screen.
    } finally {
      queryClient.clear();
      router.replace(userType === "BUDDY" ? "/buddy" : "/");
      router.refresh();
    }
  }

  return { isLoggingOut, logout };
}
