import { expect, it, vi } from "vitest";
import { createConsentLinkPort } from "./link";
it("sends only linking fields and refuses user identifiers or tokens", async () => {
  const request = vi.fn(async () => {});
  const port = createConsentLinkPort(request);
  await port.link({
    consentId: "synthetic",
    policyVersion: "v1",
    clientId: "123.456",
    sessionId: "789",
    email: "private@example.test",
  } as never);
  expect(request).toHaveBeenCalledWith("link", {
    consentId: "synthetic",
    policyVersion: "v1",
    clientId: "123.456",
    sessionId: "789",
  });
  await expect(
    port.link({
      consentId: "synthetic",
      policyVersion: "v1",
      clientId: "private@example.test",
      sessionId: "payment-token",
    }),
  ).rejects.toThrow();
  expect(request).toHaveBeenCalledTimes(1);
});
