import { expect, it } from "vitest";
import { readCampaign } from "./campaign";

it("maps only supported UTM values to GA campaign fields", () => {
  expect(
    readCampaign(
      "?utm_source=instagram&utm_medium=paid_social&utm_campaign=가을%20야구&utm_id=fall-26&utm_content=story&utm_term=baseball&token=secret&email=a%40b.com",
    ),
  ).toEqual({
    campaign_source: "instagram",
    campaign_medium: "paid_social",
    campaign_name: "가을 야구",
    campaign_id: "fall-26",
    campaign_content: "story",
    campaign_term: "baseball",
  });
});
it.each([
  "?utm_source=a&utm_source=b",
  "?utm_source=",
  "?utm_source=%20%20",
  "?utm_source=%0Asecret",
  `?utm_source=${"a".repeat(101)}`,
])("rejects ambiguous or unsafe values: %s", (query) => {
  expect(readCampaign(query).campaign_source).toBeUndefined();
});
it("does not manufacture attribution for untagged traffic", () => {
  expect(
    Object.values(readCampaign("?code=secret#utm_source=wrong")).every(
      (value) => value === undefined,
    ),
  ).toBe(true);
});

it.each(["autumn/baseball:2026 ⚾", "https://instagram.com", "social@partner", "야구 & 축제 🎉"])(
  "preserves campaign labels with punctuation and emoji: %s",
  (value) => {
    const query = new URLSearchParams({
      utm_campaign: value,
      code: "secret",
      email: "private@example.com",
    });
    const fields = readCampaign(query.toString());
    expect(fields.campaign_name).toBe(value);
    expect(Object.values(fields).filter((value) => value !== undefined)).toEqual([value]);
  },
);
