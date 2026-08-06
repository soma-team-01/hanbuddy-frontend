"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { ChevronRightIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { useMyProfile } from "@/lib/api/useMyProfile";

export function ProfileCard() {
  const t = useTranslations("MyPage");
  const getApiErrorMessage = useApiErrorMessage();
  const result = useMyProfile();
  let content: ReactNode;

  if (result === null || result.status === "unauthenticated") {
    content = (
      <>
        <span
          aria-hidden
          className="size-[72px] shrink-0 animate-pulse rounded-full bg-panel-raised"
        />
        <div aria-hidden className="flex flex-col gap-2">
          <span className="h-6 w-36 animate-pulse rounded bg-panel-raised" />
          <span className="h-4 w-24 animate-pulse rounded bg-panel-raised" />
        </div>
      </>
    );
  } else if (result.status === "error") {
    content = (
      <p role="alert" className="text-sm text-danger">
        {getApiErrorMessage(result.error, t("profileLoadFailed"))}
      </p>
    );
  } else {
    content = (
      <div className="flex min-w-0 items-center gap-5">
        <Avatar
          name={result.profile.displayName}
          src={result.profile.profileImageUrl}
          size={88}
          eagerImage
        />
        <div className="min-w-0">
          <p className="mb-2 inline-flex rounded-full bg-primary-soft px-3 py-1 text-xs font-bold tracking-[0.12em] text-primary-strong uppercase">
            {t(result.profile.userType === "BUDDY" ? "buddy" : "tourist")}
          </p>
          <h1 className="truncate font-display text-2xl font-bold tracking-tight text-ink">
            {result.profile.displayName}
          </h1>
          <p className="mt-1 truncate text-sm text-muted">{result.profile.email}</p>
          <Link
            href="/my-page/edit"
            className="mt-1 flex items-center gap-1 text-sm font-semibold text-primary-strong hover:underline"
          >
            {t("editProfile")}
            <ChevronRightIcon className="size-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <section className="flex min-h-[184px] items-center rounded-3xl border border-line-soft bg-panel-raised p-6 shadow-sm md:p-8 lg:sticky lg:top-24">
      {content}
    </section>
  );
}
