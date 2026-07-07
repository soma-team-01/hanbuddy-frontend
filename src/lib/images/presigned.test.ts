import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadProfileImage } from "./presigned";

function createJsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const presignedSuccessBody = {
  isSuccess: true,
  code: "200",
  message: "요청이 성공했습니다.",
  result: {
    images: [
      {
        uploadUrl: "https://bucket.s3.amazonaws.com/profiles/2026/07/07/uuid.png?signed",
        imageKey: "profiles/2026/07/07/uuid.png",
        imageUrl: "https://static.hanbuddy.com/profiles/2026/07/07/uuid.png",
        expiresInSeconds: 300,
      },
    ],
  },
};

describe("uploadProfileImage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("issues a presigned URL and PUTs the file to S3 with the matching content type", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse(presignedSuccessBody))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const file = new File([new Uint8Array([1, 2, 3])], "me.png", { type: "image/png" });
    const uploaded = await uploadProfileImage(file);

    expect(uploaded.imageKey).toBe("profiles/2026/07/07/uuid.png");
    expect(uploaded.imageUrl).toBe("https://static.hanbuddy.com/profiles/2026/07/07/uuid.png");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [presignedUrl, presignedInit] = fetchMock.mock.calls[0];
    expect(presignedUrl).toBe("/api/images/presigned-urls");
    expect(presignedInit.method).toBe("POST");
    expect(JSON.parse(presignedInit.body)).toEqual({
      purpose: "PROFILE",
      contentType: "image/png",
      imageCount: 1,
    });

    const [s3Url, s3Init] = fetchMock.mock.calls[1];
    expect(s3Url).toBe("https://bucket.s3.amazonaws.com/profiles/2026/07/07/uuid.png?signed");
    expect(s3Init.method).toBe("PUT");
    expect(s3Init.headers).toMatchObject({ "Content-Type": "image/png" });
    expect(s3Init.body).toBe(file);
  });

  it("rejects unsupported file types without calling the network", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const file = new File([new Uint8Array([1])], "me.gif", { type: "image/gif" });

    await expect(uploadProfileImage(file)).rejects.toThrow(
      "JPEG, PNG, WebP 형식의 이미지만 업로드할 수 있습니다.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws the API error message when presigned URL issuance fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse(
          { isSuccess: false, code: "AUTH401", message: "토큰이 유효하지 않습니다." },
          401,
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const file = new File([new Uint8Array([1])], "me.webp", { type: "image/webp" });

    await expect(uploadProfileImage(file)).rejects.toThrow("토큰이 유효하지 않습니다.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws when the S3 upload responds with a non-200 status", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse(presignedSuccessBody))
      .mockResolvedValueOnce(new Response(null, { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);

    const file = new File([new Uint8Array([1])], "me.jpg", { type: "image/jpeg" });

    await expect(uploadProfileImage(file)).rejects.toThrow("프로필 이미지 업로드에 실패했습니다.");
  });

  it("throws when the presigned response contains no upload target", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      createJsonResponse({
        isSuccess: true,
        code: "200",
        message: "요청이 성공했습니다.",
        result: { images: [] },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const file = new File([new Uint8Array([1])], "me.png", { type: "image/png" });

    await expect(uploadProfileImage(file)).rejects.toThrow(
      "프로필 이미지 업로드 URL을 발급받지 못했습니다.",
    );
  });
});
