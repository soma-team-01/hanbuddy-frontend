"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminHeader() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function logout() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        throw new Error("Logout request failed");
      }
      router.replace("/admin/login");
      router.refresh();
    } catch {
      setError("로그아웃하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }
  return (
    <header className="border-b border-line-soft bg-white">
      <div className="mx-auto flex h-18 max-w-[1200px] items-center justify-between px-5 md:px-8">
        <Link
          href="/admin/buddies"
          className="flex items-center gap-3 font-display text-lg font-extrabold"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-sm text-white">
            H
          </span>
          HanBuddy{" "}
          <span className="font-sans text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            Admin
          </span>
        </Link>
        <div className="flex items-center gap-3">
          {error ? (
            <p role="alert" className="text-xs font-medium text-danger">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            onClick={logout}
            disabled={pending}
            className="rounded-full border border-line-strong px-4 py-2 text-sm font-semibold transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
          >
            {pending ? "로그아웃 중" : "로그아웃"}
          </button>
        </div>
      </div>
    </header>
  );
}
