import { useState } from "react";
import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { openBirthDatePart, selectBirthDatePart } from "@/test/select-birth-date";
import { BirthDatePicker } from "./BirthDatePicker";

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

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
      <button onClick={() => onChange("1998-04-12")}>Restore draft</button>
      <button onClick={() => onChange("")}>Reset</button>
    </>
  );
}

it("offers three compact inline fields without an extra panel or done button", () => {
  renderWithIntl(<Picker />);
  expect(screen.getAllByRole("combobox")).toHaveLength(3);
  expect(screen.getByRole("group", { name: "Date of birth" })).toHaveClass("w-full");
  expect(screen.queryByRole("button", { name: "Date of birth" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Done" })).not.toBeInTheDocument();
});

it.each([
  ["en", "Date of birth", ["Month", "Day", "Year"], "Done"],
  ["ko", "생년월일", ["연도", "월", "일"], "완료"],
] as const)("selects directly in %s order without confirmation", (locale, label, fields, done) => {
  renderWithIntl(<Picker />, { locale });
  expect(screen.getByRole("group", { name: label }).tagName).toBe("FIELDSET");
  expect(screen.queryByText(/Enter a valid date of birth/)).not.toBeInTheDocument();
  const selects = screen.getAllByRole("combobox");
  fields.forEach((name, i) => expect(selects[i]).toHaveAccessibleName(name));
  expect(selects[0]).not.toHaveFocus();
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
    selectBirthDatePart(name, value);
  }
  expect(screen.getByLabelText("payload")).toHaveTextContent("2000-02-29");
  expect(screen.queryByRole("button", { name: done })).not.toBeInTheDocument();
});

it("clears an invalidated leap day and announces reselection", () => {
  renderWithIntl(<Picker initial="2000-02-29" />);
  selectBirthDatePart("Year", "1907");
  expect(screen.getByRole("combobox", { name: "Day" })).toHaveValue("");
  expect(screen.getByRole("status")).toHaveTextContent("Please select it again");
  expect(screen.getByRole("status").tagName).toBe("OUTPUT");
  expect(screen.getByLabelText("payload")).toBeEmptyDOMElement();
});
it("prevents dates younger than 19 and resets month-end days", () => {
  renderWithIntl(<Picker initial="2007-08-31" />);
  expect(openBirthDatePart("Month").getByRole("option", { name: "October" })).toBeDisabled();
  selectBirthDatePart("Month", "9");
  expect(screen.getByRole("combobox", { name: "Day" })).toHaveValue("");
  expect(openBirthDatePart("Day").getByRole("option", { name: "12" })).toBeDisabled();
  selectBirthDatePart("Day", "11");
  expect(screen.getByLabelText("payload")).toHaveTextContent("2007-09-11");
});

it("requires reselection after moving from January 31 to April", () => {
  renderWithIntl(<Picker initial="2000-01-31" />);
  selectBirthDatePart("Month", "4");
  expect(screen.getByRole("combobox", { name: "Day" })).toHaveValue("");
  expect(screen.getByRole("status")).toHaveTextContent("Please select it again");
});
it("invalidates an out-of-range month when changing to the youngest year", () => {
  renderWithIntl(<Picker initial="2000-12-31" />);
  selectBirthDatePart("Year", "2007");
  expect(screen.getByRole("combobox", { name: "Month" })).toHaveValue("");
  expect(screen.getByRole("combobox", { name: "Day" })).toHaveValue("");
  expect(screen.getByLabelText("payload")).toBeEmptyDOMElement();
});
it.each(["Month", "Day"])("keeps the month/day notice when %s is reselected first", (first) => {
  renderWithIntl(<Picker initial="2000-12-31" />);
  selectBirthDatePart("Year", "2007");
  expect(screen.getByRole("status")).toHaveTextContent("Please select the month and day again");
  const selections =
    first === "Month"
      ? [
          ["Month", "8"],
          ["Day", "11"],
        ]
      : [
          ["Day", "11"],
          ["Month", "8"],
        ];
  const [[firstName, firstValue], [lastName, lastValue]] = selections;
  selectBirthDatePart(firstName, firstValue);
  expect(screen.getByRole("status")).toHaveTextContent("Please select the month and day again");
  expect(screen.getByLabelText("payload")).toBeEmptyDOMElement();
  selectBirthDatePart(lastName, lastValue);
  expect(screen.getByRole("status")).toBeEmptyDOMElement();
  expect(screen.getByLabelText("payload")).toHaveTextContent("2007-08-11");
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
  expect(screen.getByRole("group", { name: "Date of birth" })).toHaveAccessibleDescription(
    /Enter a valid date of birth/,
  );
  expect(screen.getAllByText(/Enter a valid date of birth/)).toHaveLength(1);
  screen.getAllByRole("combobox").forEach((select) => {
    expect(select).toHaveValue("");
    expect(select).toHaveAttribute("aria-invalid", "true");
  });
});

it("uses exactly the supplied inclusive age bounds", () => {
  renderWithIntl(<Picker initial="1906-09-11" />);
  const years = openBirthDatePart("Year");
  expect(years.queryByRole("option", { name: "1905" })).not.toBeInTheDocument();
  expect(years.queryByRole("option", { name: "2008" })).not.toBeInTheDocument();
  expect(years.getByRole("option", { name: "1906" })).toBeEnabled();
  expect(years.getByRole("option", { name: "2007" })).toBeEnabled();
  expect(openBirthDatePart("Month").getByRole("option", { name: "August" })).toBeDisabled();
  const days = openBirthDatePart("Day");
  expect(days.getByRole("option", { name: "10" })).toBeDisabled();
  expect(days.getByRole("option", { name: "11" })).toBeEnabled();
});

it("reflects external drafts and resets while preserving partial selections", () => {
  renderWithIntl(<Picker />);
  selectBirthDatePart("Year", "2000");
  expect(screen.getByRole("combobox", { name: "Year" })).toHaveValue("2000");
  fireEvent.click(screen.getByRole("button", { name: "Restore draft" }));
  expect(screen.getByRole("combobox", { name: "Year" })).toHaveValue("1998");
  expect(screen.getByRole("combobox", { name: "Month" })).toHaveValue("4");
  expect(screen.getByRole("combobox", { name: "Day" })).toHaveValue("12");
  fireEvent.click(screen.getByRole("button", { name: "Reset" }));
  screen.getAllByRole("combobox").forEach((field) => expect(field).toHaveValue(""));
});
