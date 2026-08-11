import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const originalApiBaseUrl = process.env.HANBUDDY_API_BASE_URL;

const backendSuccessBody = {
  isSuccess: true,
  code: "200",
  message: "요청이 성공했습니다.",
  result: {
    images: [
      {
        uploadUrl: "https://bucket.s3.amazonaws.com/profiles/2026/07/07/uuid.webp?signed",
        imageKey: "profiles/2026/07/07/uuid.webp",
        imageUrl: "https://static.hanbuddy.com/profiles/2026/07/07/uuid.webp",
        expiresInSeconds: 300,
      },
    ],
  },
};

function createRequest({ cookie, body }: { cookie?: string; body?: unknown } = {}) {
  return new NextRequest("http://localhost:3000/api/images/presigned-urls", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: body === undefined ? "not-json" : JSON.stringify(body),
  });
}

const presignedRequestBody = {
  purpose: "PROFILE",
  contentType: "image/webp",
  imageCount: 1,
};

describe("POST /api/images/presigned-urls", () => {
  beforeEach(() => {
    process.env.HANBUDDY_API_BASE_URL = "https://backend.test/api/v1";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalApiBaseUrl === undefined) {
      delete process.env.HANBUDDY_API_BASE_URL;
    } else {
      process.env.HANBUDDY_API_BASE_URL = originalApiBaseUrl;
    }
  });

  it("returns 401 without calling the backend when no auth cookie exists", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(createRequest({ body: presignedRequestBody }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      isSuccess: false,
      code: "AUTH_PROXY_ERROR",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards the request to the backend with the signup token as bearer", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(backendSuccessBody), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      createRequest({
        cookie: "hanbuddy_signup_token=signup-token",
        body: presignedRequestBody,
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(backendSuccessBody);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [backendUrl, backendInit] = fetchMock.mock.calls[0];
    expect(backendUrl).toBe("https://backend.test/api/v1/images/presigned-urls");
    expect(new Headers(backendInit.headers).get("authorization")).toBe("Bearer signup-token");
    expect(JSON.parse(backendInit.body)).toEqual(presignedRequestBody);
  });

  it("falls back to the access token when no signup token exists", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(backendSuccessBody), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      createRequest({
        cookie: "hanbuddy_access_token=access-token",
        body: presignedRequestBody,
      }),
    );

    expect(response.status).toBe(200);
    const [, backendInit] = fetchMock.mock.calls[0];
    expect(new Headers(backendInit.headers).get("authorization")).toBe("Bearer access-token");
  });

  it("forwards activity image requests with the access token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(backendSuccessBody), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const body = { purpose: "ACTIVITY", contentType: "image/webp", imageCount: 3 };
    const response = await POST(
      createRequest({
        cookie: "hanbuddy_access_token=access-token",
        body,
      }),
    );

    expect(response.status).toBe(200);
    const [, backendInit] = fetchMock.mock.calls[0];
    expect(new Headers(backendInit.headers).get("authorization")).toBe("Bearer access-token");
    expect(JSON.parse(backendInit.body)).toEqual(body);
  });

  it("passes backend error responses through as-is", async () => {
    const backendErrorBody = {
      isSuccess: false,
      code: "IMAGE400",
      message: "지원하지 않는 이미지 형식입니다.",
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(backendErrorBody), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      createRequest({
        cookie: "hanbuddy_signup_token=signup-token",
        body: presignedRequestBody,
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual(backendErrorBody);
  });

  it.each([
    ["unsupported contentType", { purpose: "PROFILE", contentType: "image/gif", imageCount: 1 }],
    ["imageCount other than 1", { purpose: "PROFILE", contentType: "image/webp", imageCount: 2 }],
    [
      "activity imageCount over 8",
      { purpose: "ACTIVITY", contentType: "image/webp", imageCount: 9 },
    ],
    ["unknown purpose", { purpose: "OTHER", contentType: "image/webp", imageCount: 1 }],
  ])("rejects %s with 400 before reaching the backend", async (_label, body) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      createRequest({ cookie: "hanbuddy_signup_token=signup-token", body }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      isSuccess: false,
      message: "잘못된 이미지 업로드 요청입니다.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 502 with an image-upload-specific message when the backend is unreachable", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      createRequest({
        cookie: "hanbuddy_signup_token=signup-token",
        body: presignedRequestBody,
      }),
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      isSuccess: false,
      message: "이미지 업로드 서버에 연결할 수 없습니다.",
    });
  });

  it("returns 400 when the request body is not valid JSON", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(createRequest({ cookie: "hanbuddy_signup_token=signup-token" }));

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 400 when the request body is JSON null", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      createRequest({ cookie: "hanbuddy_signup_token=signup-token", body: null }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      isSuccess: false,
      message: "잘못된 이미지 업로드 요청입니다.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
