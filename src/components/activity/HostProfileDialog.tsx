"use client";

import Image from "next/image";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { ReviewCard } from "@/components/review/ReviewCard";
import { useInfiniteScrollSentinel } from "@/components/review/use-infinite-scroll-sentinel";
import { Avatar } from "@/components/ui/Avatar";
import { XIcon } from "@/components/ui/icons";
import { RatingSummary } from "@/components/ui/RatingSummary";
import { Link } from "@/i18n/navigation";
import { formatKrw } from "@/lib/format";
import { touristActivitiesQueryOptions } from "@/lib/query/activities";
import { buddyProfileQueryOptions, buddyReviewsQueryOptions } from "@/lib/query/reviews";
import type { Host } from "@/types/activity";

/** 버디를 특정할 수 없을 때 프로필·후기 조회를 끄기 위한 자리 표시자 */
const NO_BUDDY_ID = 0;

/**
 * 호스트(버디) 프로필 다이얼로그.
 * 사진·이름·평점·호스팅 중인 체험과 버디가 받은 후기를 함께 보여준다.
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
  const tReviews = useTranslations("Reviews");
  const tAccessibility = useTranslations("Accessibility");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const activitiesQuery = useQuery({
    ...touristActivitiesQueryOptions(),
    enabled: showHostedActivities,
  });

  const activities = activitiesQuery.data ?? [];
  // 신청 목록처럼 버디 식별자를 모르는 화면에서는 현재 활동의 목록 응답에서 찾아낸다
  const buddyId =
    host.id ??
    activities.find((activity) => String(activity.activityId) === currentActivityId)?.buddyId;
  const hasBuddyId = buddyId !== undefined;

  const profileQuery = useQuery({
    ...buddyProfileQueryOptions(buddyId ?? NO_BUDDY_ID),
    enabled: hasBuddyId,
  });
  const reviewsQuery = useInfiniteQuery({
    ...buddyReviewsQueryOptions(buddyId ?? NO_BUDDY_ID),
    enabled: hasBuddyId,
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const hostedActivities = activities.filter(
    (activity) =>
      (hasBuddyId ? activity.buddyId === buddyId : activity.buddyName === host.name) &&
      String(activity.activityId) !== currentActivityId,
  );

  const profile = profileQuery.data;
  const reviewPages = reviewsQuery.data?.pages ?? [];
  const reviews = reviewPages.flatMap((page) => page.reviews);
  const totalReviewCount = reviewPages[0]?.totalCount ?? profile?.reviewCount ?? 0;
  const canLoadMoreReviews = reviewsQuery.hasNextPage && !reviewsQuery.isFetchingNextPage;
  const sentinelRef = useInfiniteScrollSentinel(() => {
    void reviewsQuery.fetchNextPage();
  }, canLoadMoreReviews);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="host-profile-title"
      onClose={onClose}
      className="motion-dialog m-0 flex max-h-[85dvh] w-full max-w-none flex-col overflow-hidden rounded-t-3xl border-0 bg-canvas-soft p-0 text-ink shadow-2xl backdrop:bg-ink/45 backdrop:backdrop-blur-[3px] max-md:mt-auto md:m-auto md:w-[calc(100%-3rem)] md:max-w-lg md:rounded-2xl"
    >
      {/* 후기를 길게 훑어도 이름·평점과 닫기 버튼이 사라지지 않도록 헤더를 고정한다 */}
      <div className="flex items-start justify-between gap-4 border-b border-line-soft p-6 md:p-7">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar
            name={profile?.buddyName ?? host.name}
            src={profile?.buddyProfileImageUrl ?? host.avatarUrl}
            size={64}
          />
          <div className="min-w-0">
            <h2 id="host-profile-title" className="font-display text-xl font-bold text-ink">
              {profile?.buddyName ?? host.name}
            </h2>
            <p className="text-xs font-medium text-muted">{host.bio}</p>
            {profile ? (
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <RatingSummary rating={profile.averageRating} reviewCount={profile.reviewCount} />
                <span className="text-xs text-muted">
                  {tReviews("hostedCount", { count: profile.activeActivityCount })}
                </span>
              </div>
            ) : null}
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

      <div className="flex-1 overflow-y-auto p-6 md:p-7">
        {hostIntroduction ? (
          <p className="text-sm leading-7 whitespace-pre-line text-ink">{hostIntroduction}</p>
        ) : null}

        {showHostedActivities ? (
          <section className={hostIntroduction ? "mt-6 border-t border-line-soft pt-5" : ""}>
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

        {hasBuddyId ? (
          <section className="mt-6 border-t border-line-soft pt-5">
            <h3 className="font-display text-sm font-bold text-ink">
              {tReviews("hostReviews", { name: profile?.buddyName ?? host.name })}
              {totalReviewCount > 0 ? (
                <span className="ml-2 font-medium text-muted">
                  {tReviews("countLabel", { count: totalReviewCount })}
                </span>
              ) : null}
            </h3>
            {reviewsQuery.isPending ? (
              <p className="mt-3 text-sm text-muted">{tReviews("loading")}</p>
            ) : null}
            {reviewsQuery.isError ? (
              <p className="mt-3 text-sm text-primary">{tReviews("loadError")}</p>
            ) : null}
            {!reviewsQuery.isPending && !reviewsQuery.isError && reviews.length === 0 ? (
              <p className="mt-3 text-sm text-muted">{tReviews("none")}</p>
            ) : null}

            <ul className="mt-3 flex flex-col gap-3">
              {reviews.map((review) => (
                <li key={review.reviewId}>
                  <ReviewCard review={review} showActivityTitle />
                </li>
              ))}
            </ul>

            {/* 바닥에 가까워지면 12건씩 자동으로 이어 붙인다 */}
            <div ref={sentinelRef} aria-hidden="true" className="h-px" />

            {reviewsQuery.hasNextPage ? (
              <button
                type="button"
                onClick={() => void reviewsQuery.fetchNextPage()}
                disabled={reviewsQuery.isFetchingNextPage}
                className="mt-3 w-full rounded-full border border-primary px-5 py-2.5 font-display text-sm font-bold text-primary transition-colors hover:bg-primary-soft disabled:opacity-60"
              >
                {reviewsQuery.isFetchingNextPage ? tReviews("loading") : tReviews("loadMore")}
              </button>
            ) : null}
          </section>
        ) : null}
      </div>
    </dialog>
  );
}
