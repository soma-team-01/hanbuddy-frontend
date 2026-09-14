import { cleanup, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LOCALES, type Locale } from "@/i18n/routing";
import { renderWithIntl } from "@/test/render-with-intl";
import type { PolicyDocumentData } from "@/types/policy";
import type { SignupAgreementDocuments } from "@/lib/auth/signup-agreement-notices";
import PolicyPage, { generateMetadata } from "@/app/[locale]/(app)/policies/[slug]/page";
import InterceptedPolicyPage from "@/app/[locale]/@policy/(.)policies/[slug]/page";
import BookingPage from "@/app/[locale]/(app)/(tourist)/activities/[id]/book/page";
import ApplicationsPage from "@/app/[locale]/(app)/(with-nav)/(tourist)/applications/page";
import OnboardingPage from "@/app/[locale]/(app)/onboarding/page";
import BuddyOnboardingPage from "@/app/[locale]/buddy/onboarding/page";
import { getPolicyDocument } from "./policy-content";

vi.mock("next-intl/server", () => ({
  getTranslations:
    async ({ locale }: { locale: Locale }) =>
    (key: string, values?: { version: string }) =>
      `${locale}:${key}:${values?.version ?? ""}`,
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/components/policy/PolicyPageHeader", () => ({
  PolicyPageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));
vi.mock("@/components/policy/PolicyPageOverlay", () => ({
  PolicyPageOverlay: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div role="dialog" aria-label={title}>
      {children}
    </div>
  ),
}));
function RefundDocument({ refundPolicyDocument }: { refundPolicyDocument: PolicyDocumentData }) {
  return <div data-testid="refund-source">{refundPolicyDocument.source}</div>;
}
vi.mock("@/app/[locale]/(app)/(tourist)/activities/[id]/book/booking-content", () => ({
  BookingContent: (props: { refundPolicyDocument: PolicyDocumentData }) => (
    <RefundDocument {...props} />
  ),
}));
vi.mock("@/app/[locale]/(app)/(with-nav)/(tourist)/applications/applications-content", () => ({
  ApplicationsContent: (props: { refundPolicyDocument: PolicyDocumentData }) => (
    <RefundDocument {...props} />
  ),
}));
vi.mock("@/app/[locale]/(app)/onboarding/OnboardingForm", () => ({
  OnboardingForm: ({ agreementDocuments }: { agreementDocuments: SignupAgreementDocuments }) => (
    <div data-testid="signup-source">{agreementDocuments.TERMS_OF_SERVICE?.source}</div>
  ),
}));

describe("policy locale at server entry points", () => {
  it.each(LOCALES)(
    "passes %s to pages, metadata, booking, resume and signup documents",
    async (locale) => {
      const refund = await getPolicyDocument("cancellation-refund-policy", locale);
      const terms = await getPolicyDocument("terms-of-service", locale);
      const params = Promise.resolve({ locale, slug: "cancellation-refund-policy" });
      expect(await generateMetadata({ params })).toMatchObject({
        title: `${refund.title} | HanBuddy`,
        description: refund.title,
      });
      renderWithIntl(await PolicyPage({ params }), { locale });
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(refund.title);
      expect(
        screen.getByText(`${locale}:policyDocumentVersion:${refund.version}`),
      ).toBeInTheDocument();
      cleanup();

      renderWithIntl(await InterceptedPolicyPage({ params }), { locale });
      expect(screen.getByRole("dialog", { name: refund.title })).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(refund.title);
      expect(
        screen.getByText(`${locale}:policyDocumentVersion:${refund.version}`),
      ).toBeInTheDocument();
      cleanup();

      for (const page of [
        await BookingPage({
          params: Promise.resolve({ locale, id: "3" }),
          searchParams: Promise.resolve({}),
        }),
        await ApplicationsPage({ params: Promise.resolve({ locale }) }),
      ]) {
        renderWithIntl(page, { locale });
        expect(screen.getByTestId("refund-source").textContent).toBe(refund.source);
        cleanup();
      }
      for (const page of [OnboardingPage, BuddyOnboardingPage]) {
        renderWithIntl(await page({ params: Promise.resolve({ locale }) }), { locale });
        expect(screen.getByTestId("signup-source").textContent).toBe(terms.source);
        cleanup();
      }
    },
  );
});
