"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { approveBuddyApplication, rejectBuddyApplication } from "@/lib/api/admin";
import { isUnauthenticatedError } from "@/lib/api/errors";
import { SERVICE_TIME_ZONE } from "@/lib/datetime";
import { adminBuddyApplicationQueryOptions, adminKeys } from "@/lib/query/admin";
import { unwrapApiResult } from "@/lib/query/result";

export function BuddyApplicationReview({ userId }: { userId: string }) {
  const router = useRouter();
  const client = useQueryClient();
  const query = useQuery(adminBuddyApplicationQueryOptions(userId));
  const [mode, setMode] = useState<"approve" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const [actionError, setActionError] = useState("");
  const mutation = useMutation({
    mutationFn: async () =>
      mode === "approve"
        ? unwrapApiResult(await approveBuddyApplication(userId), "message")
        : unwrapApiResult(
            await rejectBuddyApplication(userId, { reason: reason.trim() }),
            "message",
          ),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: adminKeys.all });
      setMode(null);
      router.push("/admin/buddy-applications");
    },
    onError: (error) =>
      setActionError(error instanceof Error ? error.message : "처리하지 못했습니다."),
  });

  if (query.isPending)
    return (
      <main className="mx-auto max-w-[1000px] px-5 py-16 md:px-8">
        <div className="h-96 animate-pulse rounded-3xl bg-panel" />
      </main>
    );
  if (isUnauthenticatedError(query.error))
    return (
      <main className="mx-auto max-w-[1000px] px-5 py-24 text-center md:px-8">
        <h1 className="font-display text-2xl font-bold">관리자 세션이 만료되었습니다.</h1>
        <p className="mt-3 text-muted">다시 로그인한 뒤 신청 정보를 확인해 주세요.</p>
        <button
          type="button"
          onClick={() => router.replace("/admin/login")}
          className="mt-6 font-bold text-primary underline"
        >
          다시 로그인
        </button>
      </main>
    );
  if (query.error || !query.data)
    return (
      <main className="mx-auto max-w-[1000px] px-5 py-24 text-center md:px-8">
        <h1 className="font-display text-2xl font-bold">신청 정보를 불러오지 못했습니다.</h1>
        <Link href="/admin/buddy-applications" className="mt-6 inline-block text-primary underline">
          목록으로 돌아가기
        </Link>
      </main>
    );
  const application = query.data;
  const pending = application.accountStatus === "PENDING_APPROVAL";

  return (
    <main className="mx-auto w-full max-w-[1000px] px-5 py-10 md:px-8 md:py-14">
      <Link
        href="/admin/buddy-applications"
        className="text-sm font-bold text-muted transition-colors hover:text-primary"
      >
        ← 신청 목록
      </Link>
      <div className="mt-7 flex flex-col gap-7 border-b border-line-soft pb-8 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-5">
          <Avatar name={application.name} src={application.profileImageUrl} size={76} eagerImage />
          <div>
            <p className="text-sm font-bold tracking-[0.18em] text-primary uppercase">
              Buddy applicant
            </p>
            <h1 className="mt-2 font-display text-3xl font-extrabold tracking-[-0.035em]">
              {application.name}
            </h1>
            <p className="mt-1 text-muted">{application.email}</p>
          </div>
        </div>
        <span className="w-fit rounded-full bg-primary-soft px-4 py-2 text-sm font-bold text-primary-strong">
          {statusLabel(application.accountStatus)}
        </span>
      </div>
      <div className="grid gap-10 py-9 lg:grid-cols-2">
        <Section title="기본 정보">
          <Info label="사용자 ID" value={String(application.userId)} />
          <Info label="국적" value={application.nationalityCode} />
          <Info label="생년월일" value={application.birthDate} />
          <Info label="신청일" value={formatDateTime(application.appliedAt)} />
        </Section>
        <Section title="연락 정보">
          <Info label="연락 수단" value={application.contactMethod} />
          <Info label="국가 코드" value={application.contactCountryCode || "-"} />
          <Info label="연락처" value={application.contactIdentifier} />
          <Info label="검토자" value={application.reviewedByName || "아직 검토되지 않음"} />
        </Section>
      </div>
      {application.rejectionReason ? (
        <div className="border-l-4 border-primary bg-primary-soft/50 px-5 py-4">
          <p className="text-sm font-bold text-primary-strong">거절 사유</p>
          <p className="mt-2 text-muted">{application.rejectionReason}</p>
        </div>
      ) : null}
      {pending ? (
        <div className="mt-10 flex flex-col justify-end gap-3 border-t border-line-soft pt-7 sm:flex-row">
          <button
            onClick={() => {
              setActionError("");
              setMode("reject");
            }}
            className="h-12 rounded-xl border border-primary px-7 font-display font-bold text-primary transition-colors hover:bg-primary-soft"
          >
            거절
          </button>
          <button
            onClick={() => {
              setActionError("");
              setMode("approve");
            }}
            className="h-12 rounded-xl bg-primary px-8 font-display font-bold text-white transition-colors hover:bg-primary-hover"
          >
            버디 승인
          </button>
        </div>
      ) : null}
      {mode ? (
        <ReviewDialog
          mode={mode}
          reason={reason}
          error={actionError}
          pending={mutation.isPending}
          onReason={setReason}
          onClose={() => !mutation.isPending && setMode(null)}
          onSubmit={() => mutation.mutate()}
        />
      ) : null}
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-lg font-extrabold">{title}</h2>
      <dl className="mt-5 divide-y divide-line-soft border-y border-line-soft">{children}</dl>
    </section>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-4 py-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="min-w-0 font-medium break-words">{value}</dd>
    </div>
  );
}
function statusLabel(status: string) {
  return (
    (
      {
        PENDING_APPROVAL: "승인 대기",
        ACTIVE: "승인 완료",
        REJECTED: "승인 거절",
        SUSPENDED: "이용 정지",
      } as Record<string, string>
    )[status] ?? status
  );
}
function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : new Intl.DateTimeFormat("ko-KR", {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: SERVICE_TIME_ZONE,
      }).format(date);
}

