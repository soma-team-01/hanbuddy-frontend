"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isUnauthenticatedError } from "@/lib/api/errors";
import { SERVICE_TIME_ZONE } from "@/lib/datetime";
import { adminBuddyApplicationsQueryOptions } from "@/lib/query/admin";
import { AdminMemberNavigation } from "../admin-member-navigation";
import { AdminLoadingRows, AdminState, AdminStatusBadge } from "../admin-ui";

export function BuddyApplicationsDashboard() {
  return (
    <main className="mx-auto w-full max-w-[1440px] px-5 py-6 md:px-6 md:py-7 xl:px-8">
      <AdminMemberNavigation />
      <BuddyApplicationsSection />
    </main>
  );
}

export function BuddyApplicationsSection() {
  const router = useRouter();
  const query = useQuery(adminBuddyApplicationsQueryOptions());
  const applications = query.data ?? [];
  const sessionExpired = isUnauthenticatedError(query.error);
  const pendingCount = applications.filter(
    (item) => item.accountStatus === "PENDING_APPROVAL",
  ).length;

  return (
    <section id="buddy-approvals" className="mt-7 border-t border-line-soft pt-5">
      <div className="flex items-end justify-between gap-4">
        <h2 className="font-display text-xl font-extrabold tracking-[-0.03em] md:text-2xl">
          승인 관리
        </h2>
        <div className="flex items-baseline gap-2 text-sm text-muted">
          <span>승인 대기</span>
          <strong className="font-display text-lg text-primary">{pendingCount}</strong>
        </div>
      </div>
      {query.isPending ? (
        <div className="mt-4">
          <AdminLoadingRows />
        </div>
      ) : null}
      {sessionExpired ? (
        <div className="mt-4">
          <AdminState
            title="관리자 세션이 만료되었습니다."
            description="다시 로그인한 뒤 버디 신청을 확인해 주세요."
            action={() => router.replace("/admin/login")}
            actionLabel="다시 로그인"
          />
        </div>
      ) : query.error ? (
        <div className="mt-4">
          <AdminState
            title="목록을 불러오지 못했습니다."
            description="잠시 후 다시 시도해 주세요."
            action={() => query.refetch()}
          />
        </div>
      ) : null}
      {!query.isPending && !query.error && applications.length === 0 ? (
        <div className="mt-4">
          <AdminState
            title="새로운 버디 신청이 없습니다."
            description="승인 대기 신청이 접수되면 이곳에 표시됩니다."
          />
        </div>
      ) : null}
      {applications.length > 0 ? (
        <ul className="mt-4 grid gap-3 xl:grid-cols-2">
          {applications.map((item) => (
            <li
              key={item.userId}
              className="rounded-xl border border-line-soft bg-white p-4 shadow-[0_8px_24px_rgba(38,27,24,0.04)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <AdminStatusBadge status={item.accountStatus} />
                    <span className="text-xs font-semibold text-muted">{item.nationalityCode}</span>
                  </div>
                  <p className="mt-2.5 truncate font-display font-bold">{item.name}</p>
                  <p className="mt-0.5 truncate text-xs text-muted">{item.email}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-muted">신청일</p>
                  <time className="mt-0.5 block text-xs font-semibold">
                    {formatDate(item.appliedAt)}
                  </time>
                </div>
              </div>
              <Link
                href={`/admin/buddy-applications/${item.userId}`}
                className="mt-3 flex h-9 items-center justify-center rounded-lg border border-primary text-xs font-bold text-primary transition-colors hover:bg-primary hover:text-white"
              >
                신청서 검토
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: SERVICE_TIME_ZONE,
      }).format(date);
}
