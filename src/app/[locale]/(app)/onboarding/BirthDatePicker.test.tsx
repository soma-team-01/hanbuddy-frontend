import { useState } from "react";
import { fireEvent, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { BirthDatePicker } from "./BirthDatePicker";

function Picker({ initial = "" }) {
  const [value, onChange] = useState(initial);
  return (
    <>
      <BirthDatePicker
        value={value}
        onChange={onChange}
        today="2026-09-11"
        oldestAllowedBirthDate="1906-09-11"
        youngestAllowedBirthDate="2007-09-11"
      />
      <span aria-label="payload">{value}</span>
      <button>Outside</button>
    </>
  );
}

it.each([
  ["en", "Date of birth", ["Month", "Day", "Year"], "Done"],
  ["ko", "생년월일", ["연도", "월", "일"], "완료"],
] as const)("opens, selects directly and closes in %s order", (locale, label, fields, done) => {
  renderWithIntl(<Picker />, { locale });
  const trigger = screen.getByRole("button", { name: label });
  fireEvent.click(trigger);
  const selects = screen.getAllByRole("combobox");
  fields.forEach((name, i) => expect(selects[i]).toHaveAccessibleName(name));
  expect(selects[0]).toHaveFocus();
  for (const [name, value] of locale === "en"
    ? [
        ["Year", "2000"],
        ["Month", "2"],
        ["Day", "29"],
      ]
    : [
        ["연도", "2000"],
        ["월", "2"],
        ["일", "29"],
      ]) {
    fireEvent.change(screen.getByRole("combobox", { name }), { target: { value } });
  }
  expect(screen.getByLabelText("payload")).toHaveTextContent("2000-02-29");
  fireEvent.click(screen.getByRole("button", { name: done }));
  expect(trigger).toHaveFocus();
  expect(trigger).toHaveAttribute("aria-expanded", "false");
});

it("clears an invalidated leap day and announces reselection", () => {
  renderWithIntl(<Picker initial="2000-02-29" />);
  fireEvent.click(screen.getByRole("button", { name: "Date of birth" }));
  fireEvent.change(screen.getByRole("combobox", { name: "Year" }), { target: { value: "1907" } });
  expect(screen.getByRole("combobox", { name: "Day" })).toHaveValue("");
  expect(screen.getByRole("status")).toHaveTextContent("Please select it again");
  expect(screen.getByLabelText("payload")).toBeEmptyDOMElement();
  expect(screen.getByRole("button", { name: "Done" })).toBeDisabled();
});
it("prevents dates younger than 19 and resets month-end days", () => {
  renderWithIntl(<Picker initial="2007-08-31" />);
  fireEvent.click(screen.getByRole("button", { name: "Date of birth" }));
  expect(screen.getByRole("option", { name: "October" })).toBeDisabled();
  fireEvent.change(screen.getByRole("combobox", { name: "Month" }), { target: { value: "9" } });
  expect(screen.getByRole("combobox", { name: "Day" })).toHaveValue("");
  expect(
    within(screen.getByRole("combobox", { name: "Day" })).getByRole("option", { name: "12" }),
  ).toBeDisabled();
  fireEvent.change(screen.getByRole("combobox", { name: "Day" }), { target: { value: "11" } });
  expect(screen.getByLabelText("payload")).toHaveTextContent("2007-09-11");
});
it("closes on Escape, outside pointer and tabbing out, retaining selection", () => {
  renderWithIntl(<Picker initial="1998-04-12" />);
  const trigger = screen.getByRole("button", { name: "Date of birth" });
  fireEvent.click(trigger);
  fireEvent.keyDown(screen.getByRole("combobox", { name: "Month" }), { key: "Escape" });
  expect(trigger).toHaveFocus();
  expect(trigger).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(trigger);
  fireEvent.pointerDown(screen.getByRole("button", { name: "Outside" }));
  expect(trigger).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(trigger);
  fireEvent.blur(screen.getByRole("combobox", { name: "Month" }), {
    relatedTarget: screen.getByRole("button", { name: "Outside" }),
  });
  expect(trigger).toHaveAttribute("aria-expanded", "false");
  expect(screen.getByLabelText("payload")).toHaveTextContent("1998-04-12");
});

it("requires reselection after moving from January 31 to April", () => {
  renderWithIntl(<Picker initial="2000-01-31" />);
  fireEvent.click(screen.getByRole("button", { name: "Date of birth" }));
  fireEvent.change(screen.getByRole("combobox", { name: "Month" }), { target: { value: "4" } });
  expect(screen.getByRole("combobox", { name: "Day" })).toHaveValue("");
  expect(screen.getByRole("status")).toHaveTextContent("Please select it again");
});
it("invalidates an out-of-range month when changing to the youngest year", () => {
  renderWithIntl(<Picker initial="2000-12-31" />);
  fireEvent.click(screen.getByRole("button", { name: "Date of birth" }));
  fireEvent.change(screen.getByRole("combobox", { name: "Year" }), { target: { value: "2007" } });
  expect(screen.getByRole("combobox", { name: "Month" })).toHaveValue("");
  expect(screen.getByRole("combobox", { name: "Day" })).toHaveValue("");
  expect(screen.getByLabelText("payload")).toBeEmptyDOMElement();
});
it("shows invalid input as empty and exposes a described error", () => {
  renderWithIntl(
    <BirthDatePicker
      value="2025-02-29"
      onChange={() => undefined}
      today="2026-09-11"
      oldestAllowedBirthDate="1906-09-11"
      youngestAllowedBirthDate="2007-09-11"
      invalid
    />,
  );
  const trigger = screen.getByRole("button", { name: "Date of birth" });
  expect(trigger).not.toHaveAttribute("aria-invalid");
  expect(trigger).toHaveAccessibleDescription(
    /Enter a valid date of birth for an age between 19 and 120/,
  );
  fireEvent.click(trigger);
  screen.getAllByRole("combobox").forEach((select) => {
    expect(select).toHaveValue("");
    expect(select).toHaveAttribute("aria-invalid", "true");
  });
  expect(screen.getByRole("button", { name: "Done" })).toBeDisabled();
});

it("uses exactly the supplied inclusive age bounds", () => {
  renderWithIntl(<Picker initial="1906-09-11" />);
  fireEvent.click(screen.getByRole("button", { name: "Date of birth" }));
  const years = within(screen.getByRole("combobox", { name: "Year" }));
  expect(years.queryByRole("option", { name: "1905" })).not.toBeInTheDocument();
  expect(years.queryByRole("option", { name: "2008" })).not.toBeInTheDocument();
  expect(years.getByRole("option", { name: "1906" })).toBeEnabled();
  expect(years.getByRole("option", { name: "2007" })).toBeEnabled();
  expect(screen.getByRole("option", { name: "August" })).toBeDisabled();
  const days = within(screen.getByRole("combobox", { name: "Day" }));
  expect(days.getByRole("option", { name: "10" })).toBeDisabled();
  expect(days.getByRole("option", { name: "11" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Done" })).toBeEnabled();
});
