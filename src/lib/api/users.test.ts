import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MyProfile } from "@/types/user";
import { getMyProfile } from "./users";

const profile: MyProfile = {
  userId: 1,
  email: "user@example.com",
  name: "Sarah Jenkins",
  userType: "TOURIST",
  profileImageKey: null,
  profileImageUrl: "https://cdn.hanbuddy.test/profile.webp",
  nationalityCode: "US",
  age: 28,
  contactMethod: "LINE",
  contactCountryCode: "+1",
  contactIdentifier: "555-0198",
};

describe("getMyProfile", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the profile when the request succeeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ isSuccess: true, code: "200", message: "ok", result: profile }),
            { status: 200 },
          ),
        ),
    );

    await expect(getMyProfile()).resolves.toEqual({ status: "success", profile });
  });

  it("returns unauthenticated when the request keeps failing with 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ isSuccess: false }), { status: 401 })),
    );

    await expect(getMyProfile()).resolves.toEqual({ status: "unauthenticated" });
  });

  it("returns an error with the backend message for other failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ isSuccess: false, code: "SERVER_ERROR", message: "서버 오류입니다." }),
            { status: 500 },
          ),
        ),
    );

    await expect(getMyProfile()).resolves.toEqual({
      status: "error",
      message: "서버 오류입니다.",
    });
  });

  it("returns an error when the network request throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const result = await getMyProfile();

    expect(result.status).toBe("error");
  });
});
