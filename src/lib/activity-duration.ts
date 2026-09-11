export function formatActivityDuration(
  totalMinutes: number,
  formatHours: (hours: number) => string,
  formatMinutes: (minutes: number) => string,
): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return formatMinutes(minutes);
  if (minutes === 0) return formatHours(hours);

  return `${formatHours(hours)} ${formatMinutes(minutes)}`;
}
