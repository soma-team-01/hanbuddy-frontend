import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, expect, it, vi } from "vitest";
import en from "@/messages/en.json";
import { type SignupExtraError, validateSignupExtra } from "@/lib/auth/signup-extra";
import { SignupExtraFields } from "./SignupExtraFields";

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

it("searches bank names without changing the selection until a result is chosen", () => {
  render(<Fields isBuddy />);
  const trigger = screen.getByRole("combobox", { name: "Bank" });
  fireEvent.click(trigger);
  const search = screen.getByRole("combobox", { name: "Search bank" });
  expect(search).toHaveFocus();
  expect(screen.getAllByRole("option")).toHaveLength(28);
  fireEvent.change(search, { target: { value: " 신 한 " } });
  expect(screen.getAllByRole("option")).toHaveLength(1);
  expect(trigger).toHaveValue("");
  fireEvent.keyDown(search, { key: "Enter", isComposing: true });
  expect(trigger).toHaveValue("");
  fireEvent.keyDown(search, { key: "Enter" });
  expect(trigger).toHaveValue("SHINHAN");
  expect(trigger).toHaveFocus();
  expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  fireEvent.click(trigger);
  expect(screen.getByRole("combobox", { name: "Search bank" })).toHaveValue("");
  expect(screen.getByRole("option", { name: "신한은행" })).toHaveAttribute("aria-selected", "true");
  fireEvent.change(screen.getByRole("combobox", { name: "Search bank" }), {
    target: { value: "kb" },
  });
  fireEvent.click(screen.getByRole("option", { name: "KB국민은행" }));
  expect(trigger).toHaveValue("KB");
});

it("handles empty search, keyboard navigation and dismissal without clearing the bank", () => {
  render(<Fields isBuddy />);
  const trigger = screen.getByRole("combobox", { name: "Bank" });
  fireEvent.keyDown(trigger, { key: "ArrowDown" });
  let search = screen.getByRole("combobox", { name: "Search bank" });
  fireEvent.change(search, { target: { value: "수협" } });
  fireEvent.keyDown(search, { key: "ArrowDown" });
  expect(search).toHaveAttribute(
    "aria-activedescendant",
    screen.getByRole("option", { name: "수협중앙회" }).id,
  );
  fireEvent.keyDown(search, { key: "Enter" });
  expect(trigger).toHaveValue("SUHYUP_CENTRAL");
  fireEvent.click(trigger);
  search = screen.getByRole("combobox", { name: "Search bank" });
  fireEvent.change(search, { target: { value: "nonexistent" } });
  expect(screen.queryByRole("option")).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("No banks found.");
  expect(search).not.toHaveAttribute("aria-activedescendant");
  fireEvent.keyDown(search, { key: "Enter" });
  expect(trigger).toHaveValue("SUHYUP_CENTRAL");
  fireEvent.keyDown(search, { key: "Escape" });
  expect(trigger).toHaveFocus();
  expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  fireEvent.click(trigger);
  fireEvent.keyDown(screen.getByRole("combobox", { name: "Search bank" }), { key: "Tab" });
  expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  fireEvent.click(trigger);
  fireEvent.pointerDown(document.body);
  expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  expect(trigger).toHaveValue("SUHYUP_CENTRAL");
});

function Fields({ isBuddy = false }: { isBuddy?: boolean }) {
  const [value, onChange] = useState({
    signupSource: "",
    signupSourceDetail: "",
    bankName: "",
    bankAccountNumber: "",
  });
  const [error, setError] = useState<SignupExtraError | null>(null);
  return (
    <NextIntlClientProvider locale="en" messages={en}>
      <SignupExtraFields value={value} onChange={onChange} section="source" error={error} />
      {isBuddy && (
        <SignupExtraFields value={value} onChange={onChange} section="bank" error={error} />
      )}
      <button onClick={() => setError(validateSignupExtra(value, isBuddy ? "BUDDY" : "TOURIST"))}>
        Validate
      </button>
    </NextIntlClientProvider>
  );
}

it("shows eight unselected required radio choices and a linked error for no choice", () => {
  render(<Fields />);
  const choices = screen.getAllByRole("radio");
  expect(choices).toHaveLength(8);
  expect(choices.map((choice) => (choice as HTMLInputElement).value)).toEqual([
    "INSTAGRAM",
    "FACEBOOK",
    "GOOGLE_SEARCH",
    "FRIEND",
    "MEETUP",
    "OFFLINE_PROMOTION",
    "UNIVERSITY_COMMUNITY",
    "OTHER",
  ]);
  expect(screen.queryByText("Required")).not.toBeInTheDocument();
  for (const choice of choices) {
    expect(choice).not.toBeChecked();
    expect(choice).toBeRequired();
  }
  fireEvent.click(screen.getByRole("button", { name: "Validate" }));
  const error = screen.getByRole("alert");
  expect(error).toHaveTextContent("Please select how you heard about us.");
  expect(choices[0]).toHaveAttribute("aria-describedby", error.id);
  fireEvent.click(screen.getByRole("radio", { name: "Instagram" }));
  fireEvent.click(screen.getByRole("button", { name: "Validate" }));
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.getByRole("radio", { name: "Instagram" })).toBeChecked();
});

it("only reveals OTHER detail when selected and clears stale detail on a different choice", () => {
  render(<Fields />);
  fireEvent.click(screen.getByRole("radio", { name: "Other" }));
  const detail = screen.getByRole("textbox");
  expect(detail).toBeRequired();
  expect(detail).toHaveClass("hover:border-primary");
  fireEvent.change(detail, { target: { value: "Travel club" } });
  fireEvent.click(screen.getByRole("radio", { name: "Friend" }));
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("radio", { name: "Other" }));
  expect(screen.getByRole("textbox")).toHaveValue("");
});

it("requires buddy bank fields without optional labels or helper copy", () => {
  const { unmount } = render(<Fields />);
  expect(screen.queryByRole("combobox", { name: "Bank" })).not.toBeInTheDocument();
  unmount();
  render(<Fields isBuddy />);
  expect(screen.getByRole("combobox", { name: "Bank" })).toBeRequired();
  expect(screen.getByText("Bank account")).toBeInTheDocument();
  expect(screen.queryByText(/optional/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/Enter both fields if adding/)).not.toBeInTheDocument();
  const account = screen.getByLabelText("Account number");
  expect(account).toBeRequired();
  expect(account).toHaveClass("hover:border-primary");
  expect(screen.getByRole("combobox", { name: "Bank" })).toHaveClass("hover:border-primary");
  fireEvent.click(screen.getByRole("radio", { name: "Instagram" }));
  fireEvent.click(screen.getByRole("button", { name: "Validate" }));
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Select a bank and enter your account number.",
  );
  fireEvent.change(account, { target: { value: "001-234" } });
  expect(account).toHaveValue("001-234");
});
