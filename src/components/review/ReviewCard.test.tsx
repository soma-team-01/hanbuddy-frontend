import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import type { ReviewResponse } from "@/types/review";
import { ReviewCard } from "./ReviewCard";

const translatedReview = {
  reviewId: 31,
  applicationId: 82,
  activityId: 14,
  activityTitle: "Traditional Tea Experience",
  activityTitleLanguage: "EN",
  reviewerName: "Mina",
  reviewerProfileImageUrl: null,
  rating: 5,
  content: "It was a wonderful experience.",
  contentLanguage: "EN",
  sourceLanguage: "KO",
  originalContent: "정말 좋은 경험이었어요.",
  createdAt: "2026-08-25T18:00:00+09:00",
} satisfies ReviewResponse;

describe("ReviewCard", () => {
  it("shows the requested translation first and lets the reader switch to the original", () => {
    renderWithQueryClient(<ReviewCard review={translatedReview} />);

    expect(screen.getByText("It was a wonderful experience.")).toBeInTheDocument();
    expect(screen.queryByText("정말 좋은 경험이었어요.")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show original" }));

    expect(screen.getByText("정말 좋은 경험이었어요.")).toBeInTheDocument();
    expect(screen.queryByText("It was a wonderful experience.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show translation" })).toBeInTheDocument();
  });

  it("hides the translation toggle while the backend is falling back to the original", () => {
    renderWithQueryClient(
      <ReviewCard
        review={{
          ...translatedReview,
          content: translatedReview.originalContent,
          contentLanguage: "KO",
        }}
      />,
    );

    expect(screen.getByText("정말 좋은 경험이었어요.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show original" })).not.toBeInTheDocument();
  });
});
