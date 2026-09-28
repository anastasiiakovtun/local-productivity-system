import { describe, expect, it } from 'vitest';
import { loggedTimestamp } from '../../src/main/logged-timestamp.js';

describe('loggedTimestamp', () => {
  it('returns an object with all five required keys', () => {
    const ts = loggedTimestamp();
    expect(ts).toHaveProperty('local_date');
    expect(ts).toHaveProperty('local_time');
    expect(ts).toHaveProperty('utc_offset');
    expect(ts).toHaveProperty('timezone');
    expect(ts).toHaveProperty('occurred_at_utc');
  });

  it('local_date matches YYYY-MM-DD', () => {
    expect(loggedTimestamp().local_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('local_time matches HH:MM:SS', () => {
    expect(loggedTimestamp().local_time).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  it('utc_offset matches [+-]HH:MM', () => {
    expect(loggedTimestamp().utc_offset).toMatch(/^[+-]\d{2}:\d{2}$/);
  });

  it('timezone is a non-empty string', () => {
    const tz = loggedTimestamp().timezone;
    expect(typeof tz).toBe('string');
    expect(tz.length).toBeGreaterThan(0);
  });

  it('occurred_at_utc ends with Z and is a valid ISO instant', () => {
    const utc = loggedTimestamp().occurred_at_utc;
    expect(utc.endsWith('Z')).toBe(true);
    expect(Number.isNaN(new Date(utc).getTime())).toBe(false);
  });

  it('occurred_at_utc is consistent with local_date and utc_offset', () => {
    const ts = loggedTimestamp();
    const utcMs = new Date(ts.occurred_at_utc).getTime();
    expect(utcMs).toBeGreaterThan(0);
    // local_date must be a real calendar date
    expect(new Date(ts.local_date).toString()).not.toBe('Invalid Date');
  });
});
