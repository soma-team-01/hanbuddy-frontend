import { act } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import en from "@/messages/en.json";
import { createQueryClient } from "@/lib/query/client";
import { haiBuddyKeys } from "@/lib/query/hai-buddy";
import { IntlTestProvider } from "@/test/render-with-intl";
import { HaiBuddyLauncher, HaiBuddyProvider, useHaiBuddyAvailable } from "./HaiBuddyLauncher";

vi.mock("@/lib/api/hai-buddy", () => ({
  getLatestHaiBuddyConversation: vi.fn(() => new Promise(() => {})),
  sendHaiBuddyMessage: vi.fn(),
  sendHaiBuddyFeedback: vi.fn(),
}));

function Contact() {
  return useHaiBuddyAvailable() ? null : <button type="button">Contact us</button>;
}

function Tree({ client }: { client: ReturnType<typeof createQueryClient> }) {
  return (
    <QueryClientProvider client={client}>
      <IntlTestProvider locale="en">
        <HaiBuddyProvider enabled>
          <Contact />
          <HaiBuddyLauncher />
        </HaiBuddyProvider>
      </IntlTestProvider>
    </QueryClientProvider>
  );
}

describe("HAI Buddy hydration", () => {
  it("keeps the server markup while hydrating even if the latest conversation is already cached", async () => {
    // 서버는 최근 대화를 모르고 그린다. 브라우저에서는 하이드레이션 도중 조회가 먼저 끝난 상황을 캐시로 재현한다.
    const html = renderToString(<Tree client={createQueryClient()} />);
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);
    const client = createQueryClient();
    client.setQueryData(haiBuddyKeys.latest("EN"), { conversationId: null, messages: [] });
    const recoverable = vi.fn();

    await act(async () => {
      hydrateRoot(container, <Tree client={client} />, { onRecoverableError: recoverable });
    });

    expect(recoverable).not.toHaveBeenCalled();
    expect(
      [...container.querySelectorAll("button")].some((b) => b.textContent === en.HaiBuddy.launcher),
    ).toBe(true);
    expect(container.textContent).not.toContain("Contact us");
  });
});
