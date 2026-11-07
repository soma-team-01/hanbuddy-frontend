import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import en from "@/messages/en.json";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { createApiClientError } from "@/lib/api/errors";
import {
  getLatestHaiBuddyConversation,
  sendHaiBuddyFeedback,
  sendHaiBuddyMessage,
} from "@/lib/api/hai-buddy";
import { getMyProfile } from "@/lib/api/users";
import { getTouristActivity } from "@/lib/api/activities";
import type { HaiBuddyReply } from "@/types/hai-buddy";
import type { TouristActivitySummary } from "@/types/activity";
import { ActivityContact } from "@/components/activity/ActivityContact";
import { HaiBuddyLauncher, HaiBuddyProvider } from "./HaiBuddyLauncher";

const t = en.HaiBuddy;
const nav = vi.hoisted(() => ({ pathname: "/", search: "" }));
const analytics = vi.hoisted(() => ({ trackInquiry: vi.fn() }));

vi.mock("@/i18n/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/i18n/navigation")>();
  return { ...actual, usePathname: () => nav.pathname };
});
vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return { ...actual, useSearchParams: () => new URLSearchParams(nav.search) };
});
vi.mock("@/lib/api/hai-buddy", () => ({
  getLatestHaiBuddyConversation: vi.fn(),
  sendHaiBuddyMessage: vi.fn(),
  sendHaiBuddyFeedback: vi.fn(),
}));
vi.mock("@/lib/api/users", () => ({ getMyProfile: vi.fn() }));
vi.mock("@/lib/api/activities", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/activities")>();
  return { ...actual, getTouristActivity: vi.fn() };
});
vi.mock("@/components/analytics/AnalyticsProvider", () => ({
  useMeasurementEvents: () => analytics,
}));

const summary = {
  activityId: 6,
  activityType: "STANDARD",
  title: "K League Football Matchday",
  description: "Football night",
  totalDurationMinutes: 180,
  thumbnailImageUrl: "https://cdn.hanbuddy.test/6.webp",
  buddyId: 1,
  buddyName: "Hanbuddy",
  meetingPointName: "Seoul World Cup Stadium",
  price: 60000,
  currency: "KRW",
  isSoldOut: false,
} as unknown as TouristActivitySummary;

function reply(overrides: Partial<HaiBuddyReply> = {}): HaiBuddyReply {
  return {
    conversationId: 50,
    messageId: 501,
    reply: "You can pay with PayPal when you book.",
    recommendedActivities: [],
    handoff: "NONE",
    handoffSummary: "",
    citations: [{ citationId: "k11", source: "FAQ", title: "How do I pay?", url: "/en/faq#pay" }],
    generalGuidance: false,
    ...overrides,
  };
}

function renderLauncher() {
  return renderWithQueryClient(
    <HaiBuddyProvider enabled>
      <HaiBuddyLauncher />
    </HaiBuddyProvider>,
  );
}

async function openPanel() {
  renderLauncher();
  fireEvent.click(await screen.findByRole("button", { name: t.launcher }));
  return screen.getByRole("complementary", { name: t.title });
}

async function ask(question: string) {
  fireEvent.change(screen.getByRole("textbox", { name: t.placeholder }), {
    target: { value: question },
  });
  fireEvent.click(screen.getByRole("button", { name: t.send }));
}

