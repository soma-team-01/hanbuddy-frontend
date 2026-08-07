"use client";

import type { ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";
import type { SiteNavRole } from "@/lib/auth/routes";
import { SessionRoleProvider } from "@/lib/auth/session-role-context";

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
  const isActivityCreation = pathname === "/my-activities/create";

  if (isActivityCreation) {
    return <SessionRoleProvider role={sessionRole}>{children}</SessionRoleProvider>;
  }

  return (
    <SessionRoleProvider role={sessionRole}>
      {header}
      <div className="flex flex-1 flex-col">{children}</div>
      {footer}
    </SessionRoleProvider>
  );
}
