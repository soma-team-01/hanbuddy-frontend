"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getReferralApplicationDates } from "@/lib/api/referral-reporting";
import { useModalDialog } from "@/components/ui/use-modal-dialog";
import { ArrowLeftIcon, ArrowRightIcon, CalendarIcon, XIcon } from "@/components/ui/icons";
import { getSeoulNowParts } from "@/lib/datetime";
import {
  addDaysToDateKey,
  addMonthsToMonthKey,
  formatMonthKeyTitle,
  monthGridDateKeys,
} from "@/lib/buddy-calendar";

type Props = {
  activityId: number;
  from: string;
  until: string;
  onChange: (from: string, until: string) => void;
};

export function ReferralDateRange(props: Props) {
  const [open, setOpen] = useState(false);
  const label = props.from && props.until ? `${props.from} → ${props.until}` : "전체 기간";
  return (
    <div className="min-w-0 flex-1">
      <p className="mb-1 text-xs font-semibold text-muted">신청 기간 (한국 시간)</p>
      <button
        type="button"
        aria-label={`신청 기간 선택: ${label}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-line-strong px-3 text-sm hover:border-primary"
      >
        <span>{label}</span>
        <CalendarIcon className="size-4 shrink-0 text-primary" />
      </button>
      {open && <RangeDialog {...props} onClose={() => setOpen(false)} />}
    </div>
  );
}

function RangeDialog({
  activityId,
  from,
  until,
  onChange,
  onClose,
}: Props & { onClose: () => void }) {
  const { dialogRef, closeRef } = useModalDialog();
  const id = useId();
  const today = getSeoulNowParts().date;
  const [start, setStart] = useState(from);
  const [end, setEnd] = useState(until);
  const [month, setMonth] = useState((from || today).slice(0, 7));
  const [focused, setFocused] = useState("");
  const daysRef = useRef<HTMLDivElement>(null);
  const markersFrom = `${month}-01`;
  const markersUntil = addDaysToDateKey(`${addMonthsToMonthKey(month, 2)}-01`, -1);
  const markers = useQuery({
    queryKey: ["referral", "application-dates", activityId, markersFrom, markersUntil],
    queryFn: ({ signal }) =>
      getReferralApplicationDates(activityId, markersFrom, markersUntil, signal),
    retry: false,
    gcTime: 0,
  });
  useEffect(() => {
    if (focused)
      daysRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)?.focus();
  }, [focused]);
  function moveMonth(delta: number) {
    const next = addMonthsToMonthKey(month, delta);
    setMonth(next);
    setFocused(`${next}-01`);
  }
  function select(day: string) {
    if (!start || end || day < start) {
      setStart(day);
      setEnd("");
    } else setEnd(day);
  }
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={id}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-0 h-dvh max-h-none w-screen max-w-none items-center justify-center overflow-hidden border-0 bg-transparent p-3 text-ink backdrop:bg-ink/45 open:flex"
    >
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      <div className="relative max-h-[calc(100dvh-24px)] w-full max-w-[640px] overflow-y-auto rounded-2xl bg-white p-4 shadow-xl">
        <header className="flex items-center justify-between gap-3">
          <h2 id={id} className="font-bold">
            신청 기간 선택
          </h2>
          <button
            ref={closeRef}
            type="button"
            aria-label="기간 선택 닫기"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full hover:bg-panel"
          >
            <XIcon className="size-4" />
          </button>
        </header>
        <div className="my-3 grid grid-cols-2 gap-2 text-sm">
          <div
            className={`rounded-xl border p-3 ${!start || end ? "border-primary" : "border-line-soft"}`}
          >
            <p className="text-xs text-muted">시작일</p>
            <p className="mt-1 font-semibold">{start || "날짜 선택"}</p>
          </div>
          <div
            className={`rounded-xl border p-3 ${start && !end ? "border-primary" : "border-line-soft"}`}
          >
            <p className="text-xs text-muted">종료일</p>
            <p className="mt-1 font-semibold">{end || "날짜 선택"}</p>
          </div>
        </div>
        <p aria-live="polite" className="mb-3 text-xs text-muted">
          {start && !end ? "종료일을 선택해 주세요." : "시작일, 종료일 순서로 선택해 주세요."}
        </p>
        <p className="mb-2 text-xs text-muted">● 신청 내역 있음 (취소 포함)</p>
        {markers.isPending && (
          <p role="status" className="text-xs text-muted">
            신청일 확인 중…
          </p>
        )}
        {markers.error && (
          <p role="alert" className="text-xs text-danger">
            신청일 표시를 불러오지 못했습니다. 기간 선택은 가능합니다.{" "}
            <button type="button" onClick={() => void markers.refetch()} className="underline">
              다시 시도
            </button>
          </p>
        )}
        <div className="mb-2 flex justify-between">
          <button
            type="button"
            aria-label="이전 달"
            disabled={month <= "1000-01"}
            onClick={() => moveMonth(-1)}
            className="flex size-9 items-center justify-center rounded-full hover:bg-panel disabled:opacity-30"
          >
            <ArrowLeftIcon className="size-4" />
          </button>
          <button
            type="button"
            aria-label="다음 달"
            disabled={month >= "9999-11"}
            onClick={() => moveMonth(1)}
            className="flex size-9 items-center justify-center rounded-full hover:bg-panel disabled:opacity-30"
          >
            <ArrowRightIcon className="size-4" />
          </button>
        </div>
        <div ref={daysRef} className="grid gap-5 sm:grid-cols-2">
          {[month, addMonthsToMonthKey(month, 1)].map((key, index) => (
            <section
              key={key}
              aria-label={formatMonthKeyTitle(key, "ko")}
              className={index ? "hidden sm:block" : ""}
            >
              <h3 className="mb-3 text-center text-sm font-bold">
                {formatMonthKeyTitle(key, "ko")}
              </h3>
              <div aria-hidden="true" className="grid grid-cols-7 text-center text-xs text-muted">
                {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-7 gap-y-1">
                {monthGridDateKeys(key).map((day, i) =>
                  day ? (
                    <button
                      key={day}
                      type="button"
                      data-date={day}
                      aria-label={day}
                      title={markers.data?.includes(day) ? "신청 내역 있음" : undefined}
                      aria-pressed={!!start && day >= start && day <= (end || start)}
                      aria-current={day === today ? "date" : undefined}
                      onClick={() => select(day)}
                      onKeyDown={(e) => {
                        const shift: Record<string, number> = {
                          ArrowLeft: -1,
                          ArrowRight: 1,
                          ArrowUp: -7,
                          ArrowDown: 7,
                        };
                        if (!(e.key in shift)) return;
                        e.preventDefault();
                        const next = addDaysToDateKey(day, shift[e.key]);
                        if (next < "1000-01-01" || next > "9999-11-30") return;
                        setMonth(next.slice(0, 7));
                        setFocused(next);
                      }}
                      className={`min-h-10 text-sm focus-visible:outline-2 focus-visible:outline-primary ${day === start || day === end ? "rounded-full bg-primary font-bold text-on-primary" : start && end && day > start && day < end ? "bg-primary-soft text-primary" : "rounded-full hover:bg-panel"}`}
                    >
                      <span className="flex flex-col items-center">
                        {Number(day.slice(-2))}
                        <span
                          aria-hidden="true"
                          className={`size-1 rounded-full ${markers.data?.includes(day) ? (day === start || day === end ? "bg-on-primary" : "bg-primary") : "bg-transparent"}`}
                        />
                      </span>
                    </button>
                  ) : (
                    <span key={`empty-${i}`} />
                  ),
                )}
              </div>
            </section>
          ))}
        </div>
        <footer className="mt-4 flex gap-2 border-t border-line-soft pt-4">
          <button
            type="button"
            onClick={() => {
              onChange("", "");
              onClose();
            }}
            className="min-h-11 flex-1 rounded-xl border border-line-strong text-sm font-semibold hover:bg-panel"
          >
            전체 기간
          </button>
          <button
            type="button"
            disabled={!start || !end}
            onClick={() => {
              onChange(start, end);
              onClose();
            }}
            className="min-h-11 flex-1 rounded-xl bg-primary text-sm font-semibold text-on-primary hover:bg-primary-hover disabled:opacity-40"
          >
            기간 적용
          </button>
        </footer>
      </div>
    </dialog>
  );
}
