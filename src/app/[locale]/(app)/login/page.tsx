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
    <main className="flex w-full flex-1 flex-col bg-canvas">
      <PageContainer className="flex flex-1 items-center justify-center py-10 md:py-16">
        <div className="w-full max-w-lg rounded-2xl border border-line-soft bg-panel px-6 py-10 text-center shadow-sm md:px-10 md:py-12">
          <h1 className="font-display text-3xl leading-tight font-bold text-ink md:text-4xl">
            {t("welcome")}
          </h1>
          <p className="mt-4 text-muted">{t("introduction")}</p>
          {errorCode ? (
            <p
              role="alert"
              className="mt-6 rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-left text-sm text-danger"
            >
              {t(`errors.${errorCode}`)}
            </p>
          ) : null}
          <Link
            href={`/api/auth/google/start?locale=${locale}`}
            prefetch={false}
            className={`${errorCode ? "mt-6" : "mt-10"} flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-line-strong bg-panel font-display text-sm font-bold text-ink transition-colors hover:bg-panel-raised`}
          >
            <GoogleIcon className="size-5" />
            {t("continueWithGoogle")}
          </Link>
        </div>
      </PageContainer>
      <footer className="flex flex-col items-center gap-3 border-t border-line-soft px-6 py-8 text-center">
        <p className="font-display text-sm font-bold text-primary-strong">HanBuddy</p>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted">
          <span className="underline">{t("privacyPolicy")}</span>
          <span className="underline">{t("termsOfService")}</span>
          <span className="underline">{t("helpCenter")}</span>
        </div>
        <p className="text-xs text-muted">{t("copyright")}</p>
      </footer>
    </main>
  );
}
