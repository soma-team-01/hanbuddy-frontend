"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { ImagesIcon, LogOutIcon, MenuIcon, PencilIcon } from "@/components/ui/icons";
import type { ChatRoomMemberResponse } from "@/types/chat";

/**
 * 대화 헤더의 메뉴. 참여자 목록과 방 관련 동작을 한곳에 모은다.
 * 헤더의 참여자 수를 눌러도 같은 메뉴가 열리므로 열림 상태는 호출부가 들고 있는다.
 */
export function ChatRoomMenu({
  open,
  onToggle,
  onClose,
  members,
  myUserId,
  isGroup,
  onSelectMember,
  onOpenPhotos,
  onLeave,
  canRename,
  onRename,
}: Readonly<{
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  members: ChatRoomMemberResponse[];
  myUserId: number | undefined;
  isGroup: boolean;
  onSelectMember: (member: ChatRoomMemberResponse) => void;
  onOpenPhotos: () => void;
  onLeave: () => void;
  /** 단체 채팅방의 방장만 이름을 바꿀 수 있다 */
  canRename: boolean;
  onRename: () => void;
}>) {
  const t = useTranslations("Chat");
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const activeMembers = members.filter((member) => !member.left);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) onClose();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      onClose();
      triggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, onClose]);

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t("roomMenu")}
        onClick={onToggle}
        className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <MenuIcon className="size-5" />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={t("roomMenu")}
          className="absolute top-[calc(100%+10px)] right-0 z-50 flex max-h-[70dvh] w-64 flex-col overflow-hidden rounded-2xl border border-line-soft bg-white shadow-[0_18px_48px_rgba(38,27,24,0.14)]"
        >
          {isGroup ? (
            <div className="flex min-h-0 flex-col">
              <p className="shrink-0 px-4 pt-4 pb-2 font-display text-[11px] font-bold tracking-[0.14em] text-muted uppercase">
                {t("memberCount", { count: activeMembers.length })}
              </p>
              <ul className="min-h-0 flex-1 overflow-y-auto pb-2">
                {activeMembers.map((member) => (
                  <li key={member.userId}>
                    <button
                      type="button"
                      onClick={() => onSelectMember(member)}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-left transition-colors hover:bg-primary-soft/60"
                    >
                      <Avatar name={member.userName} src={member.profileImageUrl} size={28} />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                        {member.userName}
                      </span>
                      {member.userId === myUserId ? (
                        <span className="shrink-0 text-[11px] font-semibold text-muted">
                          {t("you")}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className={`shrink-0 p-1.5 ${isGroup ? "border-t border-line-soft" : ""}`}>
            {canRename ? (
              <button
                type="button"
                onClick={onRename}
                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-sm font-semibold text-ink transition-colors hover:text-primary"
              >
                <PencilIcon className="size-4 shrink-0" />
                {t("renameRoom")}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onOpenPhotos}
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-sm font-semibold text-ink transition-colors hover:text-primary"
            >
              <ImagesIcon className="size-4 shrink-0" />
              {t("openPhotoPanel")}
            </button>
            <button
              type="button"
              onClick={onLeave}
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-sm font-semibold text-ink transition-colors hover:text-danger"
            >
              <LogOutIcon className="size-4 shrink-0" />
              {t("leave")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
