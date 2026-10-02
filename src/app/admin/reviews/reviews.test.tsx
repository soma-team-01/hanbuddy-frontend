import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "@/lib/api/admin-reviews";
import { createApiClientError } from "@/lib/api/errors";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { adminReviewFixture as review } from "@/test/admin-review-fixture";
import { ReviewsDashboard } from "./reviews-dashboard";
import { ImportedReviewForm } from "./imported-review-form";
import { ReviewDetail } from "./review-detail";

vi.mock("@/lib/api/admin-reviews", () => ({
  getAdminReviews: vi.fn(),
  getAdminReview: vi.fn(),
  getAdminReviewTranslations: vi.fn(),
  importAdminReview: vi.fn(),
  editImportedReview: vi.fn(),
  moderateAdminReview: vi.fn(),
}));
const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
const page = {
  content: [review],
  totalElements: 21,
  totalPages: 2,
  hasNext: true,
  page: 0,
  size: 20,
};

describe("admin reviews screens", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.getAdminReviews).mockImplementation(async (filters) => ({
      status: "success",
      reviews: { ...page, page: filters.page },
    }));
    vi.mocked(api.getAdminReview).mockResolvedValue({ status: "success", review });
    vi.mocked(api.getAdminReviewTranslations).mockResolvedValue({
      status: "success",
      translations: [
        { targetLanguage: "EN", status: "MISSING", sourceVersion: null, content: null },
      ],
    });
    vi.mocked(api.importAdminReview).mockResolvedValue({ status: "success", review });
    vi.mocked(api.editImportedReview).mockResolvedValue({ status: "success", review });
    vi.mocked(api.moderateAdminReview).mockResolvedValue({
      status: "success",
      review: { ...review, visibility: "HIDDEN" },
    });
  });
  it("offers only contracted filters and resets pagination on search", async () => {
    renderWithQueryClient(<ReviewsDashboard />);
    fireEvent.click(await screen.findByRole("button", { name: "다음 페이지" }));
    await waitFor(() =>
      expect(api.getAdminReviews).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 })),
    );
    fireEvent.change(screen.getByLabelText("작성자명"), { target: { value: "Mina" } });
    fireEvent.change(screen.getByLabelText("출처"), { target: { value: "LEGACY_IMPORT" } });
    fireEvent.click(screen.getByRole("button", { name: "검색" }));
    await waitFor(() =>
      expect(api.getAdminReviews).toHaveBeenLastCalledWith({
        reviewerName: "Mina",
        source: "LEGACY_IMPORT",
        page: 0,
        size: 20,
      }),
    );
    expect(screen.queryByLabelText("내용 검색")).not.toBeInTheDocument();
    expect(screen.getByText("익명 · 5점")).toBeInTheDocument();
  });
  it("generates an internal reference and reuses it after a failed submission", async () => {
    vi.mocked(api.importAdminReview).mockResolvedValue({
      status: "error",
      error: createApiClientError(500, {
        isSuccess: false,
        code: "COMMON500",
        message: "duplicate",
        result: null,
      }),
    });
    const { container } = renderWithQueryClient(<ImportedReviewForm />);
    fireEvent.change(screen.getByLabelText("활동 ID"), { target: { value: "7" } });
    expect(screen.queryByLabelText(/원본 식별값/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("별점"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText(/후기 원문/), { target: { value: review.content } });
    fireEvent.change(screen.getByLabelText(/등록 사유/), { target: { value: "원본 확인" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.submit(container.querySelector("form")!);
    expect(await screen.findByRole("alert")).toHaveTextContent("요청을 완료하지 못했습니다");
    expect(api.importAdminReview).toHaveBeenCalledWith(7, {
      reviewerName: null,
      rating: 5,
      content: review.content,
      originalReviewedAt: null,
      reason: "원본 확인",
      sourceReference: expect.stringMatching(/^admin-import:[0-9a-f-]{36}$/),
    });
    expect(screen.getByLabelText(/후기 원문/)).toHaveValue(review.content);
    const firstRequest = vi.mocked(api.importAdminReview).mock.calls[0][1];
    fireEvent.submit(container.querySelector("form")!);
    await screen.findByRole("alert");
    expect(api.importAdminReview).toHaveBeenCalledTimes(2);
    expect(vi.mocked(api.importAdminReview).mock.calls[1][1]).toEqual(firstRequest);
    expect(router.replace).not.toHaveBeenCalled();
  });
  it("uses a different key for a new form even when its content is identical", async () => {
    async function create() {
      const view = renderWithQueryClient(<ImportedReviewForm />);
      fireEvent.change(screen.getByLabelText("활동 ID"), { target: { value: "7" } });
      fireEvent.change(screen.getByLabelText("별점"), { target: { value: "5" } });
      fireEvent.change(screen.getByLabelText(/후기 원문/), { target: { value: review.content } });
      fireEvent.change(screen.getByLabelText(/등록 사유/), { target: { value: "원본 확인" } });
      fireEvent.click(screen.getByRole("checkbox"));
      fireEvent.submit(view.container.querySelector("form")!);
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "후기 공개 등록" })).toBeEnabled(),
      );
      view.unmount();
    }
    await create();
    await create();
    const calls = vi.mocked(api.importAdminReview).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0][1].sourceReference).not.toBe(calls[1][1].sourceReference);
    expect(calls[0][1].content).toBe(calls[1][1].content);
  });
  it("finds the completed registration automatically when a retry reports a duplicate", async () => {
    vi.mocked(api.importAdminReview).mockResolvedValue({
      status: "error",
      error: createApiClientError(409, {
        isSuccess: false,
        code: "REVIEW409_IMPORT",
        message: "duplicate",
        result: null,
      }),
    });
    vi.mocked(api.getAdminReviews).mockImplementation(async (filters) => ({
      status: "success",
      reviews: { ...page, content: [{ ...review, sourceReference: filters.sourceReference! }] },
    }));
    const { container } = renderWithQueryClient(<ImportedReviewForm />);
    fireEvent.change(screen.getByLabelText("활동 ID"), { target: { value: "7" } });
    fireEvent.change(screen.getByLabelText("별점"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText(/후기 원문/), { target: { value: review.content } });
    fireEvent.change(screen.getByLabelText(/등록 사유/), { target: { value: "원본 확인" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/admin/reviews/42"));
    expect(api.getAdminReviews).toHaveBeenCalledWith({
      page: 0,
      size: 1,
      sourceReference: vi.mocked(api.importAdminReview).mock.calls[0][1].sourceReference,
    });
  });
  it("preserves full edit payload, including original timestamp seconds, and prevents double submission", async () => {
    vi.mocked(api.editImportedReview).mockImplementation(() => new Promise(() => {}));
    const { container } = renderWithQueryClient(
      <ImportedReviewForm
        review={{
          ...review,
          reviewerName: "Mina",
          originalReviewedAt: "2020-01-01T12:34:56+09:00",
        }}
      />,
    );
    fireEvent.change(screen.getByLabelText(/수정 사유/), { target: { value: "표기 정정" } });
    fireEvent.submit(container.querySelector("form")!);
    fireEvent.submit(container.querySelector("form")!);
    expect(api.editImportedReview).toHaveBeenCalledTimes(1);
    expect(api.editImportedReview).toHaveBeenCalledWith(42, {
      reviewerName: "Mina",
      rating: 5,
      content: review.content,
      originalReviewedAt: "2020-01-01T12:34:56+09:00",
      reason: "표기 정정",
    });
  });
  it("never offers content editing for platform reviews, but allows hiding them", async () => {
    vi.mocked(api.getAdminReview).mockResolvedValue({
      status: "success",
      review: { ...review, source: "PLATFORM" },
    });
    renderWithQueryClient(<ReviewDetail reviewId="42" />);
    expect(await screen.findByRole("button", { name: "후기 숨기기" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "원문 수정" })).not.toBeInTheDocument();
    expect(await screen.findByText("저장된 번역 없음")).toBeInTheDocument();
    expect(screen.queryByText("번역 실패")).not.toBeInTheDocument();
  });
  it("keeps moderation reason after failure and restores hidden imported reviews", async () => {
    vi.mocked(api.getAdminReview).mockResolvedValue({
      status: "success",
      review: { ...review, visibility: "HIDDEN" },
    });
    vi.mocked(api.moderateAdminReview).mockResolvedValue({
      status: "error",
      error: createApiClientError(500, null),
    });
    renderWithQueryClient(<ReviewDetail reviewId="42" />);
    fireEvent.click(await screen.findByRole("button", { name: "공개 복원" }));
    fireEvent.change(screen.getByLabelText("변경 사유"), { target: { value: "원본 재확인" } });
    fireEvent.click(screen.getAllByRole("button", { name: "공개 복원" }).at(-1)!);
    await waitFor(() =>
      expect(api.moderateAdminReview).toHaveBeenCalledWith(42, "restore", "원본 재확인"),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("요청을 완료하지 못했습니다");
    expect(screen.getByLabelText("변경 사유")).toHaveValue("원본 재확인");
  });
});
