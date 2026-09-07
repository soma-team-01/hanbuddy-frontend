import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@/lib/api/errors";
import { getApplicationCancellationQuote } from "@/lib/api/applications";
import { createQueryClient } from "@/lib/query/client";
import { applicationKeys } from "@/lib/query/applications";
import { IntlTestProvider } from "@/test/render-with-intl";
import { renderWithQueryClient as renderWithQueryClientBase } from "@/test/render-with-query-client";
import { CancelDialog, type CancelDialogOutcome } from "./cancel-dialog";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/lib/api/applications", () => ({
  getApplicationCancellationQuote: vi.fn(),
}));

const mockedGetCancellationQuote = vi.mocked(getApplicationCancellationQuote);
const quote = {
  policyVersion: "2026-09-07",
  policyType: "FREE_CANCELLATION_WINDOW" as const,
  refundPercent: 100,
  refundAmount: 36.5,
  refundCurrency: "USD",
  cancellationFeeAmount: 0,
  freeCancellationUntil: "2099-09-07T12:30:00Z",
  quotedAt: "2099-09-07T12:15:00Z",
};

function renderWithQueryClient(ui: ReactElement, options: { locale?: "en" | "ko" } = {}) {
  const queryClient = createQueryClient();
  queryClient.setQueryData(applicationKeys.cancellationQuote("11"), quote);
  return renderWithQueryClientBase(ui, { queryClient, ...options });
}

