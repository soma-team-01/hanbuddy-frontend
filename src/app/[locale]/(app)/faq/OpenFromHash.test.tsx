import { render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { OpenFromHash } from "./OpenFromHash";

function renderItems() {
  return render(
    <>
      <OpenFromHash />
      <details id="faq-pay">
        <summary>How do I pay?</summary>
        <p>Online with PayPal.</p>
      </details>
      <details id="faq-meet">
        <summary>Where do we meet?</summary>
        <p>On each experience page.</p>
      </details>
    </>,
  );
}

describe("OpenFromHash", () => {
  afterEach(() => window.history.replaceState(null, "", "/"));

  it("opens the answer a link points to when the page loads", () => {
    window.history.replaceState(null, "", "/en/faq#faq-pay");
    const { container } = renderItems();

    expect(container.querySelector("#faq-pay")).toHaveAttribute("open");
    expect(container.querySelector("#faq-meet")).not.toHaveAttribute("open");
  });

  it("opens the answer picked from the question list later", () => {
    const { container } = renderItems();

    window.history.replaceState(null, "", "/en/faq#faq-meet");
    window.dispatchEvent(new HashChangeEvent("hashchange"));

    expect(container.querySelector("#faq-meet")).toHaveAttribute("open");
  });
});
