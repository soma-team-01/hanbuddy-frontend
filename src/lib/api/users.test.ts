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

  it("returns a structured error for backend failures", async () => {
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
      error: expect.objectContaining({
        code: "SERVER_ERROR",
        status: 500,
        backendMessage: "서버 오류입니다.",
      }),
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
    displayName: "Sarah J.",
    profileImageKey: null,
    nationalityCode: "US",
    birthDate: "1997-04-12",
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
          result: { ...profile, displayName: "Sarah J." },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetch);

    await expect(updateMyProfile(updateRequest)).resolves.toEqual({
      status: "success",
      profile: { ...profile, displayName: "Sarah J." },
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

  it("returns the validation code and backend metadata", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            isSuccess: false,
            code: "VALIDATION400_FORMAT",
            message: "국적 코드는 영문 대문자 2자리여야 합니다",
          }),
          { status: 400 },
        ),
      ),
    );

    await expect(updateMyProfile(updateRequest)).resolves.toEqual({
      status: "error",
      error: expect.objectContaining({
        code: "VALIDATION400_FORMAT",
        status: 400,
        backendMessage: "국적 코드는 영문 대문자 2자리여야 합니다",
      }),
    });
  });

  it("returns a save-specific error when the update request throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await expect(updateMyProfile(updateRequest)).resolves.toEqual({
      status: "error",
      error: expect.objectContaining({
        code: null,
        status: null,
        backendMessage: null,
        message: "프로필을 저장하지 못했습니다.",
      }),
    });
  });
});
