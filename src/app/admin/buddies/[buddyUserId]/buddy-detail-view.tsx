"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { StarIcon, UserIcon, WonSignIcon } from "@/components/ui/icons";
import { updateAdminBuddyCommission } from "@/lib/api/admin";
import { ApiClientError, isUnauthenticatedError } from "@/lib/api/errors";
import { formatKrw } from "@/lib/format";
import {
  adminAuditLogsQueryOptions,
  adminBuddyPerformanceQueryOptions,
  adminBuddyQueryOptions,
  adminKeys,
} from "@/lib/query/admin";
import { unwrapApiResult } from "@/lib/query/result";
import type { AdminCommissionPolicy } from "@/types/admin";
import {
  AdminLoadingRows,
  AdminReasonDialog,
  AdminState,
  AdminStatusBadge,
  formatAdminDate,
} from "../../admin-ui";

export function AdminBuddyDetailView({ buddyId }: { buddyId: string }) {
  const router = useRouter();
  const client = useQueryClient();
  const [nextPolicy, setNextPolicy] = useState<AdminCommissionPolicy | null>(null);
  const [reason, setReason] = useState("");
  const [actionError, setActionError] = useState("");
  const buddyQuery = useQuery(adminBuddyQueryOptions(buddyId));
  const performanceQuery = useQuery(adminBuddyPerformanceQueryOptions(buddyId));
  const auditQuery = useQuery(adminAuditLogsQueryOptions(buddyId));
  const mutation = useMutation({
    mutationFn: async () => {
      if (!nextPolicy) throw new Error("변경할 수수료 정책을 선택해 주세요.");
      return unwrapApiResult(
        await updateAdminBuddyCommission(buddyId, {
          commissionPolicy: nextPolicy,
          reason: reason.trim(),
        }),
        "buddy",
      );
    },
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: adminKeys.buddy(buddyId) }),
        client.invalidateQueries({ queryKey: adminKeys.all }),
      ]);
      setNextPolicy(null);
      setReason("");
    },
    onError: async (error) => {
      if (error instanceof ApiClientError && error.status === 409) {
        await client.invalidateQueries({ queryKey: adminKeys.buddy(buddyId) });
      }
      setActionError(error instanceof Error ? error.message : "수수료 정책을 변경하지 못했습니다.");
    },
  });

  if (buddyQuery.isPending)
    return (
      <main className="mx-auto max-w-[1200px] px-5 py-12 md:px-8">
        <AdminLoadingRows />
      </main>
    );
  if (isUnauthenticatedError(buddyQuery.error))
    return (
      <main className="mx-auto max-w-[1200px] px-5 py-12 md:px-8">
        <AdminState
          title="관리자 세션이 만료되었습니다."
          description="다시 로그인해 주세요."
          action={() => router.replace("/admin/login")}
          actionLabel="다시 로그인"
        />
      </main>
    );
  if (buddyQuery.error || !buddyQuery.data)
    return (
      <main className="mx-auto max-w-[1200px] px-5 py-12 md:px-8">
        <AdminState
          title="버디 정보를 불러오지 못했습니다."
          description="버디가 존재하는지 확인해 주세요."
          action={() => buddyQuery.refetch()}
        />
      </main>
    );

  const buddy = buddyQuery.data;
  const user = buddy.user;
  const performance = performanceQuery.data;

  return (
    <main className="mx-auto w-full max-w-[1200px] px-5 py-10 md:px-8 md:py-14">
      <Link href="/admin/buddies" className="text-sm font-bold text-muted hover:text-primary">
        ← 버디 목록
      </Link>
      <section className="mt-6 rounded-3xl border border-line-soft bg-white p-6 shadow-[0_18px_60px_rgba(38,27,24,0.06)] md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <UserIcon className="size-6" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-bold text-muted">버디 #{buddyId}</p>
                <AdminStatusBadge status={user.accountStatus} />
              </div>
              <h1 className="mt-2 truncate font-display text-3xl font-extrabold tracking-[-0.04em]">
                {user.displayName}
              </h1>
              <p className="mt-1 truncate text-sm text-muted">{user.email}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/users/${user.userId}`}
              className="rounded-full border border-line-strong px-5 py-2.5 text-sm font-bold text-muted hover:border-primary hover:text-primary"
            >
              회원 정보 보기
            </Link>
            {user.accountStatus === "PENDING_APPROVAL" ? (
              <Link
                href={`/admin/buddy-applications/${user.userId}`}
                className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white"
              >
                승인 검토
              </Link>
            ) : null}
          </div>
        </div>
        <div className="mt-8 grid gap-8 border-t border-line-soft pt-7 lg:grid-cols-2">
          <section>
            <h2 className="font-display text-lg font-extrabold">기본 정보</h2>
            <dl className="mt-4 divide-y divide-line-soft">
              <Info label="실명" value={user.name} />
              <Info label="국적" value={user.nationalityCode || "-"} />
              <Info label="가입일" value={formatAdminDate(user.createdAt, true)} />
              <Info label="연락 수단" value={user.contactMethod} />
            </dl>
          </section>
          <section>
            <h2 className="font-display text-lg font-extrabold">수수료 정책</h2>
            <div className="mt-4 rounded-2xl bg-panel-raised p-5">
              <p className="text-sm text-muted">현재 적용 정책</p>
              <div className="mt-2 flex items-end justify-between gap-4">
                <div>
                  <strong className="font-display text-2xl font-extrabold">
                    {commissionLabel(buddy.commissionPolicy)}
                  </strong>
                  <p className="mt-1 text-sm text-muted">
                    기존 결제에는 변경된 정책이 적용되지 않습니다.
                  </p>
                </div>
                {buddy.commissionPolicy ? (
                  <button
                    type="button"
                    onClick={() => {
                      setReason("");
                      setActionError("");
                      setNextPolicy(
                        buddy.commissionPolicy === "EARLY_10" ? "STANDARD_20" : "EARLY_10",
                      );
                    }}
                    className="shrink-0 rounded-full border border-primary px-4 py-2 text-sm font-bold text-primary hover:bg-primary hover:text-white"
                  >
                    정책 변경
                  </button>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-primary uppercase">
              Performance
            </p>
            <h2 className="mt-2 font-display text-2xl font-extrabold">운영 성과</h2>
          </div>
          <p className="text-sm text-muted">확정 결제 기준</p>
        </div>
        {performanceQuery.isPending ? (
          <div className="mt-5">
            <AdminLoadingRows />
          </div>
        ) : null}
        {performanceQuery.error ? (
          <div className="mt-5">
            <AdminState
              title="운영 성과를 불러오지 못했습니다."
              description="잠시 후 다시 시도해 주세요."
              action={() => performanceQuery.refetch()}
            />
          </div>
        ) : null}
        {performance ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <PerformanceCard
              icon={<WonSignIcon className="size-5" />}
              label="확정 결제액"
              value={formatKrw(performance.confirmedPaymentAmountKrw, "ko")}
              detail={`${performance.confirmedPaymentCount}건`}
            />
            <PerformanceCard
              icon={<WonSignIcon className="size-5" />}
              label="버디 정산 예정액"
              value={formatKrw(performance.guidePayoutAmountKrw, "ko")}
              detail="확정 결제 기준"
            />
            <PerformanceCard
              icon={<StarIcon className="size-5" />}
              label="평균 평점"
              value={
                performance.averageRating === null
                  ? "리뷰 없음"
                  : performance.averageRating.toFixed(1)
              }
              detail={`${performance.reviewCount}개 리뷰`}
            />
            <PerformanceCard
              icon={<UserIcon className="size-5" />}
              label="운영 활동"
              value={`${performance.activeActivityCount}개`}
              detail={`전체 ${performance.totalActivityCount}개`}
            />
          </div>
        ) : null}
        {performance ? (
          <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl border border-line-soft bg-panel-raised p-4 sm:grid-cols-5">
            {Object.entries(performance.applicationCounts).map(([status, count]) => (
              <div key={status} className="rounded-xl bg-white px-4 py-3">
                <p className="text-xs text-muted">{applicationLabel(status)}</p>
                <p className="mt-1 font-display text-xl font-extrabold">{count}</p>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="mt-8 rounded-3xl border border-line-soft bg-panel-raised p-6 md:p-8">
        <h2 className="font-display text-xl font-extrabold">관리자 작업 이력</h2>
        {auditQuery.data?.content.length === 0 ? (
          <p className="mt-4 text-sm text-muted">기록된 관리자 작업이 없습니다.</p>
        ) : null}
        <ol className="mt-5 space-y-3">
          {auditQuery.data?.content.map((log) => (
            <li
              key={log.auditLogId}
              className="rounded-xl border border-line-soft bg-white px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-sm">{auditLabel(log.action)}</strong>
                <time className="text-xs text-muted">{formatAdminDate(log.createdAt, true)}</time>
              </div>
              <p className="mt-1 text-sm text-muted">{log.reason || "사유 없음"}</p>
            </li>
          ))}
        </ol>
      </section>

      {nextPolicy ? (
        <AdminReasonDialog
          title={`${commissionLabel(nextPolicy)} 정책으로 변경할까요?`}
          description="변경 이후 새로 생성되는 결제부터 적용되며 기존 결제와 정산 금액은 바뀌지 않습니다."
          confirmLabel="수수료 정책 변경"
          reason={reason}
          error={actionError}
          pending={mutation.isPending}
          onReason={setReason}
          onClose={() => !mutation.isPending && setNextPolicy(null)}
          onConfirm={() => mutation.mutate()}
        />
      ) : null}
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-4 py-3">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm font-semibold break-words">{value}</dd>
    </div>
  );
}
function PerformanceCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-2xl border border-line-soft bg-white p-5">
      <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
        {icon}
      </span>
      <p className="mt-4 text-sm text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-extrabold">{value}</p>
      <p className="mt-1 text-xs text-muted">{detail}</p>
    </article>
  );
}
function commissionLabel(policy: AdminCommissionPolicy | null) {
  return policy === "EARLY_10"
    ? "초기 버디 10%"
    : policy === "STANDARD_20"
      ? "일반 20%"
      : "승인 후 설정";
}
function applicationLabel(status: string) {
  return (
    (
      {
        PENDING_PAYMENT: "결제 대기",
        SUPERSEDED: "대체됨",
        CONFIRMED: "확정",
        CANCELLED: "취소",
        COMPLETED: "완료",
      } as Record<string, string>
    )[status] ?? status
  );
}
function auditLabel(action: string) {
  return (
    (
      {
        USER_SUSPENDED: "계정 정지",
        USER_REACTIVATED: "계정 재활성화",
        BUDDY_COMMISSION_CHANGED: "수수료 정책 변경",
      } as Record<string, string>
    )[action] ?? action
  );
}
