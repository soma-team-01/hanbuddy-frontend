import Image from "next/image";
import Link from "next/link";
import { CheckCircleIcon, GoogleIcon, HistoryIcon, UsersIcon } from "@/components/ui/icons";

const ERROR_MESSAGES: Record<string, string> = {
  adminOnly: "관리자 계정으로만 접근할 수 있습니다.",
  adminAccountRequired: "등록된 관리자 계정이 아닙니다.",
  configuration: "로그인 설정을 확인해 주세요.",
  serverUnavailable: "인증 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.",
};

const ADMIN_CAPABILITIES = [
  {
    title: "회원 상태 관리",
    description: "회원 상태와 이용 이력을 한곳에서 확인합니다.",
    icon: UsersIcon,
  },
  {
    title: "버디 자격 검토",
    description: "신청 정보와 프로필을 바탕으로 운영 자격을 검토합니다.",
    icon: CheckCircleIcon,
  },
  {
    title: "운영 이력 확인",
    description: "주요 관리 작업과 변경 내역을 투명하게 관리합니다.",
    icon: HistoryIcon,
  },
] as const;

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="min-h-screen bg-canvas text-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-[1200px] flex-col px-5 py-6 md:px-8 md:py-8">
        <header className="flex items-center justify-between">
          <Link
            href="/admin/login"
            className="flex items-center gap-3 font-display text-xl font-extrabold tracking-[-0.025em]"
          >
            <Image
              src="/images/brand/logo-borderless.webp"
              alt=""
              width={36}
              height={36}
              className="size-9"
              priority
            />
            HanBuddy
          </Link>
          <span className="rounded-full border border-line-soft bg-white px-3 py-1.5 text-xs font-semibold tracking-[0.14em] text-muted uppercase">
            Admin
          </span>
        </header>

        <div className="grid flex-1 items-center gap-12 py-14 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-20 lg:py-20">
          <section className="max-w-2xl">
            <p className="text-sm font-bold tracking-[0.24em] text-primary uppercase">
              Admin console
            </p>
            <h1 className="mt-5 max-w-xl font-display text-[clamp(2.5rem,5vw,4.5rem)] leading-[1.08] font-extrabold tracking-[-0.055em]">
              서비스의 신뢰를
              <br />
              한곳에서 관리합니다.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted md:text-lg md:leading-8">
              회원과 버디의 상태를 확인하고, 필요한 운영 조치를 정확하게 처리하세요.
            </p>

            <div className="mt-10 grid gap-3 sm:grid-cols-3 lg:max-w-2xl">
              {ADMIN_CAPABILITIES.map(({ title, description, icon: Icon }) => (
                <div key={title} className="border-t border-line-strong pt-4">
                  <Icon className="size-5 text-primary" />
                  <h2 className="mt-3 font-display text-sm font-bold">{title}</h2>
                  <p className="mt-1.5 text-xs leading-5 text-muted">{description}</p>
                </div>
              ))}
            </div>
          </section>

          <section
            aria-labelledby="admin-login-heading"
            className="rounded-[28px] border border-line-soft bg-white p-6 shadow-[0_24px_70px_rgba(38,27,24,0.08)] sm:p-9"
          >
            <p className="text-xs font-bold tracking-[0.2em] text-primary uppercase">
              Secure access
            </p>
            <h2
              id="admin-login-heading"
              className="mt-4 font-display text-3xl font-extrabold tracking-[-0.04em]"
            >
              관리자 로그인
            </h2>
            <p className="mt-3 leading-7 text-muted">
              관리자 권한이 등록된 Google 계정으로 로그인해 주세요.
            </p>

            {error ? (
              <p
                role="alert"
                className="mt-6 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm leading-6 text-danger"
              >
                {ERROR_MESSAGES[error] ?? "로그인에 실패했습니다. 다시 시도해 주세요."}
              </p>
            ) : null}

            <Link
              href="/api/auth/google/start?intent=admin"
              prefetch={false}
              className="mt-8 flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-primary px-5 font-display font-bold text-white shadow-[0_12px_30px_rgba(209,63,50,0.2)] transition-[background-color,transform,box-shadow] hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-[0_16px_34px_rgba(209,63,50,0.24)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-white">
                <GoogleIcon className="size-4" />
              </span>
              Google로 관리자 로그인
            </Link>
            <p className="mt-5 text-center text-xs leading-5 text-muted">
              접근 권한이 없다면 시스템 관리자에게 문의해 주세요.
            </p>
          </section>
        </div>

        <footer className="flex flex-col gap-1 border-t border-line-soft pt-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 HanBuddy</p>
          <p>Authorized administrators only</p>
        </footer>
      </div>
    </main>
  );
}
