import Link from "next/link";

const ERROR_MESSAGES: Record<string, string> = {
  adminOnly: "관리자 계정으로만 접근할 수 있습니다.",
  adminAccountRequired: "등록된 관리자 계정이 아닙니다.",
  configuration: "로그인 설정을 확인해 주세요.",
  serverUnavailable: "인증 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden border-r border-line-soft bg-white p-14 lg:flex lg:flex-col lg:justify-between">
        <Link
          href="/admin/login"
          className="flex items-center gap-3 font-display text-xl font-extrabold"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-white">
            H
          </span>
          HanBuddy
        </Link>
        <div className="max-w-xl">
          <p className="mb-5 text-sm font-bold tracking-[0.24em] text-primary uppercase">
            Admin workspace
          </p>
          <h1 className="font-display text-5xl leading-[1.08] font-extrabold tracking-[-0.04em]">
            좋은 만남이 시작되기 전,
            <br />
            신뢰할 수 있는 버디를 확인합니다.
          </h1>
          <p className="mt-7 max-w-lg text-lg leading-8 text-muted">
            신청자의 프로필과 연락 정보를 검토하고 HanBuddy의 새로운 버디를 승인하세요.
          </p>
        </div>
        <p className="text-sm text-muted">© 2026 HanBuddy. Admin access only.</p>
      </section>
      <section className="flex min-h-screen items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <span className="font-display text-xl font-extrabold">HanBuddy</span>
          </div>
          <p className="text-sm font-bold tracking-[0.22em] text-primary uppercase">Welcome back</p>
          <h2 className="mt-4 font-display text-3xl font-extrabold tracking-[-0.035em]">
            관리자 로그인
          </h2>
          <p className="mt-3 leading-7 text-muted">
            관리자 권한이 등록된 Google 계정으로 로그인해 주세요.
          </p>
          {error ? (
            <p
              role="alert"
              className="mt-6 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger"
            >
              {ERROR_MESSAGES[error] ?? "로그인에 실패했습니다. 다시 시도해 주세요."}
            </p>
          ) : null}
          <Link
            href="/api/auth/google/start?intent=admin"
            prefetch={false}
            className="mt-8 flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-primary font-display font-bold text-white shadow-[0_12px_30px_rgba(209,63,50,0.2)] transition-colors hover:bg-primary-hover"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-white font-bold text-primary">
              G
            </span>
            Google로 관리자 로그인
          </Link>
          <p className="mt-5 text-center text-xs leading-5 text-muted">
            접근 권한이 없다면 시스템 관리자에게 문의해 주세요.
          </p>
        </div>
      </section>
    </main>
  );
}
