import { describe, expect, it } from 'vitest';
import { validatePreferences } from '../../src/shared/app-schema.js';

describe('validatePreferences', () => {
  it('accepts partial boolean preference updates', () => {
    expect(validatePreferences({ sidebarCollapsed: true })).toBeNull();
    expect(validatePreferences({ floatingTimerEnabled: false })).toBeNull();
  });

  it('rejects non-boolean sidebarCollapsed', () => {
    expect(validatePreferences({ sidebarCollapsed: 'yes' })).toBe('sidebarCollapsed must be boolean');
  });

  it('rejects non-boolean floatingTimerEnabled', () => {
    expect(validatePreferences({ floatingTimerEnabled: 1 })).toBe('floatingTimerEnabled must be boolean');
  });
});
