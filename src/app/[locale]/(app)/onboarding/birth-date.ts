/** Gregorian date-only arithmetic: never parse a birth date as a timestamp. */
export function daysInMonth(year: number, month: number) {
  if (month === 2) return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export function isValidBirthDate(
  value: string,
  today: string,
  oldestAllowedBirthDate: string,
  youngestAllowedBirthDate: string,
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  return (
    year >= 1 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth(year, month) &&
    !!oldestAllowedBirthDate &&
    !!youngestAllowedBirthDate &&
    value >= oldestAllowedBirthDate &&
    value <= youngestAllowedBirthDate &&
    value <= today
  );
}
