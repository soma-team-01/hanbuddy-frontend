import type { Locale } from "@/i18n/routing";
import type { ChatMessageResponse } from "@/types/chat";
import {
  formatSeoulDate,
  formatSeoulTime,
  getSeoulDateTimeParts,
  getSeoulNowParts,
} from "@/lib/datetime";

type ChatTranslator = (key: "today" | "yesterday") => string;

/** 오늘이면 시각, 어제면 "어제", 그 이전이면 날짜로 보여준다 */
export function formatChatTimestamp(
  value: string,
  locale: Locale,
  t: ChatTranslator,
  now = getSeoulNowParts(),
): string {
  const parts = getSeoulDateTimeParts(value);
  if (!parts) return "";
  if (parts.date === now.date) return formatSeoulTime(value, locale) ?? "";
  if (parts.date === previousSeoulDate(now.date)) return t("yesterday");

  return formatSeoulDate(value, locale) ?? "";
}

/** 메시지 사이에 끼우는 날짜 구분선 문구 */
export function formatChatDateSeparator(
  value: string,
  locale: Locale,
  t: ChatTranslator,
  now = getSeoulNowParts(),
): string {
  const parts = getSeoulDateTimeParts(value);
  if (!parts) return "";
  if (parts.date === now.date) return t("today");
  if (parts.date === previousSeoulDate(now.date)) return t("yesterday");

  return formatSeoulDate(value, locale) ?? "";
}

/** 같은 날짜인지 비교해 구분선을 넣을 위치를 정한다 */
export function isSameSeoulDate(left: string, right: string): boolean {
  const leftParts = getSeoulDateTimeParts(left);
  const rightParts = getSeoulDateTimeParts(right);

  return Boolean(leftParts && rightParts && leftParts.date === rightParts.date);
}

function previousSeoulDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const previous = new Date(Date.UTC(year, month - 1, day - 1));

  return previous.toISOString().slice(0, 10);
}

/**
 * 말풍선 묶음. 같은 사람이 같은 분(分)에 연달아 보낸 메시지를 하나로 묶는다.
 * 보낸 사람이 다르면 같은 분이라도 따로 묶여, 각자 자기 메시지 아래에 시각이 붙는다.
 */
export interface ChatMessageGroup {
  key: number;
  senderId: number;
  senderName: string;
  senderProfileImageUrl: string | null;
  /** 묶음의 마지막 메시지 시각 — 이 한 번만 화면에 보여준다 */
  timestamp: string;
  /** 이 묶음 앞에 날짜 구분선을 넣을지 */
  startsNewDate: boolean;
  /** 한 번에 보낸 사진 묶음의 식별자. 없으면 null */
  batchId: string | null;
  messages: ChatMessageResponse[];
}

export function groupChatMessages(messages: ChatMessageResponse[]): ChatMessageGroup[] {
  const groups: ChatMessageGroup[] = [];

  for (const [index, message] of messages.entries()) {
    const previous = messages[index - 1];
    const startsNewDate = !previous || !isSameSeoulDate(previous.createdAt, message.createdAt);
    const openGroup = groups.at(-1);
    // 한 번에 보낸 묶음은 분이 바뀌어도 갈라지지 않게 batchId를 함께 본다
    const sameBatch = Boolean(message.batchId) && openGroup?.batchId === message.batchId;
    const continues =
      openGroup !== undefined &&
      !startsNewDate &&
      openGroup.senderId === message.senderId &&
      (sameBatch || isSameSeoulMinute(openGroup.timestamp, message.createdAt));

    if (continues) {
      openGroup.messages.push(message);
      openGroup.timestamp = message.createdAt;
      continue;
    }

    groups.push({
      key: message.messageId,
      senderId: message.senderId,
      senderName: message.senderName,
      senderProfileImageUrl: message.senderProfileImageUrl,
      timestamp: message.createdAt,
      startsNewDate,
      batchId: message.batchId ?? null,
      messages: [message],
    });
  }

  return groups;
}

/** 같은 분에 보냈는지 — 초 단위 차이는 무시한다 */
export function isSameSeoulMinute(left: string, right: string): boolean {
  const leftParts = getSeoulDateTimeParts(left);
  const rightParts = getSeoulDateTimeParts(right);

  return Boolean(
    leftParts &&
    rightParts &&
    leftParts.date === rightParts.date &&
    leftParts.time.slice(0, 5) === rightParts.time.slice(0, 5),
  );
}

/** 말풍선 한 줄 — 사진 묶음이면 여러 장을 하나로 묶어 격자로 그린다 */
export type ChatBubble =
  | { kind: "text"; key: number; message: ChatMessageResponse }
  | { kind: "images"; key: number; images: ChatMessageResponse[] };

/**
 * 묶음 안의 메시지를 말풍선 단위로 나눈다.
 * 한 번에 보낸 사진은 `batchId`로 묶고, 값이 없는 예전 메시지는 연달아 붙은 순서로 묶는다.
 */
export function toChatBubbles(messages: ChatMessageResponse[]): ChatBubble[] {
  const bubbles: ChatBubble[] = [];

  for (const message of messages) {
    const isImage = message.messageType === "IMAGE" && Boolean(message.imageUrl);
    const open = bubbles.at(-1);
    const openBatchId = open?.kind === "images" ? (open.images[0].batchId ?? null) : null;
    // 서로 다른 묶음이 나란히 오면 각각의 덩어리로 갈라 놓는다
    const sameBatch =
      openBatchId === null && !message.batchId ? true : openBatchId === (message.batchId ?? null);

    if (isImage && open?.kind === "images" && sameBatch) {
      open.images.push(message);
      continue;
    }

    bubbles.push(
      isImage
        ? { kind: "images", key: message.messageId, images: [message] }
        : { kind: "text", key: message.messageId, message },
    );
  }

  return bubbles;
}

/**
 * 사진 묶음을 줄 단위로 나눈다. 각 줄은 칸을 균등하게 나눠 가져 빈칸이 남지 않는다.
 * (5장이면 3 + 2, 7장이면 3 + 2 + 2처럼 아래 줄이 더 크게 보인다)
 */
export function chatPhotoRows(count: number): number[] {
  const LAYOUTS: Record<number, number[]> = {
    1: [1],
    2: [2],
    3: [3],
    4: [2, 2],
    5: [3, 2],
    6: [3, 3],
    7: [3, 2, 2],
    8: [3, 3, 2],
    9: [3, 3, 3],
  };
  if (count <= 0) return [];
  if (LAYOUTS[count]) return LAYOUTS[count];

  // 정해둔 표(최대 9장)를 넘어서면 세 칸씩 채우고 남은 만큼 마지막 줄에 둔다
  const rows: number[] = [];
  for (let remaining = count; remaining > 0; remaining -= 3) {
    rows.push(Math.min(remaining, 3));
  }

  return rows;
}
