import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteMyActivity, getMyActivities } from "@/lib/api/buddy";
import { ApiClientError } from "@/lib/api/errors";
import { buddyKeys } from "@/lib/query/buddy";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { MyActivitiesContent } from "./my-activities-content";

const routerMock = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => routerMock,
}));

vi.mock("@/lib/api/buddy", () => ({
  deleteMyActivity: vi.fn(),
  getMyActivities: vi.fn(),
}));

const mockedDeleteMyActivity = vi.mocked(deleteMyActivity);
const mockedGetMyActivities = vi.mocked(getMyActivities);

describe("MyActivitiesContent", () => {
  beforeEach(() => {
    routerMock.replace.mockReset();
    mockedDeleteMyActivity.mockReset();
    mockedGetMyActivities.mockReset();
  });

  it("renders buddy activities loaded from the API", async () => {
    mockedGetMyActivities.mockResolvedValue({
      status: "success",
      activities: [
        {
          activityId: 42,
          title: "Traditional Tea Tasting",
          description: "Learn Korean tea etiquette.",
          thumbnailImageUrl: null,
          status: "ACTIVE",
        },
      ],
    });

    renderWithQueryClient(<MyActivitiesContent />);

    expect(await screen.findByText("Traditional Tea Tasting")).toBeInTheDocument();
    expect(screen.getByText("Learn Korean tea etiquette.")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("removes an activity after a successful delete request", async () => {
    mockedGetMyActivities.mockResolvedValueOnce({
      status: "success",
      activities: [
        {
          activityId: 42,
          title: "Traditional Tea Tasting",
          description: "Learn Korean tea etiquette.",
          thumbnailImageUrl: null,
          status: "ACTIVE",
        },
      ],
    });
    mockedGetMyActivities.mockResolvedValue({ status: "success", activities: [] });
    mockedDeleteMyActivity.mockResolvedValue({
      status: "success",
      message: "삭제되었습니다.",
    });

    const { queryClient } = renderWithQueryClient(<MyActivitiesContent />);

    const deleteButton = await screen.findByRole("button", {
      name: "Delete Traditional Tea Tasting",
    });
    fireEvent.click(deleteButton);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(mockedDeleteMyActivity).toHaveBeenCalledWith(42));
    await waitFor(() => {
      expect(screen.queryByText("Traditional Tea Tasting")).not.toBeInTheDocument();
    });
    await waitFor(() => expect(mockedGetMyActivities).toHaveBeenCalledTimes(2));
    expect(queryClient.getQueryData(buddyKeys.myActivities())).toEqual([]);
  });

  it("does not delete when the confirmation is cancelled", async () => {
    mockedGetMyActivities.mockResolvedValue({
      status: "success",
      activities: [
        {
          activityId: 42,
          title: "Traditional Tea Tasting",
          description: "Learn Korean tea etiquette.",
          thumbnailImageUrl: null,
          status: "ACTIVE",
        },
      ],
    });

    renderWithQueryClient(<MyActivitiesContent />);

    const deleteButton = await screen.findByRole("button", {
      name: "Delete Traditional Tea Tasting",
    });
    fireEvent.click(deleteButton);

    expect(screen.getByText("This action cannot be undone.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(mockedDeleteMyActivity).not.toHaveBeenCalled();
    expect(screen.getByText("Traditional Tea Tasting")).toBeInTheDocument();
  });

  it("keeps the activity list visible when deletion fails", async () => {
    mockedGetMyActivities.mockResolvedValue({
      status: "success",
      activities: [
        {
          activityId: 42,
          title: "Traditional Tea Tasting",
          description: "Learn Korean tea etiquette.",
          thumbnailImageUrl: null,
          status: "ACTIVE",
        },
      ],
    });
    mockedDeleteMyActivity.mockResolvedValue({
      status: "error",
      error: new ApiClientError({
        code: null,
        status: null,
        details: null,
        backendMessage: null,
        fallbackMessage: "활동을 삭제하지 못했습니다.",
      }),
    });

    renderWithQueryClient(<MyActivitiesContent />);
    fireEvent.click(await screen.findByRole("button", { name: "Delete Traditional Tea Tasting" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not delete the activity.");
    expect(screen.getByText("Traditional Tea Tasting")).toBeInTheDocument();
  });

  it("disables every delete button while a deletion is pending", async () => {
    mockedGetMyActivities.mockResolvedValue({
      status: "success",
      activities: [
        {
          activityId: 42,
          title: "Traditional Tea Tasting",
          description: "Learn Korean tea etiquette.",
          thumbnailImageUrl: null,
          status: "ACTIVE",
        },
        {
          activityId: 43,
          title: "Bukchon Walking Tour",
          description: "Explore Bukchon.",
          thumbnailImageUrl: null,
          status: "ACTIVE",
        },
      ],
    });
    let resolveDelete!: (value: Awaited<ReturnType<typeof deleteMyActivity>>) => void;
    mockedDeleteMyActivity.mockReturnValue(
      new Promise((resolve) => {
        resolveDelete = resolve;
      }),
    );

    renderWithQueryClient(<MyActivitiesContent />);
    fireEvent.click(await screen.findByRole("button", { name: "Delete Traditional Tea Tasting" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Delete Bukchon Walking Tour" })).toBeDisabled(),
    );

    await act(async () => {
      resolveDelete({ status: "success", message: "삭제되었습니다." });
    });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Delete Bukchon Walking Tour" })).toBeEnabled(),
    );
  });

  it("localizes status, actions, and the delete dialog in Korean", async () => {
    mockedGetMyActivities.mockResolvedValue({
      status: "success",
      activities: [
        {
          activityId: 42,
          title: "Traditional Tea Tasting",
          description: "Learn Korean tea etiquette.",
          thumbnailImageUrl: null,
          status: "ACTIVE",
        },
      ],
    });

    renderWithQueryClient(<MyActivitiesContent />, { locale: "ko" });

    expect(await screen.findByText("Traditional Tea Tasting")).toBeInTheDocument();
    expect(screen.getByText("Learn Korean tea etiquette.")).toBeInTheDocument();
    expect(screen.getByText("게시 중")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "신청자 보기" })).toHaveAttribute(
      "href",
      "/ko/my-activities/42/applicants",
    );

    fireEvent.click(screen.getByRole("button", { name: "Traditional Tea Tasting 삭제" }));

    expect(screen.getByRole("heading", { name: "이 액티비티를 삭제할까요?" })).toBeInTheDocument();
    expect(screen.getByText("삭제한 액티비티는 복구할 수 없습니다.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "삭제" })).toBeInTheDocument();
  });

  it("localizes the activity loading state in Korean", () => {
    mockedGetMyActivities.mockReturnValue(new Promise(() => {}));

    renderWithQueryClient(<MyActivitiesContent />, { locale: "ko" });

    expect(screen.getByText("액티비티를 불러오는 중...")).toBeInTheDocument();
  });

  it("localizes the empty activity state in Korean", async () => {
    mockedGetMyActivities.mockResolvedValue({ status: "success", activities: [] });

    renderWithQueryClient(<MyActivitiesContent />, { locale: "ko" });

    expect(await screen.findByText("아직 등록한 액티비티가 없습니다.")).toBeInTheDocument();
  });

  it("does not expose the activity API error in Korean", async () => {
    mockedGetMyActivities.mockResolvedValue({
      status: "error",
      error: new ApiClientError({
        code: null,
        status: null,
        details: null,
        backendMessage: null,
        fallbackMessage: "raw activity service failure",
      }),
    });

    renderWithQueryClient(<MyActivitiesContent />, { locale: "ko" });

    expect(await screen.findByRole("alert")).toHaveTextContent("액티비티를 불러오지 못했습니다.");
    expect(screen.queryByText("raw activity service failure")).not.toBeInTheDocument();
  });
});
