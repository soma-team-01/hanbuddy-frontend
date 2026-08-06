"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isUnauthenticatedError } from "@/lib/api/errors";
import { adminBuddyApplicationsQueryOptions } from "@/lib/query/admin";

const STATUS_LABELS = {
  PENDING_APPROVAL: "승인 대기",
  ACTIVE: "승인",
  REJECTED: "거절",
  SUSPENDED: "정지",
} as const;

export function BuddyApplicationsDashboard() {
  const router = useRouter();
  const query = useQuery(adminBuddyApplicationsQueryOptions());
  const applications = query.data ?? [];
  const sessionExpired = isUnauthenticatedError(query.error);
  const pendingCount = applications.filter(
    (item) => item.accountStatus === "PENDING_APPROVAL",
  ).length;

  return (
    <main className="mx-auto w-full max-w-[1200px] px-5 py-10 md:px-8 md:py-14">
      <div className="flex flex-col gap-5 border-b border-line-soft pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold tracking-[0.2em] text-primary uppercase">
            Buddy approval
          </p>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-[-0.04em] md:text-4xl">
            버디 신청 관리
          </h1>
          <p className="mt-3 text-muted">프로필을 확인하고 승인 또는 거절을 결정하세요.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">승인 대기</span>
          <strong className="font-display text-3xl text-primary">{pendingCount}</strong>
        </div>
      </div>
      {query.isPending ? <LoadingRows /> : null}
      {sessionExpired ? (
        <State
          title="관리자 세션이 만료되었습니다."
          description="다시 로그인한 뒤 버디 신청을 확인해 주세요."
          action={() => router.replace("/admin/login")}
          actionLabel="다시 로그인"
        />
      ) : query.error ? (
        <State
          title="목록을 불러오지 못했습니다."
          description="잠시 후 다시 시도해 주세요."
          action={() => query.refetch()}
        />
      ) : null}
      {!query.isPending && !query.error && applications.length === 0 ? (
        <State
          title="새로운 버디 신청이 없습니다."
          description="신청이 접수되면 이곳에 표시됩니다."
        />
      ) : null}
      {applications.length > 0 ? (
        <div className="mt-8 overflow-hidden rounded-2xl border border-line-soft">
          <div className="hidden grid-cols-[1.4fr_1fr_0.8fr_0.9fr_auto] gap-4 border-b border-line-soft bg-panel-raised px-6 py-3 text-xs font-bold tracking-[0.12em] text-muted uppercase md:grid">
            <span>신청자</span>
            <span>국적</span>
            <span>상태</span>
            <span>신청일</span>
            <span>검토</span>
          </div>
          <ul className="divide-y divide-line-soft">
            {applications.map((item) => (
              <li
                key={item.userId}
                className="grid gap-4 px-5 py-5 transition-colors hover:bg-primary-soft/30 md:grid-cols-[1.4fr_1fr_0.8fr_0.9fr_auto] md:items-center md:px-6"
              >
                <div>
                  <p className="font-display font-bold">{item.name}</p>
                  <p className="mt-1 text-sm text-muted">{item.email}</p>
                </div>
                <p className="text-sm">{item.nationalityCode}</p>
                <span
                  className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${item.accountStatus === "PENDING_APPROVAL" ? "bg-primary-soft text-primary-strong" : "bg-panel text-muted"}`}
                >
                  {STATUS_LABELS[item.accountStatus]}
                </span>
                <time className="text-sm text-muted">{formatDate(item.appliedAt)}</time>
                <Link
                  href={`/admin/buddies/${item.userId}`}
                  className="w-fit rounded-full border border-primary px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-white"
                >
                  프로필 보기
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </main>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "short", day: "numeric" }).format(
        date,
      );
}
function State({
  title,
  description,
  action,
  actionLabel = "다시 시도",
}: {
  title: string;
  description: string;
  action?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="py-24 text-center">
      <div className="mx-auto mb-5 h-1 w-12 rounded-full bg-primary" />
      <h2 className="font-display text-xl font-bold">{title}</h2>
      <p className="mt-2 text-muted">{description}</p>
      {action ? (
        <button
          onClick={action}
          className="mt-6 rounded-full border border-primary px-5 py-2 text-sm font-bold text-primary"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
function LoadingRows() {
  return (
    <div aria-label="불러오는 중" className="mt-8 space-y-3">
      {[1, 2, 3].map((item) => (
        <div key={item} className="h-20 animate-pulse rounded-2xl bg-panel" />
      ))}
    </div>
  );
}
