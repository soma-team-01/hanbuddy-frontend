import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/layout/PageContainer";
import type { Locale } from "@/i18n/routing";
import { parseAuthErrorCode } from "@/lib/auth/error-codes";
import { isReviewLoginEnabled } from "@/lib/auth/review-login";
import { sanitizeReturnToPath } from "@/lib/auth/return-to";
import { getPolicyPath } from "@/lib/policy-routes";
import { ReviewLoginForm } from "./review-login-form";
import { LoginMethods } from "@/components/auth/LoginMethods";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { pageAlternates } from "@/lib/seo/metadata";

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
    alternates: pageAlternates(locale, "/login"),
  };
}

export default async function LoginPage({ params, searchParams }: LoginPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Auth" });
  const { error, next } = await searchParams;
  const emailT = await getTranslations({ locale, namespace: "EmailAuth" });
  const errorValue = Array.isArray(error) ? error[0] : error;
  const errorCode = errorValue ? parseAuthErrorCode(errorValue) : null;
  const returnTo = sanitizeReturnToPath(Array.isArray(next) ? next[0] : next);
  const reviewLoginEnabled = isReviewLoginEnabled();
  const googleStartHref = returnTo
    ? `/api/auth/google/start?locale=${locale}&next=${encodeURIComponent(returnTo)}`
    : `/api/auth/google/start?locale=${locale}`;

  return (
    <main className="flex w-full flex-1 flex-col overflow-hidden bg-canvas-soft">
      <PageContainer className="relative flex flex-1 flex-col items-center justify-center py-9 md:py-14 lg:min-h-[calc(100svh-76px)]">
        <AuthPanel title={t("eyebrow")} description={t("introduction")}>
          {errorCode ? (
            <p
              role="alert"
              className="mb-5 rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
            >
              {t(`errors.${errorCode}`)}
            </p>
          ) : null}
          <LoginMethods locale={locale} returnTo={returnTo} googleHref={googleStartHref} />
          <p className="mt-6 border-t border-line-soft pt-5 text-center text-xs leading-5 text-muted">
            {t("legalNoticeStart")}{" "}
            <Link
              href={getPolicyPath(locale, "terms-of-service")}
              className="font-semibold text-primary underline underline-offset-2 hover:text-primary-hover focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
            >
              {t("termsOfService")}
            </Link>{" "}
            {t("legalNoticeMiddle")}{" "}
            <Link
              href={getPolicyPath(locale, "privacy-policy")}
              className="font-semibold text-primary underline underline-offset-2 hover:text-primary-hover focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
            >
              {t("privacyPolicy")}
            </Link>
            {t("legalNoticeEnd")}
          </p>
          {reviewLoginEnabled && (
            <details className="mt-5 border-t border-line-soft pt-4 text-left">
              <summary className="cursor-pointer text-xs text-muted focus-visible:outline-2 focus-visible:outline-primary-strong">
                {emailT("review")}
              </summary>
              <div className="mt-4">
                <ReviewLoginForm locale={locale} returnTo={returnTo} ariaLabel={emailT("review")} />
              </div>
            </details>
          )}
        </AuthPanel>

        <div className="hidden lg:contents">
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
                src="/images/landing/kbo-0913-bear-ears.webp"
                alt={t("visualRightAlt")}
                fill
                sizes="(min-width: 1440px) 232px, (min-width: 1024px) 176px, 45vw"
                className="object-cover object-[50%_32%]"
              />
            </span>
            <figcaption>{t("visualRightCaption")}</figcaption>
          </figure>

          <figure className="login-polaroid login-polaroid-3">
            <span className="login-polaroid-tape" aria-hidden="true" />
            <span className="login-polaroid-frame">
              <Image
                src="/images/landing/kbo-0912-mascot-crew.webp"
                alt={t("visualBottomLeftAlt")}
                fill
                sizes="(min-width: 1440px) 232px, (min-width: 1024px) 176px, 45vw"
                className="object-cover object-[50%_68%]"
              />
            </span>
            <figcaption>{t("visualBottomLeftCaption")}</figcaption>
          </figure>

          <figure className="login-polaroid login-polaroid-4">
            <span className="login-polaroid-tape" aria-hidden="true" />
            <span className="login-polaroid-frame">
              <Image
                src="/images/landing/kbo-0905-dome-seats.webp"
                alt={t("visualBottomRightAlt")}
                fill
                sizes="(min-width: 1440px) 232px, (min-width: 1024px) 176px, 45vw"
                className="object-cover object-[55%_50%]"
              />
            </span>
            <figcaption>{t("visualBottomRightCaption")}</figcaption>
          </figure>
        </div>
      </PageContainer>
    </main>
  );
}
