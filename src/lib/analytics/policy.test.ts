import { expect, it } from "vitest";
import { readAnalyticsPolicy } from "./policy";
import { APP_ORIGIN } from "@/lib/site";
it("requires exactly explicit enable and valid ID using fixed origin", () => {
  expect(readAnalyticsPolicy({ GA_ENABLED: "true", GA_MEASUREMENT_ID: "G-TEST" })).toEqual({
    measurementId: "G-TEST",
    origin: APP_ORIGIN,
  });
});
it.each([undefined, "", "false", "TRUE", "1", " true "])("fails closed for enable %s", (value) => {
  expect(readAnalyticsPolicy({ GA_ENABLED: value, GA_MEASUREMENT_ID: "G-TEST" })).toBeNull();
});
it.each([undefined, "", "G-", "invalid", "G-test", "G-TEST\n"])(
  "fails closed for ID %s",
  (value) => {
    expect(readAnalyticsPolicy({ GA_ENABLED: "true", GA_MEASUREMENT_ID: value })).toBeNull();
  },
);
it("cannot override canonical origin or require removed policy/TTL inputs", () => {
  expect(
    readAnalyticsPolicy({
      GA_ENABLED: "true",
      GA_MEASUREMENT_ID: "G-TEST",
      GA_ORIGIN: "https://evil.example",
    }),
  ).toEqual({ measurementId: "G-TEST", origin: APP_ORIGIN });
});
