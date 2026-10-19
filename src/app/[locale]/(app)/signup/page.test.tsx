import { expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/render-with-intl";
import Page from "./page";

vi.mock("next-intl/server", async () => {
  const { createTranslator } = await import("next-intl");
  const { default: messages } = await import("@/messages/en.json");
  return {
    getTranslations: async () =>
      createTranslator({ locale: "en", messages, namespace: "EmailAuth" }),
  };
});

it.each([
  [
    { next: "/activities/42/book?scheduleId=101" },
    "/en/login?next=%2Factivities%2F42%2Fbook%3FscheduleId%3D101",
  ],
  [{ next: "https://evil.test" }, "/en/login"],
  [{ intent: "buddy", next: "/activities/42/book" }, "/ko/login"],
])("preserves safe signup recovery context for %j", async (query, href) => {
  renderWithIntl(
    await Page({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve(query) }),
  );
  expect(screen.getByRole("link", { name: "Back to login" })).toHaveAttribute("href", href);
});
