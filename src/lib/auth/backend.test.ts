import { afterEach, describe, expect, it } from "vitest";
import { getBackendApiBaseUrl } from "./backend";

const originalApiBaseUrl = process.env.HANBUDDY_API_BASE_URL;

describe("getBackendApiBaseUrl", () => {
  afterEach(() => {
    if (originalApiBaseUrl === undefined) {
      delete process.env.HANBUDDY_API_BASE_URL;
      return;
    }

    process.env.HANBUDDY_API_BASE_URL = originalApiBaseUrl;
  });

  it("requires HANBUDDY_API_BASE_URL instead of falling back to an insecure default", () => {
    delete process.env.HANBUDDY_API_BASE_URL;

    expect(() => getBackendApiBaseUrl()).toThrow("HANBUDDY_API_BASE_URL");
  });

  it("normalizes a configured API base URL", () => {
    process.env.HANBUDDY_API_BASE_URL = "https://api.hanbuddy.test/api/v1/";

    expect(getBackendApiBaseUrl()).toBe("https://api.hanbuddy.test/api/v1");
  });
});
