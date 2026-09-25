import { describe, expect, it } from "vitest";
import { resolveLegacyLandingPath } from "./legacy-landing";

describe("resolveLegacyLandingPath", () => {
  it.each([
    ["korea-football", "/activities/4"],
    ["kbo-jamsil", "/activities/2"],
    ["kbo-gocheok", "/activities/1"],
  ])("sends the apply form prefilled with %s to its activity detail", (event, target) => {
    const resolved = resolveLegacyLandingPath(
      "/apply",
      new URLSearchParams({ event, utm_source: "meetup", utm_medium: "social" }),
    );

    expect(resolved).toEqual({
      pathname: target,
      search: "?utm_source=meetup&utm_medium=social",
    });
  });

  it.each(["/apply", "/apply/"])("sends the bare apply form %s to the landing home", (pathname) => {
    expect(resolveLegacyLandingPath(pathname, new URLSearchParams())).toEqual({
      pathname: "/",
      search: "",
    });
  });

  it("sends an unknown event to the landing home without the event parameter", () => {
    expect(
      resolveLegacyLandingPath(
        "/apply",
        new URLSearchParams({ event: "hanriver", utm_source: "instagram" }),
      ),
    ).toEqual({ pathname: "/", search: "?utm_source=instagram" });
  });

  it.each([
    ["/events/korea-football", "/activities/4"],
    ["/events/korea-football/", "/activities/4"],
    ["/events/kbo-jamsil", "/activities/2"],
    ["/events/kbo-gocheok", "/activities/1"],
    ["/events/hanriver", "/"],
    ["/events", "/"],
    ["/about", "/"],
    ["/about/", "/"],
  ])("maps the retired landing page %s to %s", (pathname, target) => {
    expect(resolveLegacyLandingPath(pathname, new URLSearchParams({ utm_source: "ads" }))).toEqual({
      pathname: target,
      search: "?utm_source=ads",
    });
  });

  it.each(["/", "/explore", "/activities/4", "/applications", "/apply-now", "/events-x"])(
    "leaves the current route %s alone",
    (pathname) => {
      expect(resolveLegacyLandingPath(pathname, new URLSearchParams())).toBeNull();
    },
  );
});
