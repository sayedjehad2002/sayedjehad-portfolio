// Real Asia/Bahrain wall-clock time for the on-screen clock. Independent of the
// visual day/night cycle (which can run on real time OR an accelerated loop): the
// clock always shows the true local time in Bahrain via the Intl timezone DB.

const FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Bahrain',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

/** e.g. "07:42 PM" in Bahrain local time. */
export function bahrainTimeString(now: Date = new Date()): string {
  // Normalize any whitespace (ICU inserts a narrow no-break space before AM/PM)
  // to a regular space so the chip lays out predictably.
  return FMT.format(now).replace(/\s/g, ' ');
}
