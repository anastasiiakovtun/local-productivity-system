import { describe, expect, it } from 'vitest';
import {
  PROJECT_COVER_COLORS,
  validatePreferences,
  validateProjectCover,
} from '../../src/shared/app-schema.js';

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

describe('validateProjectCover', () => {
  it('accepts an exact label and palette color', () => {
    expect(validateProjectCover('Thesis', PROJECT_COVER_COLORS[0])).toBeNull();
  });

  it('rejects invalid labels and colors', () => {
    expect(validateProjectCover('', PROJECT_COVER_COLORS[0])).toBe('projectLabel is required');
    expect(validateProjectCover('Thesis', '#ffffff')).toBe('invalid project cover color');
  });
});
