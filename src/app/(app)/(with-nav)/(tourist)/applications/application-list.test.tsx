import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Application } from "@/types/application";
import { ApplicationList } from "./application-list";

const applications: Application[] = [
  {
    id: "1",
    status: "pending_payment",
    dateLabel: "Jul 20, 2026",
    hostName: "Jihoon Kim",
    hostAvatarUrl: null,
    activityTitle: "Bukchon Hidden Gems",
  },
  {
    id: "2",
    status: "completed",
    dateLabel: "Jul 10, 2026",
    hostName: "Minji Lee",
    hostAvatarUrl: null,
    activityTitle: "Traditional Tea Tasting",
  },
];

describe("ApplicationList", () => {
  it("disables payment and review actions until their flows are available", () => {
    render(<ApplicationList applications={applications} onCancelApplication={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Pay Now · Coming soon" })).toBeDisabled();

    fireEvent.click(screen.getByRole("tab", { name: "Past" }));

    expect(screen.getByRole("button", { name: "Leave Review · Coming soon" })).toBeDisabled();
  });
});
