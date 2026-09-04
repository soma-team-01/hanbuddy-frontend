import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBackend, putBackend } from "@/lib/auth/backend";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import type { BuddyResubmission, BuddyResubmissionRequest } from "@/lib/auth/types";
import { GET, PUT } from "./route";

vi.mock("@/lib/auth/backend", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/backend")>();
  return { ...actual, getBackend: vi.fn(), putBackend: vi.fn() };
});

const mockedGetBackend = vi.mocked(getBackend);
const mockedPutBackend = vi.mocked(putBackend);

const application: BuddyResubmission = {
  userId: 7,
  email: "buddy@example.com",
  name: "Google Name",
  displayName: "Old Buddy",
  profileImageKey: "profiles/2026/09/03/123e4567-e89b-12d3-a456-426614174000.webp",
  profileImageUrl: "https://cdn.test/profiles/old.webp",
  nationalityCode: "KR",
  birthDate: "1995-02-03",
  contactMethod: "LINE",
  contactCountryCode: "",
  contactIdentifier: "old-buddy",
  accountStatus: "REJECTED",
  reviewedAt: "2026-09-03T12:00:00+09:00",
  rejectionReason: "프로필 정보를 보완해 주세요.",
};

const updateRequest: BuddyResubmissionRequest = {
  displayName: "Updated Buddy",
  profileImageKey: "profiles/2026/09/04/123e4567-e89b-12d3-a456-426614174001.webp",
  nationalityCode: "KR",
  birthDate: "1995-02-03",
  contactMethod: "LINE",
  contactCountryCode: "",
  contactIdentifier: "updated-buddy",
};

function request(method: "GET" | "PUT", body?: unknown, withToken = true) {
  return new NextRequest("http://localhost/api/auth/buddy/resubmission", {
    method,
    headers: {
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
      ...(withToken ? { cookie: `${AUTH_COOKIES.resubmissionToken}=resubmit-token` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("/api/auth/buddy/resubmission", () => {
  beforeEach(() => {
    mockedGetBackend.mockReset();
    mockedPutBackend.mockReset();
  });

  it("forwards GET with the dedicated resubmission token", async () => {
    mockedGetBackend.mockResolvedValue({
      status: 200,
      setCookies: [],
      payload: { isSuccess: true, code: "200", message: "OK", result: application },
    });

    const response = await GET(request("GET"));

    expect(response.status).toBe(200);
    expect(mockedGetBackend).toHaveBeenCalledWith("/auth/buddy/resubmission", {
      bearerToken: "resubmit-token",
    });
  });

  it("forwards a valid PUT and clears the resubmission state on success", async () => {
    mockedPutBackend.mockResolvedValue({
      status: 200,
      setCookies: [],
      payload: {
        isSuccess: true,
        code: "200",
        message: "OK",
        result: { ...application, accountStatus: "PENDING_APPROVAL", rejectionReason: null },
      },
    });

    const response = await PUT(request("PUT", updateRequest));
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(mockedPutBackend).toHaveBeenCalledWith("/auth/buddy/resubmission", updateRequest, {
      bearerToken: "resubmit-token",
    });
    expect(setCookie).toContain(`${AUTH_COOKIES.resubmissionToken}=;`);
    expect(setCookie).toContain(`${AUTH_COOKIES.statusReason}=;`);
  });

  it.each([undefined, null, [], { ...updateRequest, displayName: " Buddy " }])(
    "rejects an invalid PUT body before calling the backend",
    async (body) => {
      const invalidRequest =
        body === undefined
          ? new NextRequest("http://localhost/api/auth/buddy/resubmission", {
              method: "PUT",
              headers: { cookie: `${AUTH_COOKIES.resubmissionToken}=resubmit-token` },
              body: "not-json",
            })
          : request("PUT", body);

      const response = await PUT(invalidRequest);

      expect(response.status).toBe(400);
      expect(mockedPutBackend).not.toHaveBeenCalled();
    },
  );

  it("returns 401 without a resubmission token", async () => {
    const response = await GET(request("GET", undefined, false));

    expect(response.status).toBe(401);
    expect(mockedGetBackend).not.toHaveBeenCalled();
  });

  it("clears an expired resubmission token", async () => {
    mockedGetBackend.mockResolvedValue({
      status: 401,
      setCookies: [],
      payload: {
        isSuccess: false,
        code: "TOKEN401_EXPIRED",
        message: "expired",
      },
    });

    const response = await GET(request("GET"));

    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie") ?? "").toContain(
      `${AUTH_COOKIES.resubmissionToken}=;`,
    );
  });
});
