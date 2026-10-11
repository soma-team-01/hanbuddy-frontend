import { screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import type { Locale } from "@/i18n/routing";
import en from "@/messages/en.json";
import ko from "@/messages/ko.json";
import ja from "@/messages/ja.json";
import zhHans from "@/messages/zh-Hans.json";
import zhHant from "@/messages/zh-Hant.json";
import { BuddyWorkspaceTabs } from "./BuddyWorkspaceTabs";

const messages = { en, ko, ja, "zh-Hans": zhHans, "zh-Hant": zhHant };

it.each(Object.keys(messages) as Locale[])("links separate workspace pages in %s", (locale) => {
  const copy = messages[locale].Navigation;
  const { rerender } = renderWithIntl(<BuddyWorkspaceTabs active="home" />, {
    locale,
    messages: messages[locale],
  });
  const navigation = within(screen.getByRole("navigation", { name: copy.buddyWorkspace }));
  const home = navigation.getByRole("link", { name: copy.home });
  const activities = navigation.getByRole("link", { name: copy.myActivities });
  expect(home).toHaveAttribute("href", `/${locale}/dashboard`);
  expect(home).toHaveAttribute("aria-current", "page");
  expect(activities).toHaveAttribute("href", `/${locale}/my-activities`);
  expect(activities).not.toHaveAttribute("aria-current");
  expect(home).toHaveClass("min-h-11", "border-primary", "focus-visible:outline-primary");
  rerender(<BuddyWorkspaceTabs active="activities" />);
  expect(home).not.toHaveAttribute("aria-current");
  expect(activities).toHaveAttribute("aria-current", "page");
});
