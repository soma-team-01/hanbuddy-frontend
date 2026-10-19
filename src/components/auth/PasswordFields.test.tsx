import { useState } from "react";
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { PasswordFields } from "./EmailAuthFields";

function Fields() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  return (
    <PasswordFields
      password={password}
      confirmation={confirmation}
      onPassword={setPassword}
      onConfirmation={setConfirmation}
    />
  );
}

describe("live password feedback", () => {
  it.each([
    [
      "en",
      "Password",
      "Confirm password",
      "Show Password",
      "Hide Password",
      "Show Confirm password",
      "Hide Confirm password",
    ],
    [
      "ko",
      "비밀번호",
      "비밀번호 확인",
      "비밀번호 표시",
      "비밀번호 숨기기",
      "비밀번호 확인 표시",
      "비밀번호 확인 숨기기",
    ],
  ] as const)(
    "toggles each password independently without submitting in %s",
    (
      locale,
      passwordLabel,
      confirmLabel,
      showPassword,
      hidePassword,
      showConfirmation,
      hideConfirmation,
    ) => {
      const submit = vi.fn((event) => event.preventDefault());
      renderWithIntl(
        <form onSubmit={submit}>
          <Fields />
        </form>,
        { locale },
      );
      const password = screen.getByLabelText(passwordLabel);
      const confirmation = screen.getByLabelText(confirmLabel);
      fireEvent.change(password, { target: { value: "abcdefgh" } });
      fireEvent.change(confirmation, { target: { value: "abcdefgh" } });
      expect(password).toHaveAttribute("type", "password");
      expect(confirmation).toHaveAttribute("type", "password");
      const toggle = screen.getByRole("button", { name: showPassword });
      expect(toggle).toHaveAttribute("aria-controls", password.id);
      fireEvent.click(toggle);
      expect(password).toHaveAttribute("type", "text");
      expect(password).toHaveValue("abcdefgh");
      expect(confirmation).toHaveAttribute("type", "password");
      fireEvent.click(screen.getByRole("button", { name: showConfirmation }));
      expect(confirmation).toHaveAttribute("type", "text");
      expect(confirmation).toHaveValue("abcdefgh");
      fireEvent.click(screen.getByRole("button", { name: hidePassword }));
      expect(password).toHaveAttribute("type", "password");
      expect(confirmation).toHaveAttribute("type", "text");
      fireEvent.click(screen.getByRole("button", { name: hideConfirmation }));
      expect(confirmation).toHaveAttribute("type", "password");
      expect(submit).not.toHaveBeenCalled();
    },
  );
  it.each([
    [
      "en",
      "Password",
      "Confirm password",
      "At least 8 characters.",
      "This password is valid.",
      "Passwords match.",
      "The passwords do not match.",
    ],
    [
      "ko",
      "비밀번호",
      "비밀번호 확인",
      "최소 8자 이상.",
      "사용 가능한 비밀번호입니다.",
      "비밀번호가 일치합니다.",
      "비밀번호가 일치하지 않습니다.",
    ],
  ] as const)(
    "updates validity and matching feedback in %s",
    (locale, passwordLabel, confirmLabel, hint, valid, match, mismatch) => {
      renderWithIntl(<Fields />, { locale });
      const password = screen.getByLabelText(passwordLabel);
      const confirmation = screen.getByLabelText(confirmLabel);
      expect(screen.getByText(hint)).toHaveClass("text-muted");
      expect(password).not.toHaveAttribute("aria-invalid", "true");
      expect(screen.queryByText(mismatch)).not.toBeInTheDocument();
      for (let length = 1; length < 8; length++) {
        fireEvent.change(password, { target: { value: "a".repeat(length) } });
        expect(password).toHaveAttribute("aria-invalid", "true");
        expect(screen.getByText(hint)).toHaveClass("text-muted");
        expect(screen.getByText(hint)).not.toHaveClass("text-danger", "text-success");
      }
      fireEvent.change(password, { target: { value: "abcdefgh" } });
      expect(screen.getByText(valid)).toHaveClass("text-success");
      expect(password).toHaveAccessibleDescription(valid);
      fireEvent.change(confirmation, { target: { value: "abcdefgi" } });
      expect(screen.getByText(mismatch)).toHaveClass("text-danger");
      expect(confirmation).toHaveAttribute("aria-invalid", "true");
      fireEvent.change(confirmation, { target: { value: "abcdefgh" } });
      expect(screen.getByText(match)).toHaveClass("text-success");
      expect(confirmation).toHaveAccessibleDescription(match);
      fireEvent.change(password, { target: { value: "abcdxxxx" } });
      expect(screen.getByText(mismatch)).toBeInTheDocument();
      fireEvent.change(confirmation, { target: { value: "" } });
      expect(screen.queryByText(mismatch)).not.toBeInTheDocument();
      fireEvent.change(password, { target: { value: "abcdefg" } });
      expect(screen.getByText(hint)).toHaveClass("text-muted");
      expect(screen.queryByText(valid)).not.toBeInTheDocument();
      fireEvent.change(password, { target: { value: "" } });
      expect(screen.getByText(hint)).toHaveClass("text-muted");
      expect(password).not.toHaveAttribute("aria-invalid", "true");
    },
  );
  it.each([" ".repeat(8), "a".repeat(65), "가".repeat(25)])(
    "does not call an invalid password usable: %j",
    (value) => {
      renderWithIntl(<Fields />);
      fireEvent.change(screen.getByLabelText("Password"), { target: { value } });
      expect(screen.getByLabelText("Password")).toHaveAttribute("aria-invalid", "true");
      const descriptionId = screen.getByLabelText("Password").getAttribute("aria-describedby")!;
      expect(document.getElementById(descriptionId)).toHaveClass("text-danger");
      expect(screen.queryByText("This password is valid.")).not.toBeInTheDocument();
    },
  );
  it("allows a 72-byte password without requiring uppercase or symbols", () => {
    renderWithIntl(<Fields />);
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "가".repeat(24) } });
    expect(screen.getByText("This password is valid.")).toBeInTheDocument();
  });
});
