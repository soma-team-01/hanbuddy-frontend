"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { SendIcon, XIcon } from "@/components/ui/icons";
import { sendHaiBuddyMessage } from "@/lib/api/hai-buddy";
import { touristActivityQueryOptions } from "@/lib/query/activities";
import { haiBuddyKeys } from "@/lib/query/hai-buddy";
import { myProfileQueryOptions } from "@/lib/query/users";
import type { HaiBuddyContext, HaiBuddyConversation, HaiBuddyMessage } from "@/types/hai-buddy";
import { HaiBuddyMessageView } from "./HaiBuddyMessageView";
import { useHaiBuddyContext } from "./use-hai-buddy-context";

const ERROR_MESSAGES: Record<string, "dailyLimit" | "minuteLimit" | "unavailable" | "turnLimit"> = {
  HAIBUDDY429_DAILY: "dailyLimit",
  HAIBUDDY429_MINUTE: "minuteLimit",
  HAIBUDDY503_LIMIT: "unavailable",
  HAIBUDDY404_DISABLED: "unavailable",
  HAIBUDDY400_TURNS: "turnLimit",
};

type PendingError = "error" | "dailyLimit" | "minuteLimit" | "unavailable" | "turnLimit";

/**
 * Aside처럼 페이지 옆에 떠 있는 패널. 화면을 가리지 않아(데스크톱) 보던 페이지를 계속 쓰면서 물어볼 수 있고,
 * 페이지를 옮기면 아래 화면 칩이 따라 바뀐다.
 */