describe("HAI Buddy panel", () => {
  beforeEach(() => {
    nav.pathname = "/";
    nav.search = "";
    window.sessionStorage.clear();
    vi.mocked(getLatestHaiBuddyConversation).mockResolvedValue({
      status: "success",
      conversation: { conversationId: null, messages: [] },
    });
    vi.mocked(sendHaiBuddyMessage).mockResolvedValue({ status: "success", reply: reply() });
    vi.mocked(sendHaiBuddyFeedback).mockResolvedValue({ status: "success", feedback: null });
    vi.mocked(getMyProfile).mockResolvedValue({
      status: "success",
      profile: { email: "guest@example.test" },
    } as never);
    vi.mocked(getTouristActivity).mockResolvedValue({
      status: "success",
      activity: { ...summary, activityId: 3, title: "Doosan Bears Night Game" },
    } as never);
    analytics.trackInquiry.mockReset();
  });

  it("does not render the launcher when HAI Buddy is switched off on the server", async () => {
    vi.mocked(getLatestHaiBuddyConversation).mockResolvedValue({
      status: "error",
      error: createApiClientError(
        404,
        { isSuccess: false, code: "HAIBUDDY404_DISABLED", message: "off" },
        "off",
      ),
    });
    renderLauncher();

    await waitFor(() => expect(getLatestHaiBuddyConversation).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: t.launcher })).not.toBeInTheDocument();
  });

  it("opens with a greeting, the privacy note and page suggestions", async () => {
    const panel = await openPanel();

    expect(within(panel).getByText(t.greeting)).toBeInTheDocument();
    expect(within(panel).getByText(t.privacyNote)).toBeInTheDocument();
    expect(
      within(panel).getByRole("button", { name: t.suggestions.recommend }),
    ).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: t.suggestions.pay })).toBeInTheDocument();
  });

  it("shows the viewed activity and sends it as context until the guest removes it", async () => {
    nav.pathname = "/activities/3";
    const panel = await openPanel();

    expect(await within(panel).findByText("Doosan Bears Night Game")).toBeInTheDocument();
    fireEvent.click(within(panel).getByRole("button", { name: t.suggestions.included }));
    await waitFor(() =>
      expect(sendHaiBuddyMessage).toHaveBeenLastCalledWith({
        message: t.suggestions.included,
        context: { page: "ACTIVITY_DETAIL", activityId: 3, language: "EN", locale: "en" },
      }),
    );

    fireEvent.click(within(panel).getByRole("button", { name: t.removeContext }));
    await ask("Next question");
    await waitFor(() =>
      expect(sendHaiBuddyMessage).toHaveBeenLastCalledWith({
        conversationId: 50,
        message: "Next question",
        context: { page: "ACTIVITY_DETAIL", language: "EN", locale: "en" },
      }),
    );
  });

  it("renders the answer with source chips and links recommended cards to the activity", async () => {
    vi.mocked(sendHaiBuddyMessage).mockResolvedValue({
      status: "success",
      reply: reply({
        reply: "Here is one option.",
        recommendedActivities: [{ activity: summary, nextScheduleStartAt: "2026-11-28T04:00:00Z" }],
        citations: [
          { citationId: "k11", source: "FAQ", title: "How do I pay?", url: "/en/faq#pay" },
          { citationId: "k40", source: "CASE", title: "Can I bring friends?", url: null },
        ],
      }),
    });
    const panel = await openPanel();
    await ask("Recommend something");

    expect(await within(panel).findByText("Here is one option.")).toBeInTheDocument();
    expect(within(panel).getByRole("link", { name: /How do I pay\?/ })).toHaveAttribute(
      "href",
      "/en/faq#pay",
    );
    expect(within(panel).getByText(t.sourceType.CASE)).toBeInTheDocument();
    expect(
      within(panel).queryByRole("link", { name: /Can I bring friends/ }),
    ).not.toBeInTheDocument();
    expect(within(panel).getByRole("link", { name: /K League Football Matchday/ })).toHaveAttribute(
      "href",
      "/en/activities/6",
    );
  });

  it("offers the contact card with the summary in the template and in the WhatsApp message", async () => {
    vi.mocked(sendHaiBuddyMessage).mockResolvedValue({
      status: "success",
      reply: reply({
        handoff: "CONTACT",
        handoffSummary: "Guest wants a refund for 11/28.",
        citations: [],
      }),
    });
    const panel = await openPanel();
    await ask("I want a refund");

    expect(await within(panel).findByRole("heading", { name: t.contactTitle })).toBeInTheDocument();
    const whatsapp = within(panel).getByRole("link", { name: "WhatsApp" });
    const text = new URL(whatsapp.getAttribute("href")!).searchParams.get("text")!;
    expect(text).toContain("Guest wants a refund for 11/28.");
    expect(text).toContain("guest@example.test");
    fireEvent.click(whatsapp);
    expect(analytics.trackInquiry).toHaveBeenCalledWith(
      expect.objectContaining({ placement: "hai_buddy" }),
    );
  });

  it.each([
    ["HAIBUDDY429_DAILY", 429, t.dailyLimit],
    ["HAIBUDDY429_MINUTE", 429, t.minuteLimit],
    ["HAIBUDDY503_LIMIT", 503, t.unavailable],
    ["HAIBUDDY400_TURNS", 400, t.turnLimit],
  ])("explains %s", async (code, status, message) => {
    vi.mocked(sendHaiBuddyMessage).mockResolvedValue({
      status: "error",
      error: createApiClientError(status, { isSuccess: false, code, message: "x" }, "x"),
    });
    const panel = await openPanel();
    await ask("hello");

    expect(await within(panel).findByText(message)).toBeInTheDocument();
  });

  it("sends feedback for an answer", async () => {
    const panel = await openPanel();
    await ask("How do I pay?");

    fireEvent.click(await within(panel).findByRole("button", { name: t.helpful }));

    await waitFor(() => expect(sendHaiBuddyFeedback).toHaveBeenCalledWith(501, "UP"));
    expect(await within(panel).findByText(t.feedbackThanks)).toBeInTheDocument();
  });

  it("restores the latest conversation", async () => {
    vi.mocked(getLatestHaiBuddyConversation).mockResolvedValue({
      status: "success",
      conversation: {
        conversationId: 9,
        messages: [
          {
            messageId: 1,
            role: "USER",
            content: "Old question",
            recommendedActivities: [],
            handoff: "NONE",
            handoffSummary: null,
            citations: [],
            generalGuidance: false,
            createdAt: "2026-11-08T01:00:00Z",
          },
          {
            messageId: 2,
            role: "ASSISTANT",
            content: "Old answer",
            recommendedActivities: [],
            handoff: "NONE",
            handoffSummary: null,
            citations: [],
            generalGuidance: false,
            createdAt: "2026-11-08T01:00:05Z",
          },
        ],
      },
    });
    const panel = await openPanel();

    expect(within(panel).getByText("Old question")).toBeInTheDocument();
    expect(within(panel).getByText("Old answer")).toBeInTheDocument();
    await ask("Follow up");
    await waitFor(() =>
      expect(sendHaiBuddyMessage).toHaveBeenLastCalledWith(
        expect.objectContaining({ conversationId: 9 }),
      ),
    );
  });

  it("closes with Escape and returns focus to the launcher", async () => {
    const panel = await openPanel();

    act(() => {
      fireEvent.keyDown(panel, { key: "Escape" });
    });

    expect(screen.queryByRole("complementary", { name: t.title })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: t.launcher })).toHaveFocus();
  });

  it("keeps the conversation after closing and reopening the panel", async () => {
    const panel = await openPanel();
    await ask("How do I pay?");
    expect(
      await within(panel).findByText("You can pay with PayPal when you book."),
    ).toBeInTheDocument();

    fireEvent.click(within(panel).getByRole("button", { name: t.close }));
    fireEvent.click(screen.getByRole("button", { name: t.launcher }));
    const reopened = screen.getByRole("complementary", { name: t.title });

    expect(within(reopened).getByText("How do I pay?")).toBeInTheDocument();
    expect(
      within(reopened).getByText("You can pay with PayPal when you book."),
    ).toBeInTheDocument();
    await ask("And refunds?");
    await waitFor(() =>
      expect(sendHaiBuddyMessage).toHaveBeenLastCalledWith(
        expect.objectContaining({ conversationId: 50 }),
      ),
    );
  });

  it("starts a new chat that stays empty after reopening", async () => {
    const panel = await openPanel();
    await ask("Tell me about refunds");
    await within(panel).findByText("You can pay with PayPal when you book.");

    fireEvent.click(within(panel).getByRole("button", { name: t.newChat }));
    fireEvent.click(within(panel).getByRole("button", { name: t.close }));
    fireEvent.click(screen.getByRole("button", { name: t.launcher }));

    const reopened = screen.getByRole("complementary", { name: t.title });
    expect(within(reopened).queryByText("Tell me about refunds")).not.toBeInTheDocument();
  });

  it("disables New chat while an answer is on its way", async () => {
    let resolve: (value: Awaited<ReturnType<typeof sendHaiBuddyMessage>>) => void = () => {};
    vi.mocked(sendHaiBuddyMessage).mockReturnValue(new Promise((r) => (resolve = r)));
    const panel = await openPanel();
    await ask("Slow question");

    expect(await within(panel).findByRole("button", { name: t.newChat })).toBeDisabled();
    await act(async () => resolve({ status: "success", reply: reply() }));
    expect(within(panel).getByRole("button", { name: t.newChat })).toBeEnabled();
  });

  it("keeps the human contact button and shows a separate Ask AI button", async () => {
    renderWithQueryClient(
      <HaiBuddyProvider enabled>
        <ActivityContact />
        <HaiBuddyLauncher />
      </HaiBuddyProvider>,
    );

    expect(await screen.findByRole("button", { name: t.launcher })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: en.ActivityContact.trigger })).toBeInTheDocument();
  });

  it("labels the panel and every answer as AI, and marks general travel tips", async () => {
    vi.mocked(sendHaiBuddyMessage).mockResolvedValue({
      status: "success",
      reply: reply({ reply: "Take subway Line 2.", citations: [], generalGuidance: true }),
    });
    const panel = await openPanel();
    await ask("How do I get to Jamsil?");

    expect(within(panel).getByText(t.aiBadge)).toBeInTheDocument();
    expect(await within(panel).findByText(t.aiAnswer)).toBeInTheDocument();
    expect(within(panel).getByText(t.generalGuidance)).toBeInTheDocument();
  });

  it("makes the page give up space for the panel while it is open", async () => {
    const panel = await openPanel();
    expect(document.documentElement).toHaveAttribute("data-hai-buddy-open");

    fireEvent.click(within(panel).getByRole("button", { name: t.close }));
    expect(document.documentElement).not.toHaveAttribute("data-hai-buddy-open");
  });
});
