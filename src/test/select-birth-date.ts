import { fireEvent, screen, within } from "@testing-library/react";

export function openBirthDatePart(name: string) {
  const trigger = screen.getByRole("combobox", { name });
  const current = screen.queryByRole("listbox");
  if (current && current.getAttribute("aria-label") !== name) {
    fireEvent.pointerDown(trigger);
  }
  if (trigger.getAttribute("aria-expanded") !== "true") fireEvent.click(trigger);
  return within(screen.getByRole("listbox", { name }));
}

export function selectBirthDatePart(name: string, value: string) {
  const option = openBirthDatePart(name)
    .getAllByRole("option")
    .find((element) => (element as HTMLButtonElement).value === value);
  if (option && !(option as HTMLButtonElement).disabled) fireEvent.click(option);
  else fireEvent.keyDown(screen.getByRole("combobox", { name }), { key: "Escape" });
}
