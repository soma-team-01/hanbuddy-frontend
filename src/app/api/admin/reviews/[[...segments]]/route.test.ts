import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBackend, postBackend, patchBackend } from "@/lib/auth/backend";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import { GET, POST, PATCH } from "./route";
import { POST as IMPORT } from "../../activities/[activityId]/imported-reviews/route";

vi.mock("@/lib/auth/backend", async (original) => ({
  ...(await original<typeof import("@/lib/auth/backend")>()),
  getBackend: vi.fn(),
  postBackend: vi.fn(),
  patchBackend: vi.fn(),
}));
const success = (result: unknown) => ({
  status: 200,
  payload: { isSuccess: true as const, code: "200", message: "ok", result },
  setCookies: [],
});
const context = (...segments: string[]) => ({ params: Promise.resolve({ segments }) });
function request(method = "GET", body?: unknown, query = "") {
  return new NextRequest(`http://localhost/api/admin/reviews${query}`, {
    method,
    headers: { cookie: `${AUTH_COOKIES.accessToken}=admin-token` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
const body = {
  reviewerName: null,
  rating: 5,
  content: "실제 원본",
  originalReviewedAt: null,
  reason: "원본 확인",
  sourceReference: "file:42",
};

describe("admin reviews BFF contract", () => {
  beforeEach(() => {
    vi.mocked(getBackend)
      .mockReset()
      .mockResolvedValue(success({ userType: "ADMIN" }));
    vi.mocked(postBackend)
      .mockReset()
      .mockResolvedValue(success({ reviewId: 42 }));
    vi.mocked(patchBackend)
      .mockReset()
      .mockResolvedValue(success({ reviewId: 42 }));
  });
  it("requires authentication before looking up any reviews", async () => {
    expect(
      (await GET(new NextRequest("http://localhost/api/admin/reviews"), context())).status,
    ).toBe(401);
    expect(getBackend).not.toHaveBeenCalled();
  });
  it("does not trust the admin cookie for authorization", async () => {
    vi.mocked(getBackend).mockResolvedValue(success({ userType: "TOURIST" }));
    expect((await POST(request("POST", { reason: "test" }), context("1", "hide"))).status).toBe(
      403,
    );
    expect(postBackend).not.toHaveBeenCalled();
  });
  it("allows supported filters, excluding content and unknown query parameters", async () => {
    await GET(
      request("GET", undefined, "?reviewerName=Mina&content=no&unknown=no&source=LEGACY_IMPORT"),
      context(),
    );
    expect(getBackend).toHaveBeenLastCalledWith(
      "/admin/reviews?page=0&size=20&reviewerName=Mina&source=LEGACY_IMPORT",
      { bearerToken: "admin-token" },
    );
  });
  it.each([["42"], ["42", "translations"]])("forwards read route %j", async (...segments) => {
    await GET(request(), context(...segments));
    expect(getBackend).toHaveBeenLastCalledWith(`/admin/reviews/${segments.join("/")}`, {
      bearerToken: "admin-token",
    });
  });
  it.each(["hide", "restore"])("forwards %s with only trimmed audit reason", async (action) => {
    await POST(request("POST", { reason: "  원본 확인  ", adminId: 99 }), context("42", action));
    expect(postBackend).toHaveBeenCalledWith(
      `/admin/reviews/42/${action}`,
      { reason: "원본 확인" },
      { bearerToken: "admin-token" },
    );
  });
  it("forwards complete imported edits without immutable reference", async () => {
    await PATCH(request("PATCH", body), context("42", "imported-content"));
    const edit = {
      reviewerName: null,
      rating: 5,
      content: "실제 원본",
      originalReviewedAt: null,
      reason: "원본 확인",
    };
    expect(patchBackend).toHaveBeenCalledWith("/admin/reviews/42/imported-content", edit, {
      bearerToken: "admin-token",
    });
  });
  it("imports via the activity route with nullable historical fields", async () => {
    expect(
      (await IMPORT(request("POST", body), { params: Promise.resolve({ activityId: "7" }) }))
        .status,
    ).toBe(200);
    expect(postBackend).toHaveBeenCalledWith("/admin/activities/7/imported-reviews", body, {
      bearerToken: "admin-token",
    });
  });
  it.each([null, { reason: " " }, { reason: "a".repeat(501) }])(
    "rejects malformed moderation body %j",
    async (invalid) => {
      expect((await POST(request("POST", invalid), context("42", "hide"))).status).toBe(400);
      expect(postBackend).not.toHaveBeenCalled();
    },
  );
  it.each([["0"], ["-1"], ["1", "unknown"], ["1", "translations", "extra"]])(
    "rejects unsupported read path %j",
    async (...segments) => {
      expect((await GET(request(), context(...segments))).status).toBe(400);
      expect(getBackend).toHaveBeenCalledTimes(1);
    },
  );
  it("preserves duplicate-import status and backend error code", async () => {
    vi.mocked(postBackend).mockResolvedValue({
      status: 409,
      payload: { isSuccess: false, code: "REVIEW409_IMPORT", message: "duplicate", result: null },
      setCookies: [],
    });
    const result = await IMPORT(request("POST", body), {
      params: Promise.resolve({ activityId: "7" }),
    });
    expect(result.status).toBe(409);
    expect(await result.json()).toMatchObject({ code: "REVIEW409_IMPORT" });
  });
});
