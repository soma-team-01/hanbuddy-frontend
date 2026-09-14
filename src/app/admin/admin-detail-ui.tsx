import { AdminState, formatAdminActor, formatAdminDate } from "@/app/admin/admin-ui";
import { formatKrw } from "@/lib/format";
import type { AdminAuditLogSummary, AdminUserHistory, AdminUserHistoryType } from "@/types/admin";

interface AdminAuditLogSectionProps {
  logs: AdminAuditLogSummary[];
  isPending: boolean;
  hasError: boolean;
  onRetry: () => void;
}

export function AdminAuditLogSection({
  logs,
  isPending,
  hasError,
  onRetry,
}: Readonly<AdminAuditLogSectionProps>) {
  return (
    <section className="mt-8 rounded-3xl border border-line-soft bg-white p-6 md:p-8">
      <h2 className="font-display text-xl font-extrabold">관리자 작업 이력</h2>
      {isPending ? <p className="mt-4 text-sm text-muted">작업 이력을 불러오는 중입니다.</p> : null}
      {hasError ? (
        <div className="mt-4">
          <AdminState
            title="작업 이력을 불러오지 못했습니다."
            description="잠시 후 다시 시도해 주세요."
            action={onRetry}
          />
        </div>
      ) : null}
      {!isPending && !hasError && logs.length === 0 ? (
        <p className="mt-4 text-sm text-muted">기록된 관리자 작업이 없습니다.</p>
      ) : null}
      <ol className="mt-5 space-y-3">
        {logs.map((log) => (
          <li
            key={log.auditLogId}
            className="rounded-xl border border-line-soft bg-white px-4 py-3"
          >
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
              <div className="grid min-w-0 gap-1.5">
                <strong className="block text-sm leading-5 text-ink">
                  {adminAuditActionLabel(log.action)}
                </strong>
                <p className="text-sm leading-5">
                  <span className="mr-1.5 text-muted">사유:</span>
                  <span className="text-ink/80">{log.reason || "없음"}</span>
                </p>
              </div>
              <div className="grid max-w-full gap-1.5 text-xs sm:text-right">
                <time className="block leading-5 text-muted/80">
                  {formatAdminDate(log.createdAt, true)}
                </time>
                <p className="leading-5 break-all">
                  <span className="mr-1.5 text-muted">작업자:</span>
                  <span className="font-semibold text-ink/80">{formatAdminActor(log)}</span>
                </p>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function AdminHistoryTable({
  type,
  items,
}: Readonly<{ type: AdminUserHistoryType; items: AdminUserHistory[] }>) {
  if (items.length === 0) {
    return (
      <p className="mt-6 rounded-2xl bg-panel-raised px-5 py-10 text-center text-sm text-muted">
        해당 이력이 없습니다.
      </p>
    );
  }

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

export function AdminAccountActionButtons({
  canSuspend,
  canReactivate,
  onSuspend,
  onReactivate,
}: Readonly<{
  canSuspend: boolean;
  canReactivate: boolean;
  onSuspend: () => void;
  onReactivate: () => void;
}>) {
  return (
    <>
      {canSuspend ? (
        <button
          type="button"
          onClick={onSuspend}
          className="rounded-full border border-danger px-5 py-2.5 text-sm font-bold text-danger hover:bg-primary-soft"
        >
          계정 정지
        </button>
      ) : null}
      {canReactivate ? (
        <button
          type="button"
          onClick={onReactivate}
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-hover"
        >
          계정 재활성화
        </button>
      ) : null}
    </>
  );
}

function adminAuditActionLabel(action: string) {
  return (
    (
      {
        BUDDY_APPLICATION_APPROVED: "버디 가입 승인",
        BUDDY_APPLICATION_REJECTED: "버디 가입 거절",
        USER_SUSPENDED: "계정 정지",
        USER_REACTIVATED: "계정 재활성화",
        BUDDY_COMMISSION_CHANGED: "수수료 정책 변경",
      } as Record<string, string>
    )[action] ?? action
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
  if (type === "payments" && "paymentId" in item) return `신청 #${item.applicationId} 결제`;
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
  if (type === "activities" && "price" in item) {
    return `${activityStatusLabel(item.status)} · ${formatKrw(item.price, "ko")}`;
  }
  if (type === "applications" && "guestCount" in item) {
    return `${applicationStatusLabel(item.status)} · ${item.guestCount}명 · ${formatAdminDate(item.scheduleStartAt, true)}`;
  }
  if (type === "payments" && "amount" in item) {
    return `${formatKrw(item.amount, "ko")} · ${paymentStatusLabel(item.status)} · 주문번호 ${item.orderNumber}`;
  }
  if (type === "reviews" && "content" in item) return `★ ${item.rating} · ${item.content}`;
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

function applicationStatusLabel(status: string) {
  return (
    (
      {
        PENDING_PAYMENT: "결제 대기",
        SUPERSEDED: "새 신청으로 대체",
        CONFIRMED: "예약 확정",
        CANCELLED: "취소",
        COMPLETED: "이용 완료",
      } as Record<string, string>
    )[status] ?? status
  );
}

function paymentStatusLabel(status: string) {
  return (
    (
      {
        CREATED: "결제 대기",
        CONFIRMED: "결제 완료",
        REVIEW_REQUIRED: "확인 필요",
        FAILED: "결제 실패",
        CANCELLED: "결제 취소",
        EXPIRED: "결제 만료",
      } as Record<string, string>
    )[status] ?? status
  );
}
