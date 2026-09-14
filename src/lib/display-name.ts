export const DISPLAY_NAME_PATTERN = "[A-Za-z]+(?:[ '-][A-Za-z]+)*";

const DISPLAY_NAME_REGEX = new RegExp(DISPLAY_NAME_PATTERN);

export function isValidDisplayName(displayName: string) {
  const match = DISPLAY_NAME_REGEX.exec(displayName);

  return displayName.length >= 2 && displayName.length <= 30 && match?.[0] === displayName;
}
