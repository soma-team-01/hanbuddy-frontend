"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { UnauthenticatedQueryError } from "./result";

export function useAuthQueryRedirect(error: Error | null) {
  const router = useRouter();

  useEffect(() => {
    if (error instanceof UnauthenticatedQueryError) {
      router.replace("/login");
    }
  }, [error, router]);
}
