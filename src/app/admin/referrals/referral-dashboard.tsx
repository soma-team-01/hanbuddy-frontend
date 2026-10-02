"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  getAdminReferralActivity,
  getReferralActivities,
  getReferralApplicants,
} from "@/lib/api/referral";
import { unwrapApiResult } from "@/lib/query/result";
import { AdminPagination } from "@/app/admin/admin-ui";
import {
  ReferralApplicants,
  ReferralError,
  referralButtonClass,
} from "@/components/referral/ReferralApplicants";
import { ReferralInvitationDialog } from "./referral-invitation-dialog";

const counters = [
  ["", "총 신청"],
  ["CONFIRMED", "신청 확정"],
  ["COMPLETED", "일정 종료"],
  ["CANCELLED", "취소"],
] as const;

function ActivityApplicationSummary({ activityId }: { activityId: number }) {
  const query = useQuery({
    queryKey: ["referral", "admin-activity-counts", activityId],
    queryFn: async () =>
      Promise.all(
        counters.map(async ([status]) => {
          const params = new URLSearchParams({
            activityId: String(activityId),
            page: "0",
            size: "1",
          });
          if (status) params.set("status", status);
          // Only retain totals, never aggregate a single page's guest counts.
          return unwrapApiResult(await getReferralApplicants(true, params), "data").totalElements;
        }),
      ),
    retry: false,
    gcTime: 0,
  });
  return (
    <section aria-label="활동 신청 현황" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-bold">신청 현황</h2>
        <p className="text-xs text-muted">누적 건수 · 총 신청은 취소 포함</p>
      </div>
      {query.error ? (
        <ReferralError error={query.error} admin retry={() => void query.refetch()} />
      ) : (
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {counters.map(([, label], index) => (
            <div key={label} className="rounded-2xl border border-line-soft p-5">
              <dt className="text-sm text-muted">{label}</dt>
              <dd
                className={`mt-3 text-3xl font-bold tabular-nums ${index === 0 ? "text-primary" : "text-ink"}`}
              >
                {query.data ? (
                  <>
                    {query.data[index].toLocaleString()}
                    <span className="ml-1 text-sm font-normal text-muted">건</span>
                  </>
                ) : (
                  <span aria-label="불러오는 중">—</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

function ActivityApplications({ activityId }: { activityId: number }) {
  const detail = useQuery({
    queryKey: ["referral", "admin-activity", activityId],
    queryFn: async () => unwrapApiResult(await getAdminReferralActivity(activityId), "data"),
    retry: false,
    gcTime: 0,
  });
  return (
    <div className="space-y-7">
      <Link
        href="/admin/referrals"
        className="inline-flex min-h-11 items-center gap-2 text-sm text-muted hover:text-primary"
      >
        <span aria-hidden="true">←</span>활동 목록
      </Link>
      {detail.isPending ? (
        <p role="status">불러오는 중…</p>
      ) : detail.error ? (
        <ReferralError error={detail.error} admin retry={() => void detail.refetch()} />
      ) : detail.data ? (
        <>
          <header>
            <h2 className="text-xl font-bold break-words md:text-2xl">{detail.data.title}</h2>
            <p className="mt-2 text-sm text-muted">{detail.data.meetingPointName}</p>
          </header>
          <ActivityApplicationSummary activityId={activityId} />
          <ReferralApplicants
            key={activityId}
            admin
            fixedActivityId={String(activityId)}
            schedules={detail.data.schedules}
          />
          <details className="rounded-2xl border border-line-soft p-5 text-sm">
            <summary className="cursor-pointer font-semibold">활동 소개</summary>
            <p className="mt-3 leading-6 whitespace-pre-wrap text-muted">
              {detail.data.description}
            </p>
          </details>
        </>
      ) : null}
    </div>
  );
}

function ReferralActivityList() {
  const [page, setPage] = useState(0);
  const list = useQuery({
    queryKey: ["referral", "admin-activities", page],
    queryFn: async () => unwrapApiResult(await getReferralActivities(page), "data"),
    retry: false,
    gcTime: 0,
  });
  if (list.isPending) return <p role="status">불러오는 중…</p>;
  if (list.error)
    return <ReferralError error={list.error} admin retry={() => void list.refetch()} />;
  if (!list.data) return null;
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold">
          등록 활동 <span className="text-primary">{list.data.totalElements.toLocaleString()}</span>
        </h2>
        <p className="text-sm text-muted">활동을 선택해 신청 현황을 확인하세요.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {list.data.content.map(({ partnerName, activity }) => (
          <Link
            key={activity.activityId}
            href={`/admin/referrals?activityId=${activity.activityId}`}
            className="group flex min-w-0 items-center gap-4 rounded-2xl border border-line-soft p-5 transition hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {activity.thumbnailImageUrl && (
              <Image
                src={activity.thumbnailImageUrl}
                alt=""
                width={72}
                height={72}
                className="size-16 shrink-0 rounded-xl object-cover md:size-18"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted">{partnerName}</p>
              <h3 className="mt-1 font-bold break-words group-hover:text-primary">
                {activity.title}
              </h3>
              <p className="mt-3 text-xs text-primary">신청 현황 보기</p>
            </div>
            <span aria-hidden="true" className="text-muted group-hover:text-primary">
              →
            </span>
          </Link>
        ))}
      </div>
      {!list.data.content.length && (
        <p className="rounded-2xl border border-line-soft p-8 text-center text-sm text-muted">
          등록된 제휴 활동이 없습니다.
        </p>
      )}
      <AdminPagination page={page} totalPages={list.data.totalPages} onPage={setPage} />
    </section>
  );
}

export function ReferralDashboard({ initialActivityId }: { initialActivityId?: number }) {
  const [invitationOpen, setInvitationOpen] = useState(false);
  return (
    <main className="mx-auto max-w-[1200px] space-y-7 px-4 py-6 md:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">제휴 활동</h1>
        <button
          type="button"
          className={referralButtonClass}
          onClick={() => setInvitationOpen(true)}
        >
          <span aria-hidden="true" className="mr-2 text-lg">
            +
          </span>
          등록 링크 만들기
        </button>
      </header>
      {initialActivityId ? (
        <ActivityApplications key={initialActivityId} activityId={initialActivityId} />
      ) : (
        <ReferralActivityList />
      )}
      {invitationOpen && <ReferralInvitationDialog onClose={() => setInvitationOpen(false)} />}
    </main>
  );
}
