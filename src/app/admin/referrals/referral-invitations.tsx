"use client";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import Link from "next/link";
import { getAdminBuddy, getAdminUser } from "@/lib/api/admin";
import { initialBuddySearchCursor, searchReferralBuddies } from "@/lib/api/referral-admin-search";
import { getBuddyInvitationHistory } from "@/lib/api/referral-invitation-history";
import { issueReferralInvitation, revokeReferralInvitation } from "@/lib/api/referral";
import { unwrapApiResult } from "@/lib/query/result";
import { invitationState } from "@/lib/referral";
import { AdminPagination, formatAdminDate } from "@/app/admin/admin-ui";
import {
  ReferralError,
  referralButtonClass,
  referralInputClass,
} from "@/components/referral/ReferralApplicants";
import type { AdminBuddySummary } from "@/types/admin";

function InvitationIssuer({ userId }: { userId: number }) {
  const validId = Number.isSafeInteger(userId) && userId > 0;
  const issuer = useQuery({
    queryKey: ["referral", "invitation-issuer", userId],
    queryFn: async () => unwrapApiResult(await getAdminUser(userId), "user").displayName,
    enabled: validId,
    staleTime: 60_000,
    gcTime: 0,
    retry: false,
  });
  return (
    <span className="text-xs break-words text-muted">
      발급자 {issuer.data || (validId && issuer.isPending ? "확인 중…" : "확인 불가")}
    </span>
  );
}

function BuddySearchOption({
  buddy,
  checked,
  pending,
  onSelect,
}: {
  buddy: AdminBuddySummary;
  checked: boolean;
  pending: boolean;
  onSelect: () => void;
}) {
  const email = useQuery({
    queryKey: ["referral", "buddy-email", buddy.buddyId],
    // The list masks emails. Only the existing admin-authorized detail API returns
    // the full address; retain no other personal details in this query cache.
    queryFn: async () => unwrapApiResult(await getAdminBuddy(buddy.buddyId), "buddy").user.email,
    retry: false,
    staleTime: Infinity,
    gcTime: 0,
  });
  return (
    <div
      className={`rounded-xl border p-3 text-sm ${checked ? "border-primary" : "border-line-soft"}`}
    >
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="radio"
          disabled={pending || !email.data}
          name="partner"
          className="accent-primary"
          checked={checked}
          onChange={onSelect}
        />
        <span className="min-w-0">
          <strong className="block break-words">
            {buddy.displayName} · {buddy.name}
          </strong>
          <span className="block break-all text-muted">
            {email.data ?? (email.isError ? "이메일을 불러오지 못했습니다." : "이메일 확인 중…")}
          </span>
        </span>
      </label>
      {email.isError && (
        <button
          type="button"
          disabled={pending || email.isFetching}
          onClick={() => void email.refetch()}
          className="mt-2 text-primary underline"
        >
          이메일 다시 불러오기
        </button>
      )}
    </div>
  );
}

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
    queryKey: ["referral", "invitations", selected?.buddyId],
    queryFn: ({ signal }) => {
      if (!selected) throw new Error("Select a partner first");
      return getBuddyInvitationHistory(selected.buddyId, signal);
    },
    enabled: !!selected,
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
      setPage(0);
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
            setPage(0);
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
              <BuddySearchOption
                key={buddy.buddyId}
                buddy={buddy}
                pending={pending}
                checked={selected?.buddyId === buddy.buddyId}
                onSelect={() => {
                  setSelected(buddy);
                  setPage(0);
                }}
              />
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
              발급 직후에만 확인할 수 있는 링크입니다. 창을 닫기 전에 복사해 보관해 주세요.
            </p>
          </div>
        )}
      </section>
      {selected && (
        <section
          className="rounded-2xl border border-line-soft p-5"
          aria-label="등록 링크 발급 내역"
        >
          <h2 className="font-semibold">등록 링크 발급 내역</h2>
          <p className="my-4 text-xs leading-5 text-muted">
            {selected.displayName} 계정에 발급한 등록 링크입니다.
          </p>
          {list.isPending ? (
            <p>불러오는 중…</p>
          ) : list.error ? (
            <ReferralError error={list.error} admin retry={() => void list.refetch()} />
          ) : list.data ? (
            <>
              <div className="space-y-3">
                {!list.data.length && (
                  <p className="p-5 text-sm text-muted">이 업체에 발급한 등록 링크가 없습니다.</p>
                )}
                {list.data.slice(page * 20, (page + 1) * 20).map((item) => {
                  const state = invitationState(item);
                  return (
                    <article
                      key={item.invitationId}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line-soft p-4"
                    >
                      <div className="min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <p className="text-sm font-semibold text-ink">
                            발급 일시 {formatAdminDate(item.createdAt, true)}
                          </p>
                          <InvitationIssuer userId={item.issuedBy} />
                        </div>
                        <p className="text-xs text-muted">
                          만료 일시 {formatAdminDate(item.expiresAt, true)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          className={`text-xs font-semibold ${state === "available" ? "text-success" : state === "revoked" ? "text-danger" : "text-muted"}`}
                        >
                          {
                            {
                              used: "사용 완료",
                              revoked: "회수됨",
                              expired: "만료됨",
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
                            className="inline-flex min-h-8 items-center justify-center rounded-lg border border-primary px-3 text-xs font-semibold text-primary transition hover:bg-primary-soft disabled:opacity-40"
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
              <AdminPagination
                page={page}
                totalPages={Math.ceil(list.data.length / 20)}
                onPage={setPage}
              />
            </>
          ) : null}
        </section>
      )}
    </div>
  );
}
