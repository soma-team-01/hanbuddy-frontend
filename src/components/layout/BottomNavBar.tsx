"use client";

import { useTranslations } from "next-intl";
import { CompassIcon, HomeIcon, UserIcon } from "@/components/ui/icons";
import { Link, usePathname } from "@/i18n/navigation";

const TAB_SETS = {
  tourist: [
    { href: "/explore", labelKey: "home", Icon: HomeIcon },
    { href: "/applications", labelKey: "activity", Icon: CompassIcon },
    { href: "/my-page", labelKey: "myPage", Icon: UserIcon },
  ],
  buddy: [
    { href: "/dashboard", labelKey: "home", Icon: HomeIcon },
    { href: "/my-activities", labelKey: "activity", Icon: CompassIcon },
    { href: "/my-page", labelKey: "myPage", Icon: UserIcon },
  ],
} as const;

export function BottomNavBar({ role = "tourist" }: Readonly<{ role?: "tourist" | "buddy" }>) {
  const t = useTranslations("Navigation");
  const pathname = usePathname();
  const tabs = TAB_SETS[role];
  const activeHref = [...tabs]
    .filter((tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const activeIndex = tabs.findIndex((tab) => tab.href === activeHref);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto flex h-20 w-full max-w-md items-center border-t border-line bg-cream px-9">
      <div className="relative grid w-full grid-cols-3">
        {activeIndex >= 0 ? (
          <span
            aria-hidden
            className="motion-nav-indicator pointer-events-none absolute inset-y-0 left-0 w-1/3"
            style={{ transform: `translateX(${activeIndex * 100}%)` }}
          >
            <span className="mx-auto block h-full w-20 rounded-xl bg-forest-soft" />
          </span>
        ) : null}
        {tabs.map(({ href, labelKey, Icon }) => {
          const isActive = href === activeHref;
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={`relative z-1 mx-auto flex w-20 flex-col items-center gap-1 rounded-xl px-4 py-1 font-display text-sm font-semibold transition-colors ${
                isActive ? "text-sage" : "text-ink-soft hover:bg-chip hover:text-ink"
              }`}
            >
              <span className="motion-nav-icon" data-active={isActive}>
                <Icon className="size-5" />
              </span>
              <span className="text-center leading-5 whitespace-nowrap">{t(labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
