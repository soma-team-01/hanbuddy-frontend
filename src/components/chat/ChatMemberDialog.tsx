"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { StartChatButton } from "@/components/chat/StartChatButton";
import { Avatar } from "@/components/ui/Avatar";
import { MessageCircleIcon, XIcon } from "@/components/ui/icons";
import type { ChatRoomMemberResponse } from "@/types/chat";

/** 참여자 한 명의 프로필. 본인이 아니면 여기서 바로 1:1 대화를 연다 */
export function ChatMemberDialog({
  member,
  isMe,
  onClose,
}: Readonly<{ member: ChatRoomMemberResponse; isMe: boolean; onClose: () => void }>) {
  const t = useTranslations("Chat");
  const tAccessibility = useTranslations("Accessibility");
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="chat-member-name"
      onClose={onClose}
      className="motion-dialog m-0 w-full max-w-none rounded-t-3xl border-0 bg-canvas-soft p-6 text-ink shadow-2xl backdrop:bg-ink/45 backdrop:backdrop-blur-[3px] max-md:mt-auto md:m-auto md:w-[calc(100%-3rem)] md:max-w-xs md:rounded-2xl"
    >
      <div className="flex justify-end">
        <button
          type="button"
          aria-label={tAccessibility("closeDialog")}
          onClick={onClose}
          className="-mt-2 -mr-2 flex size-9 items-center justify-center rounded-full text-muted transition-colors hover:text-primary"
        >
          <XIcon className="size-4" />
        </button>
      </div>

      <div className="flex flex-col items-center gap-3 pb-2 text-center">
        <Avatar name={member.userName} src={member.profileImageUrl} size={80} />
        <div>
          <p id="chat-member-name" className="font-display text-lg font-bold text-ink">
            {member.userName}
          </p>
          {member.left ? <p className="mt-0.5 text-xs text-muted">{t("leftMember")}</p> : null}
        </div>
      </div>

      {/* 나간 참여자에게는 대화를 걸 수 없다 */}
      {isMe || member.left ? null : (
        <div className="mt-4">
          <StartChatButton
            target={{ kind: "direct", targetUserId: member.userId }}
            label={t("startDirectChat")}
            icon={<MessageCircleIcon className="size-4" />}
            onOpened={onClose}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-primary font-display text-sm font-bold text-primary transition-colors enabled:hover:bg-primary-soft disabled:opacity-60"
          />
        </div>
      )}
    </dialog>
  );
}
