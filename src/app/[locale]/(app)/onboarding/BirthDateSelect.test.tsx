import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { BirthDateSelect } from "./BirthDateSelect";

const options = Array.from({ length: 31 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
  disabled: i === 3,
}));

function Select() {
  const [value, onChange] = useState("3");
  return <BirthDateSelect label="Day" value={value} options={options} onChange={onChange} />;
}

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

it("limits the scrollable menu to six rows and scrolls the selected option into view", () => {
  render(<Select />);
  const trigger = screen.getByRole("combobox", { name: "Day" });
  expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  fireEvent.click(trigger);
  const menu = screen.getByRole("listbox", { name: "Day" });
  expect(menu).toHaveStyle({ maxHeight: "224px" });
  expect(menu).toHaveClass("overflow-y-auto", "bg-canvas-soft");
  expect(screen.getAllByRole("option")).toHaveLength(31);
  expect(screen.getByRole("option", { name: "3" })).toHaveAttribute("aria-selected", "true");
  expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: "nearest" });
  fireEvent.click(screen.getByRole("option", { name: "12" }));
  expect(trigger).toHaveTextContent("12");
  expect(trigger).toHaveFocus();
  expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
});

it("supports keyboard selection, skips disabled dates, and retains focus", () => {
  render(<Select />);
  const trigger = screen.getByRole("combobox");
  trigger.focus();
  fireEvent.keyDown(trigger, { key: "ArrowDown" });
  fireEvent.keyDown(trigger, { key: "ArrowDown" });
  expect(trigger).toHaveAttribute(
    "aria-activedescendant",
    screen.getByRole("option", { name: "5" }).id,
  );
  fireEvent.keyDown(trigger, { key: "Enter" });
  expect(trigger).toHaveTextContent("5");
  expect(trigger).toHaveFocus();
  fireEvent.keyDown(trigger, { key: "End" });
  fireEvent.keyDown(trigger, { key: " " });
  expect(trigger).toHaveTextContent("31");
  fireEvent.keyDown(trigger, { key: "Home" });
  fireEvent.keyDown(trigger, { key: "Enter" });
  expect(trigger).toHaveTextContent("1");
});

it("supports typing a date and does not commit on Escape, Tab or outside clicks", () => {
  render(<Select />);
  const trigger = screen.getByRole("combobox");
  fireEvent.keyDown(trigger, { key: "2" });
  fireEvent.keyDown(trigger, { key: "9" });
  fireEvent.keyDown(trigger, { key: "Enter" });
  expect(trigger).toHaveTextContent("29");
  for (const key of ["Escape", "Tab"]) {
    fireEvent.click(trigger);
    fireEvent.keyDown(trigger, { key: "ArrowUp" });
    fireEvent.keyDown(trigger, { key });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(trigger).toHaveTextContent("29");
  }
  fireEvent.click(trigger);
  fireEvent.pointerDown(document.body);
  expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
});

it("highlights hovered dates without committing and ignores disabled dates", () => {
  render(<Select />);
  const trigger = screen.getByRole("combobox");
  fireEvent.click(trigger);
  const hovered = screen.getByRole("option", { name: "12" });
  fireEvent.mouseMove(hovered);
  expect(hovered).toHaveClass("text-primary-strong", "underline");
  expect(trigger).toHaveAttribute("aria-activedescendant", hovered.id);
  expect(trigger).toHaveValue("3");
  expect(hovered).toHaveAttribute("aria-selected", "false");
  expect(screen.getByRole("option", { name: "3" })).toHaveAttribute("aria-selected", "true");
  fireEvent.mouseMove(screen.getByRole("option", { name: "4" }));
  expect(trigger).toHaveAttribute("aria-activedescendant", hovered.id);
  fireEvent.click(hovered);
  expect(trigger).toHaveValue("12");
});
