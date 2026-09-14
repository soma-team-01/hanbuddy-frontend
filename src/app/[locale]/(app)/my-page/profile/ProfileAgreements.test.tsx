import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { getMyAgreements, updateMarketingConsent } from "@/lib/api/agreements";
import { createApiClientError } from "@/lib/api/errors";
import { getSignupAgreementTypes } from "@/lib/auth/signup-agreements";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import type { MyAgreement, MyAgreements } from "@/types/agreement";
import { ProfileAgreements } from "@/app/[locale]/(app)/my-page/profile/ProfileAgreements";

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => router,
}));

vi.mock("@/lib/api/agreements", () => ({
  getMyAgreements: vi.fn(),
  updateMarketingConsent: vi.fn(),
}));

function data(userType: MyAgreements["userType"] = "TOURIST"): MyAgreements {
  return {
    userType,
    agreements: getSignupAgreementTypes(userType).map((type) => ({
      type,
      required: type !== "MARKETING_COMMUNICATION",
      editable: type === "MARKETING_COMMUNICATION",
      recorded: false,
      agreed: type === "MARKETING_COMMUNICATION" ? false : null,
      version: null,
      currentVersion: "2026-09-07",
      decidedAt: null,
      withdrawnAt: null,
    })),
  };
}
const marketing = (agreed: boolean): MyAgreement => ({
  ...data().agreements[3],
  agreed,
  recorded: true,
  version: "2026-09-07",
});
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getMyAgreements).mockResolvedValue({ status: "success", data: data() });
  vi.mocked(updateMarketingConsent).mockResolvedValue({
    status: "success",
    agreement: marketing(true),
  });
});

it.each(["TOURIST", "BUDDY"] as const)(
  "shows only returned %s items with one editable switch",
  async (role) => {
    vi.mocked(getMyAgreements).mockResolvedValue({ status: "success", data: data(role) });
    renderWithQueryClient(<ProfileAgreements userId={1} />);
    await screen.findByRole("switch");
    expect(screen.getAllByTestId("agreement-row")).toHaveLength(role === "BUDDY" ? 6 : 4);
    expect(screen.getAllByRole("switch")).toHaveLength(1);
    expect(screen.getAllByText("No record")).toHaveLength(role === "BUDDY" ? 5 : 3);
    expect(updateMarketingConsent).not.toHaveBeenCalled();
  },
);

it("opens a current document without changing consent", async () => {
  const response = data();
  response.agreements[0] = {
    ...response.agreements[0],
    recorded: true,
    agreed: true,
    version: "old",
  };
  vi.mocked(getMyAgreements).mockResolvedValue({ status: "success", data: response });
  renderWithQueryClient(<ProfileAgreements userId={1} />);
  const trigger = await screen.findByRole("button", { name: /I confirm that I am 19/ });
  expect(screen.queryByText(/Recorded version/)).not.toBeInTheDocument();
  expect(screen.queryByText(/Current document/)).not.toBeInTheDocument();
  fireEvent.click(trigger);
  expect(screen.getByRole("dialog")).toHaveTextContent("Current document");
  expect(screen.getByText(/Recorded version: old/)).toBeInTheDocument();
  expect(updateMarketingConsent).not.toHaveBeenCalled();
});

it.each(["en", "ko"] as const)(
  "shows the actual agreement date in %s without explanatory copy",
  async (locale) => {
    const response = data();
    response.agreements[0] = {
      ...response.agreements[0],
      recorded: true,
      agreed: true,
      version: "2026-08-06",
      decidedAt: "2026-09-13T16:00:00Z",
    };
    vi.mocked(getMyAgreements).mockResolvedValue({ status: "success", data: response });
    const { container } = renderWithQueryClient(<ProfileAgreements userId={1} />, { locale });
    await screen.findByRole("switch");
    const date = container.querySelector("time");
    expect(date).toHaveAttribute("datetime", "2026-09-13T16:00:00Z");
    expect(date).toHaveTextContent(locale === "ko" ? "2026. 9. 14." : "Sep 14, 2026");
    expect(date?.parentElement).toHaveTextContent(locale === "ko" ? "동의 완료" : "Agreed");
    expect(container).not.toHaveTextContent("2026-08-06");
    expect(container).not.toHaveTextContent("Review your agreements");
    expect(container).not.toHaveTextContent("가입 동의 내역을 확인");
    expect(container).not.toHaveTextContent("essential service messages");
    expect(container).not.toHaveTextContent("필수 서비스 안내");
  },
);

it.each([null, "invalid"])(
  "does not invent a date for a missing/invalid timestamp (%s)",
  async (decidedAt) => {
    const response = data();
    response.agreements[0] = {
      ...response.agreements[0],
      recorded: true,
      agreed: true,
      version: "2026-08-06",
      decidedAt,
    };
    vi.mocked(getMyAgreements).mockResolvedValue({ status: "success", data: response });
    const { container } = renderWithQueryClient(<ProfileAgreements userId={1} />);
    await screen.findByText("Agreed");
    expect(container.querySelector("time")).toBeNull();
  },
);

