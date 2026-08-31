import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { DISPLAY_CURRENCY_STORAGE_KEY } from "@/lib/display-currency";
import { DisplayCurrencyProvider } from "@/lib/display-currency-context";
import { renderWithIntl } from "@/test/render-with-intl";
import { CurrencySwitcher } from "./CurrencySwitcher";

describe("CurrencySwitcher", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("uses the locale default until the user chooses a currency", () => {
    renderWithIntl(
      <DisplayCurrencyProvider>
        <CurrencySwitcher />
      </DisplayCurrencyProvider>,
      { locale: "ja" },
    );

    expect(screen.getByRole("combobox", { name: "Reference currency" })).toHaveValue("JPY");
  });

  it("persists an explicit choice for later pages and locale changes", () => {
    const firstRender = renderWithIntl(
      <DisplayCurrencyProvider>
        <CurrencySwitcher />
      </DisplayCurrencyProvider>,
    );

    fireEvent.change(screen.getByRole("combobox", { name: "Reference currency" }), {
      target: { value: "CNY" },
    });
    expect(window.localStorage.getItem(DISPLAY_CURRENCY_STORAGE_KEY)).toBe("CNY");
    firstRender.unmount();

    renderWithIntl(
      <DisplayCurrencyProvider>
        <CurrencySwitcher />
      </DisplayCurrencyProvider>,
      { locale: "ko" },
    );

    expect(screen.getByRole("combobox", { name: "참고 통화" })).toHaveValue("CNY");
  });
});
