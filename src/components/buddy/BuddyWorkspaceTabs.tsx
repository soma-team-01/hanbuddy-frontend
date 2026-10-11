"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function BuddyWorkspaceTabs({ active }: Readonly<{ active: "home" | "activities" }>) {
  const t = useTranslations("Navigation");
  return (
    <nav
      aria-label={t("buddyWorkspace")}
      className="mb-6 flex gap-6 border-b border-line-soft md:mb-8"
    >
      {(
        [
          { key: "home", href: "/dashboard", label: t("home") },
          { key: "activities", href: "/my-activities", label: t("myActivities") },
        ] as const
      ).map(({ key, href, label }) => (
        <Link
          key={key}
          href={href}
          aria-current={active === key ? "page" : undefined}
          className={`-mb-px inline-flex min-h-11 items-center border-b-2 px-1 pb-2 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary ${active === key ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink"}`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
