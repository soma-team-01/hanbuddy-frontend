import { screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { PayPalAuthorizationNotice } from "./PayPalAuthorizationNotice";

it.each(["AUTHORIZED", "VOIDED"] as const)(
  "uses compact mobile copy and retains desktop sizing for %s",
  (state) => {
    renderWithIntl(
      <PayPalAuthorizationNotice
        application={{
          paypalAuthorization: { state, authorizedAt: null, expiresAt: null, releasedAt: null },
        }}
      />,
    );
    expect(screen.getByRole("status")).toHaveClass(
      "text-sm",
      "leading-6",
      "max-md:text-xs",
      "max-md:leading-5",
    );
  },
);
