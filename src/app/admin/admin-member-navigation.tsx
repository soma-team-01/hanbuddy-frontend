"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminMemberNavigation() {
  const pathname = usePathname();
  const buddyActive =
    pathname.startsWith("/admin/buddies") || pathname.startsWith("/admin/buddy-applications");

  return (
    <div className="border-b border-line-soft">
      <nav aria-label="회원 역할 선택" className="flex gap-6">
        <RoleLink href="/admin/users" active={!buddyActive}>
          관광객
        </RoleLink>
        <RoleLink href="/admin/buddies" active={buddyActive}>
          버디
        </RoleLink>
      </nav>
    </div>
  );
}

function RoleLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`border-b-2 pb-2.5 text-sm font-bold transition-colors ${
        active
          ? "border-primary text-ink"
          : "border-transparent text-muted hover:border-primary-soft hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}
