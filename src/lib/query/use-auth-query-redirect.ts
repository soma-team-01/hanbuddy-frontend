"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { UnauthenticatedQueryError } from "./result";

export function useAuthQueryRedirect(error: Error | null) {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (error instanceof UnauthenticatedQueryError) {
      queryClient.clear();
      router.replace("/login");
      router.refresh();
    }
  }, [error, queryClient, router]);
}
