"use client";

import type { ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";
import type { SiteNavRole } from "@/lib/auth/routes";
import { SessionRoleProvider } from "@/lib/auth/session-role-context";
import { DisplayCurrencyProvider } from "@/lib/display-currency-context";

export function RouteShell({
  header,
  children,
  footer,
  sessionRole,
}: Readonly<{
  header: ReactNode;
  children: ReactNode;
  footer: ReactNode;
  sessionRole?: SiteNavRole | null;
}>) {
  const pathname = usePathname() ?? "";
  // 활동 생성·수정은 전체 화면 위저드라 전역 헤더/푸터를 렌더링하지 않는다
  const isFullScreenActivityForm =
    pathname === "/my-activities/create" || /^\/my-activities\/[^/]+\/edit$/.test(pathname);

  if (isFullScreenActivityForm) {
    return (
      <DisplayCurrencyProvider>
        <SessionRoleProvider role={sessionRole}>{children}</SessionRoleProvider>
      </DisplayCurrencyProvider>
    );
  }

  return (
    <DisplayCurrencyProvider>
      <SessionRoleProvider role={sessionRole}>
        {header}
        <div className="flex flex-1 flex-col">{children}</div>
        {footer}
      </SessionRoleProvider>
    </DisplayCurrencyProvider>
  );
}
