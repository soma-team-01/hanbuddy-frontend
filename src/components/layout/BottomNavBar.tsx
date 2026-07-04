"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CompassIcon, HistoryIcon, UserIcon } from "@/components/ui/icons";

const TABS = [
  { href: "/explore", label: "Explore", Icon: CompassIcon },
  { href: "/history", label: "History", Icon: HistoryIcon },
  { href: "/my-page", label: "My Page", Icon: UserIcon },
] as const;

export function BottomNavBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto flex h-20 w-full max-w-md items-center justify-between border-t border-line bg-cream px-9">
      {TABS.map(({ href, label, Icon }) => {
        const isActive = pathname.startsWith(href);
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
            <span className="text-center leading-5">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
