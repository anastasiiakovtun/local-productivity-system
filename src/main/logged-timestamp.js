/**
 * Returns a LoggedTimestamp object capturing the current moment
 * with all five required fields. Never reconstructed after the fact.
 */
export function loggedTimestamp() {
  const now = new Date();

  // YYYY-MM-DD in local time (Swedish locale reliably produces ISO date format)
  const local_date = now.toLocaleDateString('sv');

  // HH:MM:SS in local time (en-GB gives 24-hour format)
  const local_time = now.toLocaleTimeString('en-GB', { hour12: false });

  // UTC offset via Intl — e.g. "+02:00" or "-05:00"
  const fmt = new Intl.DateTimeFormat('en', {
    timeZoneName: 'shortOffset',
    hour: 'numeric',
  });
  const parts = fmt.formatToParts(now);
  const rawOffset = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+0';
  // rawOffset is like "GMT+2", "GMT-5:30", "GMT+0"
  const utc_offset = rawOffset.replace('GMT', '').replace(/^([+-])(\d)$/, '$10$2:00')
    .replace(/^([+-])(\d{2})$/, '$1$2:00')
    .replace(/^([+-])(\d{1,2}):(\d{2})$/, (_, s, h, m) => `${s}${h.padStart(2, '0')}:${m}`)
    || '+00:00';

  // IANA timezone name
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // UTC instant
  const occurred_at_utc = now.toISOString().replace(/\.\d{3}Z$/, 'Z');

  return { local_date, local_time, utc_offset, timezone, occurred_at_utc };
}
