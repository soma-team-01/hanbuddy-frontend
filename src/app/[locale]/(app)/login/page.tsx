import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/layout/PageContainer";
import { GoogleIcon } from "@/components/ui/icons";
import type { Locale } from "@/i18n/routing";
import { parseAuthErrorCode } from "@/lib/auth/error-codes";

const APP_ORIGIN = "https://hanbuddy-frontend.vercel.app";

interface LoginPageProps {
  readonly params: Promise<{ locale: Locale }>;
  readonly searchParams: Promise<{ error?: string | string[] }>;
}

export async function generateMetadata({
  params,
}: Pick<LoginPageProps, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Auth" });

  return {
    title: t("metadataTitle"),
    description: t("metadataDescription"),
    alternates: {
      canonical: `${APP_ORIGIN}/${locale}/login`,
      languages: {
        en: `${APP_ORIGIN}/en/login`,
        ko: `${APP_ORIGIN}/ko/login`,
      },
    },
  };
}

export default async function LoginPage({ params, searchParams }: LoginPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Auth" });
  const { error } = await searchParams;
  const errorValue = Array.isArray(error) ? error[0] : error;
  const errorCode = errorValue ? parseAuthErrorCode(errorValue) : null;

  return (
    <main className="flex w-full flex-1 flex-col bg-canvas-soft">
      <PageContainer className="flex flex-1 items-center justify-center py-16 md:py-24">
        <div className="w-full max-w-[620px] text-center">
          <p className="font-display text-xs font-bold tracking-[0.28em] text-primary uppercase">
            {t("eyebrow")}
          </p>
          <h1 className="mt-5 font-display text-4xl leading-tight font-bold tracking-[-0.04em] text-ink md:text-6xl">
            {t("welcome")}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-muted md:text-lg">
            {t("introduction")}
          </p>
          {errorCode ? (
            <p
              role="alert"
              className="mx-auto mt-8 max-w-[520px] rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-left text-sm text-danger"
            >
              {t(`errors.${errorCode}`)}
            </p>
          ) : null}
          <Link
            href={`/api/auth/google/start?locale=${locale}`}
            prefetch={false}
            className={`${errorCode ? "mt-6" : "mt-10"} mx-auto flex h-14 w-full max-w-[520px] items-center justify-center gap-3 rounded-2xl border border-line-soft bg-canvas-soft font-display text-sm font-bold text-ink shadow-[0_8px_24px_rgba(61,45,43,0.06)] transition-colors hover:border-primary hover:bg-primary-soft`}
          >
            <GoogleIcon className="size-5" />
            {t("continueWithGoogle")}
          </Link>
        </div>
      </PageContainer>
    </main>
  );
}
