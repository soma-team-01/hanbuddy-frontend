import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/layout/PageContainer";
import { GoogleIcon } from "@/components/ui/icons";
import type { Locale } from "@/i18n/routing";
import { parseAuthErrorCode } from "@/lib/auth/error-codes";
import { sanitizeReturnToPath } from "@/lib/auth/return-to";

const APP_ORIGIN = "https://hanbuddy-frontend.vercel.app";

interface LoginPageProps {
  readonly params: Promise<{ locale: Locale }>;
  readonly searchParams: Promise<{ error?: string | string[]; next?: string | string[] }>;
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
        ja: `${APP_ORIGIN}/ja/login`,
        "zh-Hans": `${APP_ORIGIN}/zh-Hans/login`,
        "zh-Hant": `${APP_ORIGIN}/zh-Hant/login`,
      },
    },
  };
}

export default async function LoginPage({ params, searchParams }: LoginPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Auth" });
  const { error, next } = await searchParams;
  const errorValue = Array.isArray(error) ? error[0] : error;
  const errorCode = errorValue ? parseAuthErrorCode(errorValue) : null;
  const returnTo = sanitizeReturnToPath(Array.isArray(next) ? next[0] : next);
  const googleStartHref = returnTo
    ? `/api/auth/google/start?locale=${locale}&next=${encodeURIComponent(returnTo)}`
    : `/api/auth/google/start?locale=${locale}`;

  return (
    <main className="flex w-full flex-1 flex-col overflow-hidden bg-canvas-soft">
      <PageContainer className="relative flex flex-1 flex-col items-center justify-center py-12 md:py-20 lg:min-h-[calc(100svh-76px)]">
        <div className="relative z-10 w-full max-w-[620px] text-center">
          <p className="font-display text-xs font-bold tracking-[0.28em] text-primary uppercase">
            {t("eyebrow")}
          </p>
          <h1 className="mt-5 font-display text-4xl leading-tight font-bold tracking-[-0.04em] text-ink md:text-5xl">
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
            href={googleStartHref}
            prefetch={false}
            className={`${errorCode ? "mt-6" : "mt-10"} motion-press relative mx-auto flex h-14 w-full max-w-[520px] items-center justify-center rounded-full border border-primary bg-primary px-16 font-display text-sm font-bold text-on-primary shadow-[0_12px_28px_rgba(209,63,50,0.28)] transition-colors hover:border-primary-hover hover:bg-primary-hover`}
          >
            <span className="absolute left-3 flex size-9 items-center justify-center rounded-full bg-white shadow-sm sm:left-4">
              <GoogleIcon className="size-5" />
            </span>
            <span>{t("continueWithGoogle")}</span>
          </Link>
          <p className="mx-auto mt-5 max-w-[520px] text-xs leading-5 text-muted">
            {t("legalNoticeStart")}{" "}
            <span className="font-semibold text-primary underline underline-offset-2">
              {t("termsOfService")}
            </span>{" "}
            {t("legalNoticeMiddle")}{" "}
            <span className="font-semibold text-primary underline underline-offset-2">
              {t("privacyPolicy")}
            </span>
            {t("legalNoticeEnd")}
          </p>
        </div>

        <div className="mt-12 grid w-full max-w-[430px] grid-cols-2 gap-x-3 gap-y-7 px-4 lg:contents">
          <figure className="login-polaroid login-polaroid-1">
            <span className="login-polaroid-tape" aria-hidden="true" />
            <span className="login-polaroid-frame">
              <Image
                src="/images/landing/kbo-0726-group.webp"
                alt={t("visualAlt")}
                fill
                sizes="(min-width: 1440px) 232px, (min-width: 1024px) 176px, 45vw"
                className="object-cover object-[60%_40%]"
              />
            </span>
            <figcaption>{t("visualCaption")}</figcaption>
          </figure>

          <figure className="login-polaroid login-polaroid-2">
            <span className="login-polaroid-tape" aria-hidden="true" />
            <span className="login-polaroid-frame">
              <Image
                src="/images/landing/1차-1.webp"
                alt={t("visualRightAlt")}
                fill
                sizes="(min-width: 1440px) 232px, (min-width: 1024px) 176px, 45vw"
                className="object-cover object-[50%_30%]"
              />
            </span>
            <figcaption>{t("visualRightCaption")}</figcaption>
          </figure>

          <figure className="login-polaroid login-polaroid-3">
            <span className="login-polaroid-tape" aria-hidden="true" />
            <span className="login-polaroid-frame">
              <Image
                src="/images/landing/hanriver-fountain.webp"
                alt={t("visualBottomLeftAlt")}
                fill
                sizes="(min-width: 1440px) 232px, (min-width: 1024px) 176px, 45vw"
                className="object-cover"
              />
            </span>
            <figcaption>{t("visualBottomLeftCaption")}</figcaption>
          </figure>

          <figure className="login-polaroid login-polaroid-4">
            <span className="login-polaroid-tape" aria-hidden="true" />
            <span className="login-polaroid-frame">
              <Image
                src="/images/landing/hanriver-food.webp"
                alt={t("visualBottomRightAlt")}
                fill
                sizes="(min-width: 1440px) 232px, (min-width: 1024px) 176px, 45vw"
                className="object-cover object-[50%_55%]"
              />
            </span>
            <figcaption>{t("visualBottomRightCaption")}</figcaption>
          </figure>
        </div>
      </PageContainer>
    </main>
  );
}
