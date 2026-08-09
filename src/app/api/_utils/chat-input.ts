export const CHAT_MESSAGE_MAX_LENGTH = 2000;
export const CHAT_MESSAGE_PAGE_MAX_SIZE = 100;
const CHAT_MESSAGE_PAGE_DEFAULT_SIZE = 30;

export function isPositiveId(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

export function isValidChatMessageContent(content: unknown): content is string {
  return (
    typeof content === "string" &&
    content.trim().length > 0 &&
    content.length <= CHAT_MESSAGE_MAX_LENGTH
  );
}

/** 메시지 조회는 ID 커서 기반이라 size와 beforeMessageId만 정규화해 넘긴다 */
export function buildChatMessageQuery(searchParams: URLSearchParams): string {
  const size = Number(searchParams.get("size"));
  const safeSize =
    Number.isInteger(size) && size > 0
      ? Math.min(size, CHAT_MESSAGE_PAGE_MAX_SIZE)
      : CHAT_MESSAGE_PAGE_DEFAULT_SIZE;

  const rawCursor = searchParams.get("beforeMessageId");
  const cursor = rawCursor === null ? null : Number(rawCursor);
  const cursorQuery = cursor !== null && isPositiveId(cursor) ? `&beforeMessageId=${cursor}` : "";

  return `?size=${safeSize}${cursorQuery}`;
}

/** 경로 파라미터로 들어온 채팅방 ID가 양의 정수인지 확인한다 */
export function isValidChatRoomId(chatRoomId: string): boolean {
  return /^\d+$/.test(chatRoomId) && Number(chatRoomId) > 0;
}
