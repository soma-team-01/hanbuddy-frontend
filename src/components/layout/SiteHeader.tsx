"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { MobileMenu } from "./MobileMenu";
import { PageContainer } from "./PageContainer";

export type SiteRole = "tourist" | "buddy" | null;

const DESTINATIONS = {
  tourist: [
    { href: "/explore", labelKey: "explore" },
    { href: "/applications", labelKey: "applications" },
    { href: "/my-page", labelKey: "myPage" },
  ],
  buddy: [
    { href: "/dashboard", labelKey: "dashboard" },
    { href: "/my-activities", labelKey: "myActivities" },
    { href: "/my-page", labelKey: "myPage" },
  ],
  guest: [{ href: "/explore", labelKey: "explore" }],
} as const;

interface SiteHeaderProps {
  role?: SiteRole;
  authenticated?: boolean;
}

export function SiteHeader({
  role = null,
  authenticated = Boolean(role),
}: Readonly<SiteHeaderProps>) {
  const t = useTranslations("Navigation");
  const pathname = usePathname();
  const destinations = DESTINATIONS[role ?? "guest"];

  const navigationLinks = destinations.map(({ href, labelKey }) => {
    const isActive = pathname === href || pathname.startsWith(`${href}/`);

    return (
      <Link
        key={href}
        href={href}
        aria-current={isActive ? "page" : undefined}
        className={`border-b-2 px-1 py-3 text-sm font-semibold transition-colors ${
          isActive
            ? "border-primary text-primary-strong"
            : "border-transparent text-muted hover:border-primary-soft hover:text-ink"
        }`}
      >
        {t(labelKey)}
      </Link>
    );
  });

  return (
    <header className="sticky top-0 z-40 border-b border-line-soft bg-canvas/95 backdrop-blur">
      <PageContainer className="flex h-16 items-center justify-between gap-5 lg:h-18">
        <Link href="/" aria-label="HanBuddy" className="flex shrink-0 items-center gap-2">
          <Image
            src="/images/brand/logo-borderless.webp"
            alt=""
            width={36}
            height={36}
            priority
            className="size-9"
          />
          <span className="font-display text-xl font-extrabold tracking-[-0.04em] text-primary-strong">
            HanBuddy
          </span>
        </Link>

        <nav aria-label={t("primaryNavigation")} className="hidden items-center gap-7 lg:flex">
          {navigationLinks}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <LocaleSwitcher />
          {!authenticated ? (
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-bold text-on-primary transition-colors hover:bg-primary-hover"
            >
              {t("login")}
            </Link>
          ) : null}
        </div>

        <MobileMenu
          title={t("navigationMenu")}
          openLabel={t("openMenu")}
          closeLabel={t("closeMenu")}
        >
          <nav aria-label={t("primaryNavigation")} className="flex flex-col gap-1">
            {navigationLinks}
          </nav>
          <div className="mt-auto flex flex-col gap-3 border-t border-line-soft pt-5">
            <LocaleSwitcher dismissMenu className="justify-start px-1" />
            {!authenticated ? (
              <Link
                href="/login"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-bold text-on-primary transition-colors hover:bg-primary-hover"
              >
                {t("login")}
              </Link>
            ) : null}
          </div>
        </MobileMenu>
      </PageContainer>
    </header>
  );
}
