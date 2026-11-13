import { describe, expect, it } from 'vitest';

import {
  formatBillingAmount,
  formatBillingRatio,
  formatBillingTokens,
} from './format';

describe('formatBillingAmount', () => {
  it('normalizes decimal strings and numbers with at least two digits', () => {
    expect(formatBillingAmount('1.5')).toBe('1.50');
    expect(formatBillingAmount(0.0012)).toBe('0.0012');
    expect(formatBillingAmount('2')).toBe('2.00');
  });

  it('returns a placeholder for missing or invalid values', () => {
    expect(formatBillingAmount(null)).toBe('-');
    expect(formatBillingAmount(undefined)).toBe('-');
    expect(formatBillingAmount('')).toBe('-');
    expect(formatBillingAmount('abc')).toBe('-');
  });
});

describe('formatBillingTokens', () => {
  it('groups digits and keeps zero meaningful', () => {
    expect(formatBillingTokens(1_234_567)).toBe('1,234,567');
    expect(formatBillingTokens(0)).toBe('0');
    expect(formatBillingTokens(null)).toBe('-');
  });
});

describe('formatBillingRatio', () => {
  it('renders ratios as percentages', () => {
    expect(formatBillingRatio(0.8)).toBe('80%');
    expect(formatBillingRatio(0.855)).toBe('85.5%');
    expect(formatBillingRatio(null)).toBe('-');
  });
});
