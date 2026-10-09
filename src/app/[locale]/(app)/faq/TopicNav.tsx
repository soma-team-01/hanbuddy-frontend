"use client";

import { useEffect, useRef, useState } from "react";

export interface NavTopic {
  readonly id: string;
  readonly number: string;
  readonly title: string;
  readonly questions: readonly { readonly key: string; readonly question: string }[];
}

// 전역 헤더(모바일 61px)와 칩 바(약 60px) 아래에서 "지금 읽는 묶음"을 판정하는 띠.
const BAND_TOP = 140;
const ACTIVE_BAND = `-${BAND_TOP}px 0px -50% 0px`;

const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong";

// 화면 위쪽 띠에 걸친 묶음 중 가장 앞의 것을 "지금 보는 묶음"으로 본다.
// 띠가 비었을 때 첫 묶음이 아직 띠 아래에 있으면(표지를 보는 중) 표시를 지우고, 아니면 이전 값을 유지한다.
function useActiveTopic(ids: readonly string[]) {
  const [active, setActive] = useState<string | null>(null);
  const idList = ids.join(",");

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const order = idList.split(",");
    const visible = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) visible.set(entry.target.id, entry.isIntersecting);
        const first = order.find((id) => visible.get(id));
        if (first) {
          setActive(first);
          return;
        }
        const firstTopic = document.getElementById(order[0]);
        if (firstTopic && firstTopic.getBoundingClientRect().top > BAND_TOP) setActive(null);
      },
      { rootMargin: ACTIVE_BAND },
    );
    for (const id of order) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [idList]);

  return [active, setActive] as const;
}

/** 모바일·태블릿: 전역 헤더 바로 아래에 붙는 묶음 이동 칩. 앵커 링크라 JS 없이도 이동한다. */
export function TopicChips({ topics, label }: { topics: readonly NavTopic[]; label: string }) {
  const [active, setActive] = useActiveTopic(topics.map((topic) => topic.id));
  const scrollerRef = useRef<HTMLDivElement>(null);

  // 지금 묶음의 칩이 가로 스크롤 밖에 있으면 보이는 곳으로 당겨 온다(세로 스크롤은 건드리지 않는다).
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || typeof scroller.scrollTo !== "function") return;
    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const behavior = reduce ? "auto" : "smooth";
    const chip = active ? scroller.querySelector<HTMLElement>(`[data-topic="${active}"]`) : null;
    scroller.scrollTo({ left: chip ? chip.offsetLeft - 16 : 0, behavior });
  }, [active]);

  return (
    <nav
      aria-label={label}
      className="sticky top-[61px] z-30 border-b border-line-soft bg-canvas/95 backdrop-blur lg:hidden"
    >
      <div
        ref={scrollerRef}
        className="mx-auto flex max-w-[1200px] [scrollbar-width:none] gap-2 overflow-x-auto px-4 py-2.5 md:px-6 [&::-webkit-scrollbar]:hidden"
      >
        {topics.map((topic) => {
          const isActive = topic.id === active;
          return (
            <a
              key={topic.id}
              href={`#${topic.id}`}
              data-topic={topic.id}
              aria-current={isActive ? "location" : undefined}
              onClick={() => setActive(topic.id)}
              className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-bold whitespace-nowrap transition-colors ${FOCUS_RING} ${
                isActive
                  ? "border-ink bg-ink text-on-primary"
                  : "border-line-strong bg-canvas-soft text-ink hover:border-primary"
              }`}
            >
              <span
                aria-hidden
                className={`font-display text-xs font-extrabold ${isActive ? "text-primary-soft" : "text-primary"}`}
              >
                {topic.number}
              </span>
              {topic.title}
            </a>
          );
        })}
      </div>
    </nav>
  );
}

/** 데스크톱: 왼쪽에 붙어 있는 묶음·질문 목차. 지금 묶음은 빨간 선과 진한 글자로 표시한다. */
export function TopicRail({ topics, label }: { topics: readonly NavTopic[]; label: string }) {
  const [active, setActive] = useActiveTopic(topics.map((topic) => topic.id));

  return (
    <nav aria-label={label}>
      <ol className="space-y-6">
        {topics.map((topic) => {
          const isActive = topic.id === active;
          return (
            <li key={topic.id}>
              <a
                href={`#${topic.id}`}
                aria-current={isActive ? "location" : undefined}
                onClick={() => setActive(topic.id)}
                className={`flex min-h-9 items-baseline gap-3 rounded-sm font-display text-base font-extrabold tracking-[-0.01em] transition-colors ${FOCUS_RING} ${
                  isActive ? "text-ink" : "text-muted hover:text-ink"
                }`}
              >
                <span aria-hidden className="w-6 shrink-0 text-xs text-primary">
                  {topic.number}
                </span>
                {topic.title}
              </a>
              <ol
                className={`mt-1 ml-9 space-y-0.5 border-l-2 transition-colors ${
                  isActive ? "border-primary" : "border-line-soft"
                }`}
              >
                {topic.questions.map((item) => (
                  <li key={item.key}>
                    <a
                      href={`#faq-${item.key}`}
                      onClick={() => setActive(topic.id)}
                      className={`block rounded-sm py-1.5 pl-4 text-sm leading-5 transition-colors hover:text-primary-strong ${FOCUS_RING} ${
                        isActive ? "text-ink" : "text-muted"
                      }`}
                    >
                      {item.question}
                    </a>
                  </li>
                ))}
              </ol>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
