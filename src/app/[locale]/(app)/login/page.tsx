import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
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
    <main className="flex flex-1 flex-col">
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="w-full rounded-2xl border border-line bg-white px-6 py-10 text-center shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
          <h1 className="font-display text-3xl leading-tight font-semibold text-forest">
            {t("welcome")}
          </h1>
          <p className="mt-4 text-ink-soft">{t("introduction")}</p>
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
            className={`${errorCode ? "mt-6" : "mt-10"} flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-line-strong bg-white font-display text-sm font-semibold text-ink transition-colors hover:bg-chip`}
          >
            <GoogleIcon className="size-5" />
            {t("continueWithGoogle")}
          </Link>
        </div>
      </div>
      <footer className="flex flex-col items-center gap-3 border-t border-line px-6 py-8 text-center">
        <p className="font-display text-sm font-semibold text-forest">HanBuddy</p>
        <div className="flex justify-center gap-6 text-xs text-ink-soft">
          <span className="underline">{t("privacyPolicy")}</span>
          <span className="underline">{t("termsOfService")}</span>
          <span className="underline">{t("helpCenter")}</span>
        </div>
        <p className="text-xs text-ink-soft">{t("copyright")}</p>
      </footer>
    </main>
  );
}
