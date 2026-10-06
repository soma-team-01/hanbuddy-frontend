import { fireEvent, render } from "@testing-library/react";
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

  it("ignores a broken hash instead of crashing", () => {
    window.history.replaceState(null, "", "/en/faq#%");

    expect(() => renderItems()).not.toThrow();
  });

  it("reopens a closed answer when the same question link is picked again", () => {
    window.history.replaceState(null, "", "/en/faq#faq-pay");
    const { container } = render(
      <>
        <OpenFromHash />
        <a href="#faq-pay">How do I pay?</a>
        <details id="faq-pay">
          <summary>How do I pay?</summary>
          <p>Online with PayPal.</p>
        </details>
      </>,
    );
    const item = container.querySelector<HTMLDetailsElement>("#faq-pay")!;
    item.open = false;

    // 해시가 그대로라 hashchange가 일어나지 않아도 다시 열어야 한다
    fireEvent.click(container.querySelector("a")!);
    expect(item).toHaveAttribute("open");
  });

  it("opens the answer picked from the question list later", () => {
    const { container } = renderItems();

    window.history.replaceState(null, "", "/en/faq#faq-meet");
    window.dispatchEvent(new HashChangeEvent("hashchange"));

    expect(container.querySelector("#faq-meet")).toHaveAttribute("open");
  });
});
