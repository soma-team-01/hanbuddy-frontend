"use client";

import { usePathname } from "@/i18n/navigation";
import type { SiteNavRole } from "@/lib/auth/routes";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";

interface FooterLocaleSwitcherProps {
  readonly role?: SiteNavRole | null;
}

export function FooterLocaleSwitcher({ role = null }: FooterLocaleSwitcherProps) {
  const pathname = usePathname();
  const isBuddyArea = pathname === "/buddy" || pathname.startsWith("/buddy/");

  if (role === "buddy" || isBuddyArea) return null;

  return <LocaleSwitcher labelStyle="nameWithCode" variant="footer" />;
}
