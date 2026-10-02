"use client";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import Link from "next/link";
import { initialBuddySearchCursor, searchReferralBuddies } from "@/lib/api/referral-admin-search";
import {
  getReferralInvitations,
  issueReferralInvitation,
  revokeReferralInvitation,
} from "@/lib/api/referral";
import { unwrapApiResult } from "@/lib/query/result";
import { invitationState } from "@/lib/referral";
import { AdminPagination, formatAdminDate } from "@/app/admin/admin-ui";
import {
  ReferralError,
  referralButtonClass,
  referralInputClass,
} from "@/components/referral/ReferralApplicants";
import type { AdminBuddySummary } from "@/types/admin";

export function ReferralInvitations({
  onPendingChange,
  onNavigate,
}: {
  onPendingChange?: (pending: boolean) => void;
  onNavigate?: () => void;
}) {
  const client = useQueryClient();
  const [term, setTerm] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AdminBuddySummary | null>(null);
  const [days, setDays] = useState(7);
  const [page, setPage] = useState(0);
  const [issuedLink, setIssuedLink] = useState("");
  const [issuedFor, setIssuedFor] = useState<{ id: number; name: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState<unknown>(null);
  const list = useQuery({
    queryKey: ["referral", "invitations", page],
    queryFn: async () => unwrapApiResult(await getReferralInvitations(page), "data"),
    retry: false,
    gcTime: 0,
  });
  const buddies = useInfiniteQuery({
    queryKey: ["referral", "buddy-search-combined", search],
    initialPageParam: initialBuddySearchCursor,
    queryFn: ({ pageParam }) => searchReferralBuddies(search, pageParam),
    getNextPageParam: (last) => last.next,
    enabled: !!search,
    retry: false,
    gcTime: 0,
  });
  const uniqueBuddies = [
    ...new Map(
      buddies.data?.pages.flatMap((page) => page.buddies).map((buddy) => [buddy.buddyId, buddy]),
    ).values(),
  ];
  async function issue() {
    if (!selected || lock.current) return;
    lock.current = true;
    setPending(true);
    onPendingChange?.(true);
    setError(null);
    setIssuedLink("");
    setCopied(false);
    try {
      const result = unwrapApiResult(
        await issueReferralInvitation(
          selected.buddyId,
          new Date(Date.now() + days * 86400000).toISOString(),
        ),
        "data",
      );
      if (!result.code) throw new Error("Invitation code unavailable");
      setIssuedFor({ id: result.invitationId, name: selected.displayName });
      setIssuedLink(
        `${window.location.origin}/ko/referral/create#code=${encodeURIComponent(result.code)}`,
      );
      await client.invalidateQueries({ queryKey: ["referral", "invitations"] });
    } catch (failure) {
      setError(failure);
    } finally {
      lock.current = false;
      setPending(false);
      onPendingChange?.(false);
    }
  }
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-line-soft p-5 md:p-6">
        <h2 className="text-lg font-bold">업체 등록 링크 발급</h2>
        <form
          className="mt-4 flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!term.trim() || lock.current) return;
            if (search === term.trim()) void buddies.refetch();
            setSearch(term.trim());
            setSelected(null);
          }}
        >
          <label className="min-w-0 flex-1 text-xs font-semibold text-muted">
            업체 검색
            <input
              required
              disabled={pending}
              placeholder="닉네임, 이름 또는 이메일"
              className={referralInputClass}
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
          </label>
          <button type="submit" disabled={pending} className={referralButtonClass}>
            검색
          </button>
        </form>
        {search && buddies.isPending && <p className="mt-3 text-sm">검색 중…</p>}
        {buddies.error && (
          <ReferralError error={buddies.error} admin retry={() => void buddies.refetch()} />
        )}
        {buddies.data && (
          <div className="mt-4 space-y-2">
            {!uniqueBuddies.length && <p className="text-sm text-muted">검색 결과가 없습니다.</p>}
            {uniqueBuddies.map((buddy) => (
              <label
                key={buddy.buddyId}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${selected?.buddyId === buddy.buddyId ? "border-primary" : "border-line-soft"}`}
              >
                <input
                  type="radio"
                  disabled={pending}
                  name="partner"
                  className="accent-primary"
                  checked={selected?.buddyId === buddy.buddyId}
                  onChange={() => setSelected(buddy)}
                />
                <span className="min-w-0">
                  <strong className="block break-words">
                    {buddy.displayName} · {buddy.name}
                  </strong>
                  <span className="text-muted">{buddy.email}</span>
                </span>
              </label>
            ))}
            {buddies.hasNextPage && (
              <button
                type="button"
                className={referralButtonClass}
                disabled={buddies.isFetching || pending}
                onClick={() => void buddies.fetchNextPage()}
              >
                {buddies.isFetchingNextPage ? "불러오는 중…" : "검색 결과 더 보기"}
              </button>
            )}
          </div>
        )}
        {selected && (
          <div className="mt-5 flex flex-wrap items-end gap-3 border-t border-line-soft pt-4">
            <p className="w-full text-sm">
              <strong>{selected.displayName}</strong> 계정 전용 링크
            </p>
            <label className="text-xs font-semibold text-muted">
              유효 기간
              <select
                className={referralInputClass}
                value={days}
                disabled={pending}
                onChange={(e) => setDays(Number(e.target.value))}
              >
                {[1, 7, 14, 30].map((day) => (
                  <option key={day} value={day}>
                    {day}일
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={pending}
              onClick={() => void issue()}
              className={referralButtonClass}
            >
              {pending ? "발급 중…" : "링크 발급"}
            </button>
          </div>
        )}
        {error ? (
          <p role="alert" className="mt-4 text-sm text-danger">
            요청을 처리하지 못했습니다. 발급 결과가 불확실하면 아래 목록을 먼저 확인해 주세요.
          </p>
        ) : null}
        {issuedLink && (
          <div className="mt-5 space-y-3 rounded-xl border border-primary/30 p-4">
            <p className="text-sm font-bold">{issuedFor?.name} 등록 링크</p>
            <p className="text-sm font-semibold">이 링크는 지금만 복사할 수 있어요.</p>
            <input
              aria-label="발급된 등록 링크"
              readOnly
              value={issuedLink}
              className={referralInputClass}
              onFocus={(e) => e.target.select()}
            />
            <button
              type="button"
              className={referralButtonClass}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(issuedLink);
                  setCopied(true);
                } catch {
                  setCopied(false);
                }
              }}
            >
              {copied ? "복사 완료" : "링크 복사"}
            </button>
            <p className="text-xs text-muted">
              링크를 잃어버렸다면 아래에서 미사용 초대를 회수하고 다시 발급해 주세요.
            </p>
          </div>
        )}
      </section>
      <details className="rounded-2xl border border-line-soft p-5">
        <summary className="mb-4 cursor-pointer font-semibold">발급 내역</summary>
        {list.isPending ? (
          <p>불러오는 중…</p>
        ) : list.error ? (
          <ReferralError error={list.error} admin retry={() => void list.refetch()} />
        ) : list.data ? (
          <>
            <div className="space-y-3">
              {!list.data.content.length && (
                <p className="p-5 text-sm text-muted">발급 내역이 없습니다.</p>
              )}
              {list.data.content.map((item) => {
                const state = invitationState(item);
                return (
                  <article
                    key={item.invitationId}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line-soft p-4"
                  >
                    <div>
                      <p className="text-sm font-semibold">
                        초대 #{item.invitationId} · 업체 계정 #{item.buddyId}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        만료 {formatAdminDate(item.expiresAt, true)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm text-muted">
                        {
                          {
                            used: "사용 완료",
                            revoked: "회수",
                            expired: "만료",
                            available: "사용 가능",
                          }[state]
                        }
                      </span>
                      {item.activityId && (
                        <Link
                          href={`/admin/referrals?activityId=${item.activityId}`}
                          onClick={(e) => {
                            if (lock.current) e.preventDefault();
                            else onNavigate?.();
                          }}
                          aria-disabled={pending}
                          className="text-sm text-primary underline"
                        >
                          등록 활동
                        </Link>
                      )}
                      {state === "available" && (
                        <button
                          type="button"
                          disabled={pending}
                          className={referralButtonClass}
                          onClick={async () => {
                            if (
                              lock.current ||
                              !window.confirm(
                                "이 등록 링크를 회수할까요? 회수 후에는 사용할 수 없습니다.",
                              )
                            )
                              return;
                            lock.current = true;
                            setPending(true);
                            onPendingChange?.(true);
                            setError(null);
                            try {
                              unwrapApiResult(
                                await revokeReferralInvitation(item.invitationId),
                                "data",
                              );
                              if (issuedFor?.id === item.invitationId) setIssuedLink("");
                              await list.refetch();
                            } catch (failure) {
                              setError(failure);
                            } finally {
                              lock.current = false;
                              setPending(false);
                              onPendingChange?.(false);
                            }
                          }}
                        >
                          회수
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
            <AdminPagination page={page} totalPages={list.data.totalPages} onPage={setPage} />
          </>
        ) : null}
      </details>
    </div>
  );
}
