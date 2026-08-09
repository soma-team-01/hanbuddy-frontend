"use client";

import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { XIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import { formatKrw } from "@/lib/format";
import { touristActivitiesQueryOptions } from "@/lib/query/activities";
import type { Host } from "@/types/activity";

/**
 * 호스트(버디) 요약 프로필 다이얼로그.
 * 현재는 사진·이름·호스팅 중인 체험만 노출하며, 리뷰 등은 API 확정 후 추가한다.
 */
export function HostProfileDialog({
  host,
  hostIntroduction,
  currentActivityId,
  /** 버디 미리보기·등록 검토처럼 실제 목록을 조회할 수 없는 화면에서는 목록을 숨긴다 */
  showHostedActivities = true,
  onClose,
}: Readonly<{
  host: Host;
  hostIntroduction?: string;
  currentActivityId: string;
  showHostedActivities?: boolean;
  onClose: () => void;
}>) {
  const locale = useLocale();
  const t = useTranslations("ActivityDetail");
  const tAccessibility = useTranslations("Accessibility");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const activitiesQuery = useQuery({
    ...touristActivitiesQueryOptions(),
    enabled: showHostedActivities,
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  // 목록 응답에는 버디 식별자가 없어 공개 닉네임으로 같은 호스트의 체험을 모은다
  const hostedActivities = (activitiesQuery.data ?? []).filter(
    (activity) =>
      activity.buddyName === host.name && String(activity.activityId) !== currentActivityId,
  );

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="host-profile-title"
      onClose={onClose}
      className="motion-dialog m-0 max-h-[85dvh] w-full max-w-none overflow-y-auto rounded-t-3xl border-0 bg-canvas-soft p-6 text-ink shadow-2xl backdrop:bg-ink/45 backdrop:backdrop-blur-[3px] max-md:mt-auto md:m-auto md:w-[calc(100%-3rem)] md:max-w-md md:rounded-2xl md:p-7"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar name={host.name} src={host.avatarUrl} size={64} />
          <div className="min-w-0">
            <h2 id="host-profile-title" className="font-display text-xl font-bold text-ink">
              {host.name}
            </h2>
            <p className="text-xs font-medium text-muted">{host.bio}</p>
          </div>
        </div>
        <button
          type="button"
          aria-label={tAccessibility("closeDialog")}
          onClick={onClose}
          className="-mt-2 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:border hover:border-primary hover:text-primary"
        >
          <XIcon className="size-5" />
        </button>
      </div>

      {hostIntroduction ? (
        <p className="mt-5 text-sm leading-7 whitespace-pre-line text-ink">{hostIntroduction}</p>
      ) : null}

      {showHostedActivities ? (
        <section className="mt-6 border-t border-line-soft pt-5">
          <h3 className="font-display text-sm font-bold text-ink">{t("hostedActivities")}</h3>
          {activitiesQuery.isPending ? (
            <p className="mt-3 text-sm text-muted">{t("loading")}</p>
          ) : null}
          {!activitiesQuery.isPending && hostedActivities.length === 0 ? (
            <p className="mt-3 text-sm text-muted">{t("noOtherActivities")}</p>
          ) : null}
          <ul className="mt-3 flex flex-col gap-2">
            {hostedActivities.map((activity) => (
              <li key={activity.activityId}>
                <Link
                  href={`/activities/${activity.activityId}`}
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-xl border border-line-soft bg-canvas-soft p-2.5 transition-colors hover:border-primary"
                >
                  <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-panel">
                    <Image
                      src={activity.thumbnailImageUrl}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 block font-display text-sm font-bold text-ink">
                      {activity.title}
                    </span>
                    <span className="mt-0.5 block text-xs font-semibold text-primary">
                      {t("perPerson", {
                        price: formatKrw(activity.discountedPrice ?? activity.price, locale),
                      })}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </dialog>
  );
}
