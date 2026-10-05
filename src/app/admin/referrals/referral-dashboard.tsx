"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import ko from "@/messages/ko.json";
import { isActivityLanguage } from "@/types/activity-language";
import {
  getAdminReferralActivity,
  getReferralActivities,
  getReferralApplicants,
} from "@/lib/api/referral";
import { unwrapApiResult } from "@/lib/query/result";
import { AdminPagination } from "@/app/admin/admin-ui";
import { ReferralApplicants, ReferralError } from "@/components/referral/ReferralApplicants";
import { ReferralInvitationDialog } from "./referral-invitation-dialog";
import {
  getReferralActivityOwner,
  searchReferralActivities,
  getRetainedApplicants,
} from "@/lib/api/referral-reporting";
import { referralInputClass, referralButtonClass } from "@/components/referral/ReferralApplicants";

const counters = [
  ["신청 인원 (취소 제외)", "명"],
  ["신청 건수 (취소 제외)", "건"],
  ["취소", "건"],
] as const;

function ActivityApplicationSummary({ activityId }: { activityId: number }) {
  const query = useQuery({
    queryKey: ["referral", "admin-activity-counts", activityId],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({
        activityId: String(activityId),
        status: "CANCELLED",
        page: "0",
        size: "1",
      });
      const [retained, cancelled] = await Promise.all([
        getRetainedApplicants(new URLSearchParams({ activityId: String(activityId) }), signal),
        getReferralApplicants(true, params).then(
          (result) => unwrapApiResult(result, "data").totalElements,
        ),
      ]);
      // Count all pages, not just visible rows; cache only aggregate numbers here.
      return [retained.reduce((sum, row) => sum + row.guestCount, 0), retained.length, cancelled];
    },
    retry: false,
    gcTime: 0,
  });
  return (
    <section aria-label="활동 신청 현황" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-bold">신청 현황</h2>
        <p className="text-xs text-muted">일정 종료 포함 · 인원은 신청별 참여 인원 합계</p>
      </div>
      {query.error ? (
        <ReferralError error={query.error} admin retry={() => void query.refetch()} />
      ) : (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {counters.map(([label, unit], index) => (
            <div
              key={label}
              className={`rounded-2xl border border-line-soft p-5 ${index === 0 ? "col-span-2 sm:col-span-1" : ""}`}
            >
              <dt className="text-sm text-muted">{label}</dt>
              <dd
                className={`mt-3 text-3xl font-bold tabular-nums ${index === 0 ? "text-primary" : "text-ink"}`}
              >
                {query.data ? (
                  <>
                    {query.data[index].toLocaleString()}
                    <span className="ml-1 text-sm font-normal text-muted">{unit}</span>
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
  const owner = useQuery({
    queryKey: ["referral", "activity-owner", activityId],
    queryFn: ({ signal }) => getReferralActivityOwner(activityId, signal),
    gcTime: 0,
    retry: false,
  });
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
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl font-bold break-words md:text-2xl">{detail.data.title}</h1>
              <p className="mt-2 text-sm text-muted">
                {owner.data?.partnerName ??
                  (owner.isPending ? "버디 확인 중…" : "버디 정보 확인 불가")}
              </p>
            </div>
            <Link href={`/admin/referrals/${activityId}`} className={referralButtonClass}>
              활동 보기
            </Link>
          </header>
          <ActivityApplicationSummary activityId={activityId} />
          <ReferralApplicants
            key={activityId}
            admin
            fixedActivityId={String(activityId)}
            schedules={detail.data.schedules}
          />
        </>
      ) : null}
    </div>
  );
}

function CreateInvitationButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-primary px-3 text-xs font-semibold text-primary transition hover:bg-primary-soft"
      onClick={onClick}
    >
      <span aria-hidden="true">+</span>
      <span>등록 링크 만들기</span>
    </button>
  );
}

function ReferralActivityList({ onCreateInvitation }: { onCreateInvitation: () => void }) {
  const [page, setPage] = useState(0);
  const [term, setTerm] = useState("");
  const [search, setSearch] = useState("");
  const list = useQuery({
    queryKey: ["referral", "admin-activities", search, search ? 0 : page],
    queryFn: async ({ signal }) => {
      if (!search) return unwrapApiResult(await getReferralActivities(page), "data");
      const content = await searchReferralActivities(search, signal);
      return {
        content,
        totalElements: content.length,
        totalPages: Math.ceil(content.length / 20),
        page: 0,
        size: 20,
        hasNext: false,
      };
    },
    retry: false,
    gcTime: 0,
  });
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-bold">
          등록 활동{" "}
          <span className="text-primary">{list.data?.totalElements.toLocaleString() ?? "—"}</span>
        </h1>
        <CreateInvitationButton onClick={onCreateInvitation} />
      </div>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(0);
          if (search === term.trim()) void list.refetch();
          setSearch(term.trim());
        }}
      >
        <label className="min-w-0 flex-1 text-xs font-semibold text-muted">
          <span>활동 등록자 검색</span>
          <input
            className={referralInputClass}
            placeholder="버디 닉네임, 이름 또는 이메일"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
        </label>
        <button className={referralButtonClass} type="submit" aria-label="활동 검색">
          검색
        </button>
        {search && (
          <button
            type="button"
            className={referralButtonClass}
            onClick={() => {
              setTerm("");
              setSearch("");
              setPage(0);
            }}
          >
            초기화
          </button>
        )}
      </form>
      {list.isPending && <p role="status">불러오는 중…</p>}
      {list.error && <ReferralError error={list.error} admin retry={() => void list.refetch()} />}
      <div className="grid gap-4 md:grid-cols-2">
        {(search ? list.data?.content.slice(page * 20, (page + 1) * 20) : list.data?.content)?.map(
          ({ partnerName, activity }) => (
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
                <h3 className="font-bold break-words group-hover:text-primary">{activity.title}</h3>
                <p className="mt-1 text-xs text-muted">{partnerName}</p>
                {!!activity.availableLanguages?.length && (
                  <p className="mt-1 text-xs text-muted">
                    {activity.availableLanguages
                      .filter(isActivityLanguage)
                      .map((code) => ko.ActivityLanguages.names[code])
                      .join(" · ")}
                  </p>
                )}
                <p className="mt-3 text-xs text-primary">신청 현황 보기</p>
              </div>
              <span aria-hidden="true" className="text-muted group-hover:text-primary">
                →
              </span>
            </Link>
          ),
        )}
      </div>
      {list.data && !list.data.content.length && (
        <p className="rounded-2xl border border-line-soft p-8 text-center text-sm text-muted">
          {search ? "검색한 업체의 제휴 활동이 없습니다." : "등록된 제휴 활동이 없습니다."}
        </p>
      )}
      {list.data && (
        <AdminPagination page={page} totalPages={list.data.totalPages} onPage={setPage} />
      )}
    </section>
  );
}

export function ReferralDashboard({ initialActivityId }: { initialActivityId?: number }) {
  const [invitationOpen, setInvitationOpen] = useState(false);
  return (
    <main className="mx-auto max-w-[1200px] space-y-7 px-4 py-6 md:px-6">
      {initialActivityId ? (
        <ActivityApplications key={initialActivityId} activityId={initialActivityId} />
      ) : (
        <ReferralActivityList onCreateInvitation={() => setInvitationOpen(true)} />
      )}
      {invitationOpen && <ReferralInvitationDialog onClose={() => setInvitationOpen(false)} />}
    </main>
  );
}
