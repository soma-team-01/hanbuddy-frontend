import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { applicationKeys, myApplicationsQueryOptions } from "./applications";
import type { ApplicationResponse } from "@/types/application";

describe("application status reconciliation", () => {
  it("bounds PayPal reads and includes release processing after an application ends", () => {
    const client = new QueryClient();
    const options = myApplicationsQueryOptions("EN");
    const query = client
      .getQueryCache()
      .build<
        ApplicationResponse[],
        Error,
        ApplicationResponse[],
        ReturnType<typeof applicationKeys.mine>
      >(client, options);
    const data = [
      { status: "REJECTED", paypalAuthorization: { state: "VOID_REQUESTED" } },
    ] as never;
    query.setData(data);
    const interval = options.refetchInterval;
    if (typeof interval !== "function") throw new Error("Expected status-based refresh policy");
    expect(interval(query)).toBe(60_000);
    for (let i = 0; i < 5; i++) query.setData(data);
    expect(interval(query)).toBe(false);
    client.clear();
  });

  it("preserves legacy refresh and stops when authorization release is complete", () => {
    const client = new QueryClient();
    const options = myApplicationsQueryOptions("EN");
    const query = client
      .getQueryCache()
      .build<
        ApplicationResponse[],
        Error,
        ApplicationResponse[],
        ReturnType<typeof applicationKeys.mine>
      >(client, options);
    const interval = options.refetchInterval;
    if (typeof interval !== "function") throw new Error("Expected status-based refresh policy");
    query.setData([{ status: "PENDING_APPROVAL", paypalAuthorization: null }] as never);
    expect(interval(query)).toBe(60_000);
    query.setData([{ status: "REJECTED", paypalAuthorization: { state: "VOIDED" } }] as never);
    expect(interval(query)).toBe(false);
    client.clear();
  });
});
