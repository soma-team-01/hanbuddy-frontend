"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { ChatMessageList } from "@/components/chat/ChatMessageList";
import { Avatar } from "@/components/ui/Avatar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ArrowLeftIcon, LogOutIcon, UsersIcon } from "@/components/ui/icons";
import { Link, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { leaveChatRoom, sendChatMessage, updateChatRead } from "@/lib/api/chat";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { CHAT_MESSAGE_MAX_LENGTH } from "@/lib/chat/limits";
import {
  chatKeys,
  chatMessageHistoryQueryOptions,
  chatRoomQueryOptions,
  latestChatMessagesQueryOptions,
  mergeChatMessages,
} from "@/lib/query/chat";
import { unwrapApiResult } from "@/lib/query/result";
import { myProfileQueryOptions } from "@/lib/query/users";

/** 대화 화면. 최신 묶음은 폴링으로 받고, 위로 스크롤하면 과거를 이어 붙인다 */
export function ChatRoomView({ chatRoomId }: Readonly<{ chatRoomId: string }>) {
  const t = useTranslations("Chat");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const queryClient = useQueryClient();
  const getApiErrorMessage = useApiErrorMessage();
  const [draft, setDraft] = useState("");
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const notifiedReadRef = useRef<number>(0);

  const profileQuery = useQuery(myProfileQueryOptions());
  const roomQuery = useQuery(chatRoomQueryOptions(chatRoomId));
  const latestQuery = useQuery(latestChatMessagesQueryOptions(chatRoomId));

  const latestMessages = latestQuery.data?.messages ?? [];
  const oldestLatestId = latestMessages.at(-1)?.messageId ?? 0;
  const historyQuery = useInfiniteQuery({
    ...chatMessageHistoryQueryOptions(chatRoomId, oldestLatestId),
    enabled: oldestLatestId > 0 && Boolean(latestQuery.data?.hasNext),
  });

  const messages = mergeChatMessages(
    latestMessages,
    (historyQuery.data?.pages ?? []).flatMap((page) => page.messages),
  );
  const newestMessageId = messages.at(-1)?.messageId ?? 0;
  const myUserId = profileQuery.data?.userId;

  const readMutation = useMutation({
    mutationFn: async (lastReadMessageId: number) =>
      unwrapApiResult(await updateChatRead(chatRoomId, { lastReadMessageId }), "chat"),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: chatKeys.rooms() });
    },
  });

  // 화면에 들어온 가장 최신 메시지까지 읽은 것으로 알린다
  useEffect(() => {
    if (newestMessageId === 0 || notifiedReadRef.current >= newestMessageId) return;
    notifiedReadRef.current = newestMessageId;
    readMutation.mutate(newestMessageId);
    // readMutation은 매 렌더마다 새 객체라 의존성에서 제외한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newestMessageId]);

  const sendMutation = useMutation({
    mutationFn: async (content: string) =>
      unwrapApiResult(await sendChatMessage(chatRoomId, { content }), "message"),
    onSuccess: async () => {
      setDraft("");
      setError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: chatKeys.latestMessages(chatRoomId) }),
        queryClient.invalidateQueries({ queryKey: chatKeys.rooms() }),
      ]);
    },
    onError: setError,
  });

  const leaveMutation = useMutation({
    mutationFn: async () => unwrapApiResult(await leaveChatRoom(chatRoomId), "chat"),
    onSuccess: async () => {
      setLeaveOpen(false);
      await queryClient.invalidateQueries({ queryKey: chatKeys.rooms() });
      router.push("/chat");
    },
    onError: setError,
  });

  function submitDraft() {
    const content = draft.trim();
    if (!content || sendMutation.isPending) return;
    sendMutation.mutate(content);
  }

  if (roomQuery.isPending) {
    return <p className="p-8 text-center text-muted">{t("loading")}</p>;
  }

  if (roomQuery.isError) {
    return (
      <p
        role="alert"
        className="m-6 rounded-xl border border-danger/20 px-4 py-3 text-sm text-danger"
      >
        {getApiErrorMessage(roomQuery.error, t("loadError"))}
      </p>
    );
  }

  const room = roomQuery.data;
  const isGroup = room.roomType === "GROUP";
  const activeMembers = room.members.filter((member) => !member.left);
  const counterpart = room.members.find((member) => member.userId !== myUserId);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b border-line-soft px-4 py-3 md:px-6">
        <Link
          href="/chat"
          aria-label={t("backToList")}
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:border hover:border-primary hover:text-primary lg:hidden"
        >
          <ArrowLeftIcon className="size-5" />
        </Link>

        {isGroup ? (
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-primary/40 text-primary">
            <UsersIcon className="size-5" />
          </span>
        ) : (
          <Avatar name={room.title} src={counterpart?.profileImageUrl ?? null} size={44} />
        )}

        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-base font-bold text-ink">{room.title}</h1>
          {isGroup ? (
            <p className="text-xs text-muted">
              {t("memberCount", { count: activeMembers.length })}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          title={t("leave")}
          aria-label={t("leave")}
          onClick={() => {
            setError(null);
            setLeaveOpen(true);
          }}
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:border hover:border-danger hover:text-danger"
        >
          <LogOutIcon className="size-5" />
        </button>
      </header>

      <ChatMessageList
        messages={messages}
        members={room.members}
        myUserId={myUserId}
        locale={locale}
        isPending={latestQuery.isPending}
        isError={latestQuery.isError}
        hasOlder={Boolean(historyQuery.hasNextPage || latestQuery.data?.hasNext)}
        isLoadingOlder={historyQuery.isFetchingNextPage}
        onLoadOlder={() => void historyQuery.fetchNextPage()}
      />

      <div className="border-t border-line-soft px-4 py-3 md:px-6">
        {error !== null ? (
          <p role="alert" className="mb-2 text-sm text-danger">
            {getApiErrorMessage(error, t("sendError"))}
          </p>
        ) : null}
        <form
          className="flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            submitDraft();
          }}
        >
          <label htmlFor="chat-draft" className="sr-only">
            {t("messageLabel")}
          </label>
          <textarea
            id="chat-draft"
            rows={1}
            value={draft}
            maxLength={CHAT_MESSAGE_MAX_LENGTH}
            placeholder={t("messagePlaceholder")}
            disabled={sendMutation.isPending}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              // Enter로 보내고, 줄바꿈은 Shift+Enter로 남겨둔다
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submitDraft();
              }
            }}
            className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-line-strong bg-canvas-soft px-4 py-2.5 text-sm leading-6 text-ink transition-colors placeholder:text-muted focus:border-primary focus:outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={sendMutation.isPending || draft.trim().length === 0}
            className="h-11 shrink-0 rounded-full bg-primary px-5 font-display text-sm font-bold text-on-primary transition-colors enabled:hover:bg-primary-hover disabled:opacity-40"
          >
            {sendMutation.isPending ? t("sending") : t("send")}
          </button>
        </form>
      </div>

      {leaveOpen ? (
        <ConfirmDialog
          title={t("leaveTitle")}
          description={t("leaveDescription")}
          confirmLabel={t("leave")}
          pendingLabel={t("leaving")}
          tone="danger"
          isPending={leaveMutation.isPending}
          onConfirm={() => leaveMutation.mutate()}
          onClose={() => {
            if (leaveMutation.isPending) return;
            setLeaveOpen(false);
          }}
        >
          {error !== null ? (
            <p role="alert" className="text-sm text-danger">
              {getApiErrorMessage(error, t("leaveError"))}
            </p>
          ) : null}
        </ConfirmDialog>
      ) : null}
    </div>
  );
}
