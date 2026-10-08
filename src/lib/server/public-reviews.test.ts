import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBackend } from "@/lib/auth/backend";
import { getPublicActivityReviewSummary } from "./public-reviews";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/backend", () => ({ getBackend: vi.fn() }));

const page = { averageRating: 4.8, totalCount: 4, reviews: [], page: 0, size: 3, hasNext: true };

beforeEach(() => {
  vi.mocked(getBackend).mockReset();
});

describe("getPublicActivityReviewSummary", () => {
  it("reads the same latest-three preview the browser requests, in the page language", async () => {
    vi.mocked(getBackend).mockResolvedValue({
      status: 200,
      payload: { isSuccess: true, result: page },
    } as never);

    await expect(getPublicActivityReviewSummary("6", "ja")).resolves.toEqual(page);
    expect(getBackend).toHaveBeenCalledWith("/activities/6/reviews?page=0&size=3&language=JA", {
      redirect: "error",
    });
  });

  it.each([
    ["an error status", { status: 503, payload: { isSuccess: false } }],
    ["an unexpected body", { status: 200, payload: { isSuccess: true, result: { reviews: "x" } } }],
  ])("returns nothing on %s so the browser fetches it again", async (_, response) => {
    vi.mocked(getBackend).mockResolvedValue(response as never);
    await expect(getPublicActivityReviewSummary("7", "en")).resolves.toBeUndefined();
  });

  it("returns nothing when the backend cannot be reached", async () => {
    vi.mocked(getBackend).mockImplementation(async () => {
      throw new Error("ECONNREFUSED");
    });
    await expect(getPublicActivityReviewSummary("8", "en")).resolves.toBeUndefined();
  });
});
