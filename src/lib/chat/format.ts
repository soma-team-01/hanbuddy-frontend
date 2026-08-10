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
  messages: ChatMessageResponse[];
}

export function groupChatMessages(messages: ChatMessageResponse[]): ChatMessageGroup[] {
  const groups: ChatMessageGroup[] = [];

  for (const [index, message] of messages.entries()) {
    const previous = messages[index - 1];
    const startsNewDate = !previous || !isSameSeoulDate(previous.createdAt, message.createdAt);
    const openGroup = groups.at(-1);
    const continues =
      openGroup !== undefined &&
      !startsNewDate &&
      openGroup.senderId === message.senderId &&
      isSameSeoulMinute(openGroup.timestamp, message.createdAt);

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