describe("CancelDialog", () => {
  beforeEach(() => {
    mockedGetCancellationQuote.mockResolvedValue({ status: "success", quote });
  });

  it("disables Yes, Cancel until a reason is selected", () => {
    renderWithQueryClient(
      <CancelDialog applicationId="11" onClose={vi.fn()} onConfirm={vi.fn()} />,
    );

    expect(screen.getByRole("dialog")).toHaveClass("max-md:mt-auto", "md:rounded-3xl");
    expect(screen.getByRole("button", { name: "Yes, Cancel" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Schedule conflict" }));

    expect(screen.getByRole("button", { name: "Yes, Cancel" })).toBeEnabled();
  });

  it("shows the backend-provided PayPal refund quote in USD", async () => {
    renderWithQueryClient(
      <CancelDialog applicationId="11" onClose={vi.fn()} onConfirm={vi.fn()} />,
    );

    expect(await screen.findByText("30-minute free cancellation · 100%")).toBeInTheDocument();
    expect(screen.getByText("Estimated refund").parentElement).toHaveTextContent("$36.50");
    expect(screen.getByText("Cancellation fee").parentElement).toHaveTextContent("$0.00");
  });

  it("keeps cancellation disabled and retries when the quote fails", async () => {
    mockedGetCancellationQuote
      .mockResolvedValueOnce({
        status: "error",
        error: new ApiClientError({
          status: 502,
          code: "INTERNAL502",
          details: null,
          backendMessage: "network down",
          fallbackMessage: "network down",
        }),
      })
      .mockResolvedValueOnce({ status: "success", quote });
    renderWithQueryClient(
      <CancelDialog applicationId="11" onClose={vi.fn()} onConfirm={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Schedule conflict" }));
    expect(await screen.findByText("Could not load the refund estimate.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Yes, Cancel" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Yes, Cancel" })).toBeEnabled());
  });

  it("submits the selected reason as a backend enum value", async () => {
    const onConfirm = vi.fn().mockResolvedValue({ ok: true });
    renderWithQueryClient(
      <CancelDialog applicationId="11" onClose={vi.fn()} onConfirm={onConfirm} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Found another option" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, Cancel" }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith("FOUND_OTHER", undefined));
  });

  it("holds back Yes, Cancel until the other reason is written out", async () => {
    const onConfirm = vi.fn().mockResolvedValue({ ok: true });
    renderWithQueryClient(
      <CancelDialog applicationId="11" onClose={vi.fn()} onConfirm={onConfirm} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Other reason" }));

    const detail = screen.getByLabelText("Tell us what happened");
    expect(screen.getByRole("button", { name: "Yes, Cancel" })).toBeDisabled();

    // 공백만 적은 것은 사유가 아니다
    fireEvent.change(detail, { target: { value: "   " } });
    expect(screen.getByRole("button", { name: "Yes, Cancel" })).toBeDisabled();

    fireEvent.change(detail, { target: { value: "  My flight was cancelled.  " } });
    fireEvent.click(screen.getByRole("button", { name: "Yes, Cancel" }));

    await waitFor(() =>
      expect(onConfirm).toHaveBeenCalledWith("OTHER", "My flight was cancelled."),
    );
  });

  it("drops the written detail when the reason moves off other", () => {
    renderWithQueryClient(
      <CancelDialog applicationId="11" onClose={vi.fn()} onConfirm={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Other reason" }));
    fireEvent.change(screen.getByLabelText("Tell us what happened"), {
      target: { value: "My flight was cancelled." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Schedule conflict" }));

    // 다른 사유에 상세 설명을 붙이면 백엔드가 거절하므로 입력칸 자체가 사라진다
    expect(screen.queryByLabelText("Tell us what happened")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Yes, Cancel" })).toBeEnabled();
  });

  it("prevents Escape from closing while cancellation is submitting", async () => {
    const onClose = vi.fn();
    let resolveConfirm!: (outcome: CancelDialogOutcome) => void;
    const onConfirm = vi.fn(
      () =>
        new Promise<CancelDialogOutcome>((resolve) => {
          resolveConfirm = resolve;
        }),
    );
    renderWithQueryClient(
      <CancelDialog applicationId="11" onClose={onClose} onConfirm={onConfirm} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Schedule conflict" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, Cancel" }));
    await screen.findByRole("button", { name: "Cancelling..." });

    const cancelEvent = new Event("cancel", { bubbles: false, cancelable: true });
    fireEvent(screen.getByRole("dialog"), cancelEvent);

    expect(cancelEvent.defaultPrevented).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
    expect(onConfirm).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveConfirm({ ok: false, error: new Error("raw cancellation failure") });
    });
    await screen.findByRole("alert");
  });

  it("recovers with an error message when onConfirm rejects unexpectedly", async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error("network down"));
    renderWithQueryClient(
      <CancelDialog applicationId="11" onClose={vi.fn()} onConfirm={onConfirm} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Schedule conflict" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, Cancel" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong. Please try again.",
    );
    expect(screen.getByRole("button", { name: "Yes, Cancel" })).toBeEnabled();
  });

  it("shows an error and keeps the dialog open when cancellation fails", async () => {
    const onConfirm = vi.fn().mockResolvedValue({
      ok: false,
      error: new ApiClientError({
        code: "APPLICATION400_NOT_CANCELLABLE",
        status: 400,
        details: null,
        backendMessage: "확정된 신청만 취소할 수 있습니다.",
        fallbackMessage: "신청을 취소하지 못했습니다.",
      }),
    });
    renderWithQueryClient(
      <CancelDialog applicationId="11" onClose={vi.fn()} onConfirm={onConfirm} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Illness or unexpected emergency" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, Cancel" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This application can no longer be cancelled.",
    );
    expect(screen.queryByText("확정된 신청만 취소할 수 있습니다.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Yes, Cancel" })).toBeEnabled();
  });

  it("relocalizes a stored cancellation error when the locale changes", async () => {
    const onConfirm = vi.fn().mockResolvedValue({
      ok: false,
      error: new Error("raw cancellation failure"),
    } as const);
    const cancelDialog = (
      <CancelDialog applicationId="11" onClose={vi.fn()} onConfirm={onConfirm} />
    );
    const queryClient = createQueryClient();
    queryClient.setQueryData(applicationKeys.cancellationQuote("11"), quote);
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <IntlTestProvider locale="en">{cancelDialog}</IntlTestProvider>
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Schedule conflict" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, Cancel" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not cancel the application.");

    rerender(
      <QueryClientProvider client={queryClient}>
        <IntlTestProvider locale="ko">{cancelDialog}</IntlTestProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("신청을 취소하지 못했습니다.");
  });

  it("localizes the complete Korean cancellation dialog", () => {
    renderWithQueryClient(
      <CancelDialog applicationId="11" onClose={vi.fn()} onConfirm={vi.fn()} />,
      { locale: "ko" },
    );

    expect(screen.getByRole("dialog", { name: "신청을 취소할까요?" })).toBeInTheDocument();
    expect(
      screen.getByText("정말 이 신청을 취소하시겠어요? 취소 후에는 되돌릴 수 없습니다."),
    ).toBeInTheDocument();
    expect(screen.getByText("취소 사유를 선택해 주세요.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "일정 충돌" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "질병 또는 긴급 상황" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다른 옵션을 찾음" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "기타 사유" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "유지하기" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "신청 취소" })).toBeDisabled();
  });
});
