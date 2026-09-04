import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { GoogleIcon } from "@/components/ui/icons";

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
    <main className="min-h-screen bg-white text-ink">
      <SiteHeader role="admin" authenticated={false} mayHaveSession={false} />
      <div className="mx-auto flex min-h-[calc(100vh-76px)] w-full max-w-[1200px] flex-col px-5 md:px-8">
        <div className="flex flex-1 items-center justify-center py-14 md:py-20">
          <section
            aria-labelledby="admin-login-heading"
            className="w-full max-w-[440px] rounded-[28px] border border-line-soft bg-white p-6 shadow-[0_24px_70px_rgba(38,27,24,0.08)] sm:p-9"
          >
            <h1
              id="admin-login-heading"
              className="text-center font-display text-3xl font-extrabold tracking-[-0.04em]"
            >
              관리자 로그인
            </h1>

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
          </section>
        </div>
      </div>
    </main>
  );
}
