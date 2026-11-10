// Fixed period starts from the reservation schedule, in local school time.
const starts = [7 * 60 + 30, 13 * 60, 18 * 60 + 30];
const clock = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'America/Sao_Paulo',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

export function isIotCollectionWindow(now = new Date()) {
  const parts = clock.formatToParts(now);
  const value = (name: string) =>
    Number(parts.find((part) => part.type === name)?.value);
  const seconds = value('hour') * 3600 + value('minute') * 60 + value('second');
  return starts.some(
    (start) => seconds >= (start - 5) * 60 && seconds <= (start + 30) * 60,
  );
}
