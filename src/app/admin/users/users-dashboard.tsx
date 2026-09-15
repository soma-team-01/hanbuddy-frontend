"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SearchIcon } from "@/components/ui/icons";
import { isUnauthenticatedError } from "@/lib/api/errors";
import { adminUsersQueryOptions } from "@/lib/query/admin";
import type { AdminAccountStatus, AdminUserFilters } from "@/types/admin";
import {
  AdminFilterInput,
  AdminFilterSelect,
  AdminLoadingRows,
  AdminPageTitle,
  AdminPagination,
  AdminState,
  AdminStatusBadge,
  formatAdminDate,
} from "@/app/admin/admin-ui";
import { AdminMemberNavigation } from "@/app/admin/admin-member-navigation";

const EMPTY_FILTERS: AdminUserFilters = { userType: "TOURIST", page: 0, size: 20 };

export function AdminUsersDashboard() {
  const router = useRouter();
  const [filters, setFilters] = useState<AdminUserFilters>(EMPTY_FILTERS);
  const [idError, setIdError] = useState(false);
  const query = useQuery(adminUsersQueryOptions(filters));
  const page = query.data;

  function submitFilters(formData: FormData) {
    const rawId = String(formData.get("userId") ?? "").trim();
    const userId = rawId ? Number(rawId) : undefined;
    if (rawId && (!/^\d+$/.test(rawId) || !Number.isSafeInteger(userId) || Number(userId) <= 0)) {
      setIdError(true);
      return;
    }
    setIdError(false);
    setFilters({
      ...(userId === undefined ? {} : { userId }),
      email: String(formData.get("email") ?? "").trim() || undefined,
      displayName: String(formData.get("displayName") ?? "").trim() || undefined,
      userType: "TOURIST",
      accountStatus: (String(formData.get("accountStatus") ?? "") || undefined) as
        AdminAccountStatus | undefined,
      page: 0,
      size: 20,
    });
  }

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-5 md:px-5 md:py-6 xl:px-6">
      <AdminMemberNavigation />
      <AdminPageTitle
        title="관광객 관리"
        aside={
          <div className="flex items-baseline gap-2 text-sm text-muted">
            <span>검색 결과</span>
            <strong className="font-display text-lg text-ink">{page?.totalElements ?? 0}명</strong>
          </div>
        }
      />

      <form
        action={submitFilters}
        className="mt-3 rounded-xl border border-line-soft bg-white p-3 shadow-[0_8px_24px_rgba(38,27,24,0.04)]"
      >
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-[100px_minmax(0,1fr)_minmax(0,1fr)_140px_auto] lg:items-end">
          <label className="text-xs font-bold text-muted">
            회원 ID
            <input
              name="userId"
              type="text"
              inputMode="numeric"
              placeholder="정확한 ID"
              aria-invalid={idError || undefined}
              aria-describedby={idError ? "user-id-error" : undefined}
              className="focus-border-only mt-1 h-8 w-full rounded-lg border border-line-strong bg-white px-3 text-xs text-ink outline-none focus:border-primary"
            />
          </label>
          <AdminFilterInput name="email" label="로그인 이메일" placeholder="Google 계정 이메일" />
          <AdminFilterInput name="displayName" label="닉네임" placeholder="닉네임 일부" />
          <AdminFilterSelect
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
              onClick={() => {
                setFilters(EMPTY_FILTERS);
                setIdError(false);
              }}
              className="h-8 rounded-lg border border-line-strong px-3 text-xs font-bold text-muted transition-colors hover:border-primary hover:text-primary"
            >
              초기화
            </button>
            <button
              type="submit"
              className="flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-white transition-colors hover:bg-primary-hover"
            >
              <SearchIcon className="size-3.5" /> 검색
            </button>
          </div>
        </div>
        {idError && (
          <p id="user-id-error" role="alert" className="mt-2 text-xs text-danger">
            회원 ID는 양의 정수로 입력해 주세요.
          </p>
        )}
        <p className="mt-2 text-xs text-muted">
          모든 검색 조건은 함께 적용됩니다. ID만 검색하려면 다른 조건을 비워 주세요.
        </p>
      </form>

      <section className="mt-3">
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
          <div className="overflow-hidden rounded-xl border border-line-soft bg-white">
            <div className="hidden grid-cols-[64px_1.6fr_0.75fr_0.8fr] gap-3 border-b border-line-soft bg-panel-raised px-4 py-2.5 text-[11px] font-bold tracking-[0.08em] text-muted uppercase lg:grid">
              <span>내부 ID</span>
              <span>관광객</span>
              <span>상태</span>
              <span>가입일</span>
            </div>
            <ul className="divide-y divide-line-soft">
              {page.content.map((user) => (
                <li key={user.userId}>
                  <Link
                    href={`/admin/users/${user.userId}`}
                    className="grid gap-2 px-4 py-2 transition-colors hover:bg-primary-soft/30 lg:grid-cols-[64px_1.6fr_0.75fr_0.8fr] lg:items-center lg:gap-3"
                  >
                    <span className="text-xs font-bold text-muted">#{user.userId}</span>
                    <span className="min-w-0">
                      <span className="block truncate font-display font-bold">
                        {user.displayName}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted">{user.email}</span>
                    </span>
                    <AdminStatusBadge status={user.accountStatus} />
                    <time className="text-xs text-muted">{formatAdminDate(user.createdAt)}</time>
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
