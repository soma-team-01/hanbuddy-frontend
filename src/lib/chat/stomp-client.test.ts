import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatStreamHandlers } from "./stomp-client";

interface MockStompConfig {
  onConnect: () => void;
  onWebSocketClose: () => void;
  onStompError: () => void;
}

interface MockStompClient {
  config: MockStompConfig;
  deactivate: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
}

const mocks = vi.hoisted(() => ({
  clients: [] as MockStompClient[],
  createChatWsTicket: vi.fn(),
}));

vi.mock("@/lib/api/chat", () => ({ createChatWsTicket: mocks.createChatWsTicket }));
vi.mock("sockjs-client", () => ({ default: vi.fn() }));
vi.mock("@stomp/stompjs", () => ({
  Client: class {
    deactivate = vi.fn();
    subscribe = vi.fn();

    constructor(public config: MockStompConfig) {
      mocks.clients.push(this);
    }

    activate() {}
  },
}));

import { openChatRoomStream } from "./stomp-client";

function handlers(): ChatStreamHandlers {
  return {
    onMessage: vi.fn(),
    onTranslation: vi.fn(),
    onRead: vi.fn(),
    onStatusChange: vi.fn(),
  };
}

async function flushTicketRequest() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("openChatRoomStream", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.clients.length = 0;
    mocks.createChatWsTicket.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stops after the configured reconnect attempts and reports failure", async () => {
    mocks.createChatWsTicket.mockResolvedValue({ status: "unauthenticated" });
    const streamHandlers = handlers();
    const close = openChatRoomStream("1", streamHandlers, { maxAttempts: 2 });

    await flushTicketRequest();
    expect(streamHandlers.onStatusChange).toHaveBeenLastCalledWith("reconnecting");

    await vi.advanceTimersByTimeAsync(1_000);
    expect(streamHandlers.onStatusChange).toHaveBeenLastCalledWith("reconnecting");

    await vi.advanceTimersByTimeAsync(2_000);
    expect(streamHandlers.onStatusChange).toHaveBeenLastCalledWith("failed");
    expect(mocks.createChatWsTicket).toHaveBeenCalledTimes(3);

    close();
  });

  it("reports a dropped connection as reconnecting instead of polling", async () => {
    mocks.createChatWsTicket.mockResolvedValue({
      status: "success",
      ticket: { socketUrl: "https://chat.test/ws", ticket: "ticket" },
    });
    const streamHandlers = handlers();
    const close = openChatRoomStream("1", streamHandlers);

    await flushTicketRequest();
    const client = mocks.clients[0];
    client.config.onConnect();
    expect(streamHandlers.onStatusChange).toHaveBeenLastCalledWith("connected");

    client.config.onWebSocketClose();
    expect(streamHandlers.onStatusChange).toHaveBeenLastCalledWith("reconnecting");

    close();
  });

  it("subscribes to delayed translation events for the open room", async () => {
    mocks.createChatWsTicket.mockResolvedValue({
      status: "success",
      ticket: { socketUrl: "https://chat.test/ws", ticket: "ticket" },
    });
    const streamHandlers = handlers();
    const close = openChatRoomStream("7", streamHandlers);

    await flushTicketRequest();
    const client = mocks.clients[0];
    client.config.onConnect();

    const translationSubscription = client.subscribe.mock.calls.find(
      ([destination]) => destination === "/topic/chat/rooms/7/translations",
    );
    expect(translationSubscription).toBeDefined();

    translationSubscription?.[1]({
      body: JSON.stringify({
        chatRoomId: 7,
        messageId: 21,
        sourceLanguage: "KO",
        contentLanguage: "EN",
        content: "See you tomorrow",
      }),
    });
    expect(streamHandlers.onTranslation).toHaveBeenCalledWith({
      chatRoomId: 7,
      messageId: 21,
      sourceLanguage: "KO",
      contentLanguage: "EN",
      content: "See you tomorrow",
    });

    close();
  });
});
