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
      <PageContainer className="flex flex-1 items-center justify-center py-12 md:py-20">
        <div className="relative w-full max-w-[460px] rounded-3xl border border-line-soft bg-canvas-soft px-6 py-10 text-center shadow-[0_20px_50px_rgba(61,45,43,0.12)] md:px-11 md:py-12">
          <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-2xl bg-primary font-display text-2xl font-extrabold text-white">
            H
          </div>
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
            className={`${errorCode ? "mt-6" : "mt-10"} flex h-14 w-full items-center justify-center gap-3 rounded-full border border-line-strong bg-canvas-soft font-display text-sm font-bold text-ink transition-colors hover:border-primary hover:bg-primary-soft`}
          >
            <GoogleIcon className="size-5" />
            {t("continueWithGoogle")}
          </Link>
        </div>
      </PageContainer>
    </main>
  );
}
