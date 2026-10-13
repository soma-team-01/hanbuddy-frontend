import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteMyActivity, getMyActivities, updateMyActivityStatus } from "@/lib/api/buddy";
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
  updateMyActivityStatus: vi.fn(),
}));

const mockedDeleteMyActivity = vi.mocked(deleteMyActivity);
const mockedGetMyActivities = vi.mocked(getMyActivities);
const mockedUpdateMyActivityStatus = vi.mocked(updateMyActivityStatus);

const cardFields = {
  meetingPointName: "Anguk Station",
  meetingPlaceId: null,
  price: 45000,
  currency: "KRW",
};

describe("MyActivitiesContent", () => {
  beforeEach(() => {
    routerMock.replace.mockReset();
    mockedDeleteMyActivity.mockReset();
    mockedGetMyActivities.mockReset();
    mockedUpdateMyActivityStatus.mockReset();
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
          ...cardFields,
          totalDurationMinutes: 90,
          status: "ACTIVE",
        },
      ],
    });

    renderWithQueryClient(<MyActivitiesContent />);

    expect(await screen.findByText("Traditional Tea Tasting")).toHaveClass("text-base");
    expect(screen.getByRole("img", { name: "Traditional Tea Tasting" })).toHaveAttribute(
      "loading",
      "eager",
    );
    expect(screen.getByTestId("activity-records")).toHaveClass("flex-col", "divide-y");
    expect(screen.getByText("Learn Korean tea etiquette.")).toHaveClass("text-sm");
    expect(
      screen.getByRole("switch", { name: "Make Traditional Tea Tasting private" }),
    ).toHaveAttribute("aria-checked", "true");
    expect(
      screen.getByRole("switch", { name: "Make Traditional Tea Tasting private" }),
    ).toHaveClass("min-h-9");
    expect(screen.getByRole("article")).toHaveAttribute("data-variant", "row");
    expect(screen.getByText("1 hour 30min")).toBeInTheDocument();
    expect(screen.getByText("Public")).toBeInTheDocument();
    const detailLinks = screen.getAllByRole("link", { name: "Traditional Tea Tasting" });
    expect(detailLinks.length).toBeGreaterThanOrEqual(1);
    for (const detailLink of detailLinks) {
      expect(detailLink).toHaveAttribute("href", "/en/my-activities/42");
    }
    expect(screen.getByRole("link", { name: "Edit Traditional Tea Tasting" })).toHaveAttribute(
      "href",
      "/en/my-activities/42/edit",
    );
    // 신청자 확인은 대시보드에서 하므로 카드에는 신청자 보기가 없다
    expect(screen.queryByRole("link", { name: "View applicants" })).not.toBeInTheDocument();
  });

  it.each(["en", "ko"] as const)(
    "uses guest card pricing, rating and sold-out state independently of visibility in %s",
    async (locale) => {
      mockedGetMyActivities.mockResolvedValue({
        status: "success",
        activities: [
          {
            activityId: 42,
            title: "Tea Tour",
            description: "Tea with a buddy",
            thumbnailImageUrl: null,
            totalDurationMinutes: 60,
            status: "INACTIVE",
            meetingPointName: "Anguk Station",
            meetingPlaceId: "anguk",
            price: 40000,
            currency: "KRW",
            discountedPrice: 39200,
            discountPercent: 2,
            averageRating: 5,
            reviewCount: 3,
            isSoldOut: false,
          },
          {
            activityId: 43,
            title: "Closed Tour",
            description: "Closed",
            thumbnailImageUrl: null,
            totalDurationMinutes: 10,
            status: "ACTIVE",
            meetingPointName: "Seoul",
            meetingPlaceId: null,
            price: 110000,
            currency: "KRW",
            activityType: "REFERRAL",
            averageRating: null,
            reviewCount: 0,
            isSoldOut: true,
          },
          {
            activityId: 44,
            title: "Free Tour",
            description: "A free walking tour",
            thumbnailImageUrl: null,
            totalDurationMinutes: 5,
            status: "ACTIVE",
            meetingPointName: "Seoul",
            meetingPlaceId: null,
            price: 0,
            currency: "KRW",
            activityType: "REFERRAL",
            isSoldOut: false,
          },
        ],
      });
      renderWithQueryClient(<MyActivitiesContent />, { locale });
      expect(await screen.findByText("Anguk Station")).toBeInTheDocument();
      expect(screen.getByText("₩39,200")).toBeInTheDocument();
      expect(screen.getByText("₩40,000").tagName).toBe("S");
      expect(screen.getByText("5.0")).toBeInTheDocument();
      expect(screen.getByText("₩110,000~")).toBeInTheDocument();
      expect(screen.getByText(locale === "ko" ? "무료" : "Free")).toBeInTheDocument();
      expect(screen.getAllByText(locale === "ko" ? "예약 마감" : "Sold out")).toHaveLength(1);
      expect(screen.getAllByRole("article").every((card) => card.dataset.variant === "row")).toBe(
        true,
      );
      expect(
        screen.getByRole("switch", {
          name: locale === "ko" ? "Tea Tour 공개" : "Publish Tea Tour",
        }),
      ).toHaveAttribute("aria-checked", "false");
    },
  );

  it("labels a soft-deleted activity instead of falling back to a blank status", async () => {
    mockedGetMyActivities.mockResolvedValue({
      status: "success",
      activities: [
        {
          activityId: 43,
          title: "Retired Night Walk",
          description: "No longer offered.",
          thumbnailImageUrl: null,
          ...cardFields,
          totalDurationMinutes: 0,
          status: "DELETED",
        },
      ],
    });

    renderWithQueryClient(<MyActivitiesContent />);

    expect(await screen.findByText("Retired Night Walk")).toBeInTheDocument();
    expect(screen.getByText("Deleted")).toBeInTheDocument();
  });

  it("changes an active activity to inactive through the dedicated status endpoint", async () => {
    mockedGetMyActivities.mockResolvedValueOnce({
      status: "success",
      activities: [
        {
          activityId: 42,
          title: "Traditional Tea Tasting",
          description: "Learn Korean tea etiquette.",
          thumbnailImageUrl: null,
          ...cardFields,
          totalDurationMinutes: 0,
          status: "ACTIVE",
        },
      ],
    });
    mockedGetMyActivities.mockResolvedValue({
      status: "success",
      activities: [
        {
          activityId: 42,
          title: "Traditional Tea Tasting",
          description: "Learn Korean tea etiquette.",
          thumbnailImageUrl: null,
          ...cardFields,
          totalDurationMinutes: 0,
          status: "INACTIVE",
        },
      ],
    });
    mockedUpdateMyActivityStatus.mockResolvedValue({
      status: "success",
      activity: { activityId: 42, status: "INACTIVE" } as never,
    });

    renderWithQueryClient(<MyActivitiesContent />);
    fireEvent.click(
      await screen.findByRole("switch", { name: "Make Traditional Tea Tasting private" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Make private" }));

    await waitFor(() => expect(mockedUpdateMyActivityStatus).toHaveBeenCalledWith(42, "INACTIVE"));
    expect(await screen.findByText("Private")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Publish Traditional Tea Tasting" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("keeps the active card unchanged when unfinished reservations block hiding", async () => {
    mockedGetMyActivities.mockResolvedValue({
      status: "success",
      activities: [
        {
          activityId: 42,
          title: "Traditional Tea Tasting",
          description: "Learn Korean tea etiquette.",
          thumbnailImageUrl: null,
          ...cardFields,
          totalDurationMinutes: 0,
          status: "ACTIVE",
        },
      ],
    });
    mockedUpdateMyActivityStatus.mockResolvedValue({
      status: "error",
      error: new ApiClientError({
        code: "ACTIVITY409_UNFINISHED_RESERVATIONS",
        status: 409,
        details: null,
        backendMessage: "unfinished",
      }),
    });

    renderWithQueryClient(<MyActivitiesContent />);
    fireEvent.click(
      await screen.findByRole("switch", { name: "Make Traditional Tea Tasting private" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Make private" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This activity cannot be made private or deleted while it has unfinished reservations.",
    );
    expect(screen.getByText("Public")).toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: "Make Traditional Tea Tasting private" }),
    ).toHaveAttribute("aria-checked", "true");
    expect(screen.queryByText("unfinished")).not.toBeInTheDocument();
  });

  it("does not offer status restoration for draft or deleted activities", async () => {
    mockedGetMyActivities.mockResolvedValue({
      status: "success",
      activities: [
        {
          activityId: 43,
          title: "Draft Walk",
          description: "Draft.",
          thumbnailImageUrl: null,
          ...cardFields,
          totalDurationMinutes: 0,
          status: "DRAFT",
        },
        {
          activityId: 44,
          title: "Deleted Walk",
          description: "Deleted.",
          thumbnailImageUrl: null,
          ...cardFields,
          totalDurationMinutes: 0,
          status: "DELETED",
        },
      ],
    });

    renderWithQueryClient(<MyActivitiesContent />);

    expect(await screen.findByText("Draft Walk")).toBeInTheDocument();
    expect(
      screen.queryByRole("switch", { name: /Publish Draft Walk|Make Draft Walk private/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("switch", { name: /Publish Deleted Walk|Make Deleted Walk private/ }),
    ).not.toBeInTheDocument();
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
          ...cardFields,
          totalDurationMinutes: 0,
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
          ...cardFields,
          totalDurationMinutes: 0,
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
          ...cardFields,
          totalDurationMinutes: 0,
          status: "ACTIVE",
        },
      ],
    });
    mockedDeleteMyActivity.mockResolvedValue({
      status: "error",
      error: new ApiClientError({
        code: "ACTIVITY403_OWNER",
        status: 403,
        details: null,
        backendMessage: "본인이 생성한 액티비티만 삭제할 수 있습니다.",
        fallbackMessage: "활동을 삭제하지 못했습니다.",
      }),
    });

    renderWithQueryClient(<MyActivitiesContent />);
    fireEvent.click(await screen.findByRole("button", { name: "Delete Traditional Tea Tasting" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You can only access activities you created.",
    );
    expect(
      screen.queryByText("본인이 생성한 액티비티만 삭제할 수 있습니다."),
    ).not.toBeInTheDocument();
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
          ...cardFields,
          totalDurationMinutes: 0,
          status: "ACTIVE",
        },
        {
          activityId: 43,
          title: "Bukchon Walking Tour",
          description: "Explore Bukchon.",
          thumbnailImageUrl: null,
          ...cardFields,
          totalDurationMinutes: 0,
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
          ...cardFields,
          totalDurationMinutes: 0,
          status: "ACTIVE",
        },
      ],
    });

    renderWithQueryClient(<MyActivitiesContent />, { locale: "ko" });

    expect(await screen.findByText("Traditional Tea Tasting")).toBeInTheDocument();
    expect(screen.getByText("Learn Korean tea etiquette.")).toBeInTheDocument();
    expect(screen.getByText("공개 중")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "신청자 보기" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Traditional Tea Tasting 삭제" }));

    expect(screen.getByRole("heading", { name: "이 활동을 삭제할까요?" })).toBeInTheDocument();
    expect(screen.getByText("삭제한 활동은 복구할 수 없습니다.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "삭제" })).toBeInTheDocument();
  });

  it("localizes the activity loading state in Korean", () => {
    mockedGetMyActivities.mockReturnValue(new Promise(() => {}));

    renderWithQueryClient(<MyActivitiesContent />, { locale: "ko" });

    expect(screen.getByText("활동을 불러오는 중...")).toBeInTheDocument();
  });

  it("localizes the empty activity state in Korean", async () => {
    mockedGetMyActivities.mockResolvedValue({ status: "success", activities: [] });

    renderWithQueryClient(<MyActivitiesContent />, { locale: "ko" });

    expect(await screen.findByText("아직 등록한 활동이 없습니다.")).toBeInTheDocument();
  });

  it("maps the buddy-role activity error in Korean", async () => {
    mockedGetMyActivities.mockResolvedValue({
      status: "error",
      error: new ApiClientError({
        code: "USER403_BUDDY",
        status: 403,
        details: null,
        backendMessage: "raw activity service failure",
      }),
    });

    renderWithQueryClient(<MyActivitiesContent />, { locale: "ko" });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "버디 사용자만 이용할 수 있는 기능입니다.",
    );
    expect(screen.queryByText("raw activity service failure")).not.toBeInTheDocument();
  });
});
