import { Client, type IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { createChatWsTicket } from "@/lib/api/chat";
import type { ChatMessageResponse, ChatReadEvent } from "@/types/chat";

/** 재사용된 티켓은 거절되므로, 재연결할 때마다 새로 받는다 */
async function resolveTicket() {
  const result = await createChatWsTicket();
  if (result.status !== "success") throw new Error("채팅 티켓을 받지 못했습니다.");
  if (!result.ticket.socketUrl) throw new Error("채팅 서버 주소를 알 수 없습니다.");

  return result.ticket;
}

export interface ChatStreamHandlers {
  onMessage: (message: ChatMessageResponse) => void;
  onRead: (event: ChatReadEvent) => void;
  onStatusChange: (status: ChatStreamStatus) => void;
}

export type ChatStreamStatus = "connecting" | "connected" | "reconnecting" | "failed";

function parseFrame<T>(frame: IMessage): T | null {
  try {
    return JSON.parse(frame.body) as T;
  } catch {
    return null;
  }
}

/**
 * 한 채팅방의 실시간 구독을 연다. 정리 함수를 호출하면 연결을 닫는다.
 *
 * 티켓은 1회용이라 재연결할 때마다 새로 받아야 하고, 실패가 반복되면 서버 발급 제한에 걸리므로
 * 재시도 간격을 늘려 가며 정해진 횟수까지만 시도하고, 모두 실패하면 오류 상태로 전환한다.
 */
export function openChatRoomStream(
  chatRoomId: string,
  handlers: ChatStreamHandlers,
  { maxAttempts = 4 }: { maxAttempts?: number } = {},
) {
  let disposed = false;
  let client: Client | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let attempt = 0;

  async function connect() {
    if (disposed) return;

    let ticket;
    try {
      ticket = await resolveTicket();
    } catch {
      scheduleRetry();
      return;
    }
    if (disposed) return;

    const socketUrl = ticket.socketUrl as string;
    const stompClient = new Client({
      webSocketFactory: () => new SockJS(socketUrl),
      connectHeaders: { Authorization: `Bearer ${ticket.ticket}` },
      // 같은 티켓으로 다시 붙을 수 없어 stompjs 자체 재연결은 끄고 직접 다시 연다
      reconnectDelay: 0,
      onConnect: () => {
        // 정리됐거나 이미 다음 연결로 교체된 클라이언트의 콜백은 무시한다
        if (disposed || client !== stompClient) {
          void stompClient.deactivate();
          return;
        }
        attempt = 0;
        handlers.onStatusChange("connected");
        stompClient.subscribe(`/topic/chat/rooms/${chatRoomId}`, (frame) => {
          const message = parseFrame<ChatMessageResponse>(frame);
          if (message) handlers.onMessage(message);
        });
        stompClient.subscribe(`/topic/chat/rooms/${chatRoomId}/read`, (frame) => {
          const event = parseFrame<ChatReadEvent>(frame);
          if (event) handlers.onRead(event);
        });
      },
      onWebSocketClose: () => {
        if (disposed || client !== stompClient) return;
        scheduleRetry();
      },
      onStompError: () => {
        if (disposed || client !== stompClient) return;
        scheduleRetry();
      },
    });

    client = stompClient;
    stompClient.activate();
  }

  function scheduleRetry() {
    if (disposed || retryTimer !== null) return;
    attempt += 1;
    if (attempt > maxAttempts) {
      handlers.onStatusChange("failed");
      return;
    }

    // 지수 백오프 — 발급 제한(60초 30회)에 닿지 않도록 간격을 벌린다
    handlers.onStatusChange("reconnecting");
    const delay = Math.min(1_000 * 2 ** (attempt - 1), 30_000);
    retryTimer = setTimeout(() => {
      retryTimer = null;
      void connect();
    }, delay);
  }

  void connect();

  return () => {
    disposed = true;
    if (retryTimer !== null) clearTimeout(retryTimer);
    void client?.deactivate();
    client = null;
  };
}
