"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { HistoryIcon, UserIcon } from "@/components/ui/icons";
import { reactivateAdminUser, suspendAdminUser, updateAdminBuddyCommission } from "@/lib/api/admin";
import { ApiClientError, isUnauthenticatedError } from "@/lib/api/errors";
import { formatKrw } from "@/lib/format";
import {
  adminAuditLogsQueryOptions,
  adminBuddyPerformanceQueryOptions,
  adminBuddyQueryOptions,
  adminKeys,
  adminUserHistoryQueryOptions,
} from "@/lib/query/admin";
import { unwrapApiResult } from "@/lib/query/result";
import type { AdminCommissionPolicy, AdminUserHistory, AdminUserHistoryType } from "@/types/admin";
import {
  AdminLoadingRows,
  AdminPagination,
  AdminReasonDialog,
  AdminState,
  AdminStatusBadge,
  formatAdminCountry,
  formatAdminDate,
} from "../../admin-ui";

export function AdminBuddyDetailView({ buddyId }: { buddyId: string }) {
  const router = useRouter();
  const client = useQueryClient();
  const [commissionDialogOpen, setCommissionDialogOpen] = useState(false);
  const [nextPolicy, setNextPolicy] = useState<AdminCommissionPolicy | null>(null);
  const [historyType, setHistoryType] = useState<AdminUserHistoryType>("activities");
  const [historyPage, setHistoryPage] = useState(0);
  const [accountAction, setAccountAction] = useState<"suspend" | "reactivate" | null>(null);
  const [reason, setReason] = useState("");
  const [actionError, setActionError] = useState("");
  const buddyQuery = useQuery(adminBuddyQueryOptions(buddyId));
  const performanceQuery = useQuery(adminBuddyPerformanceQueryOptions(buddyId));
  const auditTargetUserId = buddyQuery.data?.user.userId;
  const historyQuery = useQuery({
    ...adminUserHistoryQueryOptions(auditTargetUserId ?? "pending", historyType, historyPage),
    enabled: auditTargetUserId !== undefined,
  });
  const auditQuery = useQuery({
    ...adminAuditLogsQueryOptions(auditTargetUserId ?? "pending"),
    enabled: auditTargetUserId !== undefined,
  });
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
      setCommissionDialogOpen(false);
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
  const accountMutation = useMutation({
    mutationFn: async () => {
      const userId = buddyQuery.data?.user.userId;
      if (!userId || !accountAction) throw new Error("변경할 계정 정보를 확인하지 못했습니다.");
      const request = { reason: reason.trim() };
      return accountAction === "suspend"
        ? unwrapApiResult(await suspendAdminUser(userId, request), "user")
        : unwrapApiResult(await reactivateAdminUser(userId, request), "user");
    },
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: adminKeys.buddy(buddyId) }),
        client.invalidateQueries({ queryKey: adminKeys.all }),
      ]);
      setAccountAction(null);
      setReason("");
    },
    onError: async (error) => {
      if (error instanceof ApiClientError && error.status === 409) {
        await client.invalidateQueries({ queryKey: adminKeys.buddy(buddyId) });
      }
      setActionError(error instanceof Error ? error.message : "회원 상태를 변경하지 못했습니다.");
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
  const auditLogs = auditQuery.data?.logs ?? [];
  const canSuspend = user.accountStatus === "ACTIVE";
  const canReactivate = user.accountStatus === "SUSPENDED";

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
            {user.accountStatus === "PENDING_APPROVAL" ? (
              <Link
                href={`/admin/buddy-applications/${user.userId}`}
                className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white"
              >
                승인 검토
              </Link>
            ) : null}
            {canSuspend ? (
              <button
                type="button"
                onClick={() => {
                  setCommissionDialogOpen(false);
                  setNextPolicy(null);
                  setReason("");
                  setActionError("");
                  setAccountAction("suspend");
                }}
                className="rounded-full border border-danger px-5 py-2.5 text-sm font-bold text-danger hover:bg-primary-soft"
              >
                계정 정지
              </button>
            ) : null}
            {canReactivate ? (
              <button
                type="button"
                onClick={() => {
                  setCommissionDialogOpen(false);
                  setNextPolicy(null);
                  setReason("");
                  setActionError("");
                  setAccountAction("reactivate");
                }}
                className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-hover"
              >
                계정 재활성화
              </button>
            ) : null}
          </div>
        </div>
        <div className="mt-8 grid gap-8 border-t border-line-soft pt-7 lg:grid-cols-3">
          <InfoSection title="기본 정보">
            <Info label="Google 계정 이름" value={user.name} />
            <Info label="국적" value={formatAdminCountry(user.nationalityCode)} />
            <Info label="생년월일" value={formatAdminDate(user.birthDate)} />
            <Info label="가입일" value={formatAdminDate(user.createdAt, true)} />
          </InfoSection>
          <InfoSection title="연락">
            <Info label="연락 수단" value={user.contactMethod} />
            <Info label="국가 코드" value={user.contactCountryCode || "-"} />
            <Info label="연락처" value={user.contactIdentifier || "-"} />
          </InfoSection>
          <InfoSection title="관리 정보">
            <Info label="계정 상태" value={<AdminStatusBadge status={user.accountStatus} />} />
            <Info label="정지 사유" value={user.suspensionReason || "-"} />
            <Info label="상태 변경일" value={formatAdminDate(user.updatedAt, true)} />
            <Info
              label="수수료 정책"
              value={
                <div className="flex flex-wrap items-center gap-2">
                  <span>{commissionLabel(buddy.commissionPolicy)}</span>
                  {buddy.commissionPolicy ? (
                    <button
                      type="button"
                      onClick={() => {
                        setAccountAction(null);
                        setReason("");
                        setActionError("");
                        setNextPolicy(buddy.commissionPolicy);
                        setCommissionDialogOpen(true);
                      }}
                      className="rounded-full border border-primary/45 px-3 py-1 text-xs font-bold text-primary hover:border-primary hover:bg-primary-soft"
                    >
                      변경
                    </button>
                  ) : null}
                </div>
              }
            />
          </InfoSection>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-line-soft bg-white p-6 md:p-8">
        <h2 className="font-display text-xl font-extrabold">운영 정보</h2>
        {performanceQuery.isPending ? (
          <div className="mt-5">
            <AdminLoadingRows />
          </div>
        ) : null}
        {performanceQuery.error ? (
          <div className="mt-5">
            <AdminState
              title="운영 정보를 불러오지 못했습니다."
              description="잠시 후 다시 시도해 주세요."
              action={() => performanceQuery.refetch()}
            />
          </div>
        ) : null}
        {performanceQuery.data ? (
          <dl className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Metric label="등록 활동" value={`${performanceQuery.data.totalActivityCount}개`} />
            <Metric label="운영 중" value={`${performanceQuery.data.activeActivityCount}개`} />
            <Metric
              label="확정 결제"
              value={`${performanceQuery.data.confirmedPaymentCount}건`}
              detail={formatKrw(performanceQuery.data.confirmedPaymentAmountKrw, "ko")}
            />
            <Metric
              label="정산 예정"
              value={formatKrw(performanceQuery.data.guidePayoutAmountKrw, "ko")}
            />
            <Metric
              label="평점"
              value={
                performanceQuery.data.averageRating === null
                  ? "-"
                  : performanceQuery.data.averageRating.toFixed(1)
              }
              detail={`리뷰 ${performanceQuery.data.reviewCount}개`}
            />
          </dl>
        ) : null}
      </section>

      <section className="mt-8 rounded-3xl border border-line-soft bg-white p-6 md:p-8">
        <div className="flex items-center gap-3">
          <HistoryIcon className="size-5 text-primary" />
          <h2 className="font-display text-xl font-extrabold">서비스 이용 이력</h2>
        </div>
        <div
          role="tablist"
          aria-label="버디 이용 이력 유형"
          className="mt-5 grid grid-cols-2 gap-3"
        >
          {(
            [
              ["activities", "등록 활동", user.activityCount],
              ["agreements", "약관", user.agreementCount],
            ] as const
          ).map(([type, label, count]) => (
            <button
              key={type}
              type="button"
              role="tab"
              aria-selected={historyType === type}
              aria-label={`${label} 이력 ${count.toLocaleString("ko-KR")}건`}
              onClick={() => {
                setHistoryType(type);
                setHistoryPage(0);
              }}
              className={`min-w-0 rounded-2xl border px-4 py-4 text-left transition-all ${historyType === type ? "border-primary/45 bg-primary-soft shadow-[0_10px_28px_rgba(209,63,50,0.09)]" : "border-line-soft bg-panel-raised hover:border-line-strong hover:bg-white"}`}
            >
              <span
                className={`block text-xs font-bold ${historyType === type ? "text-primary" : "text-muted"}`}
              >
                {label}
              </span>
              <span className="mt-1 block font-display text-2xl font-extrabold text-ink">
                {count.toLocaleString("ko-KR")}
              </span>
            </button>
          ))}
        </div>
        {historyQuery.isPending ? (
          <div className="mt-6">
            <AdminLoadingRows />
          </div>
        ) : null}
        {historyQuery.error ? (
          <div className="mt-6">
            <AdminState
              title="이력을 불러오지 못했습니다."
              description="잠시 후 다시 시도해 주세요."
              action={() => historyQuery.refetch()}
            />
          </div>
        ) : null}
        {historyQuery.data ? (
          <>
            <HistoryTable type={historyType} items={historyQuery.data.content ?? []} />
            <AdminPagination
              page={historyQuery.data.page}
              totalPages={historyQuery.data.totalPages}
              onPage={setHistoryPage}
            />
          </>
        ) : null}
      </section>

      <section className="mt-8 rounded-3xl border border-line-soft bg-panel-raised p-6 md:p-8">
        <h2 className="font-display text-xl font-extrabold">관리자 작업 이력</h2>
        {auditQuery.isPending ? (
          <p className="mt-4 text-sm text-muted">작업 이력을 불러오는 중입니다.</p>
        ) : null}
        {auditQuery.error ? (
          <div className="mt-4">
            <AdminState
              title="작업 이력을 불러오지 못했습니다."
              description="잠시 후 다시 시도해 주세요."
              action={() => auditQuery.refetch()}
            />
          </div>
        ) : null}
        {!auditQuery.isPending && !auditQuery.error && auditLogs.length === 0 ? (
          <p className="mt-4 text-sm text-muted">기록된 관리자 작업이 없습니다.</p>
        ) : null}
        <ol className="mt-5 space-y-3">
          {auditLogs.map((log) => (
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

      {commissionDialogOpen ? (
        <AdminReasonDialog
          title="수수료 정책 변경"
          confirmLabel="수수료 정책 변경"
          reason={reason}
          error={actionError}
          pending={mutation.isPending}
          confirmDisabled={!nextPolicy || nextPolicy === buddy.commissionPolicy}
          onReason={setReason}
          onClose={() => {
            if (!mutation.isPending) {
              setCommissionDialogOpen(false);
              setNextPolicy(null);
            }
          }}
          onConfirm={() => mutation.mutate()}
        >
          <div role="radiogroup" aria-label="수수료 정책" className="grid grid-cols-2 gap-3">
            {(["EARLY_10", "STANDARD_20"] as const).map((policy) => {
              const selected = nextPolicy === policy;
              return (
                <button
                  key={policy}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={policy === "EARLY_10" ? "초기 버디 10%" : "일반 20%"}
                  onClick={() => setNextPolicy(policy)}
                  className={`rounded-2xl border p-4 text-left transition-all ${selected ? "border-primary bg-primary-soft shadow-[0_8px_24px_rgba(209,63,50,0.1)]" : "border-line-strong hover:border-primary/60"}`}
                >
                  <span
                    className={`block text-xs font-bold ${selected ? "text-primary" : "text-muted"}`}
                  >
                    {policy === "EARLY_10" ? "초기 버디" : "일반"}
                  </span>
                  <span className="mt-1 block font-display text-2xl font-extrabold">
                    {policy === "EARLY_10" ? "10%" : "20%"}
                  </span>
                </button>
              );
            })}
          </div>
        </AdminReasonDialog>
      ) : null}
      {accountAction ? (
        <AdminReasonDialog
          title={
            accountAction === "suspend"
              ? "이 버디의 이용을 정지할까요?"
              : "이 버디를 재활성화할까요?"
          }
          description={
            accountAction === "suspend"
              ? "정지 즉시 기존 토큰을 포함한 서비스 이용이 차단됩니다."
              : "재활성화하면 버디가 다시 서비스에 접근할 수 있습니다."
          }
          confirmLabel={accountAction === "suspend" ? "계정 정지" : "재활성화"}
          danger={accountAction === "suspend"}
          reason={reason}
          error={actionError}
          pending={accountMutation.isPending}
          onReason={setReason}
          onClose={() => !accountMutation.isPending && setAccountAction(null)}
          onConfirm={() => accountMutation.mutate()}
        />
      ) : null}
    </main>
  );
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-lg font-extrabold">{title}</h2>
      <dl className="mt-4 divide-y divide-line-soft">{children}</dl>
    </section>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-4 py-3">
      <dt className="text-sm whitespace-nowrap text-muted">{label}</dt>
      <dd className="min-w-0 text-sm font-semibold break-words">{value}</dd>
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-2xl border border-line-soft bg-panel-raised px-4 py-4">
      <dt className="text-xs font-semibold text-muted">{label}</dt>
      <dd className="mt-1">
        <span className="block font-display text-xl font-extrabold text-ink">{value}</span>
        {detail ? <span className="mt-1 block text-xs text-muted">{detail}</span> : null}
      </dd>
    </div>
  );
}

function HistoryTable({ type, items }: { type: AdminUserHistoryType; items: AdminUserHistory[] }) {
  if (items.length === 0)
    return (
      <p className="mt-6 rounded-2xl bg-panel-raised px-5 py-10 text-center text-sm text-muted">
        해당 이력이 없습니다.
      </p>
    );
  return (
    <ul className="mt-6 divide-y divide-line-soft border-y border-line-soft">
      {items.map((item) => (
        <li
          key={historyKey(type, item)}
          className="grid gap-2 py-4 md:grid-cols-[1fr_auto] md:items-center"
        >
          <div>
            <p className="font-semibold">{historyTitle(type, item)}</p>
            <p className="mt-1 text-sm text-muted">{historyDescription(type, item)}</p>
          </div>
          <time className="text-xs text-muted">
            {formatAdminDate("createdAt" in item ? item.createdAt : item.decidedAt, true)}
          </time>
        </li>
      ))}
    </ul>
  );
}

function historyKey(type: AdminUserHistoryType, item: AdminUserHistory) {
  if (type === "activities" && "activityId" in item) return `${type}-${item.activityId}`;
  if (type === "agreements" && "userAgreementId" in item) return `${type}-${item.userAgreementId}`;
  return `${type}-unknown`;
}

function historyTitle(type: AdminUserHistoryType, item: AdminUserHistory) {
  if (type === "activities" && "title" in item) return item.title;
  if (type === "agreements" && "type" in item) return `${item.type} · ${item.version}`;
  return type === "activities" ? "활동 정보 없음" : "약관 정보 없음";
}

function historyDescription(type: AdminUserHistoryType, item: AdminUserHistory) {
  if (type === "activities" && "price" in item)
    return `${activityStatusLabel(item.status)} · ${formatKrw(item.price, "ko")}`;
  if (type === "agreements" && "agreed" in item) return item.agreed ? "동의" : "미동의";
  return "";
}

function activityStatusLabel(status: string) {
  return (
    (
      { DRAFT: "작성 중", ACTIVE: "운영 중", INACTIVE: "비활성", DELETED: "삭제" } as Record<
        string,
        string
      >
    )[status] ?? status
  );
}

function commissionLabel(policy: AdminCommissionPolicy | null) {
  return policy === "EARLY_10"
    ? "초기 버디 10%"
    : policy === "STANDARD_20"
      ? "일반 20%"
      : "승인 후 설정";
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
