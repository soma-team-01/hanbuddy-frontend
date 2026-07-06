import type { ComponentProps } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MessagingAppField } from "./MessagingAppField";

type FieldProps = ComponentProps<typeof MessagingAppField>;

function renderField(overrides: Partial<FieldProps> = {}) {
  const props: FieldProps = {
    app: "whatsapp",
    onAppChange: vi.fn(),
    country: "US",
    onCountryChange: vi.fn(),
    contactValue: "",
    onContactChange: vi.fn(),
    ...overrides,
  };
  render(<MessagingAppField {...props} />);
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

  it("keeps the ID input for ID-based apps regardless of koreanOnly", () => {
    renderField({ app: "line", koreanOnly: true });
    expect(screen.getByPlaceholderText("Line ID")).toBeInTheDocument();
    expect(screen.queryByText("+82")).not.toBeInTheDocument();
  });
});
