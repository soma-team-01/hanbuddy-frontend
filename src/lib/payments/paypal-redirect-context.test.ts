import { beforeEach, describe, expect, it } from "vitest";
import {
  clearPayPalRedirectContext,
  readPayPalRedirectContext,
  storePayPalRedirectContext,
} from "./paypal-redirect-context";

describe("PayPal redirect context", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("restores the application only for the matching PayPal order", () => {
    storePayPalRedirectContext({ applicationId: "11", orderId: "ORDER-123" });

    expect(readPayPalRedirectContext("ORDER-123")).toEqual({
      applicationId: "11",
      orderId: "ORDER-123",
    });
    expect(readPayPalRedirectContext("OTHER-ORDER")).toBeNull();
  });

  it("clears the context after completion or cancellation", () => {
    storePayPalRedirectContext({ applicationId: "11", orderId: "ORDER-123" });
    clearPayPalRedirectContext();
    expect(readPayPalRedirectContext()).toBeNull();
  });
});
