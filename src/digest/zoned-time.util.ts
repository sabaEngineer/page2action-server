/** Wall-clock parts for a Date in an IANA time zone. */
export function zonedWallParts(date: Date, timeZone: string): { ymd: string; hour: number; minute: number } {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const v = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? '';
  const y = v('year');
  const m = v('month');
  const d = v('day');
  const h = v('hour');
  const min = v('minute');
  return {
    ymd: `${y}-${m}-${d}`,
    hour: parseInt(h, 10),
    minute: parseInt(min, 10),
  };
}

export function isValidIanaTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}
