import type { ComponentProps } from "react";
import { screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { CountrySelect } from "@/components/ui/CountrySelect";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { renderWithIntl } from "@/test/render-with-intl";
import { MessagingAppField } from "./MessagingAppField";

type FieldProps = ComponentProps<typeof MessagingAppField>;

function renderField(overrides: Partial<FieldProps> = {}, locale: "en" | "ko" = "en") {
  const props: FieldProps = {
    app: "whatsapp",
    onAppChange: vi.fn(),
    country: "US",
    onCountryChange: vi.fn(),
    contactValue: "",
    onContactChange: vi.fn(),
    ...overrides,
  };
  renderWithIntl(<MessagingAppField {...props} />, { locale });
  return props;
}

describe("MessagingAppField", () => {
  it("renders the country selector and generic phone input by default", () => {
    renderField();
    expect(screen.getByLabelText("Messaging country code")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Phone number")).toBeInTheDocument();
  });

  it("renders a fixed +82 chip instead of the country selector when koreanOnly", () => {
    renderField({ koreanOnly: true });
    expect(screen.queryByLabelText("Messaging country code")).not.toBeInTheDocument();
    expect(screen.getByText("+82")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("010-XXXX-XXXX")).toBeInTheDocument();
  });

  it("displays stored digits with Korean hyphen format when koreanOnly", () => {
    renderField({ koreanOnly: true, contactValue: "01012345678" });
    expect(screen.getByLabelText("Messaging phone number")).toHaveValue("010-1234-5678");
  });

  it("reports digits only from the koreanOnly input", () => {
    const props = renderField({ koreanOnly: true });
    fireEvent.change(screen.getByLabelText("Messaging phone number"), {
      target: { value: "010-1234" },
    });
    expect(props.onContactChange).toHaveBeenCalledWith("0101234");
  });

  it("caps koreanOnly phone input to 11 digits", () => {
    const props = renderField({ koreanOnly: true });
    fireEvent.change(screen.getByLabelText("Messaging phone number"), {
      target: { value: "010-1234-5678-99" },
    });
    expect(props.onContactChange).toHaveBeenCalledWith("01012345678");
  });

  it("keeps the ID input for ID-based apps regardless of koreanOnly", () => {
    renderField({ app: "line", koreanOnly: true });
    expect(screen.getByPlaceholderText("Line ID")).toBeInTheDocument();
    expect(screen.queryByText("+82")).not.toBeInTheDocument();
  });

  it("localizes the phone number messaging option in Korean", () => {
    renderField({}, "ko");

    expect(screen.getByRole("button", { name: "전화번호" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "WhatsApp" })).toBeInTheDocument();
  });

  it.each([
    ["whatsapp", "WhatsApp"],
    ["line", "Line"],
    ["wechat", "WeChat"],
    ["phone", "Phone Number"],
  ] as const)("renders the dedicated %s contact icon", (icon, label) => {
    renderField({ variant: "cards" });

    expect(
      screen.getByRole("button", { name: label }).querySelector(`[data-messaging-icon="${icon}"]`),
    ).toBeInTheDocument();
  });

  it.each([
    ["whatsapp", "WhatsApp"],
    ["phone", "전화번호"],
  ] as const)("localizes the Korean phone field for the %s state", (app, selectedOption) => {
    renderField({ app }, "ko");

    expect(screen.getByRole("button", { name: selectedOption })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByLabelText("메신저 국가번호")).toBeInTheDocument();
    expect(screen.getByLabelText("메신저 전화번호")).toHaveAttribute("placeholder", "전화번호");
  });

  it.each([
    ["line", "Line"],
    ["wechat", "WeChat"],
  ] as const)("preserves the %s brand in the localized Korean ID field", (app, brand) => {
    renderField({ app }, "ko");

    expect(screen.getByRole("button", { name: brand })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("메신저 앱 ID")).toHaveAttribute("placeholder", `${brand} ID`);
  });
});

describe("shared localized selectors and statuses", () => {
  it("localizes country selection, search, empty text, and region names in Korean", () => {
    Element.prototype.scrollIntoView = vi.fn();
    renderWithIntl(<CountrySelect value="" onChange={vi.fn()} ariaLabel="Nationality" />, {
      locale: "ko",
    });

    expect(screen.getByText("국가 선택")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Nationality" }));
    expect(screen.getByRole("combobox", { name: "국가 검색" })).toBeInTheDocument();
    expect(screen.getByText("대한민국")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox", { name: "국가 검색" }), {
      target: { value: "존재하지 않는 국가" },
    });
    expect(screen.getByText("검색 결과가 없습니다")).toBeInTheDocument();
  });

  it("restores focus to the country trigger after backdrop dismissal", () => {
    Element.prototype.scrollIntoView = vi.fn();
    renderWithIntl(<CountrySelect value="" onChange={vi.fn()} ariaLabel="Nationality" />);
    const trigger = screen.getByRole("button", { name: "Nationality" });
    fireEvent.click(trigger);
    expect(screen.getByRole("combobox", { name: "Search country" })).toHaveFocus();

    fireEvent.click(screen.getByTestId("country-select-backdrop"));

    expect(trigger).toHaveFocus();
  });

  it("renders the country panel in a body portal above clipping containers", () => {
    Element.prototype.scrollIntoView = vi.fn();
    const { container } = renderWithIntl(
      <div className="overflow-hidden">
        <CountrySelect value="" onChange={vi.fn()} ariaLabel="Nationality" />
      </div>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Nationality" }));

    const panel = screen.getByTestId("country-select-panel");
    expect(panel.parentElement).toBe(document.body);
    expect(panel).toHaveClass("fixed", "z-[100]");
    expect(container).not.toContainElement(panel);
  });

  it("does not select a country when Enter is pressed during IME composition", () => {
    Element.prototype.scrollIntoView = vi.fn();
    const onChange = vi.fn();
    renderWithIntl(<CountrySelect value="" onChange={onChange} ariaLabel="Nationality" />);

    fireEvent.click(screen.getByRole("button", { name: "Nationality" }));
    const search = screen.getByRole("combobox", { name: "Search country" });
    fireEvent.keyDown(search, { key: "Enter", isComposing: true });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId("country-select-panel")).toBeInTheDocument();
  });

  it("localizes every application status in Korean", () => {
    renderWithIntl(
      <>
        <StatusBadge status="pending_payment" />
        <StatusBadge status="confirmed" />
        <StatusBadge status="cancelled" />
        <StatusBadge status="completed" />
      </>,
      { locale: "ko" },
    );

    expect(screen.getByText("결제 대기")).toBeInTheDocument();
    expect(screen.getByText("확정")).toBeInTheDocument();
    expect(screen.getByText("취소됨")).toBeInTheDocument();
    expect(screen.getByText("완료됨")).toBeInTheDocument();
  });
});
