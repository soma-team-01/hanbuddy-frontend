"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { UsersIcon } from "@/components/ui/icons";

export function AdminSiteHeader({ authenticated }: Readonly<{ authenticated: boolean }>) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const memberActive =
    pathname.startsWith("/admin/users") ||
    pathname.startsWith("/admin/buddies") ||
    pathname.startsWith("/admin/buddy-applications");

  async function logout() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Logout request failed");
      router.replace("/admin/login");
      router.refresh();
    } catch {
      setError("로그아웃하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }

  const logo = (
    <Link
      href={authenticated ? "/admin/users" : "/admin/login"}
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
  );

  if (!authenticated) {
    return (
      <header className="sticky top-0 z-40 border-b border-line-soft bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[76px] max-w-[1200px] items-center justify-between px-5 md:px-8">
          {logo}
          <span className="rounded-full border border-line-soft px-3 py-1.5 text-xs font-semibold tracking-[0.14em] text-muted uppercase">
            Admin
          </span>
        </div>
      </header>
    );
  }

  const navigation = (
    <nav aria-label="관리자 메뉴" className="flex flex-col gap-1">
      <Link
        href="/admin/users"
        aria-current={memberActive ? "page" : undefined}
        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${
          memberActive
            ? "bg-primary-soft text-primary-strong"
            : "text-muted hover:bg-panel hover:text-ink"
        }`}
      >
        <UsersIcon className="size-5" />
        회원 관리
      </Link>
    </nav>
  );

  const logoutButton = (
    <button
      type="button"
      onClick={logout}
      disabled={pending}
      className="w-full rounded-xl border border-line-strong px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
    >
      {pending ? "로그아웃 중" : "로그아웃"}
    </button>
  );

  return (
    <>
      {error ? (
        <p
          role="alert"
          className="fixed inset-x-4 top-20 z-50 rounded-xl border border-danger/20 bg-white px-4 py-3 text-center text-xs font-medium text-danger shadow-lg lg:top-auto lg:right-auto lg:bottom-4 lg:left-4 lg:w-[188px]"
        >
          {error}
        </p>
      ) : null}

      <header className="sticky top-0 z-40 border-b border-line-soft bg-white/95 px-5 backdrop-blur lg:hidden">
        <div className="flex h-[68px] items-center justify-between">
          {logo}
          <MobileMenu
            title="관리자 메뉴"
            openLabel="관리자 메뉴 열기"
            closeLabel="관리자 메뉴 닫기"
          >
            {navigation}
            <div className="mt-auto border-t border-line-soft pt-5">{logoutButton}</div>
          </MobileMenu>
        </div>
      </header>

      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line-soft bg-white px-5 py-5 lg:flex">
        {logo}
        <div className="flex-1 pt-8">{navigation}</div>
        <div className="border-t border-line-soft pt-4">{logoutButton}</div>
      </aside>
    </>
  );
}
