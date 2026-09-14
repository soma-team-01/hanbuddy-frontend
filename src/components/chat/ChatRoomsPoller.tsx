"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { getContentLanguage } from "@/lib/content-language";
import { myChatRoomsPollingQueryOptions } from "@/lib/query/chat";

/** 인증된 앱 화면에서 채팅방 목록과 안 읽은 수를 한 번만 주기적으로 갱신한다. */
export function ChatRoomsPoller() {
  const language = getContentLanguage(useLocale());
  useQuery(myChatRoomsPollingQueryOptions(language));

  return null;
}
