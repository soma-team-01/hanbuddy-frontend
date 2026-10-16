import { expect, it } from "vitest";
import { eventFields, pageFields, safePage, type FunnelEvent } from "./events";

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
    content_language: "en",
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

it("labels every page and event with the rendered site locale, not the browser language", () => {
  for (const locale of ["en", "ko", "ja", "zh-Hans", "zh-Hant"]) {
    const page = safePage(`/${locale}/activities/42`)!;
    expect(pageFields(page, origin)).toEqual({
      page_location: `${origin}/activities/detail`,
      page_referrer: "",
      page_title: "Activity",
      content_language: locale,
    });
    expect(fields("view_item", `/${locale}/activities/42`, 42)).toMatchObject({
      content_language: locale,
    });
  }
  expect(fields("begin_checkout", "/ko/activities/42/book", 42)).toMatchObject({
    content_language: "ko",
  });
  expect(safePage("/de/activities/42")).toBeNull();
});

it("marks translated exposure only on activity detail funnel events", () => {
  const detail = safePage("/en/activities/42")!;
  for (const [isTranslated, value] of [
    [true, "true"],
    [false, "false"],
  ] as const) {
    expect(eventFields("view_item", detail, 42, origin, { isTranslated })).toEqual({
      page_location: `${origin}/activities/detail`,
      page_referrer: "",
      page_title: "Activity",
      content_language: "en",
      items: [{ item_id: "42" }],
      is_translated: value,
    });
    expect(eventFields("booking_cta_click", detail, 42, origin, { isTranslated })).toMatchObject({
      is_translated: value,
    });
  }
  // Unknown exposure stays unset instead of being guessed.
  expect(eventFields("view_item", detail, 42, origin)).not.toHaveProperty("is_translated");
  expect(
    eventFields("view_item", detail, 42, origin, {
      isTranslated: "true" as unknown as boolean,
    }),
  ).not.toHaveProperty("is_translated");
  const booking = safePage("/en/activities/42/book")!;
  expect(
    eventFields("begin_checkout", booking, 42, origin, { isTranslated: true }),
  ).not.toHaveProperty("is_translated");
  expect(eventFields("view_item", detail, 7, origin, { isTranslated: true })).toBeNull();
});
