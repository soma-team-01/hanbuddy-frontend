"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { UserIcon } from "@/components/ui/icons";
import { reactivateAdminUser, suspendAdminUser, updateAdminBuddyCommission } from "@/lib/api/admin";
import { ApiClientError, isUnauthenticatedError } from "@/lib/api/errors";
import { adminAuditLogsQueryOptions, adminBuddyQueryOptions, adminKeys } from "@/lib/query/admin";
import { unwrapApiResult } from "@/lib/query/result";
import type { AdminCommissionPolicy } from "@/types/admin";
import {
  AdminLoadingRows,
  AdminReasonDialog,
  AdminState,
  AdminStatusBadge,
  formatAdminCountry,
  formatAdminDate,
} from "../../admin-ui";

export function AdminBuddyDetailView({ buddyId }: { buddyId: string }) {
  const router = useRouter();
  const client = useQueryClient();
  const [nextPolicy, setNextPolicy] = useState<AdminCommissionPolicy | null>(null);
  const [accountAction, setAccountAction] = useState<"suspend" | "reactivate" | null>(null);
  const [reason, setReason] = useState("");
  const [actionError, setActionError] = useState("");
  const buddyQuery = useQuery(adminBuddyQueryOptions(buddyId));
  const auditTargetUserId = buddyQuery.data?.user.userId;
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
                        setNextPolicy(
                          buddy.commissionPolicy === "EARLY_10" ? "STANDARD_20" : "EARLY_10",
                        );
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
