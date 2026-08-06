"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { getMyProfile } from "@/lib/api/users";
import { getUserTypeNavRole } from "@/lib/auth/routes";
import type { MyProfile } from "@/types/user";
import { Avatar } from "../ui/Avatar";
import { UserIcon } from "../ui/icons";
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
    { href: "/home", labelKey: "home" },
    { href: "/dashboard", labelKey: "dashboard" },
    { href: "/my-activities", labelKey: "myActivities" },
    { href: "/my-page", labelKey: "myPage" },
  ],
  guest: [
    { href: "/", labelKey: "home" },
    { href: "/explore", labelKey: "explore" },
  ],
} as const;

const LOGO_DESTINATIONS = {
  tourist: "/explore",
  buddy: "/dashboard",
  guest: "/",
} as const;

interface SiteHeaderProps {
  role?: SiteRole;
  authenticated?: boolean;
  mayHaveSession?: boolean;
}

export function SiteHeader({
  role = null,
  authenticated = Boolean(role),
  mayHaveSession = authenticated,
}: Readonly<SiteHeaderProps>) {
  const t = useTranslations("Navigation");
  const pathname = usePathname();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [sessionStatus, setSessionStatus] = useState<"authenticated" | "guest" | "pending">(
    authenticated ? "authenticated" : mayHaveSession ? "pending" : "guest",
  );

  useEffect(() => {
    if (!mayHaveSession) return;

    let active = true;
    void getMyProfile().then((result) => {
      if (!active) return;

      if (result.status === "success") {
        setProfile(result.profile);
        setSessionStatus("authenticated");
        return;
      }

      if (result.status === "unauthenticated") {
        setProfile(null);
        setSessionStatus("guest");
        return;
      }

      setSessionStatus(authenticated ? "authenticated" : "guest");
    });

    return () => {
      active = false;
    };
  }, [authenticated, mayHaveSession]);

  const effectiveAuthenticated = sessionStatus === "authenticated";
  const effectiveRole = profile ? getUserTypeNavRole(profile.userType) : role;
  const isAuthPage =
    pathname === "/login" || pathname === "/onboarding" || pathname === "/buddy/onboarding";
  const isBuddyHostingPage = pathname === "/buddy";
  const isMinimalHeader = isAuthPage || isBuddyHostingPage;
  const isGuestLandingPage = pathname === "/" && sessionStatus === "guest";
  const destinations = DESTINATIONS[effectiveRole ?? "guest"];
  const logoHref = LOGO_DESTINATIONS[effectiveRole ?? "guest"];
  const accountTitle = profile?.displayName || profile?.name || t("account");

  const navigationLinks = destinations.map(({ href, labelKey }) => {
    const isActive = pathname === href || pathname.startsWith(`${href}/`);

    return (
      <Link
        key={href}
        href={href}
        aria-current={isActive ? "page" : undefined}
        className={`border-b-2 px-1 py-3 text-sm font-semibold transition-colors ${
          isActive
            ? "border-primary text-ink"
            : "border-transparent text-muted hover:border-primary-soft hover:text-ink"
        }`}
      >
        {t(labelKey)}
      </Link>
    );
  });

  return (
    <header className="sticky top-0 z-40 border-b border-line-soft bg-canvas/95 backdrop-blur">
      <PageContainer className="flex h-[76px] items-center justify-between gap-5">
        <Link href={logoHref} aria-label="HanBuddy" className="flex shrink-0 items-center gap-2">
          <Image
            src="/images/brand/logo-borderless.webp"
            alt=""
            width={36}
            height={36}
            priority
            className="size-9"
          />
          <span className="font-display text-xl font-extrabold tracking-[-0.04em] text-ink">
            HanBuddy
          </span>
        </Link>

        {!isMinimalHeader && effectiveRole !== "buddy" ? (
          <nav aria-label={t("primaryNavigation")} className="hidden items-center gap-8 lg:flex">
            {navigationLinks}
          </nav>
        ) : !isMinimalHeader ? (
          <span className="hidden flex-1 lg:block" aria-hidden />
        ) : null}

        <div className={`${isMinimalHeader ? "flex" : "hidden lg:flex"} items-center gap-2`}>
          {isGuestLandingPage ? (
            <Link
              href="/buddy"
              className="inline-flex min-h-11 items-center rounded-full border border-transparent bg-white px-4 text-sm font-bold text-ink transition-colors hover:border-primary hover:text-primary-strong focus-visible:border-primary focus-visible:text-primary-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {t("hostAnExperience")}
            </Link>
          ) : null}
          <LocaleSwitcher />
          {!isMinimalHeader && sessionStatus === "pending" ? (
            <span
              aria-hidden
              className="size-11 animate-pulse rounded-full border border-line-soft bg-panel"
            />
          ) : null}
          {!isMinimalHeader && effectiveAuthenticated ? (
            <Link
              href="/my-page"
              aria-label={t("openAccount")}
              title={accountTitle}
              className="inline-flex size-11 items-center justify-center rounded-full border border-line-strong bg-canvas-soft transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {profile ? (
                <Avatar name={accountTitle} src={profile.profileImageUrl} size={36} eagerImage />
              ) : (
                <UserIcon className="size-5 text-primary-strong" />
              )}
            </Link>
          ) : null}
          {!isMinimalHeader && sessionStatus === "guest" ? (
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center rounded-full border border-line-strong bg-canvas-soft px-6 text-sm font-bold text-ink transition-colors hover:border-primary hover:text-primary-strong"
            >
              {t("login")}
            </Link>
          ) : null}
        </div>

        {!isMinimalHeader ? (
          <div className="flex items-center gap-2 lg:hidden">
            {sessionStatus === "pending" ? (
              <span
                aria-hidden
                className="size-10 animate-pulse rounded-full border border-line-soft bg-panel"
              />
            ) : null}
            {effectiveAuthenticated ? (
              <Link
                href="/my-page"
                aria-label={t("openAccount")}
                title={accountTitle}
                className="inline-flex size-10 items-center justify-center rounded-full border border-line-strong bg-canvas-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {profile ? (
                  <Avatar name={accountTitle} src={profile.profileImageUrl} size={32} eagerImage />
                ) : (
                  <UserIcon className="size-5 text-primary-strong" />
                )}
              </Link>
            ) : null}
            <MobileMenu
              title={t("navigationMenu")}
              openLabel={t("openMenu")}
              closeLabel={t("closeMenu")}
            >
              <nav aria-label={t("primaryNavigation")} className="flex flex-col gap-1">
                {navigationLinks}
              </nav>
              <div className="mt-auto flex flex-col gap-3 border-t border-line-soft pt-5">
                {isGuestLandingPage ? (
                  <Link
                    href="/buddy"
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-line-strong bg-canvas-soft px-5 text-sm font-bold text-ink transition-colors hover:border-primary hover:text-primary-strong"
                  >
                    {t("hostAnExperience")}
                  </Link>
                ) : null}
                <LocaleSwitcher dismissMenu className="justify-start px-1" />
                {sessionStatus === "guest" ? (
                  <Link
                    href="/login"
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-bold text-on-primary transition-colors hover:bg-primary-hover"
                  >
                    {t("login")}
                  </Link>
                ) : null}
              </div>
            </MobileMenu>
          </div>
        ) : null}
      </PageContainer>
    </header>
  );
}
