import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { deleteMyActivity, getMyActivities } from "@/lib/api/buddy";
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

    render(<MyActivitiesContent />);

    expect(await screen.findByText("Traditional Tea Tasting")).toBeInTheDocument();
    expect(screen.getByText("Learn Korean tea etiquette.")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("removes an activity after a successful delete request", async () => {
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
      status: "success",
      message: "삭제되었습니다.",
    });

    render(<MyActivitiesContent />);

    const deleteButton = await screen.findByRole("button", {
      name: "Delete Traditional Tea Tasting",
    });
    fireEvent.click(deleteButton);

    await waitFor(() => expect(mockedDeleteMyActivity).toHaveBeenCalledWith(42));
    await waitFor(() => {
      expect(screen.queryByText("Traditional Tea Tasting")).not.toBeInTheDocument();
    });
  });
});
