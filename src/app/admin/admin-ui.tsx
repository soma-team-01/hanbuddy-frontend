"use client";

import { useEffect, useRef } from "react";
import { ArrowLeftIcon, ArrowRightIcon, XIcon } from "@/components/ui/icons";
import { SERVICE_TIME_ZONE } from "@/lib/datetime";
import type { AdminAccountStatus } from "@/types/admin";

const STATUS_STYLES: Record<AdminAccountStatus, string> = {
  ACTIVE: "border-success/25 bg-success-soft text-success",
  PENDING_APPROVAL: "border-warning/25 bg-warning-soft text-warning",
  REJECTED: "border-line-strong bg-panel text-muted",
  SUSPENDED: "border-danger/25 bg-primary-soft text-danger",
};

const STATUS_LABELS: Record<AdminAccountStatus, string> = {
  ACTIVE: "활성",
  PENDING_APPROVAL: "승인 대기",
  REJECTED: "승인 반려",
  SUSPENDED: "이용 정지",
};

export function AdminStatusBadge({ status }: { status: AdminAccountStatus }) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function AdminPageTitle({ title, aside }: { title: string; aside?: React.ReactNode }) {
  return (
    <div className="mt-5 flex items-end justify-between gap-4 border-b border-line-soft pb-4">
      <h1 className="font-display text-2xl font-extrabold tracking-[-0.04em] md:text-3xl">
        {title}
      </h1>
      {aside}
    </div>
  );
}

export function AdminPagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="페이지 이동" className="mt-4 flex items-center justify-end gap-2">
      <button
        type="button"
        aria-label="이전 페이지"
        disabled={page <= 0}
        onClick={() => onPage(page - 1)}
        className="flex size-9 items-center justify-center rounded-full border border-line-strong text-muted transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-35"
      >
        <ArrowLeftIcon className="size-4" />
      </button>
      <span className="min-w-20 text-center text-sm font-semibold text-muted">
        {page + 1} / {totalPages}
      </span>
      <button
        type="button"
        aria-label="다음 페이지"
        disabled={page >= totalPages - 1}
        onClick={() => onPage(page + 1)}
        className="flex size-9 items-center justify-center rounded-full border border-line-strong text-muted transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-35"
      >
        <ArrowRightIcon className="size-4" />
      </button>
    </nav>
  );
}

export function AdminState({
  title,
  description,
  action,
  actionLabel = "다시 시도",
}: {
  title: string;
  description: string;
  action?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-xl border border-line-soft bg-panel-raised px-5 py-9 text-center">
      <div className="mx-auto mb-3 h-1 w-8 rounded-full bg-primary" />
      <h2 className="font-display text-base font-bold">{title}</h2>
      <p className="mt-1.5 text-sm text-muted">{description}</p>
      {action ? (
        <button
          type="button"
          onClick={action}
          className="mt-4 rounded-full border border-primary px-4 py-1.5 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-white"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export function AdminLoadingRows() {
  return (
    <div aria-label="불러오는 중" className="space-y-2">
      {[1, 2, 3, 4].map((item) => (
        <div key={item} className="h-14 animate-pulse rounded-xl bg-panel" />
      ))}
    </div>
  );
}

export function formatAdminDate(value: string | null | undefined, includeTime = false) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    ...(includeTime ? { timeStyle: "short" as const } : {}),
    timeZone: SERVICE_TIME_ZONE,
  }).format(date);
}

export function AdminReasonDialog({
  title,
  description,
  confirmLabel,
  reason,
  error,
  pending,
  danger = false,
  onReason,
  onClose,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  reason: string;
  error?: string;
  pending: boolean;
  danger?: boolean;
  onReason: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => dialogRef.current?.showModal(), []);
  const valid = reason.trim().length > 0 && reason.trim().length <= 500;
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="admin-reason-title"
      onCancel={(event) => pending && event.preventDefault()}
      onClose={onClose}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-3xl border-0 bg-white p-0 text-ink shadow-2xl backdrop:bg-ink/45 backdrop:backdrop-blur-sm"
    >
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="admin-reason-title" className="font-display text-2xl font-extrabold">
              {title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
          </div>
          <button
            type="button"
            aria-label="닫기"
            disabled={pending}
            onClick={() => dialogRef.current?.close()}
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-panel hover:text-primary disabled:opacity-50"
          >
            <XIcon className="size-5" />
          </button>
        </div>
        <label htmlFor="admin-reason" className="mt-6 block text-sm font-bold">
          변경 사유
        </label>
        <textarea
          id="admin-reason"
          value={reason}
          maxLength={500}
          rows={5}
          onChange={(event) => onReason(event.target.value)}
          placeholder="관리자 작업 이력에 남길 사유를 입력해 주세요."
          className="mt-2 w-full resize-none rounded-xl border border-line-strong p-3 transition-colors outline-none focus:border-primary"
        />
        <p className="mt-1 text-right text-xs text-muted">{reason.length}/500</p>
        {error ? (
          <p role="alert" className="mt-3 text-sm font-medium text-danger">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={() => dialogRef.current?.close()}
            className="h-12 flex-1 rounded-xl border border-line-strong font-bold text-muted disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            disabled={pending || !valid}
            onClick={onConfirm}
            className={`h-12 flex-1 rounded-xl font-bold text-white disabled:opacity-40 ${danger ? "bg-danger" : "bg-primary hover:bg-primary-hover"}`}
          >
            {pending ? "처리 중" : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
