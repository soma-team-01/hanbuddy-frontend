import { describe, expect, it } from "vitest";
import {
  isPayPalCheckoutReceived,
  isPayPalUncaptured,
  paypalAuthorizationMessage,
} from "./paypal-authorization";

const authorization = (state: string) => ({
  state,
  authorizedAt: null,
  expiresAt: null,
  releasedAt: null,
});

describe("PayPal authorization semantics", () => {
  it("accepts an authorized application without treating it as captured", () => {
    const app = {
      status: "PENDING_APPROVAL",
      paymentStatus: "AUTHORIZED",
      paypalAuthorization: authorization("AUTHORIZED"),
    } as never;
    expect(isPayPalCheckoutReceived(app)).toBe(true);
    expect(isPayPalUncaptured(app)).toBe(true);
    expect(paypalAuthorizationMessage(app)).toBe("authorized");
  });
  it("requires server confirmation and does not infer booking from capture alone", () => {
    expect(isPayPalCheckoutReceived({ status: "PENDING_PAYMENT" } as never)).toBe(false);
    expect(
      isPayPalCheckoutReceived({
        status: "CANCELLED",
        paypalAuthorization: authorization("CAPTURED"),
      } as never),
    ).toBe(false);
    expect(
      isPayPalCheckoutReceived({
        status: "CONFIRMED",
        paypalAuthorization: authorization("CAPTURED"),
      } as never),
    ).toBe(true);
    expect(
      isPayPalCheckoutReceived({
        status: "CONFIRMED",
        paypalAuthorization: authorization("CAPTURE_REQUESTED"),
      } as never),
    ).toBe(false);
  });
  it("preserves legacy capture checkout", () => {
    expect(
      isPayPalCheckoutReceived({ status: "PENDING_APPROVAL", paypalAuthorization: null } as never),
    ).toBe(true);
  });
  it.each([
    ["REQUESTED", "processing"],
    ["CAPTURE_REQUESTED", "captureProcessing"],
    ["VOID_REQUESTED", "releaseProcessing"],
    ["VOIDED", "released"],
  ])("maps %s independently of application cancellation", (state, message) => {
    const app = { status: "REJECTED", paypalAuthorization: authorization(state) } as never;
    expect(paypalAuthorizationMessage(app)).toBe(message);
    expect(isPayPalUncaptured(app)).toBe(true);
  });
});
