"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AdminAccountActionButtons,
  AdminAuditLogSection,
  AdminHistoryTable,
} from "@/app/admin/admin-detail-ui";
import {
  AdminLoadingRows,
  AdminPagination,
  AdminReasonDialog,
  AdminState,
  AdminStatusBadge,
  formatAdminCountry,
  formatAdminDate,
} from "@/app/admin/admin-ui";
import { Avatar } from "@/components/ui/Avatar";
import { HistoryIcon } from "@/components/ui/icons";
import { reactivateAdminUser, suspendAdminUser } from "@/lib/api/admin";
import { ApiClientError, isUnauthenticatedError } from "@/lib/api/errors";
import {
  adminAuditLogsQueryOptions,
  adminKeys,
  adminUserHistoryQueryOptions,
  adminUserQueryOptions,
} from "@/lib/query/admin";
import { unwrapApiResult } from "@/lib/query/result";
import type { AdminUserHistoryType } from "@/types/admin";

const HISTORY_TABS: Array<{ value: AdminUserHistoryType; label: string }> = [
  { value: "activities", label: "등록 활동" },
  { value: "applications", label: "신청" },
  { value: "payments", label: "결제" },
  { value: "reviews", label: "리뷰" },
  { value: "agreements", label: "약관" },
];

const ROLE_HISTORY_TYPES: Record<string, AdminUserHistoryType[]> = {
  TOURIST: ["applications", "payments", "reviews", "agreements"],
  BUDDY: ["activities", "agreements"],
  ADMIN: ["agreements"],
};

