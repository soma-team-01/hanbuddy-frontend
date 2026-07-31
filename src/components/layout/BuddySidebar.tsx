"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { HistoryIcon, HomeIcon, PlusIcon, UserIcon } from "@/components/ui/icons";

const LINKS = [
  { href: "/dashboard", labelKey: "dashboard", Icon: HomeIcon },
  { href: "/my-activities", labelKey: "myActivities", Icon: HistoryIcon },
  { href: "/my-page", labelKey: "myPage", Icon: UserIcon },
] as const;

export function BuddySidebar() {
  const t = useTranslations("Navigation");
  const pathname = usePathname() ?? "";

  return (
    <aside className="hidden w-64 shrink-0 border-r border-line-soft bg-panel/45 lg:flex lg:flex-col">
      <div className="sticky top-[76px] flex min-h-[calc(100vh-76px)] flex-col p-5">
        <p className="mb-4 px-4 text-xs font-bold tracking-[0.16em] text-primary-strong uppercase">
          {t("buddyWorkspace")}
        </p>
        <nav aria-label={t("primaryNavigation")} className="flex flex-col gap-2">
          {LINKS.map(({ href, labelKey, Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={labelKey}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm font-bold transition-colors ${active ? "bg-primary-soft text-primary-strong" : "text-muted hover:bg-primary-soft/60 hover:text-ink"}`}
              >
                <Icon className="size-5" />
                {t(labelKey)}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/my-activities/create"
          aria-label={t("createActivity")}
          className="mt-6 flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary font-display text-sm font-bold text-on-primary shadow-[0_10px_20px_rgba(209,63,50,0.2)] hover:bg-primary-hover"
        >
          <PlusIcon className="size-4" />
          {t("createActivity")}
        </Link>
        <div className="mt-auto border-t border-line-soft pt-5 text-xs text-muted">
          {t("buddyWorkspace")}
        </div>
      </div>
    </aside>
  );
}
