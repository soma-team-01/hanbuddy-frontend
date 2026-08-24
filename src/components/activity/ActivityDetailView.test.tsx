import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import type { Activity } from "@/types/activity";

vi.mock("@/components/activity/HostProfileDialog", () => ({
  HostProfileDialog: ({
    host,
    showHostedActivities,
    canContact,
  }: {
    host: { id?: number; name: string };
    showHostedActivities?: boolean;
    canContact?: boolean;
  }) => (
    <div
      data-testid="host-profile-dialog"
      data-host-id={host.id}
      data-show-hosted-activities={String(showHostedActivities)}
      data-can-contact={String(canContact)}
    >
      {host.name}
    </div>
  ),
}));

vi.mock("@/lib/google/places", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/google/places")>()),
  getGoogleMapsApiKey: () => "",
}));

import { ActivityDetailView } from "./ActivityDetailView";

const activity: Activity = {
  id: "preview",
  title: "Seoul market walk",
  description: "Explore a traditional market with a local buddy.",
  location: "Gwangjang Market",
  district: "Jongno-gu",
  imageUrl: "/images/activities/hanok-hero.jpg",
  heroImageUrl: "/images/activities/hanok-hero.jpg",
  price: 50000,
  host: {
    id: 17,
    name: "Seoul Buddy",
    bio: "Local HanBuddy host",
    avatarUrl: null,
  },
  included: [],
  restrictions: [],
  sessions: [],
  itinerary: [],
  meetingPoint: {
    name: "Gwangjang Market Gate 2",
    area: "Jongno-gu, Seoul",
  },
};

describe("ActivityDetailView", () => {
  it("keeps the guest host profile content visible while preview actions stay disabled", () => {
    renderWithIntl(
      <ActivityDetailView activity={activity} preview bottomBar="inline" unoptimizedImages />,
      { locale: "en" },
    );

    expect(screen.getByRole("button", { name: "Book now" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "View Seoul Buddy's profile" }));

    const hostProfile = screen.getByTestId("host-profile-dialog");
    expect(hostProfile).toHaveAttribute("data-host-id", "17");
    expect(hostProfile).toHaveAttribute("data-show-hosted-activities", "true");
    expect(hostProfile).toHaveAttribute("data-can-contact", "false");
  });
});
