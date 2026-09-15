import type { SignupSource } from "@/lib/auth/signup-extra";
import type { AdminSignupInfo } from "@/types/admin";

const SOURCE_LABELS: Record<SignupSource, string> = {
  MEETUP: "Meetup",
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  FRIEND: "지인 추천",
  GOOGLE_SEARCH: "Google 검색",
  OFFLINE_PROMOTION: "오프라인 홍보",
  UNIVERSITY_COMMUNITY: "대학교 커뮤니티",
  OTHER: "기타",
};

/** Only mount in authenticated admin detail screens, never public profiles. */
export function AdminSignupInfoSection({ info }: Readonly<{ info: AdminSignupInfo }>) {
  return (
    <section className="mt-7 border-t border-line-soft pt-6">
      <h2 className="font-display text-lg font-bold">가입 정보</h2>
      <dl className="mt-4 grid gap-5 sm:grid-cols-3">
        <div className="min-w-0">
          <dt className="text-sm text-muted">가입 경로</dt>
          <dd className="mt-1 text-sm font-medium break-words">
            {info.signupSource ? (SOURCE_LABELS[info.signupSource] ?? info.signupSource) : "미입력"}
            {info.signupSource === "OTHER" && info.signupSourceDetail && (
              <span className="mt-1 block font-normal">{info.signupSourceDetail}</span>
            )}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-sm text-muted">은행</dt>
          <dd className="mt-1 text-sm font-medium break-words">
            {info.bankAccount?.bankName || "미입력"}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-sm text-muted">계좌번호</dt>
          <dd className="mt-1 text-sm font-medium break-all tabular-nums">
            {info.bankAccount?.accountNumber || "미입력"}
          </dd>
        </div>
      </dl>
    </section>
  );
}
