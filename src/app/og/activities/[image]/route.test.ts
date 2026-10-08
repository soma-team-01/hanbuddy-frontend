import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getPublicActivity, PublicActivityError } from "@/lib/server/public-activities";
import type { TouristActivityDetail } from "@/types/activity";
import { GET } from "./route";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/public-activities", async (original) => ({
  ...(await original<typeof import("@/lib/server/public-activities")>()),
  getPublicActivity: vi.fn(),
}));

const S3 = "https://hanbuddy-bucket-526958954481-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com";

function request(image: string) {
  return GET(new Request(`https://hanbuddy.kr/og/activities/${image}`), {
    params: Promise.resolve({ image }),
  });
}

function withThumbnail(thumbnailImageUrl: string) {
  vi.mocked(getPublicActivity).mockResolvedValue({
    activityId: 2,
    thumbnailImageUrl,
  } as TouristActivityDetail);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.mocked(getPublicActivity).mockReset();
});

describe("activity share image", () => {
  it("crops the activity thumbnail into a 1200x630 JPEG on the site domain", async () => {
    withThumbnail(`${S3}/activities/2026/09/21/photo.webp`);
    const source = await sharp({
      create: { width: 1600, height: 1200, channels: 3, background: "#d13f32" },
    })
      .webp()
      .toBuffer();
    const fetchMock = vi.fn(async () => new Response(new Uint8Array(source)));
    vi.stubGlobal("fetch", fetchMock);

    const response = await request("2.jpg");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(fetchMock).toHaveBeenCalledWith(
      `${S3}/activities/2026/09/21/photo.webp`,
      expect.anything(),
    );
    const metadata = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
    expect([metadata.format, metadata.width, metadata.height]).toEqual(["jpeg", 1200, 630]);
  });

  it("only fetches thumbnails from the HanBuddy activity bucket", async () => {
    withThumbnail("https://evil.example/activities/photo.jpg");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await request("2.jpg");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://hanbuddy.kr/images/og/hanbuddy-share.jpg",
    );
  });

  it("answers 404 for malformed names and deleted activities", async () => {
    expect((await request("2.png")).status).toBe(404);
    expect((await request("../2.jpg")).status).toBe(404);
    vi.mocked(getPublicActivity).mockRejectedValue(new PublicActivityError("missing"));
    expect((await request("9.jpg")).status).toBe(404);
  });

  it("falls back to the brand image when the API or the image source fails", async () => {
    vi.mocked(getPublicActivity).mockRejectedValue(new PublicActivityError("unavailable"));
    expect((await request("2.jpg")).status).toBe(302);

    withThumbnail(`${S3}/activities/photo.jpg`);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 503 })),
    );
    expect((await request("2.jpg")).status).toBe(302);
  });
});
