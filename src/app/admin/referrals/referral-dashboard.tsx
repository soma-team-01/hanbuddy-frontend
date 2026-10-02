"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getAdminReferralActivity, getReferralActivities } from "@/lib/api/referral";
import { unwrapApiResult } from "@/lib/query/result";
import { AdminPagination, formatAdminDate } from "@/app/admin/admin-ui";
import {
  ReferralApplicants,
  ReferralError,
  referralButtonClass,
} from "@/components/referral/ReferralApplicants";
import { ReferralInvitations } from "./referral-invitations";

export function ReferralDashboard({ initialActivityId }: { initialActivityId?: number }) {
  const [tab, setTab] = useState(initialActivityId ? "activities" : "applications");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(initialActivityId);
  const [filterActivity, setFilterActivity] = useState("");
  const list = useQuery({
    queryKey: ["referral", "admin-activities", page],
    queryFn: async () => unwrapApiResult(await getReferralActivities(page), "data"),
    retry: false,
    gcTime: 0,
  });
  const detail = useQuery({
    queryKey: ["referral", "admin-activity", selected],
    queryFn: async () => unwrapApiResult(await getAdminReferralActivity(selected!), "data"),
    enabled: !!selected,
    retry: false,
    gcTime: 0,
  });
  return (
    <main className="mx-auto max-w-[1200px] space-y-6 px-4 py-6 md:px-6">
      <h1 className="text-2xl font-bold">제휴 활동</h1>
      <nav aria-label="제휴 관리 메뉴" className="flex gap-5 border-b border-line-soft">
        {[
          ["applications", "신청 내역"],
          ["activities", "등록 활동"],
          ["invitations", "등록 링크"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-current={tab === key ? "page" : undefined}
            onClick={() => setTab(key)}
            className={`min-h-11 border-b-2 px-1 text-sm font-semibold ${tab === key ? "border-primary text-primary" : "border-transparent text-muted"}`}
          >
            {label}
          </button>
        ))}
      </nav>
      {tab === "invitations" ? (
        <ReferralInvitations />
      ) : tab === "applications" ? (
        <ReferralApplicants
          key={filterActivity}
          admin
          activities={list.data?.content.map((row) => row.activity)}
          initialActivityId={filterActivity}
        />
      ) : (
        <>
          {list.isPending ? (
            <p>불러오는 중…</p>
          ) : list.error ? (
            <ReferralError error={list.error} admin retry={() => void list.refetch()} />
          ) : (
            list.data && (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  {list.data.content.map(({ partnerName, activity }) => (
                    <article
                      key={activity.activityId}
                      className="rounded-2xl border border-line-soft p-5"
                    >
                      <p className="text-xs text-primary">{partnerName}</p>
                      <h2 className="mt-2 font-bold">{activity.title}</h2>
                      <div className="mt-4 flex gap-3">
                        <button
                          className={referralButtonClass}
                          onClick={() => setSelected(activity.activityId)}
                        >
                          활동 상세
                        </button>
                        <button
                          className={referralButtonClass}
                          onClick={() => {
                            setFilterActivity(String(activity.activityId));
                            setTab("applications");
                          }}
                        >
                          신청 보기
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
                {!list.data.content.length && (
                  <p className="text-sm text-muted">등록된 제휴 활동이 없습니다.</p>
                )}
                <AdminPagination page={page} totalPages={list.data.totalPages} onPage={setPage} />
              </>
            )
          )}
          {selected && (
            <section className="mt-6 rounded-2xl border border-line-soft p-5">
              {detail.isPending ? (
                <p>불러오는 중…</p>
              ) : detail.error ? (
                <ReferralError error={detail.error} admin retry={() => void detail.refetch()} />
              ) : detail.data ? (
                <>
                  <h2 className="text-lg font-bold">{detail.data.title}</h2>
                  <p className="mt-3 text-sm whitespace-pre-wrap text-muted">
                    {detail.data.description}
                  </p>
                  <p className="mt-3 text-sm">{detail.data.meetingPointName}</p>
                  <ul className="mt-4 divide-y divide-line-soft">
                    {detail.data.schedules.map((schedule) => (
                      <li
                        key={schedule.scheduleId}
                        className="flex flex-wrap justify-between gap-2 py-3 text-sm"
                      >
                        <span>{formatAdminDate(schedule.startAt, true)}</span>
                        <span>
                          정원 {schedule.maxCapacity ?? detail.data!.maxCapacity}명 ·{" "}
                          {schedule.status === "CANCELLED"
                            ? "취소"
                            : schedule.status === "CLOSED"
                              ? "마감"
                              : "모집 중"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </section>
          )}
        </>
      )}
    </main>
  );
}
