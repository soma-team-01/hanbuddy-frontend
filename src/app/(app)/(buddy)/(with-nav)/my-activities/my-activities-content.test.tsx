import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteMyActivity, getMyActivities } from "@/lib/api/buddy";
import { buddyKeys } from "@/lib/query/buddy";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { MyActivitiesContent } from "./my-activities-content";

const routerMock = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
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
      message: "활동을 삭제하지 못했습니다.",
    });

    renderWithQueryClient(<MyActivitiesContent />);
    fireEvent.click(await screen.findByRole("button", { name: "Delete Traditional Tea Tasting" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("활동을 삭제하지 못했습니다.");
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
    mockedDeleteMyActivity.mockReturnValue(new Promise(() => undefined));

    renderWithQueryClient(<MyActivitiesContent />);
    fireEvent.click(await screen.findByRole("button", { name: "Delete Traditional Tea Tasting" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Delete Bukchon Walking Tour" })).toBeDisabled(),
    );
  });
});