it("waits for the server, blocks repeated clicks, and sends no version for OFF", async () => {
  let resolve!: (result: Awaited<ReturnType<typeof updateMarketingConsent>>) => void;
  vi.mocked(updateMarketingConsent).mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  renderWithQueryClient(<ProfileAgreements userId={1} />);
  const toggle = await screen.findByRole("switch");
  fireEvent.click(toggle);
  await waitFor(() => expect(toggle).toBeDisabled());
  expect(toggle).toHaveAttribute("aria-checked", "false");
  fireEvent.click(toggle);
  expect(updateMarketingConsent).toHaveBeenCalledTimes(1);
  expect(updateMarketingConsent).toHaveBeenCalledWith({ agreed: true, version: "2026-09-07" });
  resolve({ status: "success", agreement: marketing(true) });
  await waitFor(() => expect(toggle).toHaveAttribute("aria-checked", "true"));
  vi.mocked(updateMarketingConsent).mockResolvedValue({
    status: "success",
    agreement: marketing(false),
  });
  fireEvent.click(toggle);
  await waitFor(() => expect(updateMarketingConsent).toHaveBeenLastCalledWith({ agreed: false }));
  await waitFor(() => expect(toggle).toHaveAttribute("aria-checked", "false"));
});

it("blocks mismatched ON but allows withdrawal from an old document", async () => {
  const response = data();
  response.agreements[3].currentVersion = "new-version";
  vi.mocked(getMyAgreements).mockResolvedValue({ status: "success", data: response });
  const view = renderWithQueryClient(<ProfileAgreements userId={1} />);
  expect(await screen.findByRole("switch")).toBeDisabled();
  expect(updateMarketingConsent).not.toHaveBeenCalled();
  view.unmount();
  response.agreements[3].agreed = true;
  renderWithQueryClient(<ProfileAgreements userId={1} />);
  const toggle = await screen.findByRole("switch");
  expect(toggle).not.toBeDisabled();
  fireEvent.click(toggle);
  await waitFor(() => expect(updateMarketingConsent).toHaveBeenCalledWith({ agreed: false }));
});

it("does not treat a failed read as OFF and supports retry", async () => {
  vi.mocked(getMyAgreements).mockResolvedValueOnce({
    status: "error",
    error: createApiClientError(502, null),
  });
  renderWithQueryClient(<ProfileAgreements userId={1} />);
  expect(await screen.findByRole("alert")).toBeInTheDocument();
  expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByRole("switch")).toHaveAttribute("aria-checked", "false");
});

it.each([null, "USER400_MARKETING_VERSION"])(
  "resyncs a failed update (%s) without automatic consent",
  async (code) => {
    vi.mocked(updateMarketingConsent).mockResolvedValue({
      status: "error",
      error: createApiClientError(
        code ? 400 : null,
        code ? { isSuccess: false, code, message: "version" } : null,
      ),
    });
    renderWithQueryClient(<ProfileAgreements userId={1} />);
    fireEvent.click(await screen.findByRole("switch"));
    await screen.findByRole("alert");
    await waitFor(() => expect(getMyAgreements).toHaveBeenCalledTimes(2));
    expect(updateMarketingConsent).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  },
);

it("does not show another account's cached consent", async () => {
  vi.mocked(getMyAgreements).mockResolvedValueOnce({
    status: "success",
    data: { ...data(), agreements: [marketing(true)] },
  });
  const view = renderWithQueryClient(<ProfileAgreements key={1} userId={1} />);
  expect(await screen.findByRole("switch")).toHaveAttribute("aria-checked", "true");
  vi.mocked(getMyAgreements).mockImplementationOnce(() => new Promise(() => {}));
  view.rerender(<ProfileAgreements key={2} userId={2} />);
  expect(screen.queryByRole("switch")).not.toBeInTheDocument();
});

it("clears agreement caches and redirects on authentication failure", async () => {
  vi.mocked(getMyAgreements).mockResolvedValue({ status: "unauthenticated" });
  const { queryClient } = renderWithQueryClient(<ProfileAgreements userId={1} />);
  await waitFor(() => expect(router.replace).toHaveBeenCalled());
  expect(queryClient.getQueryData(["agreements", 1])).toBeUndefined();
  expect(screen.queryByRole("switch")).not.toBeInTheDocument();
});

it.each(["en", "ko", "ja", "zh-Hans", "zh-Hant"] as const)(
  "localizes agreements in %s",
  async (locale) => {
    renderWithQueryClient(<ProfileAgreements userId={1} />, { locale });
    await screen.findByRole("switch");
    expect(document.body).not.toHaveTextContent("ProfileAgreements.");
    expect(document.body).not.toHaveTextContent("Onboarding.agreements.");
  },
);

it("uses the buddy privacy notice and restores focus when closed", async () => {
  vi.mocked(getMyAgreements).mockResolvedValue({ status: "success", data: data("BUDDY") });
  renderWithQueryClient(<ProfileAgreements userId={1} />, { locale: "ko" });
  const trigger = await screen.findByRole("button", { name: "개인정보 수집·이용" });
  fireEvent.click(trigger);
  expect(screen.getByRole("dialog")).toHaveTextContent("버디 가입 심사");
  fireEvent.click(screen.getByRole("button", { name: "대화상자 닫기" }));
  expect(trigger).toHaveFocus();
  expect(updateMarketingConsent).not.toHaveBeenCalled();
});