export function AdminUserDetailView({ userId }: { userId: string }) {
  const router = useRouter();
  const client = useQueryClient();
  const [historyType, setHistoryType] = useState<AdminUserHistoryType | null>(null);
  const [historyPage, setHistoryPage] = useState(0);
  const [action, setAction] = useState<"suspend" | "reactivate" | null>(null);
  const [reason, setReason] = useState("");
  const [actionError, setActionError] = useState("");
  const userQuery = useQuery(adminUserQueryOptions(userId));
  const defaultHistoryType = userQuery.data
    ? (ROLE_HISTORY_TYPES[userQuery.data.userType]?.[0] ?? "agreements")
    : null;
  const activeHistoryType = historyType ?? defaultHistoryType;
  const historyQuery = useQuery({
    ...adminUserHistoryQueryOptions(userId, activeHistoryType ?? "agreements", historyPage),
    enabled: activeHistoryType !== null,
  });
  const auditQuery = useQuery(adminAuditLogsQueryOptions(userId));
  const mutation = useMutation({
    mutationFn: async () => {
      const request = { reason: reason.trim() };
      return action === "suspend"
        ? unwrapApiResult(await suspendAdminUser(userId, request), "user")
        : unwrapApiResult(await reactivateAdminUser(userId, request), "user");
    },
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: adminKeys.user(userId) }),
        client.invalidateQueries({ queryKey: adminKeys.all }),
      ]);
      setAction(null);
      setReason("");
    },
    onError: async (error) => {
      if (error instanceof ApiClientError && error.status === 409) {
        await client.invalidateQueries({ queryKey: adminKeys.user(userId) });
      }
      setActionError(error instanceof Error ? error.message : "회원 상태를 변경하지 못했습니다.");
    },
  });

  if (userQuery.isPending)
    return (
      <main className="mx-auto max-w-[1200px] px-5 py-12 md:px-8">
        <AdminLoadingRows />
      </main>
    );
  if (isUnauthenticatedError(userQuery.error))
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
  if (userQuery.error || !userQuery.data)
    return (
      <main className="mx-auto max-w-[1200px] px-5 py-12 md:px-8">
        <AdminState
          title="회원 정보를 불러오지 못했습니다."
          description="회원이 존재하는지 확인해 주세요."
          action={() => userQuery.refetch()}
        />
      </main>
    );

  const user = userQuery.data;
  const historyTabs = HISTORY_TABS.filter((tab) =>
    (ROLE_HISTORY_TYPES[user.userType] ?? ["agreements"]).includes(tab.value),
  );
  const auditLogs = auditQuery.data?.logs ?? [];
  const canSuspend = user.userType !== "ADMIN" && user.accountStatus === "ACTIVE";
  const canReactivate = user.userType !== "ADMIN" && user.accountStatus === "SUSPENDED";

  function openAccountAction(nextAction: "suspend" | "reactivate") {
    setReason("");
    setActionError("");
    setAction(nextAction);
  }

  return (
    <main className="mx-auto w-full max-w-[1200px] px-5 pt-10 pb-28 md:px-8 md:py-14">
      <Link
        href={user.userType === "BUDDY" ? "/admin/buddies" : "/admin/users"}
        className="text-sm font-bold text-muted hover:text-primary"
      >
        ← {user.userType === "BUDDY" ? "버디 목록" : "관광객 목록"}
      </Link>
      <section className="mt-6 rounded-3xl border border-line-soft bg-white p-6 shadow-[0_18px_60px_rgba(38,27,24,0.06)] md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar name={user.displayName} size={56} className="rounded-2xl" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-bold text-muted">내부 ID #{user.userId}</p>
                <AdminStatusBadge status={user.accountStatus} />
              </div>
              <h1 className="mt-2 truncate font-display text-3xl font-extrabold tracking-[-0.04em]">
                {user.displayName}
              </h1>
              <p className="mt-1 truncate text-sm text-muted">{user.email}</p>
            </div>
          </div>
          <div className="hidden flex-wrap gap-2 md:flex">
            <AdminAccountActionButtons
              canSuspend={canSuspend}
              canReactivate={canReactivate}
              onSuspend={() => openAccountAction("suspend")}
              onReactivate={() => openAccountAction("reactivate")}
            />
          </div>
        </div>
        <div className="mt-8 grid gap-8 border-t border-line-soft pt-7 lg:grid-cols-3">
          <InfoSection title="기본 정보">
            <Info label="Google 계정 이름" value={user.name} />
            <Info label="역할" value={roleLabel(user.userType)} />
            <Info label="국적" value={formatAdminCountry(user.nationalityCode)} />
            <Info label="생년월일" value={formatAdminDate(user.birthDate)} />
            <Info label="가입일" value={formatAdminDate(user.createdAt, true)} />
          </InfoSection>
          <InfoSection title="연락">
            <Info label="연락 수단" value={user.contactMethod} />
            <Info label="국가 코드" value={user.contactCountryCode || "-"} />
            <Info label="연락처" value={user.contactIdentifier || "-"} />
          </InfoSection>
          <InfoSection title="상태">
            <Info label="계정 상태" value={<AdminStatusBadge status={user.accountStatus} />} />
            <Info label="정지 사유" value={user.suspensionReason || "-"} />
            <Info label="상태 변경일" value={formatAdminDate(user.updatedAt, true)} />
          </InfoSection>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-line-soft bg-white p-6 md:p-8">
        <div className="flex items-center gap-3">
          <HistoryIcon className="size-5 text-primary" />
          <h2 className="font-display text-xl font-extrabold">서비스 이용 이력</h2>
        </div>
        <div
          role="tablist"
          aria-label="서비스 이용 이력 유형"
          className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]"
        >
          {historyTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={activeHistoryType === tab.value}
              aria-label={`${tab.label} 이력 ${historyCount(user, tab.value).toLocaleString("ko-KR")}건`}
              onClick={() => {
                setHistoryType(tab.value);
                setHistoryPage(0);
              }}
              className={`min-w-0 rounded-2xl border px-4 py-4 text-left transition-all ${activeHistoryType === tab.value ? "border-primary/45 bg-primary-soft shadow-[0_10px_28px_rgba(209,63,50,0.09)]" : "border-line-soft bg-panel-raised hover:border-line-strong hover:bg-white"}`}
            >
              <span
                className={`block text-xs font-bold ${activeHistoryType === tab.value ? "text-primary" : "text-muted"}`}
              >
                {tab.label}
              </span>
              <span className="mt-1 block truncate font-display text-2xl font-extrabold text-ink">
                {historyCount(user, tab.value).toLocaleString("ko-KR")}
              </span>
            </button>
          ))}
        </div>
        {activeHistoryType && historyQuery.isPending ? (
          <div className="mt-6">
            <AdminLoadingRows />
          </div>
        ) : null}
        {activeHistoryType && historyQuery.error ? (
          <div className="mt-6">
            <AdminState
              title="이력을 불러오지 못했습니다."
              description="잠시 후 다시 시도해 주세요."
              action={() => historyQuery.refetch()}
            />
          </div>
        ) : null}
        {activeHistoryType && historyQuery.data ? (
          <>
            <AdminHistoryTable type={activeHistoryType} items={historyQuery.data.content ?? []} />
            <AdminPagination
              page={historyQuery.data.page}
              totalPages={historyQuery.data.totalPages}
              onPage={setHistoryPage}
            />
          </>
        ) : null}
      </section>

      <AdminAuditLogSection
        logs={auditLogs}
        isPending={auditQuery.isPending}
        hasError={Boolean(auditQuery.error)}
        onRetry={() => auditQuery.refetch()}
      />

      {canSuspend || canReactivate ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line-soft bg-white/95 px-5 py-3 shadow-[0_-12px_30px_rgba(38,27,24,0.08)] backdrop-blur md:hidden">
          <div className="mx-auto flex max-w-[1200px] justify-end gap-2">
            <AdminAccountActionButtons
              canSuspend={canSuspend}
              canReactivate={canReactivate}
              onSuspend={() => openAccountAction("suspend")}
              onReactivate={() => openAccountAction("reactivate")}
            />
          </div>
        </div>
      ) : null}

      {action ? (
        <AdminReasonDialog
          title={
            action === "suspend" ? "이 회원의 이용을 정지할까요?" : "이 회원을 재활성화할까요?"
          }
          description={
            action === "suspend"
              ? "정지 즉시 기존 토큰을 포함한 서비스 이용이 차단됩니다."
              : "재활성화하면 회원이 다시 서비스에 접근할 수 있습니다."
          }
          confirmLabel={action === "suspend" ? "계정 정지" : "재활성화"}
          danger={action === "suspend"}
          reason={reason}
          error={actionError}
          pending={mutation.isPending}
          onReason={setReason}
          onClose={() => !mutation.isPending && setAction(null)}
          onConfirm={() => mutation.mutate()}
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
    <div className="grid grid-cols-[116px_minmax(0,1fr)] gap-4 py-3">
      <dt className="text-sm whitespace-nowrap text-muted">{label}</dt>
      <dd className="min-w-0 text-sm font-semibold break-words">{value}</dd>
    </div>
  );
}
function historyCount(
  user: {
    activityCount: number;
    applicationCount: number;
    paymentCount: number;
    reviewCount: number;
    agreementCount: number;
  },
  type: AdminUserHistoryType,
) {
  return {
    activities: user.activityCount,
    applications: user.applicationCount,
    payments: user.paymentCount,
    reviews: user.reviewCount,
    agreements: user.agreementCount,
  }[type];
}

function roleLabel(role: string) {
  return (
    ({ TOURIST: "투어리스트", BUDDY: "버디", ADMIN: "관리자" } as Record<string, string>)[role] ??
    role
  );
}
