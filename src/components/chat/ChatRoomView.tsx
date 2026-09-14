"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ChatMemberDialog } from "@/components/chat/ChatMemberDialog";
import { ChatMessageList } from "@/components/chat/ChatMessageList";
import { ChatRoomMenu } from "@/components/chat/ChatRoomMenu";
import { ChatRoomTitleDialog } from "@/components/chat/ChatRoomTitleDialog";
import { ChatPhotoPanel } from "@/components/chat/ChatPhotoPanel";
import { useChatMessages } from "@/components/chat/use-chat-messages";
import { useChatRoomStream } from "@/components/chat/use-chat-room-stream";
import { Avatar } from "@/components/ui/Avatar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PhotoGalleryDialog } from "@/components/activity/PhotoGalleryDialog";
import { ArrowLeftIcon, ImagePlusIcon, UsersIcon, XIcon } from "@/components/ui/icons";
import { Link, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import {
  buildChatImageDownloadUrl,
  leaveChatRoom,
  sendChatMessage,
  updateChatRead,
} from "@/lib/api/chat";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { formatChatScheduleLabel } from "@/lib/chat/format";
import { getContentLanguage } from "@/lib/content-language";
import { CHAT_MESSAGE_MAX_LENGTH } from "@/lib/chat/limits";
import { readImageSize } from "@/lib/chat/image-size";
import { MAX_CHAT_IMAGE_COUNT, uploadChatImages } from "@/lib/images/presigned";
import { chatKeys, chatRoomQueryOptions, myChatRoomsCacheQueryOptions } from "@/lib/query/chat";
import { unwrapApiResult } from "@/lib/query/result";
import { myProfileQueryOptions } from "@/lib/query/users";
import type { ChatMessageResponse, ChatRoomMemberResponse } from "@/types/chat";

/** 보내기 전 미리보기용으로만 쓰는 첨부 항목 */
interface ChatAttachment {
  file: File;
  /** createObjectURL 결과 — 목록에서 빠질 때 반드시 해제한다 */
  previewUrl: string;
}

/** 고른 사진을 올린 뒤 한 장씩 보낸다. 여러 장이면 같은 batchId로 묶어 화면에서 한 덩어리가 되게 한다 */
async function sendChatPhotos(chatRoomId: string, files: File[], content: string) {
  // 발급받은 key는 1시간 안에 써야 하므로 보내기 직전에 올린다
  const uploaded = await uploadChatImages(files);
  const sizes = await Promise.all(files.map(readImageSize));
  const batchId = files.length > 1 ? crypto.randomUUID() : undefined;

  for (const [index, target] of uploaded.entries()) {
    unwrapApiResult(
      await sendChatMessage(chatRoomId, {
        messageType: "IMAGE",
        imageKey: target.imageKey,
        // 캡션은 첫 장에만 붙인다
        content: index === 0 && content ? content : null,
        batchId,
        ...sizes[index],
      }),
      "message",
    );
  }
}

/** 대화 화면. 최신 묶음은 폴링으로 받고, 위로 스크롤하면 과거를 이어 붙인다 */
export function ChatRoomView({ chatRoomId }: Readonly<{ chatRoomId: string }>) {
  const t = useTranslations("Chat");
  const locale = useLocale() as Locale;
  const language = getContentLanguage(locale);
  const router = useRouter();
  const queryClient = useQueryClient();
  const getApiErrorMessage = useApiErrorMessage();
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [attachNotice, setAttachNotice] = useState<string | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [photoPanelOpen, setPhotoPanelOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [titleDialogOpen, setTitleDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<ChatRoomMemberResponse | null>(null);
  const [viewer, setViewer] = useState<{
    images: ChatMessageResponse[];
    index: number;
  } | null>(null);
  const [error, setError] = useState<unknown>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentsRef = useRef<ChatAttachment[]>([]);
  const notifiedReadRef = useRef<number>(0);

  const stream = useChatRoomStream(chatRoomId, language);
  const chatConnected = stream.status === "connected";
  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  const profileQuery = useQuery(myProfileQueryOptions());
  const roomQuery = useQuery(chatRoomQueryOptions(chatRoomId, language));
  const roomsQuery = useQuery(myChatRoomsCacheQueryOptions(language));
  const chatMessages = useChatMessages(chatRoomId, language);

  const messages = chatMessages.messages;
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

  // 대화방을 떠날 때 남아 있는 미리보기 URL을 정리한다
  useEffect(() => {
    return () => {
      for (const item of attachmentsRef.current) URL.revokeObjectURL(item.previewUrl);
    };
  }, []);

  const sendMutation = useMutation({
    mutationFn: async ({ content, files }: { content: string; files: File[] }) => {
      if (files.length === 0) {
        return unwrapApiResult(await sendChatMessage(chatRoomId, { content }), "message");
      }
      await sendChatPhotos(chatRoomId, files, content);
      return null;
    },
    onSuccess: async () => {
      setDraft("");
      setAttachments((current) => {
        for (const item of current) URL.revokeObjectURL(item.previewUrl);
        return [];
      });
      setAttachNotice(null);
      setError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: chatKeys.latestMessages(chatRoomId, language) }),
        queryClient.invalidateQueries({ queryKey: chatKeys.images(chatRoomId) }),
        queryClient.invalidateQueries({ queryKey: chatKeys.rooms() }),
      ]);
    },
    // 묶음 전송은 한 장씩 보내므로 도중에 끊겨도 앞선 장은 이미 서버에 있다
    onError: async (sendError) => {
      setError(sendError);
      await queryClient.invalidateQueries({
        queryKey: chatKeys.latestMessages(chatRoomId, language),
      });
    },
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

  function sendLabel() {
    if (!sendMutation.isPending) return t("send");
    return attachments.length > 0 ? t("uploadingPhotos") : t("sending");
  }

  function submitDraft() {
    const content = draft.trim();
    if (!chatConnected || sendMutation.isPending) return;
    if (!content && attachments.length === 0) return;
    sendMutation.mutate({ content, files: attachments.map((item) => item.file) });
  }

  function attachFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const room = MAX_CHAT_IMAGE_COUNT - attachments.length;
    const picked = [...files].slice(0, Math.max(room, 0));
    // 넘치게 고르면 앞에서부터 채우고 왜 다 못 담았는지 알린다
    setAttachNotice(
      picked.length < files.length ? t("photoTooMany", { max: MAX_CHAT_IMAGE_COUNT }) : null,
    );
    if (picked.length === 0) return;

    setAttachments((current) => [
      ...current,
      ...picked.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })),
    ]);
    setError(null);
  }

  function removeAttachment(index: number) {
    setAttachments((current) => {
      URL.revokeObjectURL(current[index].previewUrl);
      return current.filter((_, at) => at !== index);
    });
    setAttachNotice(null);
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
  // 단체는 활동 대표 이미지, 1:1은 상대 프로필이 상세 응답으로 내려온다
  const roomImageUrl =
    room.imageUrl ??
    roomsQuery.data?.find((item) => item.chatRoomId === room.chatRoomId)?.imageUrl ??
    null;
  const isRoomOwner = isGroup && room.ownerId != null && room.ownerId === myUserId;
  // 같은 활동을 회차별로 열면 방 이름이 전부 같아진다 — 어느 회차인지 헤더에 붙인다
  const scheduleLabel = formatChatScheduleLabel(room.activityStartAt, locale);
  // 대표 이미지가 없는 단체방은 사람 아이콘으로, 1:1은 상대 이름 이니셜로 채운다
  let roomAvatar = <Avatar name={room.title} src={roomImageUrl} size={44} />;
  if (!roomImageUrl && isGroup) {
    roomAvatar = (
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-primary/40 text-primary">
        <UsersIcon className="size-5" />
      </span>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b border-line-soft px-4 py-3 md:px-6">
        <Link
          href="/chat"
          aria-label={t("backToList")}
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:text-primary lg:hidden"
        >
          <ArrowLeftIcon className="size-5" />
        </Link>

        {roomAvatar}

        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-base font-bold text-ink">{room.title}</h1>
          {isGroup ? (
            <div className="flex min-w-0 items-center gap-1.5 text-xs">
              {scheduleLabel ? (
                <>
                  <span className="truncate font-semibold text-primary">{scheduleLabel}</span>
                  <span aria-hidden="true" className="shrink-0 text-line-strong">
                    ·
                  </span>
                </>
              ) : null}
              {/* 참여자 수를 눌러도 메뉴가 열린다 — 사람 목록을 찾아 헤매지 않도록 */}
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="shrink-0 text-muted transition-colors hover:text-primary"
              >
                {t("memberCount", { count: activeMembers.length })}
              </button>
            </div>
          ) : null}
        </div>

        <ChatRoomMenu
          open={menuOpen}
          onToggle={() => setMenuOpen((open) => !open)}
          onClose={() => setMenuOpen(false)}
          members={room.members}
          myUserId={myUserId}
          isGroup={isGroup}
          onSelectMember={(member) => {
            setMenuOpen(false);
            setSelectedMember(member);
          }}
          onOpenPhotos={() => {
            setMenuOpen(false);
            setPhotoPanelOpen(true);
          }}
          onLeave={() => {
            setMenuOpen(false);
            setError(null);
            setLeaveOpen(true);
          }}
          canRename={isRoomOwner}
          onRename={() => {
            setMenuOpen(false);
            setTitleDialogOpen(true);
          }}
        />
      </header>

      <ChatMessageList
        key={language}
        messages={messages}
        members={room.members}
        myUserId={myUserId}
        locale={locale}
        language={language}
        isPending={chatMessages.isPending}
        isError={chatMessages.isError}
        hasOlder={chatMessages.hasOlder}
        isLoadingOlder={chatMessages.isLoadingOlder}
        onLoadOlder={chatMessages.loadOlder}
        onOpenImage={(images, index) => setViewer({ images, index })}
      />

      <div className="border-t border-line-soft px-4 py-3 md:px-6">
        {stream.status !== "connected" ? (
          <div
            role={stream.status === "failed" ? "alert" : "status"}
            className="mb-3 flex items-center justify-between gap-3 text-sm"
          >
            <p className={stream.status === "failed" ? "text-danger" : "text-muted"}>
              {stream.status === "connecting" ? t("connectionConnecting") : null}
              {stream.status === "reconnecting" ? t("connectionReconnecting") : null}
              {stream.status === "failed" ? t("connectionFailed") : null}
            </p>
            {stream.status === "failed" ? (
              <button
                type="button"
                onClick={stream.retry}
                className="shrink-0 rounded-full border border-ink px-3 py-1.5 font-display text-xs font-bold text-ink transition-colors hover:border-primary hover:text-primary"
              >
                {t("retryConnection")}
              </button>
            ) : null}
          </div>
        ) : null}
        {error !== null ? (
          <p role="alert" className="mb-2 text-sm text-danger">
            {getApiErrorMessage(error, t("sendError"))}
          </p>
        ) : null}
        {attachNotice ? (
          <p role="alert" className="mb-2 text-xs text-danger">
            {attachNotice}
          </p>
        ) : null}
        {attachments.length > 0 ? (
          <ul className="mb-2 flex flex-wrap gap-2">
            {attachments.map((item, index) => (
              <li
                key={item.previewUrl}
                className="relative size-16 overflow-hidden rounded-xl border border-line-soft"
              >
                <Image
                  src={item.previewUrl}
                  alt={item.file.name}
                  fill
                  sizes="64px"
                  unoptimized
                  className="object-cover"
                />
                <button
                  type="button"
                  aria-label={t("removePhoto")}
                  disabled={sendMutation.isPending}
                  onClick={() => removeAttachment(index)}
                  className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-ink/70 text-white transition-colors enabled:hover:bg-ink disabled:opacity-60"
                >
                  <XIcon className="size-3" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <form
          data-testid="chat-composer"
          className="flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            submitDraft();
          }}
        >
          <label htmlFor="chat-draft" className="sr-only">
            {t("messageLabel")}
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={!chatConnected || sendMutation.isPending}
            className="hidden"
            onChange={(event) => {
              attachFiles(event.target.files);
              // 같은 파일을 다시 고를 수 있도록 값을 비운다
              event.target.value = "";
            }}
          />
          <button
            type="button"
            title={t("attachPhoto")}
            aria-label={t("attachPhoto")}
            disabled={
              !chatConnected || sendMutation.isPending || attachments.length >= MAX_CHAT_IMAGE_COUNT
            }
            onClick={() => fileInputRef.current?.click()}
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors enabled:hover:text-primary disabled:opacity-40"
          >
            <ImagePlusIcon className="size-5" />
          </button>
          <div data-testid="chat-message-input" className="min-w-0 flex-1">
            <textarea
              id="chat-draft"
              rows={1}
              value={draft}
              maxLength={CHAT_MESSAGE_MAX_LENGTH}
              placeholder={t("messagePlaceholder")}
              disabled={!chatConnected || sendMutation.isPending}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                // 한글 등 IME 조합 중의 Enter는 조합 확정이라 전송하지 않는다 (중복 전송 방지)
                if (event.nativeEvent.isComposing) return;
                // Enter로 보내고, 줄바꿈은 Shift+Enter로 남겨둔다
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submitDraft();
                }
              }}
              className="focus-border-only block max-h-32 min-h-11 w-full resize-none rounded-2xl border border-line-strong bg-canvas-soft px-4 py-2.5 text-sm leading-6 text-ink transition-colors placeholder:text-muted focus:border-primary focus:outline-none disabled:opacity-60"
            />
          </div>
          <button
            type="submit"
            disabled={
              !chatConnected ||
              sendMutation.isPending ||
              (draft.trim().length === 0 && attachments.length === 0)
            }
            className="h-11 shrink-0 rounded-full bg-primary px-5 font-display text-sm font-bold text-on-primary transition-colors enabled:hover:bg-primary-hover disabled:opacity-40"
          >
            {sendLabel()}
          </button>
        </form>
      </div>

      {titleDialogOpen ? (
        <ChatRoomTitleDialog
          chatRoomId={chatRoomId}
          currentTitle={room.title}
          onClose={() => setTitleDialogOpen(false)}
        />
      ) : null}

      {selectedMember ? (
        <ChatMemberDialog
          chatRoomId={chatRoomId}
          member={selectedMember}
          isMe={selectedMember.userId === myUserId}
          canRemove={isRoomOwner}
          onClose={() => setSelectedMember(null)}
        />
      ) : null}

      {photoPanelOpen ? (
        <ChatPhotoPanel chatRoomId={chatRoomId} onClose={() => setPhotoPanelOpen(false)} />
      ) : null}

      {viewer && viewer.images.length > 0 ? (
        <PhotoGalleryDialog
          images={viewer.images.map((image) => image.imageUrl ?? "")}
          alt={viewer.images[viewer.index]?.content ?? t("photo")}
          initialIndex={Math.max(viewer.index, 0)}
          downloadUrls={viewer.images.map((image) =>
            buildChatImageDownloadUrl(chatRoomId, image.messageId),
          )}
          downloadLabel={t("download")}
          downloadTitle={t("downloadTitle")}
          downloadOneLabel={t("downloadOne")}
          downloadAllLabel={t("downloadAll")}
          onClose={() => setViewer(null)}
        />
      ) : null}

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
