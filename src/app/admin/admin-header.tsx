"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { UsersIcon } from "@/components/ui/icons";

export function AdminHeader() {
  const router = useRouter();
  const pathname = usePathname();
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
  const memberActive =
    pathname.startsWith("/admin/users") ||
    pathname.startsWith("/admin/buddies") ||
    pathname.startsWith("/admin/buddy-applications");

  return (
    <aside className="z-40 flex min-h-[68px] items-center justify-between gap-2 border-b border-line-soft bg-white px-5 sm:gap-4 lg:sticky lg:top-0 lg:h-screen lg:flex-col lg:items-stretch lg:border-r lg:border-b-0 lg:px-5 lg:py-5">
      <div>
        <Link
          href="/admin/users"
          aria-label="HanBuddy Admin"
          className="flex items-center gap-2.5 font-display text-lg font-extrabold tracking-[-0.04em]"
        >
          <Image
            src="/images/brand/logo-borderless.webp"
            alt=""
            width={36}
            height={36}
            priority
            className="size-9"
          />
          <span>HanBuddy</span>
        </Link>
      </div>

      <nav aria-label="관리자 메뉴" className="ml-auto lg:ml-0 lg:flex-1 lg:pt-8">
        <Link
          href="/admin/users"
          aria-current={memberActive ? "page" : undefined}
          className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors lg:gap-3 ${
            memberActive
              ? "bg-primary-soft text-primary-strong"
              : "text-muted hover:bg-panel hover:text-ink"
          }`}
        >
          <UsersIcon className="hidden size-5 lg:block" />
          회원 관리
        </Link>
      </nav>

      <div className="flex items-center gap-2 lg:block lg:border-t lg:border-line-soft lg:pt-4">
        <div className="lg:mt-2">
          {error ? (
            <p
              role="alert"
              className="fixed inset-x-4 top-20 rounded-xl border border-danger/20 bg-white px-4 py-3 text-xs font-medium text-danger shadow-lg lg:static lg:mb-2 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:shadow-none"
            >
              {error}
            </p>
          ) : null}
          <button
            type="button"
            onClick={logout}
            disabled={pending}
            className="rounded-full border border-line-strong px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-primary hover:text-primary disabled:opacity-50 lg:w-full lg:rounded-xl"
          >
            {pending ? "로그아웃 중" : "로그아웃"}
          </button>
        </div>
      </div>
    </aside>
  );
}
