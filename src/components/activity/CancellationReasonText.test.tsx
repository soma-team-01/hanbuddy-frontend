import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { IntlTestProvider } from "@/test/render-with-intl";
import { getCancellationTranslation } from "@/lib/api/cancellation-translation";
import { CancellationReasonText } from "./CancellationReasonText";

const session = vi.hoisted(() => ({ userId: 7 as number | null }));
vi.mock("@/lib/api/useMyProfile", () => ({
  useMyProfile: () =>
    session.userId ? { status: "success", profile: { userId: session.userId } } : null,
}));
vi.mock("@/lib/query/use-auth-query-redirect", () => ({ useAuthQueryRedirect: vi.fn() }));
vi.mock("@/lib/api/cancellation-translation", () => ({ getCancellationTranslation: vi.fn() }));
const api = vi.mocked(getCancellationTranslation);
let reveal: () => void;
const props = { kind: "application" as const, id: 42, originalText: "개인 사정" };
const success = {
  status: "success" as const,
  translation: {
    originalText: "개인 사정",
    displayText: "Personal reasons",
    sourceLanguage: "KO" as const,
    targetLanguage: "EN" as const,
    status: "TRANSLATED" as const,
  },
};
beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        reveal = () =>
          act(() =>
            callback(
              [{ isIntersecting: true } as IntersectionObserverEntry],
              this as unknown as IntersectionObserver,
            ),
          );
      }
      observe() {}
      disconnect() {}
    },
  );
  session.userId = 7;
  api.mockReset();
  api.mockResolvedValue(success);
});
afterEach(() => vi.unstubAllGlobals());

describe("automatic visible cancellation translation", () => {
  it("automatically translates and lets the guest switch to the original without refetching", async () => {
    renderWithQueryClient(<CancellationReasonText {...props} />);
    expect(screen.queryByText(props.originalText)).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Translating…");
    expect(api).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Translate" })).not.toBeInTheDocument();
    reveal();
    expect(await screen.findByText("Personal reasons")).toBeVisible();
    expect(api).toHaveBeenCalledWith("application", 42, "EN", expect.any(AbortSignal));
    expect(screen.queryByText(props.originalText)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show original" }));
    expect(screen.getByText(props.originalText)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Show translation" }));
    expect(screen.getByText("Personal reasons")).toBeVisible();
    expect(api).toHaveBeenCalledTimes(1);
  });
  it.each(["ORIGINAL", "UNAVAILABLE", "NOT_APPLICABLE"] as const)(
    "preserves the original for %s without claiming translated",
    async (status) => {
      api.mockResolvedValue({
        ...success,
        translation: {
          ...success.translation,
          status,
          originalText: status === "NOT_APPLICABLE" ? null : props.originalText,
          displayText: null,
        },
      });
      renderWithQueryClient(<CancellationReasonText {...props} />);
      reveal();
      await waitFor(() => expect(screen.queryByText("Translating…")).not.toBeInTheDocument());
      expect(screen.getByText(props.originalText)).toBeVisible();
      expect(screen.queryByRole("button", { name: "Show original" })).not.toBeInTheDocument();
      expect(api).toHaveBeenCalledTimes(1);
    },
  );
  it("offers a manual retry after a network failure, without changing cancellation state", async () => {
    api.mockRejectedValueOnce(new Error("timeout"));
    renderWithQueryClient(<CancellationReasonText {...props} />);
    reveal();
    const retry = await screen.findByRole("button", { name: "Retry translation" });
    expect(screen.getByText(props.originalText)).toBeVisible();
    fireEvent.click(retry);
    expect(await screen.findByText("Personal reasons")).toBeVisible();
    expect(screen.queryByText(props.originalText)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry translation" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show original" })).toBeVisible();
    expect(api).toHaveBeenCalledTimes(2);
  });
  it.each(["TRANSLATED", "ORIGINAL", "UNAVAILABLE", "NOT_APPLICABLE"] as const)(
    "falls back and allows retry when a %s response has the wrong target language",
    async (status) => {
      api.mockResolvedValueOnce({
        ...success,
        translation: {
          ...success.translation,
          status,
          targetLanguage: "JA",
          originalText: "Ignored mismatched source",
          displayText: "Ignored mismatched translation",
        },
      });
      renderWithQueryClient(<CancellationReasonText {...props} />);
      reveal();
      const retry = await screen.findByRole("button", { name: "Retry translation" });
      expect(screen.queryByText("Translating…")).not.toBeInTheDocument();
      expect(screen.getByText(props.originalText)).toBeVisible();
      expect(screen.queryByText(/Ignored mismatched/)).not.toBeInTheDocument();
      expect(api).toHaveBeenCalledTimes(1);
      fireEvent.click(retry);
      expect(await screen.findByText("Personal reasons")).toBeVisible();
      expect(screen.queryByRole("button", { name: "Retry translation" })).not.toBeInTheDocument();
      expect(api).toHaveBeenCalledTimes(2);
    },
  );
  it("automatically translates the new locale without an old response overwriting it", async () => {
    let finish!: (value: typeof success) => void;
    api.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    api.mockResolvedValueOnce({
      ...success,
      translation: { ...success.translation, targetLanguage: "JA", displayText: "個人的な事情" },
    });
    const view = renderWithQueryClient(<CancellationReasonText {...props} />);
    reveal();
    view.rerender(
      <IntlTestProvider locale="ja">
        <CancellationReasonText {...props} />
      </IntlTestProvider>,
    );
    expect(screen.queryByText(props.originalText)).not.toBeInTheDocument();
    reveal();
    await screen.findByText("個人的な事情");
    await act(async () => finish(success));
    expect(screen.queryByText("Personal reasons")).not.toBeInTheDocument();
    expect(screen.getByText("個人的な事情")).toBeVisible();
    expect(api).toHaveBeenCalledTimes(2);
  });
  it("clears private translation state when the signed-in account changes or logs out", async () => {
    const view = renderWithQueryClient(<CancellationReasonText {...props} />);
    reveal();
    await screen.findByText("Personal reasons");
    session.userId = 8;
    view.rerender(<CancellationReasonText {...props} />);
    expect(screen.queryByText("Personal reasons")).not.toBeInTheDocument();
    session.userId = null;
    view.rerender(<CancellationReasonText {...props} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText(props.originalText)).not.toBeInTheDocument();
    expect(api).toHaveBeenCalledTimes(1);
  });
});
