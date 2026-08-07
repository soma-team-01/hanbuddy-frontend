import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ pathname: "/explore" as string }));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => navigation.pathname,
}));

import { RouteShell } from "./RouteShell";

describe("RouteShell", () => {
  beforeEach(() => {
    navigation.pathname = "/explore";
  });

  it("keeps the shared site chrome on regular routes", () => {
    render(
      <RouteShell header={<div>Header</div>} footer={<div>Footer</div>}>
        <main>Content</main>
      </RouteShell>,
    );

    expect(screen.getByText("Header")).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
    expect(screen.getByText("Footer")).toBeInTheDocument();
  });

  it("removes the shared header and footer from activity creation", () => {
    navigation.pathname = "/my-activities/create";

    render(
      <RouteShell header={<div>Header</div>} footer={<div>Footer</div>}>
        <main>Creation flow</main>
      </RouteShell>,
    );

    expect(screen.getByText("Creation flow")).toBeInTheDocument();
    expect(screen.queryByText("Header")).not.toBeInTheDocument();
    expect(screen.queryByText("Footer")).not.toBeInTheDocument();
  });
});