export function HaiBuddyPanel({
  initial,
  onClose,
}: Readonly<{ initial?: HaiBuddyConversation; onClose: () => void }>) {
  const t = useTranslations("HaiBuddy");
  const titleId = useId();
  const queryClient = useQueryClient();
  const context = useHaiBuddyContext();
  // 캐시 변경 알림은 다음 틱에 퍼지므로, 닫자마자 다시 열어도 마지막 대화가 보이도록 열 때 캐시를 직접 읽는다.
  const [restored] = useState(
    () =>
      queryClient.getQueryData<HaiBuddyConversation>(haiBuddyKeys.latest(context.language)) ??
      initial,
  );
  const [conversationId, setConversationId] = useState<number | null>(
    restored?.conversationId ?? null,
  );
  const [messages, setMessages] = useState<HaiBuddyMessage[]>(restored?.messages ?? []);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<{ kind: PendingError; question: string } | null>(null);
  const [contextOffFor, setContextOffFor] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const contextKey = `${context.page}:${context.activityId ?? ""}:${context.scheduleId ?? ""}`;
  const contextOn = contextOffFor !== contextKey;
  const activity = useQuery({
    ...touristActivityQueryOptions(context.activityId ?? 0, context.language),
    enabled: Boolean(context.activityId),
  });
  const profile = useQuery({ ...myProfileQueryOptions(), retry: false });

  const send = useMutation({
    mutationFn: (input: Parameters<typeof sendHaiBuddyMessage>[0]) => sendHaiBuddyMessage(input),
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 패널을 닫았다 열거나 페이지를 옮겨도 화면에 보이던 대화가 그대로 복원되도록 캐시를 맞춘다.
  useEffect(() => {
    queryClient.setQueryData<HaiBuddyConversation>(haiBuddyKeys.latest(context.language), {
      conversationId,
      messages,
    });
  }, [queryClient, context.language, conversationId, messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages, send.isPending]);

  // 데스크톱은 페이지가 패널 폭만큼 줄어들고(globals.css), 휴대폰·태블릿은 아래 절반만 덮어 위쪽 페이지를 계속 쓸 수 있다.
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-hai-buddy-open", "");
    return () => root.removeAttribute("data-hai-buddy-open");
  }, []);

  const contextLabel = useMemo(() => {
    const title = activity.data?.title;
    switch (context.page) {
      case "ACTIVITY_DETAIL":
        return title ? t("viewingPage.activity", { title }) : t("viewingPage.activityFallback");
      case "BOOKING":
        return t("viewingPage.booking", { title: title ?? t("viewingPage.activityFallback") });
      case "FAQ":
        return t("viewingPage.faq");
      case "EXPLORE":
        return t("viewingPage.explore");
      case "APPLICATIONS":
        return t("viewingPage.applications");
      default:
        return t("viewingPage.other");
    }
  }, [activity.data?.title, context.page, t]);

  const suggestions =
    context.page === "ACTIVITY_DETAIL" || context.page === "BOOKING"
      ? [t("suggestions.included"), t("suggestions.confirmed")]
      : [t("suggestions.recommend"), t("suggestions.pay")];

  function contactMessage(summary: string | null) {
    const lastQuestion = [...messages].reverse().find((m) => m.role === "USER")?.content ?? "";
    const lines = [t("contactIntro")];
    if (profile.data?.email) lines.push(t("contactEmail", { email: profile.data.email }));
    if (contextOn && activity.data?.title)
      lines.push(t("contactActivity", { activity: activity.data.title }));
    lines.push(t("contactQuestion", { question: summary?.trim() || lastQuestion }));
    return lines.join("\n");
  }

  async function ask(question: string) {
    const text = question.trim();
    if (!text || send.isPending) return;
    setError(null);
    setDraft("");
    setMessages((current) => [...current, localMessage("USER", text)]);
    const requestContext: HaiBuddyContext = contextOn
      ? context
      : { page: context.page, language: context.language, locale: context.locale };
    const result = await send.mutateAsync({
      ...(conversationId !== null && { conversationId }),
      message: text,
      context: requestContext,
    });
    if (result.status !== "success") {
      const code = result.status === "error" ? result.error.code : null;
      setError({ kind: (code && ERROR_MESSAGES[code]) || "error", question: text });
      return;
    }
    const reply = result.reply;
    setConversationId(reply.conversationId);
    setMessages((current) => [
      ...current,
      {
        messageId: reply.messageId,
        role: "ASSISTANT",
        content: reply.reply,
        recommendedActivities: reply.recommendedActivities,
        handoff: reply.handoff,
        handoffSummary: reply.handoffSummary,
        citations: reply.citations,
        generalGuidance: reply.generalGuidance,
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void ask(draft);
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
    }
  }

  function startNewChat() {
    setConversationId(null);
    setMessages([]);
    setError(null);
    inputRef.current?.focus();
  }

  return (
    <aside
      aria-labelledby={titleId}
      onKeyDown={onKeyDown}
      data-hai-buddy-panel
      className="fixed inset-x-0 bottom-0 z-40 flex h-[50dvh] flex-col rounded-t-3xl border-t border-line-soft bg-canvas-soft text-ink shadow-[0_-12px_40px_rgba(38,27,24,0.18)] lg:top-0 lg:right-0 lg:left-auto lg:h-auto lg:w-[400px] lg:rounded-none lg:border-t-0 lg:border-l lg:shadow-none"
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line-soft px-4 pt-3 pb-3 lg:pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="min-w-0">
          <h2
            id={titleId}
            className="flex items-center gap-2 font-display text-lg leading-7 font-bold"
          >
            {t("title")}
            <span
              aria-hidden
              className="rounded-full bg-primary-soft px-2 py-0.5 font-sans text-[11px] leading-4 font-bold tracking-wide text-primary-strong"
            >
              {t("aiBadge")}
            </span>
          </h2>
          <p className="hidden text-xs text-muted lg:block">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={startNewChat}
            // 답을 기다리는 중에 새 대화를 열면 늦게 온 답이 새 대화에 섞인다.
            disabled={send.isPending}
            className="min-h-10 rounded-full px-3 text-sm font-medium whitespace-nowrap text-primary-strong hover:bg-canvas"
          >
            {t("newChat")}
          </button>
          <button
            type="button"
            aria-label={t("close")}
            onClick={onClose}
            className="flex size-10 items-center justify-center rounded-full text-muted hover:text-primary"
          >
            <XIcon className="size-5" />
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4" aria-live="polite">
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl bg-canvas px-4 py-3 text-sm leading-6">
            <p>{t("greeting")}</p>
            <p className="mt-1 text-xs text-muted">{t("privacyNote")}</p>
          </div>
          {messages.length === 0 && (
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void ask(suggestion)}
                  className="min-h-10 rounded-full border border-primary/40 px-3 text-sm text-primary-strong hover:border-primary"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
          {messages.map((message, index) => (
            <HaiBuddyMessageView
              key={`${message.messageId}-${index}`}
              message={message}
              contactMessage={contactMessage}
            />
          ))}
          {send.isPending && (
            <p role="status" className="text-sm text-muted">
              {t("thinking")}
            </p>
          )}
          {error && (
            <div role="alert" className="rounded-xl border border-line-soft px-4 py-3 text-sm">
              <p>{t(error.kind)}</p>
              {error.kind === "error" && (
                <button
                  type="button"
                  onClick={() => {
                    setMessages((current) => current.slice(0, -1));
                    void ask(error.question);
                  }}
                  className="mt-2 text-sm font-semibold text-primary-strong"
                >
                  {t("retry")}
                </button>
              )}
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="shrink-0 border-t border-line-soft px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <div className="mb-2 flex min-w-0 items-center gap-2 text-xs text-muted">
          {contextOn ? (
            <>
              <span className="shrink-0">{t("viewing")}</span>
              <span className="min-w-0 truncate rounded-full bg-canvas px-2.5 py-1 font-medium text-ink">
                {contextLabel}
              </span>
              <button
                type="button"
                aria-label={t("removeContext")}
                title={t("removeContext")}
                onClick={() => setContextOffFor(contextKey)}
                className="flex size-6 shrink-0 items-center justify-center rounded-full hover:text-primary"
              >
                <XIcon className="size-3.5" />
              </button>
            </>
          ) : (
            <span>{t("contextRemoved")}</span>
          )}
        </div>
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            aria-label={t("placeholder")}
            placeholder={t("placeholder")}
            value={draft}
            maxLength={1000}
            rows={1}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                void ask(draft);
              }
            }}
            className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-line-soft bg-canvas px-4 py-2.5 text-sm leading-6 outline-none focus:border-primary"
          />
          <button
            type="submit"
            aria-label={t("send")}
            disabled={!draft.trim() || send.isPending}
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-white disabled:opacity-40"
          >
            <SendIcon className="size-5" />
          </button>
        </div>
      </form>
    </aside>
  );
}

let localId = 0;
function localMessage(role: "USER", content: string): HaiBuddyMessage {
  localId -= 1;
  return {
    messageId: localId,
    role,
    content,
    recommendedActivities: [],
    handoff: "NONE",
    handoffSummary: null,
    citations: [],
    generalGuidance: false,
    createdAt: new Date().toISOString(),
  };
}
