import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { expect, it } from "vitest";
import en from "@/messages/en.json";
import { type SignupExtraError, validateSignupExtra } from "@/lib/auth/signup-extra";
import { SignupExtraFields } from "./SignupExtraFields";

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
