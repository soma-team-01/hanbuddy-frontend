"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ActivityDetailView } from "@/components/activity/ActivityDetailView";
import { ReferralError } from "@/components/referral/ReferralApplicants";
import { getAdminReferralActivity } from "@/lib/api/referral";
import { getReferralActivityOwner } from "@/lib/api/referral-reporting";
import { mapMyActivityDetailToPreviewActivity } from "@/lib/api/buddy-view";
import { unwrapApiResult } from "@/lib/query/result";

export function ReferralActivityPreview({ activityId }: { activityId: number }) {
  const detail = useQuery({
    queryKey: ["referral", "admin-activity", activityId],
    queryFn: async () => unwrapApiResult(await getAdminReferralActivity(activityId), "data"),
    retry: false,
    gcTime: 0,
  });
  const owner = useQuery({
    queryKey: ["referral", "activity-owner", activityId],
    queryFn: ({ signal }) => getReferralActivityOwner(activityId, signal),
    retry: false,
    gcTime: 0,
  });
  const error = detail.error || owner.error;
  const activity =
    detail.data && owner.data
      ? mapMyActivityDetailToPreviewActivity(
          detail.data,
          "일정 확인 불가",
          "ko",
          { id: owner.data.partnerUserId, name: owner.data.partnerName, avatarUrl: null },
          detail.data.hostIntroduction,
        )
      : null;
  return (
    <main className="mx-auto max-w-[1200px] py-6">
      <header className="space-y-3 px-4 md:px-6">
        <Link
          href={`/admin/referrals?activityId=${activityId}`}
          className="inline-flex min-h-10 items-center text-sm text-muted hover:text-primary"
        >
          ← 신청 현황
        </Link>
        <h1 className="text-2xl font-bold">활동 상세</h1>
        <p className="text-sm text-muted">등록된 활동을 확인하는 조회 전용 화면입니다.</p>
      </header>
      {error ? (
        <div className="m-6">
          <ReferralError
            error={error}
            admin
            retry={() => {
              void detail.refetch();
              void owner.refetch();
            }}
          />
        </div>
      ) : !activity ? (
        <p role="status" className="p-6">
          불러오는 중…
        </p>
      ) : (
        <ActivityDetailView activity={activity} preview bottomBar="inline" />
      )}
    </main>
  );
}
