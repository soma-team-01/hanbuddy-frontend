import { expect, it } from "vitest";
import { eventFields, safePage, type FunnelEvent } from "./events";

const origin = "https://example.test";

function fields(name: string, pathname: string, input: unknown) {
  const page = safePage(pathname);
  if (!page) return null;
  return eventFields(name as FunnelEvent, page, input as number, origin);
}

it("builds an Explore list payload from ordered rendered IDs without titles or prices", () => {
  expect(
    fields("view_item_list", "/en/explore", {
      itemIds: [42, 7],
      itemListId: "explore_activities",
      itemListName: "Explore activities",
    }),
  ).toEqual({
    page_location: `${origin}/explore`,
    page_referrer: "",
    page_title: "Explore",
    item_list_id: "explore_activities",
    item_list_name: "Explore activities",
    items: [
      { item_id: "42", index: 1 },
      { item_id: "7", index: 2 },
    ],
  });
});

it("accepts selection only on Explore with a positive rendered index", () => {
  const input = {
    itemId: 42,
    index: 2,
    itemListId: "explore_activities",
    itemListName: "Explore activities",
  };
  expect(fields("select_item", "/ko/explore", input)).toMatchObject({
    item_list_id: "explore_activities",
    item_list_name: "Explore activities",
    items: [{ item_id: "42", index: 2 }],
  });
  expect(fields("select_item", "/ko/activities/42", input)).toBeNull();
  expect(fields("select_item", "/ko/explore", { ...input, index: 0 })).toBeNull();
});

it("allows only fixed signup, landing section, CTA and inquiry categories", () => {
  expect(fields("sign_up", "/en/onboarding", { method: "google" })).toMatchObject({
    method: "google",
  });
  expect(fields("sign_up", "/en/login", { method: "email@example.test" })).toBeNull();
  expect(
    fields("section_view", "/ko", {
      sectionId: "booking_steps",
      position: 3,
      pageType: "landing",
      locale: "ko",
    }),
  ).toMatchObject({
    section_id: "booking_steps",
    position: 3,
    page_type: "landing",
    locale: "ko",
  });
  expect(
    fields("landing_cta_click", "/en", {
      ctaId: "hero_explore",
      sectionId: "hero",
      position: 1,
      destinationType: "explore",
      locale: "en",
    }),
  ).toMatchObject({
    cta_id: "hero_explore",
    section_id: "hero",
    position: 1,
    destination_type: "explore",
    locale: "en",
  });
  expect(
    fields("inquiry_click", "/en", {
      channel: "email",
      placement: "landing_contact",
      locale: "en",
    }),
  ).toMatchObject({ channel: "email", placement: "landing_contact", locale: "en" });
  expect(
    fields("inquiry_click", "/en", {
      channel: "mailto:person@example.test",
      placement: "landing_contact",
      locale: "en",
    }),
  ).toBeNull();
});

it("keeps query-bearing or raw URL pathnames ineligible", () => {
  expect(safePage("/en/explore?token=secret")).toBeNull();
  expect(safePage("https://example.test/en/explore")).toBeNull();
});
