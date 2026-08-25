import { afterEach, describe, expect, it, vi } from "vitest";
import { createGroupChatRoom, getChatRoom, getMyChatRooms, updateChatRoomTitle } from "./chat";

function createJsonResponse(result: unknown) {
  return new Response(JSON.stringify({ isSuccess: true, code: "200", message: "ok", result }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("translated chat room API client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("adds the requested language to room list and detail requests", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse([]))
      .mockResolvedValueOnce(createJsonResponse({ chatRoomId: 4 }));
    vi.stubGlobal("fetch", fetchMock);

    await getMyChatRooms("EN");
    await getChatRoom(4, "KO");

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/chat/rooms?language=EN", {
      credentials: "same-origin",
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/chat/rooms/4?language=KO", {
      credentials: "same-origin",
    });
  });

  it("adds the requested language when creating and resetting a group room title", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(createJsonResponse({ chatRoomId: 4, title: "Seoul walk" }));
    vi.stubGlobal("fetch", fetchMock);

    await createGroupChatRoom({ activityScheduleId: 8 }, "EN");
    await updateChatRoomTitle(4, { title: null }, "EN");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/chat/rooms/group?language=EN",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/chat/rooms/4?language=EN",
      expect.objectContaining({ method: "PATCH" }),
    );
  });
});
