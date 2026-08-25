import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { postBackend } from "@/lib/auth/backend";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import { POST } from "./route";

vi.mock("@/lib/auth/backend", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/backend")>();
  return { ...actual, postBackend: vi.fn() };
});

const mockedPostBackend = vi.mocked(postBackend);
const context = { params: Promise.resolve({ chatRoomId: "4" }) };

describe("POST /api/chat/rooms/[chatRoomId]/messages", () => {
  beforeEach(() => {
    mockedPostBackend.mockReset();
    mockedPostBackend.mockResolvedValue({
      status: 200,
      payload: { isSuccess: true, code: "200", message: "ok", result: { messageId: 21 } },
      setCookies: [],
    });
  });

  it("lets the backend detect the source language of a text message", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/chat/rooms/4/messages", {
        method: "POST",
        body: JSON.stringify({ content: "내일 만나요" }),
        headers: { cookie: `${AUTH_COOKIES.accessToken}=access-token` },
      }),
      context,
    );

    expect(mockedPostBackend).toHaveBeenCalledWith(
      "/chat/rooms/4/messages",
      { messageType: "TEXT", content: "내일 만나요" },
      { bearerToken: "access-token" },
    );
    expect(response.status).toBe(200);
  });

  it("forwards an image message without a source language", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/chat/rooms/4/messages", {
        method: "POST",
        body: JSON.stringify({
          messageType: "IMAGE",
          content: "야경 사진",
          imageKey: "chats/2026/08/25/photo.webp",
          imageWidth: 1200,
          imageHeight: 800,
        }),
        headers: { cookie: `${AUTH_COOKIES.accessToken}=access-token` },
      }),
      context,
    );

    expect(mockedPostBackend).toHaveBeenCalledWith(
      "/chat/rooms/4/messages",
      expect.objectContaining({
        messageType: "IMAGE",
        content: "야경 사진",
        imageKey: "chats/2026/08/25/photo.webp",
        imageWidth: 1200,
        imageHeight: 800,
      }),
      { bearerToken: "access-token" },
    );
    expect(mockedPostBackend.mock.calls[0]?.[1]).not.toHaveProperty("sourceLanguage");
    expect(response.status).toBe(200);
  });
});
