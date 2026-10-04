import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithIntl } from "@/test/render-with-intl";
import type { ApplicationResponse } from "@/types/application";
import { ApplicationConfirmation } from "./ApplicationConfirmation";

const application = {
  applicationId: 11,
  activityTitle: "Seoul studio visit",
  buddyName: "Buddy",
  thumbnailImageUrl: null,
  startAt: "2026-10-09T08:00:00+09:00",
  guestCount: 1,
  totalPrice: 40000,
  currency: "KRW",
  specialRequest: "Please meet us outside.",
} as ApplicationResponse;

describe("ApplicationConfirmation layout", () => {
  it.each([undefined, 0, 5000])(
    "keeps completion links inline for service price %s",
    (referralServicePrice) => {
      renderWithIntl(
        <ApplicationConfirmation
          application={application}
          referralServicePrice={referralServicePrice}
        />,
      );
      const result = screen.getByTestId(
        referralServicePrice === undefined ? "payment-result" : "referral-result",
      );
      expect(screen.queryByTestId("bottom-action-bar")).not.toBeInTheDocument();
      const actions = within(result).getByTestId("confirmation-actions");
      expect(within(actions).getByRole("link", { name: "View My Applications" })).toHaveAttribute(
        "href",
        "/en/applications",
      );
      expect(
        within(actions).getByRole("link", { name: "Explore More Activities" }),
      ).toHaveAttribute("href", "/en/explore");
      expect(actions).toHaveClass("mt-5", "lg:mt-6");
      expect(result).toHaveClass("max-md:p-3.5", "md:p-10");
      expect(within(result).getByRole("heading", { level: 1 })).toHaveClass(
        "max-md:text-base",
        "md:text-3xl",
      );
      expect(screen.getByText("Oct 9, 2026, 8:00 AM")).toHaveClass("max-md:whitespace-nowrap");
      expect(screen.getByText("1 participant")).toHaveClass("max-md:whitespace-nowrap");
      expect(screen.getByText(application.specialRequest!)).toBeInTheDocument();
    },
  );
});
