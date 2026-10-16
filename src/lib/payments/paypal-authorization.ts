import type { ApplicationResponse, PayPalAuthorization, PaymentStatus } from "@/types/application";

type PaymentState = {
  paypalAuthorization?: PayPalAuthorization | null;
  paymentStatus?: PaymentStatus | null;
};

/** A hold is not payment capture, including while it is being released. */
export function isPayPalUncaptured(application: PaymentState) {
  return (
    application.paypalAuthorization != null && application.paypalAuthorization.state !== "CAPTURED"
  );
}

/** Checkout receipt is not reservation confirmation; legacy CAPTURE responses remain supported. */
export function isPayPalCheckoutReceived(application: ApplicationResponse) {
  if (application.status === "CONFIRMED" || application.status === "COMPLETED")
    return !isPayPalUncaptured(application);
  if (application.status !== "PENDING_APPROVAL") return false;
  if (!application.paypalAuthorization) return true;
  return (
    application.paymentStatus === "AUTHORIZED" &&
    application.paypalAuthorization.state === "AUTHORIZED"
  );
}

/** Returns a localized-message key without conflating application and payment lifecycles. */
export function paypalAuthorizationMessage(application: PaymentState) {
  switch (application.paypalAuthorization?.state) {
    case "REQUESTED":
      return "processing";
    case "AUTHORIZED":
      return "authorized";
    case "CAPTURE_REQUESTED":
      return "captureProcessing";
    case "VOID_REQUESTED":
      return "releaseProcessing";
    case "VOIDED":
      return "released";
    default:
      return null;
  }
}

/** Commands must not be retried automatically while the provider result is unknown. */
export function isPayPalResultPending(application: PaymentState) {
  return (
    ["REQUESTED", "CAPTURE_REQUESTED", "VOID_REQUESTED"].includes(
      application.paypalAuthorization?.state ?? "",
    ) || application.paymentStatus === "REVIEW_REQUIRED"
  );
}
