import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockProfile } from "@/test/factories";
import { getMyProfile, updateMyProfile } from "./users";

const profile = createMockProfile({ profileImageKey: null });

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

describe("updateMyProfile", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  const updateRequest = {
    name: "Sarah J.",
    profileImageKey: null,
    nationalityCode: "US",
    age: 29,
    contactMethod: "WHATSAPP",
    contactCountryCode: "+1",
    contactIdentifier: "555-0199",
  } as const;

  it("sends a PATCH request and returns the updated profile", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          isSuccess: true,
          code: "200",
          message: "ok",
          result: { ...profile, name: "Sarah J." },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetch);

    await expect(updateMyProfile(updateRequest)).resolves.toEqual({
      status: "success",
      profile: { ...profile, name: "Sarah J." },
    });

    const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/users/me");
    expect(init.method).toBe("PATCH");
    expect(init.body).toBe(JSON.stringify(updateRequest));
    expect(new Headers(init.headers).get("content-type")).toBe("application/json");
  });

  it("returns unauthenticated when the update keeps failing with 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ isSuccess: false }), { status: 401 })),
    );

    await expect(updateMyProfile(updateRequest)).resolves.toEqual({ status: "unauthenticated" });
  });

  it("returns the backend message when validation fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            isSuccess: false,
            code: "VALIDATION",
            message: "국적 코드는 영문 대문자 2자리여야 합니다",
          }),
          { status: 400 },
        ),
      ),
    );

    await expect(updateMyProfile(updateRequest)).resolves.toEqual({
      status: "error",
      message: "국적 코드는 영문 대문자 2자리여야 합니다",
    });
  });

  it("returns a save-specific error when the update request throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await expect(updateMyProfile(updateRequest)).resolves.toEqual({
      status: "error",
      message: "프로필을 저장하지 못했습니다.",
    });
  });
});
