"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { HistoryIcon, HomeIcon, PlusIcon, UsersIcon, UserIcon } from "@/components/ui/icons";

const LINKS = [
  { href: "/dashboard", labelKey: "dashboard", Icon: HomeIcon },
  { href: "/my-activities", labelKey: "myActivities", Icon: HistoryIcon },
  { href: "/my-activities", labelKey: "applicants", Icon: UsersIcon },
  { href: "/my-page", labelKey: "myPage", Icon: UserIcon },
] as const;

export function BuddySidebar() {
  const t = useTranslations("Navigation");
  const pathname = usePathname() ?? "";

  return (
    <aside className="hidden w-64 shrink-0 border-r border-line-soft bg-panel/45 lg:flex lg:flex-col">
      <div className="sticky top-[76px] flex min-h-[calc(100vh-76px)] flex-col p-5">
        <div className="mb-8 flex items-center gap-3 px-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary font-display font-extrabold text-white">
            H
          </span>
          <span className="font-display text-xl font-extrabold tracking-[-0.04em] text-ink">
            HanBuddy
          </span>
        </div>
        <nav aria-label={t("primaryNavigation")} className="flex flex-col gap-2">
          {LINKS.map(({ href, labelKey, Icon }) => {
            const active =
              labelKey === "applicants"
                ? pathname.startsWith("/my-activities/")
                : pathname === href || pathname.startsWith(`${href}/`);
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
          aria-label={`${t("createActivity")} from sidebar`}
          className="mt-6 flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary font-display text-sm font-bold text-white shadow-[0_10px_20px_rgba(209,63,50,0.2)] hover:bg-primary-hover"
        >
          <PlusIcon className="size-4" />
          {t("createActivity")}
        </Link>
        <div className="mt-auto border-t border-line-soft pt-5 text-xs text-muted">
          HanBuddy buddy workspace
        </div>
      </div>
    </aside>
  );
}
