import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { InquiryTemplate } from "./InquiryTemplate";

const analytics = vi.hoisted(() => ({ trackInquiry: vi.fn() }));
vi.mock("@/components/analytics/AnalyticsProvider", () => ({
  useMeasurementEvents: () => analytics,
}));

const labels = {
  title: "Ask our team",
  hint: "Check the message before sending.",
  copy: "Copy message",
  copied: "Copied.",
  copyFailed: "Could not copy.",
};

describe("InquiryTemplate", () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    ["copies the message and shows the success status", vi.fn().mockResolvedValue(undefined), labels.copied],
    ["shows the failure status when the clipboard refuses", vi.fn().mockRejectedValue(new Error("no")), labels.copyFailed],
  ])("%s", async (_name, writeText, status) => {
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    renderWithIntl(<InquiryTemplate message={"Hi!\nQuestion"} labels={labels} placement="hai_buddy" />);

    fireEvent.click(screen.getByRole("button", { name: labels.copy }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(status));
    expect(writeText).toHaveBeenCalledWith("Hi!\nQuestion");
  });

  it("prefills WhatsApp with the same message and tracks the placement", () => {
    renderWithIntl(<InquiryTemplate message={"Hi!\nQuestion"} labels={labels} placement="hai_buddy" />);
    const whatsapp = screen.getByRole("link", { name: "WhatsApp" });

    expect(new URL(whatsapp.getAttribute("href")!).searchParams.get("text")).toBe("Hi!\nQuestion");
    fireEvent.click(whatsapp);
    expect(analytics.trackInquiry).toHaveBeenCalledWith(
      expect.objectContaining({ channel: "whatsapp", placement: "hai_buddy" }),
    );
  });
});
