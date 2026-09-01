"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

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
  const navigation = [
    { href: "/admin/users", label: "회원" },
    { href: "/admin/buddies", label: "버디" },
    { href: "/admin/buddy-applications", label: "승인 관리" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line-soft bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-18 max-w-[1200px] flex-wrap items-center justify-between gap-x-5 px-5 md:px-8">
        <Link
          href="/admin/users"
          className="flex items-center gap-3 font-display text-lg font-extrabold"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary font-display text-sm text-white shadow-sm">
            H
          </span>
          HanBuddy{" "}
          <span className="font-sans text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            Admin
          </span>
        </Link>
        <nav className="order-3 flex w-full gap-1 overflow-x-auto border-t border-line-soft py-2 md:order-none md:w-auto md:border-0 md:py-0">
          {navigation.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors ${active ? "bg-primary-soft text-primary-strong" : "text-muted hover:text-primary"}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
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
