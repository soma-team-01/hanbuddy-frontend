import { afterEach, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { AuthSessionResetListener } from "./AuthSessionResetListener";

afterEach(() => vi.unstubAllGlobals());

it("does not subscribe unauthenticated tabs and closes the channel when their session disappears", () => {
  const close = vi.fn();
  const channel = vi.fn(function () {
    return { close, onmessage: null };
  });
  vi.stubGlobal("BroadcastChannel", channel);
  const view = renderWithIntl(<AuthSessionResetListener mayHaveSession={false} />);
  expect(channel).not.toHaveBeenCalled();
  view.rerender(<AuthSessionResetListener mayHaveSession />);
  expect(channel).toHaveBeenCalledExactlyOnceWith("hanbuddy-auth");
  view.rerender(<AuthSessionResetListener mayHaveSession={false} />);
  expect(close).toHaveBeenCalledTimes(1);
});
