import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { applicationKeys, myApplicationsQueryOptions } from "./applications";
import type { ApplicationResponse } from "@/types/application";

describe("application status reconciliation", () => {
  function setup() {
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
    return { client, query, interval };
  }

  it.each(["VOIDED", "CAPTURED"] as const)(
    "keeps other approvals and refunds refreshing alongside a %s PayPal application",
    (state) => {
      const { client, query, interval } = setup();
      const completed = {
        applicationId: 1,
        status: state === "VOIDED" ? "REJECTED" : "COMPLETED",
        paypalAuthorization: { state },
      };
      for (const active of [
        { status: "PENDING_PAYMENT" },
        { status: "PENDING_APPROVAL" },
        { status: "PENDING_APPROVAL", paypalAuthorization: { state: "AUTHORIZED" } },
        { status: "CONFIRMED" },
        { status: "CANCELLED", refund: { status: "REQUESTED" } },
        { status: "CANCELLED", refund: { status: "FAILED" } },
      ]) {
        for (let i = 0; i < 8; i++) {
          query.setData([completed, { applicationId: 2, ...active }] as never);
          expect(interval(query)).toBe(60_000);
        }
      }
      query.setData([completed] as never);
      expect(interval(query)).toBe(false);
      client.clear();
    },
  );

  it.each(["REQUESTED", "CAPTURE_REQUESTED", "VOID_REQUESTED"] as const)(
    "limits only the unresolved %s result while keeping other lifecycle updates",
    (state) => {
      const { client, query, interval } = setup();
      const pending = {
        applicationId: 1,
        status: "PENDING_APPROVAL",
        paypalAuthorization: { state },
      };
      for (let i = 0; i < 6; i++) {
        query.setData([pending] as never);
        expect(interval(query)).toBe(i < 5 ? 60_000 : false);
      }
      query.setData([pending, { applicationId: 2, status: "PENDING_APPROVAL" }] as never);
      expect(interval(query)).toBe(60_000);
      query.setData([{ ...pending, refund: { status: "REQUESTED" } }] as never);
      expect(interval(query)).toBe(60_000);
      query.setData([pending] as never);
      expect(interval(query)).toBe(false);
      client.clear();
    },
  );

  it("starts a fresh budget for a new application or a changed recovery stage", () => {
    const { client, query, interval } = setup();
    for (let i = 0; i < 10; i++) query.setData([]);
    const pending = {
      applicationId: 1,
      status: "REJECTED",
      paypalAuthorization: { state: "VOID_REQUESTED" },
    };
    for (let i = 0; i < 6; i++) {
      query.setData([pending] as never);
      expect(interval(query)).toBe(i < 5 ? 60_000 : false);
      // Rebuilding options during a render must not reset or consume the budget.
      const rerenderInterval = myApplicationsQueryOptions("EN").refetchInterval;
      if (typeof rerenderInterval !== "function") throw new Error("Expected refresh policy");
      expect(rerenderInterval(query)).toBe(i < 5 ? 60_000 : false);
    }
    query.setData([pending, { ...pending, applicationId: 2 }] as never);
    expect(interval(query)).toBe(60_000);
    query.setData([{ ...pending, paymentStatus: "REVIEW_REQUIRED" }] as never);
    expect(interval(query)).toBe(60_000);
    client.clear();
  });

  it("counts failed reads without allowing them to suppress another pending approval", () => {
    const { client, query, interval } = setup();
    const pending = {
      applicationId: 1,
      status: "PENDING_PAYMENT",
      paymentStatus: "REVIEW_REQUIRED",
    };
    query.setData([pending] as never);
    expect(interval(query)).toBe(60_000);
    query.setState({ errorUpdateCount: 5 });
    expect(interval(query)).toBe(false);
    query.setData([pending, { applicationId: 2, status: "PENDING_APPROVAL" }] as never);
    expect(interval(query)).toBe(60_000);
    client.clear();
  });

  it("drops resolved and removed budgets and isolates separate query caches", () => {
    const { client, query, interval } = setup();
    const pending = {
      applicationId: 1,
      status: "PENDING_APPROVAL",
      paypalAuthorization: { state: "CAPTURE_REQUESTED" },
    };
    for (let i = 0; i < 6; i++) {
      query.setData([pending] as never);
      interval(query);
    }
    expect(interval(query)).toBe(false);
    const other = setup();
    other.query.setData([pending] as never);
    expect(other.interval(other.query)).toBe(60_000);
    other.client.clear();
    query.setData([
      { ...pending, status: "COMPLETED", paypalAuthorization: { state: "CAPTURED" } },
    ] as never);
    expect(interval(query)).toBe(false);
    query.setData([pending] as never);
    expect(interval(query)).toBe(60_000);
    query.setData([]);
    expect(interval(query)).toBe(false);
    query.setData([pending] as never);
    expect(interval(query)).toBe(60_000);
    client.clear();
  });

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
