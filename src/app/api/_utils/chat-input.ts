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

const CHAT_IMAGE_PAGE_MAX_SIZE = 100;
const CHAT_IMAGE_PAGE_DEFAULT_SIZE = 30;

/** 사진함은 page·size만 정규화해 넘긴다 */
export function buildChatImagePageQuery(searchParams: URLSearchParams): string {
  const page = Number(searchParams.get("page"));
  const size = Number(searchParams.get("size"));
  const safePage = Number.isInteger(page) && page >= 0 ? page : 0;
  const safeSize =
    Number.isInteger(size) && size > 0
      ? Math.min(size, CHAT_IMAGE_PAGE_MAX_SIZE)
      : CHAT_IMAGE_PAGE_DEFAULT_SIZE;

  return `?page=${safePage}&size=${safeSize}`;
}

/**
 * IMAGE 메시지의 imageKey는 채팅 전용 폴더의 key여야 한다.
 * 상위 경로로 빠져나가는 값은 여기서 막는다 (소유권은 백엔드가 최종 확인한다).
 */
export function isValidChatImageKey(imageKey: unknown): imageKey is string {
  return (
    typeof imageKey === "string" &&
    /^chats\/[\w.\-/]+$/.test(imageKey) &&
    !imageKey.split("/").includes("..")
  );
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 묶음 식별자는 서버가 해석하지 않고 그대로 보관하므로 형식만 확인한다 */
export function isValidChatBatchId(batchId: unknown): batchId is string {
  return typeof batchId === "string" && UUID_PATTERN.test(batchId);
}

export const CHAT_ROOM_TITLE_MAX_LENGTH = 50;

/**
 * 채팅방 이름을 정규화한다.
 * 비어 있으면 null(활동 제목으로 복귀), 너무 길면 undefined(거절)를 돌려준다.
 */
export function normalizeChatRoomTitle(title: unknown): string | null | undefined {
  if (title === null || title === undefined) return null;
  if (typeof title !== "string") return undefined;

  const trimmed = title.trim();
  if (trimmed.length === 0) return null;

  return trimmed.length <= CHAT_ROOM_TITLE_MAX_LENGTH ? trimmed : undefined;
}
