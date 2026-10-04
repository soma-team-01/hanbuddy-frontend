import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { onlineManager } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { consumeReferralCode } from "@/lib/referral";
import { validateReferralInvitation } from "@/lib/api/referral";
import type { ReferralInvitation } from "@/types/referral";
import { ReferralCreateEntry } from "./ReferralCreateEntry";

vi.mock("@/lib/referral", () => ({ consumeReferralCode: vi.fn() }));
vi.mock("@/lib/api/referral", () => ({ validateReferralInvitation: vi.fn() }));
vi.mock("@/app/[locale]/(app)/(buddy)/my-activities/create/create-activity-form", () => ({
  CreateActivityForm: () => <input aria-label="Activity title" defaultValue="" />,
}));

const success = { status: "success", data: {} as ReferralInvitation } as const;

beforeEach(() => {
  onlineManager.setOnline(true);
  vi.mocked(consumeReferralCode).mockReset().mockReturnValue("first-invitation");
  vi.mocked(validateReferralInvitation).mockReset().mockResolvedValue(success);
});
afterEach(() => onlineManager.setOnline(true));

describe("referral invitation validation lifetime", () => {
  it("does not validate or open a form without an invitation code", async () => {
    vi.mocked(consumeReferralCode).mockReturnValue(null);
    renderWithQueryClient(<ReferralCreateEntry />);
    await screen.findByRole("alert");
    expect(validateReferralInvitation).not.toHaveBeenCalled();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("requires login when validation returns unauthenticated", async () => {
    vi.mocked(validateReferralInvitation).mockResolvedValue({ status: "unauthenticated" });
    renderWithQueryClient(<ReferralCreateEntry />);
    await screen.findByRole("button", { name: "Sign in" });
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("allows an explicit retry after initial validation fails", async () => {
    vi.mocked(validateReferralInvitation).mockRejectedValueOnce(new Error("Network unavailable"));
    renderWithQueryClient(<ReferralCreateEntry />);
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));
    await screen.findByRole("textbox", { name: "Activity title" });
    expect(validateReferralInvitation).toHaveBeenCalledTimes(2);
  });

  it("does not revalidate or reset entered values after reconnecting", async () => {
    renderWithQueryClient(<ReferralCreateEntry />);
    const input = await screen.findByRole("textbox", { name: "Activity title" });
    fireEvent.change(input, { target: { value: "My activity draft" } });

    await act(async () => {
      onlineManager.setOnline(false);
    });
    await act(async () => {
      onlineManager.setOnline(true);
    });

    expect(validateReferralInvitation).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("textbox", { name: "Activity title" })).toBe(input);
    expect(input).toHaveValue("My activity draft");
  });

  it("keeps the same form mounted during an explicit background refresh", async () => {
    const { queryClient } = renderWithQueryClient(<ReferralCreateEntry />);
    const input = await screen.findByRole("textbox", { name: "Activity title" });
    fireEvent.change(input, { target: { value: "Unsaved draft" } });
    let finish!: (value: typeof success) => void;
    vi.mocked(validateReferralInvitation).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    let refresh!: Promise<void>;
    await act(async () => {
      refresh = queryClient.invalidateQueries({ queryKey: ["referral", "invitation-validation"] });
    });
    await waitFor(() => expect(validateReferralInvitation).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("textbox", { name: "Activity title" })).toBe(input);
    expect(input).toHaveValue("Unsaved draft");
    await act(async () => {
      finish(success);
      await refresh;
    });
    expect(screen.getByRole("textbox", { name: "Activity title" })).toBe(input);
  });

  it("validates a new entry independently without exposing either code in query keys", async () => {
    const { queryClient, unmount } = renderWithQueryClient(<ReferralCreateEntry />);
    await screen.findByRole("textbox", { name: "Activity title" });
    unmount();
    vi.mocked(consumeReferralCode).mockReturnValue("second-invitation");
    vi.mocked(validateReferralInvitation).mockReturnValue(new Promise(() => {}));
    renderWithQueryClient(<ReferralCreateEntry />, { queryClient });
    await waitFor(() =>
      expect(validateReferralInvitation).toHaveBeenCalledWith("second-invitation"),
    );
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    const keys = JSON.stringify(
      queryClient
        .getQueryCache()
        .getAll()
        .map((q) => q.queryKey),
    );
    expect(keys).not.toContain("first-invitation");
    expect(keys).not.toContain("second-invitation");
  });
});
