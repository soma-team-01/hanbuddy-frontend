"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useState } from "react";
import { createDirectChatRoom, createGroupChatRoom } from "@/lib/api/chat";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { useRouter } from "@/i18n/navigation";
import { chatKeys } from "@/lib/query/chat";
import { unwrapApiResult } from "@/lib/query/result";

type ChatTarget =
  { kind: "direct"; targetUserId: number } | { kind: "group"; activityScheduleId: number };

/**
 * 대화를 열고 그 방으로 이동하는 버튼.
 * 1:1은 같은 상대의 방이 이미 있으면 그 방으로, 단체는 회차의 방으로 그대로 들어간다.
 */
export function StartChatButton({
  target,
  label,
  icon,
  labelHidden = false,
  className,
  onOpened,
}: Readonly<{
  target: ChatTarget;
  label: string;
  icon?: ReactNode;
  /** 아이콘만 보여줄 때. 접근성 이름은 label로 남는다 */
  labelHidden?: boolean;
  className?: string;
  /** 다이얼로그 안에서 눌렀을 때처럼 이동 전에 정리할 일이 있으면 쓴다 */
  onOpened?: () => void;
}>) {
  const t = useTranslations("Chat");
  const router = useRouter();
  const queryClient = useQueryClient();
  const getApiErrorMessage = useApiErrorMessage();
  const [error, setError] = useState<unknown>(null);

  const openMutation = useMutation({
    mutationFn: async () =>
      target.kind === "direct"
        ? unwrapApiResult(await createDirectChatRoom({ targetUserId: target.targetUserId }), "room")
        : unwrapApiResult(
            await createGroupChatRoom({ activityScheduleId: target.activityScheduleId }),
            "room",
          ),
    onSuccess: async (room) => {
      setError(null);
      // 목록 재조회를 기다리면 방이 열렸는데도 이동이 늦어진다 — 갱신은 뒤에서 돌게 둔다
      void queryClient.invalidateQueries({ queryKey: chatKeys.rooms() });
      onOpened?.();
      router.push(`/chat/${room.chatRoomId}`);
    },
    onError: setError,
  });

  return (
    <>
      <button
        type="button"
        title={labelHidden ? label : undefined}
        disabled={openMutation.isPending}
        onClick={() => openMutation.mutate()}
        className={className}
      >
        {icon}
        <span className={labelHidden ? "sr-only" : undefined}>
          {openMutation.isPending ? t("openingChat") : label}
        </span>
      </button>
      {error !== null ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {getApiErrorMessage(error, t("loadError"))}
        </p>
      ) : null}
    </>
  );
}
