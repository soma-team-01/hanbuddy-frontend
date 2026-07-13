import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const LAYOUT_DIRECTORY = dirname(fileURLToPath(import.meta.url));

const SHARED_NAV_PAGES = [
  ["tourist home", resolve(LAYOUT_DIRECTORY, "(tourist)/explore/page.tsx")],
  ["tourist activity", resolve(LAYOUT_DIRECTORY, "(tourist)/applications/page.tsx")],
  ["buddy home", resolve(LAYOUT_DIRECTORY, "(buddy)/dashboard/page.tsx")],
  ["buddy activity", resolve(LAYOUT_DIRECTORY, "(buddy)/my-activities/page.tsx")],
  ["shared my page", resolve(LAYOUT_DIRECTORY, "my-page/page.tsx")],
] as const;

const REPLACED_ROLE_LAYOUTS = [
  ["tourist", resolve(LAYOUT_DIRECTORY, "../(tourist)/(with-nav)/layout.tsx")],
  ["buddy", resolve(LAYOUT_DIRECTORY, "../(buddy)/(with-nav)/layout.tsx")],
] as const;

const SHARED_EDIT_PROFILE_PAGE = resolve(LAYOUT_DIRECTORY, "../my-page/edit/page.tsx");
const TOURIST_SCOPED_EDIT_PROFILE_PAGE = resolve(
  LAYOUT_DIRECTORY,
  "../(tourist)/my-page/edit/page.tsx",
);

describe("shared bottom navigation route structure", () => {
  it.each(SHARED_NAV_PAGES)("keeps %s under the shared layout", (_, pagePath) => {
    expect(existsSync(pagePath)).toBe(true);
  });

  it.each(REPLACED_ROLE_LAYOUTS)("removes the %s-specific nav layout", (_, layoutPath) => {
    expect(existsSync(layoutPath)).toBe(false);
  });

  it("keeps Edit Profile in the role-neutral app route", () => {
    expect(existsSync(SHARED_EDIT_PROFILE_PAGE)).toBe(true);
  });

  it("removes the Tourist-scoped Edit Profile route", () => {
    expect(existsSync(TOURIST_SCOPED_EDIT_PROFILE_PAGE)).toBe(false);
  });
});
