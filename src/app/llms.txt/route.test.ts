import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { getPublicActivities, PublicActivityError } from "@/lib/server/public-activities";
import type { TouristActivitySummary } from "@/types/activity";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/public-activities", async (original) => ({
  ...(await original<typeof import("@/lib/server/public-activities")>()),
  getPublicActivities: vi.fn(),
}));
beforeEach(() => {
  vi.mocked(getPublicActivities).mockReset();
});

describe("llms.txt", () => {
  it("defines HanBuddy from this site and lists public experiences and the Meetup group", async () => {
    vi.mocked(getPublicActivities).mockResolvedValue([
      {
        activityId: 2,
        title: "⚾ Open-Air KBO Baseball Night",
        meetingPointName: "Jamsil Baseball Stadium",
        totalDurationMinutes: 240,
      } as TouristActivitySummary,
    ]);

    const response = await GET();
    const body = await response.text();

    expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=3600");
    expect(body).toMatch(/^# HanBuddy\n\n> HanBuddy is a platform that connects/);
    expect(body).toContain(
      "- [⚾ Open-Air KBO Baseball Night](https://hanbuddy.kr/en/activities/2): Jamsil Baseball Stadium, 4 hours",
    );
    expect(body).toContain("https://www.meetup.com/discover-korea-with-local-buddies/");
  });

  it("still serves the guide without the experiences section when activities are unavailable", async () => {
    vi.mocked(getPublicActivities).mockRejectedValue(new PublicActivityError("unavailable"));

    const response = await GET();
    const body = await response.text();

    // 복구된 뒤 활동이 빠진 안내문이 캐시에 남지 않게 한다.
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toContain("## Main pages");
    expect(body).not.toContain("## Experiences");
  });
});
