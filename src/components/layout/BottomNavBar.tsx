"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CompassIcon, HomeIcon, UserIcon } from "@/components/ui/icons";

const TAB_SETS = {
  tourist: [
    { href: "/explore", label: "Home", Icon: HomeIcon },
    { href: "/applications", label: "Activity", Icon: CompassIcon },
    { href: "/my-page", label: "My Page", Icon: UserIcon },
  ],
  buddy: [
    { href: "/dashboard", label: "Home", Icon: HomeIcon },
    { href: "/my-activities", label: "Activity", Icon: CompassIcon },
    { href: "/my-page", label: "My Page", Icon: UserIcon },
  ],
} as const;

export function BottomNavBar({ role = "tourist" }: Readonly<{ role?: "tourist" | "buddy" }>) {
  const pathname = usePathname();
  const tabs = TAB_SETS[role];
  const activeHref = [...tabs]
    .filter((tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto flex h-20 w-full max-w-md items-center justify-between border-t border-line bg-cream px-9">
      {tabs.map(({ href, label, Icon }) => {
        const isActive = href === activeHref;
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={`flex w-20 flex-col items-center gap-1 rounded-xl px-4 py-1 font-display text-sm font-semibold ${
              isActive ? "bg-forest-soft text-sage" : "text-ink-soft"
            }`}
          >
            <Icon className="size-5" />
            <span className="text-center leading-5 whitespace-nowrap">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
