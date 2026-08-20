import { afterEach, describe, expect, it, vi } from "vitest";
import {
  extractImageKeyFromUrl,
  uploadActivityImages,
  uploadChatImages,
  uploadProfileImage,
} from "./presigned";

function createJsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function stubChatImageUploads() {
  const issuedCounts = new Map<string, number>();
  const expectedUploadUrls = new Set<string>();
  const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
    if (input !== "/api/images/presigned-urls") {
      if (!expectedUploadUrls.delete(input)) {
        throw new Error(`Unexpected fetch target: ${input}`);
      }
      return new Response(null, { status: 200 });
    }

    const body = JSON.parse(String(init?.body)) as {
      purpose: string;
      contentType: string;
      imageCount: number;
    };
    const issued = issuedCounts.get(body.contentType) ?? 0;
    issuedCounts.set(body.contentType, issued + body.imageCount);

    return createJsonResponse({
      isSuccess: true,
      code: "200",
      message: "요청이 성공했습니다.",
      result: {
        images: Array.from({ length: body.imageCount }, (_, index) => {
          const sequence = issued + index;
          const extension = body.contentType.split("/")[1];
          const uploadUrl = `https://bucket.s3.amazonaws.com/chats/${extension}-${sequence}?signed`;
          expectedUploadUrls.add(uploadUrl);
          return {
            uploadUrl,
            imageKey: `chats/${extension}-${sequence}`,
            imageUrl: `https://static.hanbuddy.com/chats/${extension}-${sequence}`,
            expiresInSeconds: 300,
          };
        }),
      },
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
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
    vi.restoreAllMocks();
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

  it("passes an abort signal to both requests so they cannot hang forever", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse(presignedSuccessBody))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const file = new File([new Uint8Array([1, 2, 3])], "me.png", { type: "image/png" });
    await uploadProfileImage(file);

    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
    expect(fetchMock.mock.calls[1][1].signal).toBeInstanceOf(AbortSignal);
  });

  it("caps the S3 upload timeout at 30 seconds even when the presigned URL lasts longer", async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          ...presignedSuccessBody,
          result: {
            images: [
              {
                ...presignedSuccessBody.result.images[0],
                expiresInSeconds: 3600,
              },
            ],
          },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const file = new File([new Uint8Array([1, 2, 3])], "me.png", { type: "image/png" });
    await uploadProfileImage(file);

    expect(timeoutSpy).toHaveBeenNthCalledWith(1, 10_000);
    expect(timeoutSpy).toHaveBeenNthCalledWith(2, 30_000);
  });

  it("maps request timeouts to a user-friendly error message", async () => {
    const timeoutError = Object.assign(new Error("The operation timed out."), {
      name: "TimeoutError",
    });
    const fetchMock = vi.fn().mockRejectedValueOnce(timeoutError);
    vi.stubGlobal("fetch", fetchMock);

    const file = new File([new Uint8Array([1])], "me.png", { type: "image/png" });

    await expect(uploadProfileImage(file)).rejects.toThrow(
      "프로필 이미지 업로드가 지연되어 중단되었습니다. 잠시 후 다시 시도해 주세요.",
    );
  });

  it("rejects files over the size limit without calling the network", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const oversized = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.png", {
      type: "image/png",
    });

    await expect(uploadProfileImage(oversized)).rejects.toThrow(
      "프로필 이미지는 5MB 이하만 업로드할 수 있습니다.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
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

  it("preserves API error metadata when presigned URL issuance fails", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      createJsonResponse(
        {
          isSuccess: false,
          code: "IMAGE400_CONTENT_TYPE",
          message: "raw backend message",
        },
        400,
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const file = new File([new Uint8Array([1])], "me.webp", { type: "image/webp" });

    await expect(uploadProfileImage(file)).rejects.toMatchObject({
      code: "IMAGE400_CONTENT_TYPE",
      status: 400,
      backendMessage: "raw backend message",
    });
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

describe("uploadActivityImages", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("issues activity presigned URLs and PUTs each file to S3", async () => {
    const activityPresignedBody = {
      isSuccess: true,
      code: "200",
      message: "요청이 성공했습니다.",
      result: {
        images: [
          {
            uploadUrl: "https://bucket.s3.amazonaws.com/activities/1.webp?signed",
            imageKey: "activities/2026/07/07/1.webp",
            imageUrl: "https://static.hanbuddy.com/activities/2026/07/07/1.webp",
            expiresInSeconds: 300,
          },
          {
            uploadUrl: "https://bucket.s3.amazonaws.com/activities/2.webp?signed",
            imageKey: "activities/2026/07/07/2.webp",
            imageUrl: "https://static.hanbuddy.com/activities/2026/07/07/2.webp",
            expiresInSeconds: 300,
          },
        ],
      },
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse(activityPresignedBody))
      .mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const files = [
      new File([new Uint8Array([1])], "one.webp", { type: "image/webp" }),
      new File([new Uint8Array([2])], "two.webp", { type: "image/webp" }),
    ];

    await expect(uploadActivityImages(files)).resolves.toEqual(activityPresignedBody.result.images);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      purpose: "ACTIVITY",
      contentType: "image/webp",
      imageCount: 2,
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe(
      "https://bucket.s3.amazonaws.com/activities/1.webp?signed",
    );
    expect(fetchMock.mock.calls[2][0]).toBe(
      "https://bucket.s3.amazonaws.com/activities/2.webp?signed",
    );
  });

  it("rejects more than 10 activity images without calling the network", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const files = Array.from(
      { length: 11 },
      (_, index) => new File([new Uint8Array([index])], `${index}.webp`, { type: "image/webp" }),
    );

    await expect(uploadActivityImages(files)).rejects.toThrow(
      "활동 이미지는 최대 10장까지 업로드할 수 있습니다.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps activity request timeouts to an activity-specific error message", async () => {
    const timeoutError = Object.assign(new Error("The operation timed out."), {
      name: "TimeoutError",
    });
    const fetchMock = vi.fn().mockRejectedValueOnce(timeoutError);
    vi.stubGlobal("fetch", fetchMock);

    const files = [new File([new Uint8Array([1])], "one.webp", { type: "image/webp" })];

    await expect(uploadActivityImages(files)).rejects.toThrow(
      "활동 이미지 업로드가 지연되어 중단되었습니다. 잠시 후 다시 시도해 주세요.",
    );
  });

  it("restores the S3 key from a served image URL", () => {
    expect(
      extractImageKeyFromUrl("https://static.hanbuddy.com/activities/2026/07/07/uuid.webp"),
    ).toBe("activities/2026/07/07/uuid.webp");
    expect(extractImageKeyFromUrl("https://cdn.example.test/profiles/photo%20one.png")).toBe(
      "profiles/photo one.png",
    );
    expect(extractImageKeyFromUrl("/activities/relative.webp")).toBe("activities/relative.webp");
    expect(extractImageKeyFromUrl("/profiles/photo%20one.png")).toBe("profiles/photo one.png");
    expect(extractImageKeyFromUrl("/activities/broken%2.webp")).toBe("activities/broken%2.webp");
  });
});

describe("uploadChatImages", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("uploads mixed supported formats in separate batches and preserves selection order", async () => {
    const fetchMock = stubChatImageUploads();

    const files = [
      new File([new Uint8Array([1])], "first.png", { type: "image/png" }),
      new File([new Uint8Array([2])], "second.jpg", { type: "image/jpeg" }),
      new File([new Uint8Array([3])], "third.png", { type: "image/png" }),
      new File([new Uint8Array([4])], "fourth.webp", { type: "image/webp" }),
    ];

    const uploaded = await uploadChatImages(files);

    const presignedBodies = fetchMock.mock.calls
      .filter(([input]) => input === "/api/images/presigned-urls")
      .map(([, init]) => JSON.parse(String(init?.body)));
    expect(presignedBodies).toEqual([
      { purpose: "CHAT", contentType: "image/png", imageCount: 2 },
      { purpose: "CHAT", contentType: "image/jpeg", imageCount: 1 },
      { purpose: "CHAT", contentType: "image/webp", imageCount: 1 },
    ]);
    expect(uploaded.map((item) => item.imageKey)).toEqual([
      "chats/png-0",
      "chats/jpeg-0",
      "chats/png-1",
      "chats/webp-0",
    ]);

    for (const [index, file] of files.entries()) {
      const uploadCall = fetchMock.mock.calls.find(([, init]) => init?.body === file);
      expect(uploadCall?.[1]?.headers).toMatchObject({ "Content-Type": file.type });
      expect(uploaded[index]).toBeDefined();
    }
  });

  it("issues batches only for the supported formats that were selected", async () => {
    const fetchMock = stubChatImageUploads();
    const files = [
      new File([new Uint8Array([1])], "first.jpg", { type: "image/jpeg" }),
      new File([new Uint8Array([2])], "second.webp", { type: "image/webp" }),
      new File([new Uint8Array([3])], "third.jpg", { type: "image/jpeg" }),
    ];

    const uploaded = await uploadChatImages(files);

    const presignedBodies = fetchMock.mock.calls
      .filter(([input]) => input === "/api/images/presigned-urls")
      .map(([, init]) => JSON.parse(String(init?.body)));
    expect(presignedBodies).toEqual([
      { purpose: "CHAT", contentType: "image/jpeg", imageCount: 2 },
      { purpose: "CHAT", contentType: "image/webp", imageCount: 1 },
    ]);
    expect(uploaded.map((item) => item.imageKey)).toEqual([
      "chats/jpeg-0",
      "chats/webp-0",
      "chats/jpeg-1",
    ]);
  });
});
