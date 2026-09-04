"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { isUnauthenticatedError } from "@/lib/api/errors";
import { SERVICE_TIME_ZONE } from "@/lib/datetime";
import { adminBuddyApplicationsQueryOptions } from "@/lib/query/admin";
import { AdminMemberNavigation } from "@/app/admin/admin-member-navigation";
import {
  AdminLoadingRows,
  AdminPagination,
  AdminState,
  AdminStatusBadge,
} from "@/app/admin/admin-ui";

const PAGE_SIZE = 20;

export function BuddyApplicationsDashboard() {
  return (
    <main className="mx-auto w-full max-w-[1200px] px-5 py-6 md:px-6 md:py-7 xl:px-8">
      <AdminMemberNavigation />
      <BuddyApplicationsSection />
    </main>
  );
}

export function BuddyApplicationsSection({ showHeader = true }: { showHeader?: boolean } = {}) {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const query = useQuery(adminBuddyApplicationsQueryOptions());
  const applications = query.data ?? [];
  const totalPages = Math.ceil(applications.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(totalPages - 1, 0));
  const visibleApplications = applications.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE,
  );
  const sessionExpired = isUnauthenticatedError(query.error);
  const pendingCount = applications.filter(
    (item) => item.accountStatus === "PENDING_APPROVAL",
  ).length;

  return (
    <section
      id="buddy-approvals"
      className={showHeader ? "mt-7 border-t border-line-soft pt-5" : "mt-3"}
    >
      {showHeader ? (
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-xl font-extrabold tracking-[-0.03em] md:text-2xl">
            승인 관리
          </h2>
          <div className="flex items-baseline gap-2 text-sm text-muted">
            <span>승인 대기</span>
            <strong className="font-display text-lg text-primary">{pendingCount}</strong>
          </div>
        </div>
      ) : null}
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
        <ul aria-label="승인 대기 목록" className="mt-3 grid gap-1.5">
          {visibleApplications.map((item) => (
            <li
              key={item.userId}
              className="grid gap-2 rounded-lg border border-line-soft bg-white px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="flex min-w-0 items-center gap-3">
                <AdminStatusBadge status={item.accountStatus} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{item.name}</p>
                  <p className="truncate text-[11px] text-muted">{item.email}</p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <span className="text-[11px] font-semibold text-muted">
                  <time>{formatDate(item.appliedAt)}</time>
                </span>
                <Link
                  href={`/admin/buddy-applications/${item.userId}`}
                  className="flex h-8 shrink-0 items-center justify-center rounded-md border border-primary px-3 text-[11px] font-bold text-primary transition-colors hover:bg-primary hover:text-white"
                >
                  신청서 검토
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {applications.length > 0 ? (
        <AdminPagination page={currentPage} totalPages={totalPages} onPage={setPage} />
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
