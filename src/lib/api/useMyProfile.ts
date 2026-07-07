"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getMyProfile, type MyProfileResult } from "./users";

/** 내 프로필을 로드한다. 미인증 세션이면 로그인 화면으로 보내고 결과를 null로 유지한다. */
export function useMyProfile() {
  const router = useRouter();
  const [result, setResult] = useState<MyProfileResult | null>(null);

  useEffect(() => {
    let cancelled = false;

    getMyProfile().then((profileResult) => {
      if (cancelled) return;

      if (profileResult.status === "unauthenticated") {
        router.replace("/login");
        return;
      }

      setResult(profileResult);
    });

    return () => {
      cancelled = true;
    };
  }, [router]);

  return result;
}