function ReviewDialog({
  mode,
  reason,
  error,
  pending,
  onReason,
  onClose,
  onSubmit,
}: {
  mode: "approve" | "reject";
  reason: string;
  error: string;
  pending: boolean;
  onReason: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const reject = mode === "reject";
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="review-dialog-title"
      onCancel={(event) => pending && event.preventDefault()}
      onClose={onClose}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-3xl bg-white p-0 text-ink shadow-2xl backdrop:bg-ink/45 backdrop:backdrop-blur-sm"
    >
      <div className="p-6 sm:p-8">
        <h2 id="review-dialog-title" className="font-display text-2xl font-extrabold">
          {reject ? "버디 신청을 거절할까요?" : "이 신청자를 버디로 승인할까요?"}
        </h2>
        <p className="mt-3 leading-7 text-muted">
          {reject
            ? "신청자에게 전달할 구체적인 거절 사유를 입력해 주세요."
            : "승인하면 신청자의 버디 프로필이 생성됩니다."}
        </p>
        {reject ? (
          <>
            <label htmlFor="reject-reason" className="mt-5 block text-sm font-bold">
              거절 사유
            </label>
            <textarea
              id="reject-reason"
              value={reason}
              onChange={(event) => onReason(event.target.value)}
              maxLength={500}
              rows={5}
              className="mt-2 w-full resize-none rounded-xl border border-line-strong p-3 outline-none focus:border-primary"
              placeholder="거절 사유를 입력해 주세요."
            />
            <p className="mt-1 text-right text-xs text-muted">{reason.length}/500</p>
          </>
        ) : null}
        {error ? (
          <p role="alert" className="mt-4 text-sm text-danger">
            {error}
          </p>
        ) : null}
        <div className="mt-7 flex gap-3">
          <button
            disabled={pending}
            onClick={() => dialogRef.current?.close()}
            className="h-12 flex-1 rounded-xl border border-line-strong font-bold disabled:opacity-50"
          >
            취소
          </button>
          <button
            disabled={pending || (reject && !reason.trim())}
            onClick={onSubmit}
            className="h-12 flex-1 rounded-xl bg-primary font-bold text-white disabled:opacity-50"
          >
            {pending ? "처리 중" : reject ? "거절하기" : "승인하기"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
