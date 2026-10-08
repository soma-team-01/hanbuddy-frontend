import { cleanup, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LOCALES } from "@/i18n/routing";
import { policyRevisionExpectations } from "@/test/fixtures/policy-revision";
import { PolicyDocument } from "@/components/policy/PolicyDocument";
import { getPolicyDocument, getSignupAgreementDocuments } from "./policy-content";

describe("Buddy-attributable cancellation terms", () => {
  it.each(LOCALES)(
    "shows the revised conditions in public and signup %s documents",
    async (locale) => {
      const {
        timing,
        excludedMinimumParticipantText: minimum,
        discretion,
        venue,
        safety,
        weather,
        previousDate,
      } = policyRevisionExpectations[locale].cancellation;
      const operation = await getPolicyDocument("buddy-operation-terms", locale);
      const settlement = await getPolicyDocument("buddy-commission-settlement-policy", locale);
      for (const doc of [operation, settlement]) {
        const { container } = render(<PolicyDocument locale={locale} source={doc.source} />);
        for (const phrase of [timing, discretion, "20%", previousDate])
          expect(container).toHaveTextContent(phrase);
        expect(container).not.toHaveTextContent(minimum);
        expect(doc.version).toBe("2026-10-08");
        cleanup();
      }
      const cancellation = operation.source.split(/^## /m)[4];
      for (const phrase of [venue, safety, weather]) expect(cancellation).toContain(phrase);
      expect(cancellation).not.toMatch(/7일|7 days|7日|7天/);
      expect(settlement.source.split(/^## /m)[3]).not.toMatch(/7일|7 days|7日|7天/);
      const documents = await getSignupAgreementDocuments("BUDDY", locale);
      expect(documents.BUDDY_OPERATION_TERMS).toEqual({
        version: operation.version,
        source: operation.source,
      });
      expect(documents.BUDDY_COMMISSION_POLICY).toEqual({
        version: settlement.version,
        source: settlement.source,
      });
    },
  );
});
