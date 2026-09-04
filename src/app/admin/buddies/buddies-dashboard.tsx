"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SearchIcon } from "@/components/ui/icons";
import { isUnauthenticatedError } from "@/lib/api/errors";
import { adminBuddiesQueryOptions } from "@/lib/query/admin";
import type { AdminAccountStatus, AdminBuddyFilters } from "@/types/admin";
import {
  AdminLoadingRows,
  AdminPageTitle,
  AdminPagination,
  AdminState,
  AdminStatusBadge,
  formatAdminDate,
} from "../admin-ui";
import { AdminMemberNavigation } from "../admin-member-navigation";
import { BuddyApplicationsSection } from "./buddy-applications-dashboard";

const EMPTY_FILTERS: AdminBuddyFilters = { page: 0, size: 20 };

export function AdminBuddiesDashboard() {
  const router = useRouter();
  const [filters, setFilters] = useState<AdminBuddyFilters>(EMPTY_FILTERS);
  const query = useQuery(adminBuddiesQueryOptions(filters));
  const page = query.data;

  function submitFilters(formData: FormData) {
    setFilters({
      email: String(formData.get("email") ?? "").trim() || undefined,
      displayName: String(formData.get("displayName") ?? "").trim() || undefined,
      accountStatus: (String(formData.get("accountStatus") ?? "") || undefined) as
        AdminAccountStatus | undefined,
      page: 0,
      size: 20,
    });
  }

  return (
    <main className="mx-auto w-full max-w-[1440px] px-5 py-6 md:px-6 md:py-7 xl:px-8">
      <AdminMemberNavigation />
      <AdminPageTitle
        title="버디 목록"
        aside={
          <div className="flex items-baseline gap-2 text-sm text-muted">
            <span>검색 결과</span>
            <strong className="font-display text-lg text-ink">{page?.totalElements ?? 0}명</strong>
          </div>
        }
      />

      <form
        action={submitFilters}
        className="mt-4 rounded-xl border border-line-soft bg-white p-4 shadow-[0_8px_24px_rgba(38,27,24,0.04)]"
      >
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_180px_auto] lg:items-end">
          <FilterInput name="email" label="로그인 이메일" placeholder="Google 계정 이메일" />
          <FilterInput name="displayName" label="닉네임" placeholder="닉네임 일부" />
          <FilterSelect
            name="accountStatus"
            label="계정 상태"
            options={[
              ["ACTIVE", "활성"],
              ["PENDING_APPROVAL", "승인 대기"],
              ["REJECTED", "승인 반려"],
              ["SUSPENDED", "이용 정지"],
            ]}
          />
          <div className="flex justify-end gap-2 md:col-span-2 lg:col-span-1">
            <button
              type="reset"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="h-9 rounded-lg border border-line-strong px-4 text-xs font-bold text-muted transition-colors hover:border-primary hover:text-primary"
            >
              초기화
            </button>
            <button
              type="submit"
              className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-bold text-white hover:bg-primary-hover"
            >
              <SearchIcon className="size-3.5" /> 검색
            </button>
          </div>
        </div>
      </form>

      <section className="mt-4">
        {query.isPending ? <AdminLoadingRows /> : null}
        {isUnauthenticatedError(query.error) ? (
          <AdminState
            title="관리자 세션이 만료되었습니다."
            description="다시 로그인해 주세요."
            action={() => router.replace("/admin/login")}
            actionLabel="다시 로그인"
          />
        ) : query.error ? (
          <AdminState
            title="버디 목록을 불러오지 못했습니다."
            description="잠시 후 다시 시도해 주세요."
            action={() => query.refetch()}
          />
        ) : null}
        {page && page.content.length === 0 ? (
          <AdminState
            title="조건에 맞는 버디가 없습니다."
            description="검색 조건을 변경해 보세요."
          />
        ) : null}
        {page && page.content.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-line-soft bg-white">
            <div className="hidden grid-cols-[64px_1.3fr_0.75fr_0.6fr_0.7fr_0.8fr] gap-3 border-b border-line-soft bg-panel-raised px-4 py-2.5 text-[11px] font-bold tracking-[0.08em] text-muted uppercase lg:grid">
              <span>내부 ID</span>
              <span>버디</span>
              <span>상태</span>
              <span>국적</span>
              <span>수수료</span>
              <span>가입일</span>
            </div>
            <ul className="divide-y divide-line-soft">
              {page.content.map((buddy) => (
                <li key={buddy.buddyId}>
                  <Link
                    href={
                      buddy.accountStatus === "PENDING_APPROVAL"
                        ? `/admin/buddy-applications/${buddy.buddyId}`
                        : `/admin/buddies/${buddy.buddyId}`
                    }
                    className="grid gap-2 px-4 py-3 transition-colors hover:bg-primary-soft/30 lg:grid-cols-[64px_1.3fr_0.75fr_0.6fr_0.7fr_0.8fr] lg:items-center lg:gap-3"
                  >
                    <span className="text-xs font-bold text-muted">#{buddy.buddyId}</span>
                    <span className="min-w-0">
                      <span className="block truncate font-display font-bold">
                        {buddy.displayName}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted">
                        {buddy.email}
                      </span>
                    </span>
                    <AdminStatusBadge status={buddy.accountStatus} />
                    <span className="text-xs">{buddy.nationalityCode || "-"}</span>
                    <span className="text-xs font-semibold">
                      {commissionLabel(buddy.commissionPolicy)}
                    </span>
                    <time className="text-xs text-muted">{formatAdminDate(buddy.createdAt)}</time>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {page ? (
          <AdminPagination
            page={page.page}
            totalPages={page.totalPages}
            onPage={(nextPage) => setFilters((current) => ({ ...current, page: nextPage }))}
          />
        ) : null}
      </section>
      <BuddyApplicationsSection />
    </main>
  );
}

function FilterInput({
  name,
  label,
  type = "text",
  placeholder,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="text-xs font-bold text-muted">
      {label}
      <input
        name={name}
        type={type}
        min={type === "number" ? 1 : undefined}
        placeholder={placeholder}
        className="mt-1 h-9 w-full rounded-lg border border-line-strong bg-white px-3 text-sm text-ink outline-none focus:border-primary"
      />
    </label>
  );
}

function FilterSelect({
  name,
  label,
  options,
}: {
  name: string;
  label: string;
  options: string[][];
}) {
  return (
    <label className="text-xs font-bold text-muted">
      {label}
      <select
        name={name}
        className="mt-1 h-9 w-full rounded-lg border border-line-strong bg-white px-3 text-sm text-ink outline-none focus:border-primary"
      >
        <option value="">전체</option>
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

function commissionLabel(policy: string | null) {
  if (policy === "EARLY_10") return "초기 10%";
  if (policy === "STANDARD_20") return "일반 20%";
  return "승인 전";
}
