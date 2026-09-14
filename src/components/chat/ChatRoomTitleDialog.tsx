"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { XIcon } from "@/components/ui/icons";
import { updateChatRoomTitle } from "@/lib/api/chat";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { CHAT_ROOM_TITLE_MAX_LENGTH } from "@/lib/chat/limits";
import { chatKeys } from "@/lib/query/chat";
import { unwrapApiResult } from "@/lib/query/result";
import { getContentLanguage } from "@/lib/content-language";

/** 단체 채팅방 이름 바꾸기. 비워서 저장하면 활동 제목으로 되돌아간다 */
export function ChatRoomTitleDialog({
  chatRoomId,
  currentTitle,
  onClose,
}: Readonly<{ chatRoomId: string; currentTitle: string; onClose: () => void }>) {
  const t = useTranslations("Chat");
  const language = getContentLanguage(useLocale());
  const tCommon = useTranslations("Common");
  const tAccessibility = useTranslations("Accessibility");
  const queryClient = useQueryClient();
  const getApiErrorMessage = useApiErrorMessage();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState(currentTitle);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () =>
      unwrapApiResult(
        await updateChatRoomTitle(chatRoomId, { title: title.trim() || null }, language),
        "room",
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: chatKeys.room(chatRoomId) }),
        queryClient.invalidateQueries({ queryKey: chatKeys.rooms() }),
      ]);
      onClose();
    },
    onError: setError,
  });

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="chat-title-dialog"
      onClose={onClose}
      onCancel={(event) => {
        if (saveMutation.isPending) event.preventDefault();
      }}
      className="motion-dialog m-0 w-full max-w-none rounded-t-3xl border-0 bg-canvas-soft p-6 text-ink shadow-2xl backdrop:bg-ink/45 backdrop:backdrop-blur-[3px] max-md:mt-auto md:m-auto md:w-[calc(100%-3rem)] md:max-w-sm md:rounded-2xl"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 id="chat-title-dialog" className="font-display text-base font-bold text-ink">
          {t("renameRoom")}
        </h2>
        <button
          type="button"
          aria-label={tAccessibility("closeDialog")}
          onClick={onClose}
          disabled={saveMutation.isPending}
          className="-mt-1.5 -mr-1.5 flex size-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors enabled:hover:text-primary disabled:opacity-60"
        >
          <XIcon className="size-4" />
        </button>
      </div>

      <label htmlFor="chat-room-title" className="sr-only">
        {t("renameLabel")}
      </label>
      <input
        id="chat-room-title"
        value={title}
        maxLength={CHAT_ROOM_TITLE_MAX_LENGTH}
        placeholder={t("renamePlaceholder")}
        disabled={saveMutation.isPending}
        onChange={(event) => setTitle(event.target.value)}
        className="mt-4 h-11 w-full rounded-xl border border-line-strong bg-canvas-soft px-4 text-sm text-ink transition-colors placeholder:text-muted focus:border-primary focus:outline-none disabled:opacity-60"
      />

      {error !== null ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {getApiErrorMessage(error, t("renameError"))}
        </p>
      ) : null}

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={saveMutation.isPending}
          className="h-11 flex-1 rounded-xl border border-line-strong font-display text-sm font-semibold text-ink transition-colors enabled:hover:border-primary enabled:hover:text-primary disabled:opacity-60"
        >
          {tCommon("cancel")}
        </button>
        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="h-11 flex-1 rounded-xl border border-primary font-display text-sm font-bold text-primary transition-colors enabled:hover:bg-primary-soft disabled:opacity-60"
        >
          {saveMutation.isPending ? t("renameSaving") : t("renameSave")}
        </button>
      </div>
    </dialog>
  );
}
