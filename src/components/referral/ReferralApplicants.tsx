"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getReferralApplicants } from "@/lib/api/referral";
import { getRetainedApplicants } from "@/lib/api/referral-reporting";
import { ReferralDateRange } from "./ReferralDateRange";
import { unwrapApiResult } from "@/lib/query/result";
import { isUnauthenticatedError } from "@/lib/api/errors";
import { AdminPagination, formatAdminDate } from "@/app/admin/admin-ui";
import type { MyActivitySummaryResponse, ActivityScheduleResponse } from "@/types/buddy";

export const referralInputClass =
  "focus-border-only mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-white px-3 text-sm outline-none focus:border-primary";
export const referralButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-primary px-4 text-sm font-semibold text-primary transition hover:bg-primary-soft disabled:opacity-40";
export function ReferralError({
  error,
  retry,
  admin = false,
}: {
  error: unknown;
  retry: () => void;
  admin?: boolean;
}) {
  return (
    <div role="alert" className="rounded-xl border border-line-soft p-5 text-sm">
      <p>
        {isUnauthenticatedError(error)
          ? "로그인이 필요합니다."
          : "정보를 불러오지 못했습니다. 접근 권한과 서버 연결을 확인해 주세요."}
      </p>
      {isUnauthenticatedError(error) ? (
        <button
          type="button"
          className="mt-3 inline-block text-primary underline"
          onClick={() =>
            window.location.assign(
              admin
                ? "/admin/login"
                : "/api/auth/google/start?intent=buddy&locale=ko&next=%2Fmy-activities%2Freferrals",
            )
          }
        >
          로그인
        </button>
      ) : (
        <button type="button" className="mt-3 text-primary underline" onClick={retry}>
          다시 시도
        </button>
      )}
    </div>
  );
}

