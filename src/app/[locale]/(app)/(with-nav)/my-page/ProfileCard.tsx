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
      <>
        <Avatar name={result.profile.name} src={result.profile.profileImageUrl} size={72} />
        <div>
          <h1 className="font-display text-xl font-semibold text-ink">{result.profile.name}</h1>
          <Link
            href="/my-page/edit"
            className="mt-1 flex items-center gap-1 text-sm font-semibold text-primary-strong hover:underline"
          >
            {t("editProfile")}
            <ChevronRightIcon className="size-3.5" />
          </Link>
        </div>
      </>
    );
  }

  return (
    <section className="flex items-center gap-5 rounded-2xl border border-line-soft bg-panel p-5 shadow-sm lg:sticky lg:top-24 lg:flex-col lg:items-start lg:p-6">
      {content}
    </section>
  );
}
