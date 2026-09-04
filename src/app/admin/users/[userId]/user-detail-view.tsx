"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { HistoryIcon, UserIcon } from "@/components/ui/icons";
import { reactivateAdminUser, suspendAdminUser } from "@/lib/api/admin";
import { ApiClientError, isUnauthenticatedError } from "@/lib/api/errors";
import { formatKrw } from "@/lib/format";
import {
  adminAuditLogsQueryOptions,
  adminKeys,
  adminUserHistoryQueryOptions,
  adminUserQueryOptions,
} from "@/lib/query/admin";
import { unwrapApiResult } from "@/lib/query/result";
import type { AdminUserHistory, AdminUserHistoryType } from "@/types/admin";
import {
  AdminLoadingRows,
  AdminPagination,
  AdminReasonDialog,
  AdminState,
  AdminStatusBadge,
  formatAdminCountry,
  formatAdminDate,
} from "../../admin-ui";

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

  return (
    <main className="mx-auto w-full max-w-[1200px] px-5 py-10 md:px-8 md:py-14">
      <Link
        href={user.userType === "BUDDY" ? "/admin/buddies" : "/admin/users"}
        className="text-sm font-bold text-muted hover:text-primary"
      >
        ← {user.userType === "BUDDY" ? "버디 목록" : "관광객 목록"}
      </Link>
      <section className="mt-6 rounded-3xl border border-line-soft bg-white p-6 shadow-[0_18px_60px_rgba(38,27,24,0.06)] md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <UserIcon className="size-6" />
            </span>
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
          <div className="flex flex-wrap gap-2">
            {canSuspend ? (
              <button
                type="button"
                onClick={() => {
                  setReason("");
                  setActionError("");
                  setAction("suspend");
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
                  setReason("");
                  setActionError("");
                  setAction("reactivate");
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
        <div className="mt-8 grid grid-cols-2 gap-3 border-t border-line-soft pt-7 sm:grid-cols-5">
          <Metric label="활동" value={user.activityCount} />
          <Metric label="신청" value={user.applicationCount} />
          <Metric label="결제" value={user.paymentCount} />
          <Metric label="리뷰" value={user.reviewCount} />
          <Metric label="약관" value={user.agreementCount} />
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-line-soft bg-white p-6 md:p-8">
        <div className="flex items-center gap-3">
          <HistoryIcon className="size-5 text-primary" />
          <div>
            <h2 className="font-display text-xl font-extrabold">서비스 이용 이력</h2>
            <p className="mt-1 text-sm text-muted">탭을 선택할 때 해당 이력을 조회합니다.</p>
          </div>
        </div>
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {historyTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              aria-pressed={activeHistoryType === tab.value}
              onClick={() => {
                setHistoryType(tab.value);
                setHistoryPage(0);
              }}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold ${activeHistoryType === tab.value ? "border-primary bg-primary text-white" : "border-line-strong text-muted hover:border-primary hover:text-primary"}`}
            >
              {tab.label}
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
            <HistoryTable type={activeHistoryType} items={historyQuery.data.content ?? []} />
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
function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-panel-raised px-4 py-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-extrabold">{value.toLocaleString("ko-KR")}</p>
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
            <p className="mt-1 line-clamp-2 text-sm text-muted">{historyDescription(type, item)}</p>
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
  if (type === "applications" && "applicationId" in item) return `${type}-${item.applicationId}`;
  if (type === "payments" && "paymentId" in item) return `${type}-${item.paymentId}`;
  if (type === "reviews" && "reviewId" in item) return `${type}-${item.reviewId}`;
  if (type === "agreements" && "userAgreementId" in item) return `${type}-${item.userAgreementId}`;
  return `${type}-unknown`;
}
function historyTitle(type: AdminUserHistoryType, item: AdminUserHistory) {
  if (type === "activities" && "title" in item) return item.title;
  if (type === "applications" && "activityTitle" in item) return item.activityTitle;
  if (type === "payments" && "orderNumber" in item) return item.orderNumber;
  if (type === "reviews" && "content" in item) return item.activityTitle;
  if (type === "agreements" && "type" in item) return `${item.type} · ${item.version}`;
  return historyFallbackTitle(type, item);
}

function historyFallbackTitle(type: AdminUserHistoryType, item: AdminUserHistory) {
  const labels: Record<AdminUserHistoryType, string> = {
    activities: "활동",
    applications: "신청",
    payments: "결제",
    reviews: "리뷰",
    agreements: "약관",
  };
  const id =
    "activityId" in item
      ? item.activityId
      : "applicationId" in item
        ? item.applicationId
        : "paymentId" in item
          ? item.paymentId
          : "reviewId" in item
            ? item.reviewId
            : "userAgreementId" in item
              ? item.userAgreementId
              : null;
  return id === null ? `${labels[type]} 정보 없음` : `${labels[type]} #${id}`;
}
function historyDescription(type: AdminUserHistoryType, item: AdminUserHistory) {
  if (type === "activities" && "price" in item)
    return `${item.status} · ${formatKrw(item.price, "ko")}`;
  if (type === "applications" && "guestCount" in item)
    return `${item.status} · ${item.guestCount}명 · ${formatAdminDate(item.scheduleStartAt, true)}`;
  if (type === "payments" && "amount" in item)
    return `${item.status} · ${formatKrw(item.amount, "ko")}`;
  if (type === "reviews" && "content" in item) return `★ ${item.rating} · ${item.content}`;
  if (type === "agreements" && "agreed" in item) return item.agreed ? "동의" : "미동의";
  return "";
}
function roleLabel(role: string) {
  return (
    ({ TOURIST: "투어리스트", BUDDY: "버디", ADMIN: "관리자" } as Record<string, string>)[role] ??
    role
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
