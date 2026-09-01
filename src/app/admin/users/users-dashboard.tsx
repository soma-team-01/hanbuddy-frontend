"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SearchIcon, UsersIcon } from "@/components/ui/icons";
import { isUnauthenticatedError } from "@/lib/api/errors";
import { adminUsersQueryOptions } from "@/lib/query/admin";
import type { AdminAccountStatus, AdminUserFilters } from "@/types/admin";
import {
  AdminLoadingRows,
  AdminPageTitle,
  AdminPagination,
  AdminState,
  AdminStatusBadge,
  formatAdminDate,
} from "../admin-ui";

const EMPTY_FILTERS: AdminUserFilters = { page: 0, size: 20 };

export function AdminUsersDashboard() {
  const router = useRouter();
  const [filters, setFilters] = useState<AdminUserFilters>(EMPTY_FILTERS);
  const query = useQuery(adminUsersQueryOptions(filters));
  const page = query.data;

  function submitFilters(formData: FormData) {
    const userId = String(formData.get("userId") ?? "").trim();
    setFilters({
      userId: userId ? Number(userId) : undefined,
      email: String(formData.get("email") ?? "").trim() || undefined,
      name: String(formData.get("name") ?? "").trim() || undefined,
      displayName: String(formData.get("displayName") ?? "").trim() || undefined,
      userType: (String(formData.get("userType") ?? "") || undefined) as
        AdminUserFilters["userType"] | undefined,
      accountStatus: (String(formData.get("accountStatus") ?? "") || undefined) as
        AdminAccountStatus | undefined,
      nationalityCode:
        String(formData.get("nationalityCode") ?? "")
          .trim()
          .toUpperCase() || undefined,
      joinedFrom: String(formData.get("joinedFrom") ?? "") || undefined,
      joinedTo: String(formData.get("joinedTo") ?? "") || undefined,
      page: 0,
      size: 20,
    });
  }

  return (
    <main className="mx-auto w-full max-w-[1200px] px-5 py-10 md:px-8 md:py-14">
      <AdminPageTitle
        eyebrow="User management"
        title="회원 관리"
        description="가입 회원을 조건별로 조회하고 계정 상태와 서비스 이용 이력을 관리합니다."
        aside={
          <div className="flex items-center gap-3 rounded-2xl border border-line-soft bg-panel-raised px-5 py-4">
            <UsersIcon className="size-5 text-primary" />
            <div>
              <p className="text-xs text-muted">검색 결과</p>
              <p className="font-display text-xl font-extrabold">{page?.totalElements ?? 0}명</p>
            </div>
          </div>
        }
      />

      <form
        action={submitFilters}
        className="mt-7 rounded-2xl border border-line-soft bg-panel-raised p-5"
      >
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <FilterInput name="userId" label="회원 ID" type="number" placeholder="정확한 ID" />
          <FilterInput name="email" label="이메일" placeholder="이메일 일부" />
          <FilterInput name="name" label="이름" placeholder="실명 일부" />
          <FilterInput name="displayName" label="닉네임" placeholder="닉네임 일부" />
          <FilterSelect
            name="userType"
            label="역할"
            options={[
              ["TOURIST", "투어리스트"],
              ["BUDDY", "버디"],
              ["ADMIN", "관리자"],
            ]}
          />
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
          <FilterInput name="nationalityCode" label="국적 코드" placeholder="예: US" />
          <div className="grid grid-cols-2 gap-2">
            <FilterInput name="joinedFrom" label="가입 시작일" type="date" />
            <FilterInput name="joinedTo" label="가입 종료일" type="date" />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="reset"
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="h-10 rounded-full border border-line-strong px-5 text-sm font-bold text-muted transition-colors hover:border-primary hover:text-primary"
          >
            초기화
          </button>
          <button
            type="submit"
            className="flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-white transition-colors hover:bg-primary-hover"
          >
            <SearchIcon className="size-4" /> 검색
          </button>
        </div>
      </form>

      <section className="mt-7">
        {query.isPending ? <AdminLoadingRows /> : null}
        {isUnauthenticatedError(query.error) ? (
          <AdminState
            title="관리자 세션이 만료되었습니다."
            description="다시 로그인한 뒤 회원 목록을 확인해 주세요."
            action={() => router.replace("/admin/login")}
            actionLabel="다시 로그인"
          />
        ) : query.error ? (
          <AdminState
            title="회원 목록을 불러오지 못했습니다."
            description="조회 조건을 확인하거나 잠시 후 다시 시도해 주세요."
            action={() => query.refetch()}
          />
        ) : null}
        {page && page.content.length === 0 ? (
          <AdminState
            title="조건에 맞는 회원이 없습니다."
            description="검색 조건을 변경해 보세요."
          />
        ) : null}
        {page && page.content.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-line-soft bg-white">
            <div className="hidden grid-cols-[72px_1.4fr_0.8fr_0.8fr_0.6fr_0.8fr] gap-4 border-b border-line-soft bg-panel-raised px-6 py-3 text-xs font-bold tracking-[0.1em] text-muted uppercase lg:grid">
              <span>ID</span>
              <span>회원</span>
              <span>역할</span>
              <span>상태</span>
              <span>국적</span>
              <span>가입일</span>
            </div>
            <ul className="divide-y divide-line-soft">
              {page.content.map((user) => (
                <li key={user.userId}>
                  <Link
                    href={`/admin/users/${user.userId}`}
                    className="grid gap-3 px-5 py-5 transition-colors hover:bg-primary-soft/30 lg:grid-cols-[72px_1.4fr_0.8fr_0.8fr_0.6fr_0.8fr] lg:items-center lg:gap-4 lg:px-6"
                  >
                    <span className="text-xs font-bold text-muted">#{user.userId}</span>
                    <span className="min-w-0">
                      <span className="block truncate font-display font-bold">
                        {user.displayName}
                      </span>
                      <span className="mt-1 block truncate text-sm text-muted">{user.email}</span>
                    </span>
                    <span className="text-sm font-semibold">{roleLabel(user.userType)}</span>
                    <AdminStatusBadge status={user.accountStatus} />
                    <span className="text-sm">{user.nationalityCode || "-"}</span>
                    <time className="text-sm text-muted">{formatAdminDate(user.createdAt)}</time>
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
        className="mt-1.5 h-11 w-full rounded-xl border border-line-strong bg-white px-3 text-sm text-ink transition-colors outline-none focus:border-primary"
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
        className="mt-1.5 h-11 w-full rounded-xl border border-line-strong bg-white px-3 text-sm text-ink outline-none focus:border-primary"
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

function roleLabel(role: string) {
  return (
    ({ TOURIST: "투어리스트", BUDDY: "버디", ADMIN: "관리자" } as Record<string, string>)[role] ??
    role
  );
}
