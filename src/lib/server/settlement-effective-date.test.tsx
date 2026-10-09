import { render, cleanup } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LOCALES } from "@/i18n/routing";
import { policyRevisionExpectations } from "@/test/fixtures/policy-revision";
import { PolicyDocument } from "@/components/policy/PolicyDocument";
import { getPolicyDocument, getSignupAgreementDocuments } from "./policy-content";

describe("monthly settlement and confirmed effective date", () => {
  it.each(LOCALES)(
    "renders the monthly transfer deadline and effective date in %s",
    async (locale) => {
      const { deadline, holidays, effective, transfer } =
        policyRevisionExpectations[locale].settlement;
      const policy = await getPolicyDocument("buddy-commission-settlement-policy", locale);
      const { container } = render(<PolicyDocument locale={locale} source={policy.source} />);
      for (const clause of [deadline, holidays, effective, transfer])
        expect(container).toHaveTextContent(clause);
      cleanup();
      for (const slug of [
        "terms-of-service",
        "buddy-operation-terms",
        "consent-notices",
      ] as const) {
        const doc = await getPolicyDocument(slug, locale);
        const rendered = render(<PolicyDocument locale={locale} source={doc.source} />);
        expect(rendered.container).toHaveTextContent(effective);
        cleanup();
      }
      const documents = await getSignupAgreementDocuments("BUDDY", locale);
      for (const doc of Object.values(documents)) expect(doc.source).toContain(effective);
    },
  );
});
