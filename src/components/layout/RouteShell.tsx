"use client";

import { Suspense, type ReactNode } from "react";
import { HaiBuddyLauncher, HaiBuddyProvider } from "@/components/hai-buddy/HaiBuddyLauncher";
import { usePathname } from "@/i18n/navigation";
import type { SiteNavRole } from "@/lib/auth/routes";
import { SessionRoleProvider } from "@/lib/auth/session-role-context";

export function RouteShell({
  header,
  children,
  footer,
  sessionRole,
  haiBuddyEnabled = false,
}: Readonly<{
  header: ReactNode;
  children: ReactNode;
  footer: ReactNode;
  sessionRole?: SiteNavRole | null;
  haiBuddyEnabled?: boolean;
}>) {
  const pathname = usePathname() ?? "";
  // 활동 생성·수정은 전체 화면 위저드라 전역 헤더/푸터를 렌더링하지 않는다
  const isFullScreenActivityForm =
    pathname === "/my-activities/create" || /^\/my-activities\/[^/]+\/edit$/.test(pathname);

  if (isFullScreenActivityForm) {
    return <SessionRoleProvider role={sessionRole}>{children}</SessionRoleProvider>;
  }

  const page = (
    <>
      {header}
      <div className="flex flex-1 flex-col">{children}</div>
      {footer}
    </>
  );

  return (
    <SessionRoleProvider role={sessionRole}>
      {haiBuddyEnabled ? (
        // 레이아웃에 붙어 있어 페이지를 옮겨도 패널과 대화가 유지된다. 화면 맥락은 검색 파라미터를 읽어 Suspense로 감싼다.
        <HaiBuddyProvider enabled>
          {page}
          <Suspense fallback={null}>
            <HaiBuddyLauncher />
          </Suspense>
        </HaiBuddyProvider>
      ) : (
        page
      )}
    </SessionRoleProvider>
  );
}