export function ReferralApplicants({
  admin = false,
  activities = [],
  initialActivityId = "",
  fixedActivityId,
  schedules = [],
}: {
  admin?: boolean;
  activities?: MyActivitySummaryResponse[];
  initialActivityId?: string;
  fixedActivityId?: string;
  schedules?: ActivityScheduleResponse[];
}) {
  const compactStatus = admin && !!fixedActivityId;
  const [filters, setFilters] = useState({
    activityId: fixedActivityId ?? initialActivityId,
    scheduleId: "",
    status: compactStatus ? "ACTIVE" : "CONFIRMED",
    from: "",
    until: "",
  });
  const [applied, setApplied] = useState(filters);
  const [page, setPage] = useState(0);
  const [rangeError, setRangeError] = useState(false);
  const params = new URLSearchParams({ page: String(page), size: "20" });
  Object.entries(applied).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  if (fixedActivityId) params.set("activityId", fixedActivityId);
  const retained = compactStatus && applied.status === "ACTIVE";
  if (retained) params.set("page", "0");
  const query = useQuery({
    queryKey: ["referral", admin ? "admin-applicants" : "partner-applicants", params.toString()],
    queryFn: async ({ signal }) => {
      if (!retained) return unwrapApiResult(await getReferralApplicants(admin, params), "data");
      const content = await getRetainedApplicants(params, signal);
      return {
        content,
        totalElements: content.length,
        totalPages: Math.ceil(content.length / 20),
        page: 0,
        size: 20,
        hasNext: false,
      };
    },
    gcTime: 0,
    retry: false,
  });
  return (
    <section className="space-y-5">
      {fixedActivityId && <h2 className="text-lg font-bold">신청 내역</h2>}
      {compactStatus && (
        <div role="group" aria-label="신청 상태" className="flex flex-wrap gap-2">
          {[
            ["", "전체"],
            ["ACTIVE", "취소 제외"],
            ["CANCELLED", "취소"],
          ].map(([status, label]) => (
            <button
              key={status}
              type="button"
              aria-pressed={applied.status === status}
              className={`min-h-9 rounded-lg border px-3 text-sm ${applied.status === status ? "border-primary font-semibold text-primary" : "border-line-soft text-muted hover:border-primary"}`}
              onClick={() => {
                setFilters({ ...filters, status });
                setApplied({ ...applied, status });
                setPage(0);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <form
        className={`grid gap-3 rounded-2xl border border-line-soft p-4 ${compactStatus ? "sm:grid-cols-[1fr_auto]" : "sm:grid-cols-2 xl:grid-cols-5"}`}
        onSubmit={(e) => {
          e.preventDefault();
          if (filters.from && filters.until && filters.from > filters.until) {
            setRangeError(true);
            return;
          }
          setRangeError(false);
          setApplied(filters);
          setPage(0);
        }}
      >
        {compactStatus ? null : fixedActivityId ? (
          <label className="min-w-0 text-xs font-semibold text-muted">
            일정
            <select
              className={referralInputClass}
              value={filters.scheduleId}
              onChange={(e) => setFilters({ ...filters, scheduleId: e.target.value })}
            >
              <option value="">전체 일정</option>
              {schedules.map((schedule) => (
                <option key={schedule.scheduleId} value={schedule.scheduleId}>
                  {formatAdminDate(schedule.startAt, true)}
                  {schedule.status === "CANCELLED" ? " · 취소" : ""}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="text-xs font-semibold text-muted">
            활동
            <select
              value={filters.activityId}
              className={referralInputClass}
              onChange={(e) =>
                setFilters({ ...filters, activityId: e.target.value, scheduleId: "" })
              }
            >
              <option value="">전체 활동</option>
              {initialActivityId &&
                !activities.some((a) => String(a.activityId) === initialActivityId) && (
                  <option value={initialActivityId}>선택한 활동</option>
                )}
              {activities.map((a) => (
                <option value={a.activityId} key={a.activityId}>
                  {a.title}
                </option>
              ))}
            </select>
          </label>
        )}
        {!compactStatus && (
          <label className="text-xs font-semibold text-muted">
            신청 상태
            <select
              value={filters.status}
              className={referralInputClass}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">전체 (취소 포함)</option>
              <option value="CONFIRMED">신청 확정</option>
              <option value="COMPLETED">일정 종료</option>
              <option value="CANCELLED">취소</option>
            </select>
          </label>
        )}
        {compactStatus ? (
          <ReferralDateRange
            activityId={Number(fixedActivityId)}
            from={filters.from}
            until={filters.until}
            onChange={(from, until) => setFilters({ ...filters, from, until })}
          />
        ) : (
          <>
            <label className="text-xs font-semibold text-muted">
              신청일 시작 (한국 시간)
              <input
                type="date"
                value={filters.from}
                className={referralInputClass}
                onChange={(e) => setFilters({ ...filters, from: e.target.value })}
              />
            </label>
            <label className="text-xs font-semibold text-muted">
              신청일 종료 (한국 시간)
              <input
                type="date"
                value={filters.until}
                className={referralInputClass}
                onChange={(e) => setFilters({ ...filters, until: e.target.value })}
              />
            </label>
          </>
        )}
        <button className={`${referralButtonClass} self-end`} type="submit">
          조회
        </button>
        {rangeError && (
          <p role="alert" className="text-sm text-danger sm:col-span-2">
            신청일 범위를 확인해 주세요.
          </p>
        )}
      </form>
      {query.isPending ? (
        <p role="status">불러오는 중…</p>
      ) : query.error ? (
        <ReferralError error={query.error} admin={admin} retry={() => void query.refetch()} />
      ) : query.data ? (
        <>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold">
              {fixedActivityId ? "조회 결과 " : "신청 "}
              <span className="text-primary">{query.data.totalElements.toLocaleString()}</span>건
            </h2>
            <p className="text-xs text-muted">
              {retained
                ? "취소 제외 · 일정 종료 포함"
                : applied.status
                  ? "선택한 상태 기준"
                  : "취소 건 포함"}{" "}
              · 참여 인원 합계가 아닙니다
            </p>
          </div>
          {!query.data.content.length && (
            <p className="rounded-2xl border border-line-soft p-8 text-center text-sm text-muted">
              조회 조건에 맞는 신청이 없습니다.
            </p>
          )}
          <div className="grid gap-3 lg:grid-cols-2">
            {(retained
              ? query.data.content.slice(page * 20, (page + 1) * 20)
              : query.data.content
            ).map((row) => (
              <article
                key={row.applicationId}
                className="min-w-0 rounded-2xl border border-line-soft p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-bold break-words">
                    {fixedActivityId ? row.applicantName : row.activityTitle}
                  </h3>
                  <span
                    className={`shrink-0 text-xs font-semibold ${row.status === "CANCELLED" ? "text-muted" : "text-primary"}`}
                  >
                    {row.status === "CONFIRMED"
                      ? "신청 확정"
                      : row.status === "CANCELLED"
                        ? "취소"
                        : "일정 종료"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted">
                  {formatAdminDate(row.startAt, true)} · {row.guestCount}명
                </p>
                <div className="mt-4 border-t border-line-soft pt-4">
                  {!fixedActivityId && <p className="font-semibold">{row.applicantName}</p>}
                  <p className="mt-1 text-sm break-all text-muted">
                    {row.contactMethod} ·{" "}
                    {[row.contactCountryCode, row.contactIdentifier].filter(Boolean).join(" ")}
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    신청일 {formatAdminDate(row.createdAt, true)}
                  </p>
                </div>
                {row.specialRequest && (
                  <div className="mt-4 border-t border-line-soft pt-4 text-sm">
                    <p className="font-semibold">특별 요청</p>
                    <p className="mt-1 break-words whitespace-pre-wrap text-muted">
                      {row.specialRequest}
                    </p>
                  </div>
                )}
                {!admin && (
                  <details className="mt-3 text-xs text-muted">
                    <summary className="cursor-pointer">동의 기록 · 신청 당시 정보</summary>
                    <p className="mt-2">
                      {row.consentVersion} · {formatAdminDate(row.consentedAt, true)}
                    </p>
                    <p className="mt-1">신청 번호 #{row.applicationId}</p>
                  </details>
                )}
              </article>
            ))}
          </div>
          <AdminPagination page={page} totalPages={query.data.totalPages} onPage={setPage} />
        </>
      ) : null}
    </section>
  );
}
