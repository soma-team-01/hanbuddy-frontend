import { describe, expect, it, vi } from "vitest";
import { getPublicActivity, PublicActivityError } from "@/lib/server/public-activities";
import Page, { generateMetadata } from "./page";
import type { TouristActivityDetail } from "@/types/activity";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/public-activities", async (original) => ({
  ...(await original<typeof import("@/lib/server/public-activities")>()),
  getPublicActivity: vi.fn(),
}));
const params = Promise.resolve({ id: "42", locale: "en" as const });
const activity = {
  activityId: 42,
  title: "Public walk",
  description: "A real public description.",
  thumbnailImageUrl: "/images/activities/hanok-hero.jpg",
} as TouristActivityDetail;
describe("public detail document", () => {
  it("uses API data for metadata and passes the same content to the interactive view", async () => {
    vi.mocked(getPublicActivity).mockResolvedValue(activity);
    const metadata = await generateMetadata({ params });
    expect(metadata.title).toBe("Public walk | HanBuddy");
    expect(metadata.description).toBe("A real public description.");
    expect(metadata.alternates?.canonical).toBe("https://hanbuddy.kr/en/activities/42");
    expect(metadata.openGraph).toMatchObject({
      title: metadata.title,
      images: ["https://hanbuddy.kr/images/activities/hanok-hero.jpg"],
    });
    expect(metadata.twitter).toMatchObject({
      title: metadata.title,
      description: metadata.description,
    });
    expect((await Page({ params })).props.initialActivity).toBe(activity);
  });
  it("raises Next notFound for a confirmed missing activity in metadata and body", async () => {
    vi.mocked(getPublicActivity).mockRejectedValue(new PublicActivityError("missing"));
    await expect(Page({ params })).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
    await expect(generateMetadata({ params })).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
  });
  it("keeps transient failure distinct from a missing resource", async () => {
    vi.mocked(getPublicActivity).mockRejectedValue(new PublicActivityError("unavailable"));
    await expect(Page({ params })).rejects.toMatchObject({ kind: "unavailable" });
    const metadata = await generateMetadata({ params });
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.alternates).toBeUndefined();
  });
});
