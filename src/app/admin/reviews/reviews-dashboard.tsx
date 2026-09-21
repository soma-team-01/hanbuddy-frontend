"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AdminFilterInput,
  AdminFilterSelect,
  AdminLoadingRows,
  AdminPageTitle,
  AdminPagination,
  AdminState,
  formatAdminDate,
} from "@/app/admin/admin-ui";
import {
  parseReviewFilters,
  REVIEW_LANGUAGES,
  REVIEW_SOURCES,
  REVIEW_VISIBILITIES,
} from "@/lib/admin/reviews";
import { adminReviewsQueryOptions } from "@/lib/query/admin-reviews";
import type { AdminReviewFilters } from "@/types/admin-review";
import {
  ReviewBadges,
  ReviewError,
  reviewButton,
  reviewMain,
  reviewPanel,
  reviewPrimaryButton,
} from "./review-ui";

const initialFilters: AdminReviewFilters = { page: 0, size: 20 };

export function ReviewsDashboard() {
  const [filters, setFilters] = useState(initialFilters);
  const [error, setError] = useState<unknown>(null);
  const query = useQuery(adminReviewsQueryOptions(filters));
  const page = query.data;
  return (
    <main className={reviewMain}>
      <AdminPageTitle
        title="리뷰 관리"
        aside={
          <Link className={reviewPrimaryButton} href="/admin/reviews/new">
            기존 후기 등록
          </Link>
        }
      />
      <form
        className={`${reviewPanel} mt-4`}
        onSubmit={(event) => {
          event.preventDefault();
          try {
            const params = new URLSearchParams();
            new FormData(event.currentTarget).forEach((value, key) =>
              params.set(key, String(value)),
            );
            setFilters(parseReviewFilters(params));
            setError(null);
          } catch (failure) {
            setError(failure);
          }
        }}
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <AdminFilterInput name="reviewerName" label="작성자명" placeholder="작성자명 일부" />
          <AdminFilterInput name="activityId" label="활동 ID" type="number" />
          <AdminFilterSelect name="source" label="출처" options={REVIEW_SOURCES} />
          <AdminFilterSelect name="visibility" label="공개 상태" options={REVIEW_VISIBILITIES} />
        </div>
        <details className="mt-3 text-xs text-muted">
          <summary className="w-fit cursor-pointer py-2 font-bold">상세 검색 조건</summary>
          <div className="mt-2 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <AdminFilterInput name="reviewId" label="리뷰 ID" type="number" />
            <AdminFilterInput name="reviewerId" label="작성자 회원 ID" type="number" />
            <AdminFilterInput name="buddyId" label="버디 ID" type="number" />
            <AdminFilterInput name="sourceReference" label="원본 식별값 (정확히 일치)" />
            <AdminFilterSelect
              name="rating"
              label="별점"
              options={[1, 2, 3, 4, 5].map((value) => [String(value), `${value}점`])}
            />
            <AdminFilterSelect name="sourceLanguage" label="원문 언어" options={REVIEW_LANGUAGES} />
            <AdminFilterInput
              name="createdFrom"
              label="시스템 등록일 시작 (한국 시간)"
              type="date"
            />
            <AdminFilterInput name="createdTo" label="시스템 등록일 종료 (한국 시간)" type="date" />
          </div>
        </details>
        <ReviewError error={error} />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted">
            조건은 모두 함께 적용되며, 최근 등록 순으로 표시됩니다.
          </p>
          <div className="flex gap-2">
            <button
              type="reset"
              className={reviewButton}
              onClick={() => {
                setFilters(initialFilters);
                setError(null);
              }}
            >
              초기화
            </button>
            <button type="submit" className={reviewPrimaryButton}>
              검색
            </button>
          </div>
        </div>
      </form>
      <div className="my-4 flex items-center justify-between text-sm">
        <p>
          검색 결과 <strong>{page?.totalElements ?? 0}</strong>건
        </p>
        <button
          className={reviewButton}
          type="button"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          새로고침
        </button>
      </div>
      <ReviewError error={query.error} />
      {query.isPending ? <AdminLoadingRows /> : null}
      {page && !page.content.length ? (
        <AdminState
          title="조건에 맞는 후기가 없습니다."
          description="검색 조건을 변경하거나 기존 후기를 등록해 주세요."
        />
      ) : null}
      {page && !query.error ? (
        <ul className="divide-y divide-line-soft overflow-hidden rounded-xl border border-line-soft">
          {page.content.map((review) => (
            <li key={review.reviewId}>
              <Link
                href={`/admin/reviews/${review.reviewId}`}
                className="grid gap-3 p-4 transition-colors hover:bg-panel-raised lg:grid-cols-[70px_minmax(0,1fr)_180px_160px] lg:items-center"
              >
                <span className="text-xs font-bold text-muted">#{review.reviewId}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{review.activityTitle}</p>
                  <p className="mt-1 text-xs text-muted">
                    {review.reviewerName?.trim() || "익명"} · {review.rating}점
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm [overflow-wrap:anywhere] break-words">
                    {review.content}
                  </p>
                </div>
                <ReviewBadges review={review} />
                <p className="text-xs text-muted">등록 {formatAdminDate(review.createdAt)}</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      {page ? (
        <AdminPagination
          page={page.page}
          totalPages={page.totalPages}
          onPage={(next) => setFilters((current) => ({ ...current, page: next }))}
        />
      ) : null}
    </main>
  );
}
